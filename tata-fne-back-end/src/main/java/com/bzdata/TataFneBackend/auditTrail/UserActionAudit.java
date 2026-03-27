package com.bzdata.TataFneBackend.auditTrail;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "user_action_audit",
        indexes = {
                @Index(name = "idx_user_action_audit_occurred_at", columnList = "occurredAt"),
                @Index(name = "idx_user_action_audit_user_id", columnList = "userId"),
                @Index(name = "idx_user_action_audit_module", columnList = "module"),
                @Index(name = "idx_user_action_audit_result", columnList = "result")
        }
)
public class UserActionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    @Column
    private Integer userId;

    @Column(length = 160)
    private String userFullName;

    @Column(length = 160)
    private String userEmail;

    @Column(nullable = false, length = 80)
    private String module;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(nullable = false, length = 12)
    private String httpMethod;

    @Column(nullable = false, length = 255)
    private String endpoint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserActionAuditResult result;

    @Column(nullable = false)
    private Integer httpStatus;

    @Column(nullable = false)
    private Long durationMs;

    @Column(length = 120)
    private String clientIp;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String requestPayload;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String responsePayload;
}
