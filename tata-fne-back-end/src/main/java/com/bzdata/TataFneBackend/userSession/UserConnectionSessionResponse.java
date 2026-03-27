package com.bzdata.TataFneBackend.userSession;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UserConnectionSessionResponse {
    private Long id;
    private Integer userId;
    private String userFullName;
    private String userEmail;
    private LocalDateTime connectedAt;
    private LocalDateTime lastActivityAt;
    private LocalDateTime disconnectedAt;
    private LocalDateTime expiresAt;
    private String status;
    private long remainingMs;
    private boolean currentSession;
    private String clientIp;
    private String userAgent;
    private String logoutReason;
}
