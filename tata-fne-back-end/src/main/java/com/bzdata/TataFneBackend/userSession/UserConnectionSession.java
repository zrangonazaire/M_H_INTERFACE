package com.bzdata.TataFneBackend.userSession;

import com.bzdata.TataFneBackend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
        name = "user_connection_session",
        indexes = {
                @Index(name = "idx_user_connection_token_fingerprint", columnList = "tokenFingerprint", unique = true),
                @Index(name = "idx_user_connection_status", columnList = "status"),
                @Index(name = "idx_user_connection_connected_at", columnList = "connectedAt")
        }
)
public class UserConnectionSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 64, unique = true)
    private String tokenFingerprint;

    @Column(nullable = false)
    private LocalDateTime connectedAt;

    @Column(nullable = false)
    private LocalDateTime lastActivityAt;

    @Column
    private LocalDateTime disconnectedAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserConnectionStatus status;

    @Column(length = 120)
    private String clientIp;

    @Column(length = 512)
    private String userAgent;

    @Column(length = 64)
    private String logoutReason;
}
