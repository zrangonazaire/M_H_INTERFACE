package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.time.Instant;

public record FactureNonCertifierListDTO(
        Long id,
        String invoiceNumber,
        Instant invoiceDate,
        String clientCompanyName,
        String clientNcc,
        String invoiceType,
        String paymentMethod,
        String factureCertifStatus,
        Instant dateDeModification
) {
}
