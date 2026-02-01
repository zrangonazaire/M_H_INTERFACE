package com.bzdata.TataFneBackend.newCertificationWay;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationResponseRepository
        extends JpaRepository<VerificationRefundResponse, Long> {

    boolean existsByReference(String reference);
        // Tous les refunds d’une facture
    List<VerificationRefundResponse> findByInvoiceIdOrderByCreatedAtDesc(String invoiceId);

    // Tous les refunds (ordre décroissant)
    List<VerificationRefundResponse> findAllByOrderByCreatedAtDesc();
}

