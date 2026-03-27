package com.bzdata.TataFneBackend.auditTrail;

import com.bzdata.TataFneBackend.user.User;
import com.bzdata.TataFneBackend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserActionAuditService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private final UserActionAuditRepository auditRepository;
    private final UserRepository userRepository;

    @Transactional
    public void recordAction(UserActionAuditCommand command) {
        auditRepository.save(UserActionAudit.builder()
                .occurredAt(command.getOccurredAt())
                .userId(command.getUserId())
                .userFullName(truncate(command.getUserFullName(), 160))
                .userEmail(truncate(command.getUserEmail(), 160))
                .module(truncate(command.getModule(), 80))
                .action(truncate(command.getAction(), 80))
                .endpoint(truncate(command.getEndpoint(), 255))
                .httpMethod(truncate(command.getHttpMethod(), 12))
                .result(command.getResult())
                .httpStatus(command.getHttpStatus())
                .durationMs(command.getDurationMs())
                .clientIp(truncate(command.getClientIp(), 120))
                .requestPayload(command.getRequestPayload())
                .responsePayload(command.getResponsePayload())
                .build());
    }

    @Transactional(readOnly = true)
    public Page<UserActionAuditResponse> findAuditLogs(
            Authentication authentication,
            int page,
            int size,
            String search,
            String module,
            String httpMethod,
            String result,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        var requester = resolveAuthenticatedUser(authentication);
        var specification = buildSpecification(requester, search, module, httpMethod, result, fromDate, toDate);
        var pageable = PageRequest.of(
                normalizePage(page),
                normalizePageSize(size),
                Sort.by(Sort.Direction.DESC, "occurredAt")
        );

        return auditRepository.findAll(specification, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<String> findAvailableModules(Authentication authentication) {
        var requester = resolveAuthenticatedUser(authentication);

        return hasAdminRole(requester)
                ? auditRepository.findDistinctModules()
                : auditRepository.findDistinctModulesByUserId(requester.getId());
    }

    private UserActionAuditResponse toResponse(UserActionAudit audit) {
        return UserActionAuditResponse.builder()
                .id(audit.getId())
                .occurredAt(audit.getOccurredAt())
                .userId(audit.getUserId())
                .userFullName(audit.getUserFullName())
                .userEmail(audit.getUserEmail())
                .module(audit.getModule())
                .action(audit.getAction())
                .endpoint(audit.getEndpoint())
                .httpMethod(audit.getHttpMethod())
                .result(audit.getResult().name())
                .httpStatus(audit.getHttpStatus())
                .durationMs(audit.getDurationMs())
                .clientIp(audit.getClientIp())
                .requestPayload(audit.getRequestPayload())
                .responsePayload(audit.getResponsePayload())
                .build();
    }

    private Specification<UserActionAudit> buildSpecification(
            User requester,
            String search,
            String module,
            String httpMethod,
            String result,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        Specification<UserActionAudit> specification = Specification.where(null);

        if (!hasAdminRole(requester)) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("userId"), requester.getId()));
        }

        if (StringUtils.hasText(search)) {
            var searchValue = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            specification = specification.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("userFullName"), "")), searchValue),
                    criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("userEmail"), "")), searchValue),
                    criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("module"), "")), searchValue),
                    criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("action"), "")), searchValue),
                    criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("endpoint"), "")), searchValue),
                    criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("clientIp"), "")), searchValue)
            ));
        }

        if (StringUtils.hasText(module)) {
            var normalizedModule = module.trim().toLowerCase(Locale.ROOT);
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(criteriaBuilder.lower(root.get("module")), normalizedModule));
        }

        if (StringUtils.hasText(httpMethod)) {
            var normalizedMethod = httpMethod.trim().toUpperCase(Locale.ROOT);
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("httpMethod"), normalizedMethod));
        }

        if (StringUtils.hasText(result)) {
            var normalizedResult = result.trim().toUpperCase(Locale.ROOT);
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("result"), UserActionAuditResult.valueOf(normalizedResult)));
        }

        if (fromDate != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("occurredAt"), fromDate.atStartOfDay()));
        }

        if (toDate != null) {
            var inclusiveToDate = toDate.plusDays(1).atStartOfDay().minusNanos(1);
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.lessThanOrEqualTo(root.get("occurredAt"), inclusiveToDate));
        }

        return specification;
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

    private int normalizePage(int page) {
        return Math.max(page, 0);
    }

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }

        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }

        return value.substring(0, maxLength);
    }
}
