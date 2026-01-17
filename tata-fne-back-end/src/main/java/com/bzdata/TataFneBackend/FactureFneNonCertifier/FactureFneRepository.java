package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FactureFneRepository extends JpaRepository<FactureNonCertifier, Long> {
    Optional<FactureNonCertifier> findByInvoiceNumber(String invoiceNumber);

    List<FactureNonCertifier> findAllByOrderByInvoiceDateDesc();
}
