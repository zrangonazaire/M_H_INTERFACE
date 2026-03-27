package com.bzdata.TataFneBackend.userSession;

import com.bzdata.TataFneBackend.user.User;
import com.bzdata.TataFneBackend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserConnectionSessionService {

    private static final int MAX_LIMIT = 100;
    private static final int DEFAULT_LIMIT = 20;

    private final UserConnectionSessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Transactional
    public void registerLogin(User user, String jwtToken, String clientIp, String userAgent, LocalDateTime expiresAt) {
        expireStaleSessions();

        var now = LocalDateTime.now();
        var fingerprint = fingerprint(jwtToken);

        var session = sessionRepository.findByTokenFingerprint(fingerprint)
                .orElseGet(() -> UserConnectionSession.builder()
                        .tokenFingerprint(fingerprint)
                        .build());

        session.setUser(user);
        session.setConnectedAt(now);
        session.setLastActivityAt(now);
        session.setDisconnectedAt(null);
        session.setExpiresAt(expiresAt);
        session.setStatus(UserConnectionStatus.ACTIVE);
        session.setClientIp(truncate(clientIp, 120));
        session.setUserAgent(truncate(userAgent, 512));
        session.setLogoutReason(null);

        sessionRepository.save(session);
    }

    @Transactional
    public void registerActivity(String authorizationHeader, String clientIp, String userAgent) {
        expireStaleSessions();

        extractToken(authorizationHeader)
                .flatMap(token -> sessionRepository.findByTokenFingerprint(fingerprint(token)))
                .ifPresent(session -> {
                    if (session.getStatus() != UserConnectionStatus.ACTIVE) {
                        return;
                    }

                    session.setLastActivityAt(LocalDateTime.now());
                    session.setClientIp(truncate(clientIp, 120));
                    session.setUserAgent(truncate(userAgent, 512));
                    sessionRepository.save(session);
                });
    }

    @Transactional
    public void registerLogout(String authorizationHeader, String logoutReason, String clientIp, String userAgent) {
        expireStaleSessions();

        extractToken(authorizationHeader)
                .flatMap(token -> sessionRepository.findByTokenFingerprint(fingerprint(token)))
                .ifPresent(session -> {
                    var now = LocalDateTime.now();
                    session.setLastActivityAt(now);
                    session.setDisconnectedAt(now);
                    session.setStatus(UserConnectionStatus.LOGGED_OUT);
                    session.setLogoutReason(truncate(normalizeLogoutReason(logoutReason), 64));
                    session.setClientIp(truncate(clientIp, 120));
                    session.setUserAgent(truncate(userAgent, 512));
                    sessionRepository.save(session);
                });
    }

    @Transactional
    public List<UserConnectionSessionResponse> getRecentSessions(
            Authentication authentication,
            String authorizationHeader,
            int limit
    ) {
        expireStaleSessions();

        var requester = resolveAuthenticatedUser(authentication);
        var currentFingerprint = extractToken(authorizationHeader)
                .map(this::fingerprint)
                .orElse(null);
        var pageable = PageRequest.of(0, normalizeLimit(limit), Sort.by(Sort.Direction.DESC, "connectedAt"));

        var page = hasAdminRole(requester)
                ? sessionRepository.findAll(pageable)
                : sessionRepository.findByUser_Id(requester.getId(), pageable);

        return page.getContent().stream()
                .map(session -> toResponse(session, currentFingerprint))
                .toList();
    }

    @Transactional
    public void expireStaleSessions() {
        var now = LocalDateTime.now();
        var expiredSessions = sessionRepository.findByStatusAndExpiresAtBefore(UserConnectionStatus.ACTIVE, now);

        for (var session : expiredSessions) {
            session.setStatus(UserConnectionStatus.EXPIRED);
            session.setDisconnectedAt(session.getDisconnectedAt() == null ? session.getExpiresAt() : session.getDisconnectedAt());
            session.setLogoutReason("TOKEN_EXPIRED");
        }

        if (!expiredSessions.isEmpty()) {
            sessionRepository.saveAll(expiredSessions);
        }
    }

    public String resolveClientIp(jakarta.servlet.http.HttpServletRequest request) {
        var forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        var realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    private UserConnectionSessionResponse toResponse(UserConnectionSession session, String currentFingerprint) {
        var referenceTime = session.getDisconnectedAt() != null ? session.getDisconnectedAt() : LocalDateTime.now();
        var remainingMs = Math.max(Duration.between(referenceTime, session.getExpiresAt()).toMillis(), 0L);

        return UserConnectionSessionResponse.builder()
                .id(session.getId())
                .userId(session.getUser().getId())
                .userFullName(session.getUser().getFullName())
                .userEmail(session.getUser().getEmail())
                .connectedAt(session.getConnectedAt())
                .lastActivityAt(session.getLastActivityAt())
                .disconnectedAt(session.getDisconnectedAt())
                .expiresAt(session.getExpiresAt())
                .status(session.getStatus().name())
                .remainingMs(remainingMs)
                .currentSession(currentFingerprint != null && currentFingerprint.equals(session.getTokenFingerprint()))
                .clientIp(session.getClientIp())
                .userAgent(session.getUserAgent())
                .logoutReason(session.getLogoutReason())
                .build();
    }

    private User resolveAuthenticatedUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }

        if (authentication != null && authentication.getName() != null) {
            return userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));
        }

        throw new UsernameNotFoundException("Utilisateur authentifie introuvable");
    }

    private boolean hasAdminRole(User user) {
        return user.getRoles() != null && user.getRoles().stream()
                .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName()));
    }

    private java.util.Optional<String> extractToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return java.util.Optional.empty();
        }

        return java.util.Optional.of(authorizationHeader.substring(7));
    }

    private String fingerprint(String rawToken) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Impossible de calculer l'empreinte du token", exception);
        }
    }

    private int normalizeLimit(int requestedLimit) {
        if (requestedLimit <= 0) {
            return DEFAULT_LIMIT;
        }

        return Math.min(requestedLimit, MAX_LIMIT);
    }

    private String normalizeLogoutReason(String logoutReason) {
        if (logoutReason == null || logoutReason.isBlank()) {
            return "MANUAL";
        }

        return logoutReason.trim().toUpperCase(Locale.ROOT);
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }

        return value.substring(0, maxLength);
    }
}
