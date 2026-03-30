package com.bzdata.TataFneBackend.auditTrail;

import com.bzdata.TataFneBackend.user.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserActionAuditFilter extends OncePerRequestFilter {

    private static final int MAX_PAYLOAD_LENGTH = 6000;
    private static final Set<String> EXCLUDED_PREFIXES = Set.of(
            "/swagger-ui",
            "/v3/api-docs",
            "/swagger-resources",
            "/webjars",
            "/configuration",
            "/actuator",
            "/metrics",
            "/error",
            "/audit-logs",
            "/user-sessions"
    );
    private static final Set<String> SENSITIVE_FIELDS = Set.of(
            "password",
            "currentpassword",
            "newpassword",
            "confirmpassword",
            "confirmationpassword",
            "token",
            "accesstoken",
            "refreshtoken",
            "authorization",
            "secret",
            "bearertoken"
    );

    private final UserActionAuditService auditService;
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        var path = request.getServletPath();
        if (path == null || path.isBlank()) {
            return true;
        }

        return EXCLUDED_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        var wrappedRequest = request instanceof ContentCachingRequestWrapper requestWrapper
                ? requestWrapper
                : new ContentCachingRequestWrapper(request);
        var wrappedResponse = response instanceof ContentCachingResponseWrapper responseWrapper
                ? responseWrapper
                : new ContentCachingResponseWrapper(response);

        var startedAt = System.currentTimeMillis();

        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse);
        } finally {
            try {
                persistAuditLog(wrappedRequest, wrappedResponse, System.currentTimeMillis() - startedAt);
            } catch (Exception exception) {
                log.warn("Impossible d'enregistrer l'audit de {}", request.getServletPath(), exception);
            } finally {
                wrappedResponse.copyBodyToResponse();
            }
        }
    }

    private void persistAuditLog(
            ContentCachingRequestWrapper request,
            ContentCachingResponseWrapper response,
            long durationMs
    ) {
        var rawRequestPayload = readPayload(request.getContentAsByteArray(), request.getCharacterEncoding());
        var rawResponsePayload = readPayload(response.getContentAsByteArray(), response.getCharacterEncoding());
        var userContext = resolveUserContext(request, rawRequestPayload);

        auditService.recordAction(UserActionAuditCommand.builder()
                .occurredAt(LocalDateTime.now())
                .userId(userContext.userId())
                .userFullName(userContext.userFullName())
                .userEmail(userContext.userEmail())
                .module(resolveModule(request.getServletPath()))
                .action(resolveAction(request.getMethod(), request.getServletPath()))
                .endpoint(truncate(request.getServletPath(), 255))
                .httpMethod(request.getMethod())
                .result(resolveResult(response.getStatus()))
                .httpStatus(response.getStatus())
                .durationMs(Math.max(durationMs, 0L))
                .clientIp(resolveClientIp(request))
                .requestPayload(sanitizePayload(rawRequestPayload, request.getContentType()))
                .responsePayload(sanitizePayload(rawResponsePayload, response.getContentType()))
                .build());
    }

    private UserContext resolveUserContext(ContentCachingRequestWrapper request, String rawRequestPayload) {
        var userId = resolveIntegerAttribute(request.getAttribute(AuditRequestAttributes.USER_ID));
        var userFullName = normalizeStringAttribute(request.getAttribute(AuditRequestAttributes.USER_FULL_NAME));
        var userEmail = normalizeStringAttribute(request.getAttribute(AuditRequestAttributes.USER_EMAIL));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            if (userId == null) {
                userId = user.getId();
            }
            if (userFullName == null) {
                userFullName = user.getFullName();
            }
            if (userEmail == null) {
                userEmail = user.getEmail();
            }
        } else if (authentication != null && authentication.getName() != null && userEmail == null) {
            userEmail = authentication.getName();
        }

        if (userEmail == null && "/auth/authenticate".equals(request.getServletPath())) {
            userEmail = extractJsonField(rawRequestPayload, "email");
        }

        return new UserContext(
                userId,
                truncate(userFullName, 160),
                truncate(userEmail, 160)
        );
    }

    private String resolveModule(String path) {
        if (path == null || path.isBlank() || "/".equals(path)) {
            return "system";
        }

        var normalizedPath = path.startsWith("/") ? path.substring(1) : path;
        if (normalizedPath.isBlank()) {
            return "system";
        }

        var pathSegments = normalizedPath.split("/");
        return truncate(pathSegments[0], 80);
    }

    private String resolveAction(String httpMethod, String path) {
        var normalizedPath = path == null ? "" : path.toLowerCase(Locale.ROOT);

        if (normalizedPath.contains("/authenticate")) {
            return "AUTHENTICATE";
        }
        if (normalizedPath.contains("/logout")) {
            return "LOGOUT";
        }
        if (normalizedPath.contains("/change-password")) {
            return "CHANGE_PASSWORD";
        }
        if (normalizedPath.contains("/forgot-password")) {
            return "FORGOT_PASSWORD";
        }
        if (normalizedPath.contains("/reset-password")) {
            return "RESET_PASSWORD";
        }
        if (normalizedPath.contains("/sync")) {
            return "SYNC";
        }
        if (normalizedPath.contains("/export")) {
            return "EXPORT";
        }
        if (normalizedPath.contains("/import")) {
            return "IMPORT";
        }

        return switch (httpMethod.toUpperCase(Locale.ROOT)) {
            case "POST" -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            case "GET" -> isDetailEndpoint(path) ? "VIEW" : "LIST";
            default -> httpMethod.toUpperCase(Locale.ROOT);
        };
    }

    private boolean isDetailEndpoint(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }

        var segments = List.of(path.split("/")).stream()
                .filter(segment -> !segment.isBlank())
                .toList();

        if (segments.size() <= 1) {
            return false;
        }

        var lastSegment = segments.get(segments.size() - 1).toLowerCase(Locale.ROOT);
        return !List.of("search", "list", "all", "paginated", "modules").contains(lastSegment);
    }

    private UserActionAuditResult resolveResult(int httpStatus) {
        return httpStatus >= 200 && httpStatus < 400
                ? UserActionAuditResult.SUCCESS
                : UserActionAuditResult.ERROR;
    }

    private String resolveClientIp(HttpServletRequest request) {
        var forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return truncate(forwardedFor.split(",")[0].trim(), 120);
        }

        var realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return truncate(realIp.trim(), 120);
        }

        return truncate(request.getRemoteAddr(), 120);
    }

    private String sanitizePayload(String payload, String contentType) {
        if (payload == null || payload.isBlank()) {
            return null;
        }

        if (contentType != null) {
            var normalizedContentType = contentType.toLowerCase(Locale.ROOT);
            if (normalizedContentType.contains("multipart/")
                    || normalizedContentType.contains("octet-stream")
                    || normalizedContentType.contains("image/")
                    || normalizedContentType.contains("audio/")
                    || normalizedContentType.contains("video/")
                    || normalizedContentType.contains("application/pdf")) {
                return "[contenu binaire omis]";
            }
        }

        try {
            var jsonNode = objectMapper.readTree(payload);
            maskSensitiveFields(jsonNode);
            return truncate(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode), MAX_PAYLOAD_LENGTH);
        } catch (Exception ignored) {
            return truncate(maskSensitiveText(payload), MAX_PAYLOAD_LENGTH);
        }
    }

    private void maskSensitiveFields(JsonNode node) {
        if (node == null) {
            return;
        }

        if (node instanceof ObjectNode objectNode) {
            var fieldNames = objectNode.fieldNames();
            while (fieldNames.hasNext()) {
                var fieldName = fieldNames.next();
                var child = objectNode.get(fieldName);
                if (SENSITIVE_FIELDS.contains(fieldName.toLowerCase(Locale.ROOT))) {
                    objectNode.put(fieldName, "[REDACTED]");
                } else {
                    maskSensitiveFields(child);
                }
            }
            return;
        }

        if (node instanceof ArrayNode arrayNode) {
            for (JsonNode child : arrayNode) {
                maskSensitiveFields(child);
            }
        }
    }

    private String maskSensitiveText(String payload) {
        var sanitized = payload;
        for (var field : SENSITIVE_FIELDS) {
            sanitized = sanitized.replaceAll("(?i)(\"" + field + "\"\\s*:\\s*\")[^\"]*(\")", "$1[REDACTED]$2");
        }
        return sanitized;
    }

    private String readPayload(byte[] payload, String characterEncoding) {
        if (payload == null || payload.length == 0) {
            return null;
        }

        Charset charset = StandardCharsets.UTF_8;
        if (characterEncoding != null && !characterEncoding.isBlank()) {
            try {
                charset = Charset.forName(characterEncoding);
            } catch (Exception ignored) {
                charset = StandardCharsets.UTF_8;
            }
        }

        return new String(payload, charset);
    }

    private String extractJsonField(String payload, String fieldName) {
        if (payload == null || payload.isBlank()) {
            return null;
        }

        try {
            var root = objectMapper.readTree(payload);
            var field = root.get(fieldName);
            if (field == null || field.isNull()) {
                return null;
            }
            return field.asText(null);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Integer resolveIntegerAttribute(Object attribute) {
        if (attribute instanceof Integer integerValue) {
            return integerValue;
        }

        if (attribute instanceof Number numberValue) {
            return numberValue.intValue();
        }

        return null;
    }

    private String normalizeStringAttribute(Object attribute) {
        if (!(attribute instanceof String stringValue) || stringValue.isBlank()) {
            return null;
        }

        return stringValue.trim();
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }

        return value.substring(0, maxLength) + "...";
    }

    private record UserContext(Integer userId, String userFullName, String userEmail) {
    }
}
