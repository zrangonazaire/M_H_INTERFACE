package com.bzdata.TataFneBackend.auditTrail;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UserActionAuditResponse {

    private final Long id;
    private final LocalDateTime occurredAt;
    private final Integer userId;
    private final String userFullName;
    private final String userEmail;
    private final String module;
    private final String action;
    private final String endpoint;
    private final String httpMethod;
    private final String result;
    private final Integer httpStatus;
    private final Long durationMs;
    private final String clientIp;
    private final String requestPayload;
    private final String responsePayload;
}
