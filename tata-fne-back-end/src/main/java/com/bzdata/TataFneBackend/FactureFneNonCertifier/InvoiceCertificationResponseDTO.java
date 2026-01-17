package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import com.fasterxml.jackson.annotation.JsonProperty;

public record InvoiceCertificationResponseDTO(
        String ncc,
        String reference,
        String token,
        boolean warning,

        @JsonProperty("balance_sticker")
        int balanceSticker,

        CertifiedInvoiceDTO invoice
) {}
