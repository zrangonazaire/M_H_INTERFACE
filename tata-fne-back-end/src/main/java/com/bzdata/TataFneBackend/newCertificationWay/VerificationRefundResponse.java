package com.bzdata.TataFneBackend.newCertificationWay;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "verification_refund_response")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerificationRefundResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;
    private String reference;

    @Column(name = "ncc", length = 50)
    private String ncc;

    @Column(name = "token", length = 255)
    private String token;

    @Column(name = "warning")
    private Boolean warning;

    @Column(name = "balance_sticker")
    private Integer balanceSticker;

    @Column(name = "invoice_id", nullable = false)
    private String invoiceId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
