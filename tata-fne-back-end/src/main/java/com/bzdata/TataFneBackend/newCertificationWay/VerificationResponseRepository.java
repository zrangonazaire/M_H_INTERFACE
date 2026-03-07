package com.bzdata.TataFneBackend.newCertificationWay;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationResponseRepository
        extends JpaRepository<VerificationRefundResponse, Long> {

    boolean existsByReference(String reference);
        // Tous les refunds d’une facture
    List<VerificationRefundResponse> findByInvoiceIdOrderByCreatedAtDesc(String invoiceId);
     List<VerificationRefundResponse> findByInvoiceIdInOrderByCreatedAtDesc(Collection<String> invoiceIds);


    // Tous les refunds (ordre décroissant)
    List<VerificationRefundResponse> findAllByOrderByCreatedAtDesc();
}

