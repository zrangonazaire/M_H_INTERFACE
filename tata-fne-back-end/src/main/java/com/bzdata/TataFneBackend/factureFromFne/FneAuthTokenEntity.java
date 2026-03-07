package com.bzdata.TataFneBackend.factureFromFne;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "fne_auth_token", uniqueConstraints = @UniqueConstraint(name = "uk_fne_username", columnNames = "username"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FneAuthTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 50)
    private String username;

    @Lob
    @Column(nullable = false)
    private String token;

    @Lob
    @Column(name = "encrypted_password")
    private String encryptedPassword;

    private Instant issuedAt;
    private Instant expiresAt;

    // optionnel: tracer la dernière connexion
    private Instant lastLoginAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
