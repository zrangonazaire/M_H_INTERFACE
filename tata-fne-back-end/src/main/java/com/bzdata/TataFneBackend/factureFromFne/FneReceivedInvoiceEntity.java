package com.bzdata.TataFneBackend.factureFromFne;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "fne_received_invoice",
        uniqueConstraints = @UniqueConstraint(name = "uk_fne_received_invoice_external_id", columnNames = "external_id"),
        indexes = {
                @Index(name = "idx_fne_received_invoice_date", columnList = "invoice_date"),
                @Index(name = "idx_fne_received_invoice_reference", columnList = "reference"),
                @Index(name = "idx_fne_received_invoice_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FneReceivedInvoiceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "external_id", nullable = false, length = 64)
    private String externalId;

    @Column(name = "external_token", length = 64)
    private String externalToken;

    @Column(length = 80)
    private String reference;

    @Column(name = "parent_id", length = 64)
    private String parentId;

    @Column(name = "parent_reference", length = 80)
    private String parentReference;

    @Column(length = 20)
    private String type;

    @Column(length = 20)
    private String subtype;

    @Column(name = "invoice_date")
    private Instant invoiceDate;

    @Column(precision = 20, scale = 6)
    private BigDecimal amount;

    @Column(name = "total_due", precision = 20, scale = 6)
    private BigDecimal totalDue;

    @Column(name = "total_after_taxes", precision = 20, scale = 6)
    private BigDecimal totalAfterTaxes;

    @Column(length = 20)
    private String status;

    @Column(name = "client_ncc", length = 30)
    private String clientNcc;

    @Column(name = "client_company_name", length = 255)
    private String clientCompanyName;

    @Column(name = "company_ncc", length = 30)
    private String companyNcc;

    @Column(name = "company_name", length = 255)
    private String companyName;

    @Column(length = 30)
    private String source;

    @Column(name = "raw_payload", columnDefinition = "TEXT", nullable = false)
    private String rawPayload;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (fetchedAt == null) {
            fetchedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
