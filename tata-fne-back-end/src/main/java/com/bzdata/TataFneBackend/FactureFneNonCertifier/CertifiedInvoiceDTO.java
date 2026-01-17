package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CertifiedInvoiceDTO(
        String id,
        String parentId,
        String parentReference,

        String token,
        String reference,

        String type,
        String subtype,

        Instant date,

        String paymentMethod,

        BigDecimal amount,
        BigDecimal vatAmount,
        BigDecimal fiscalStamp,
        BigDecimal discount,

        String clientNcc,
        String clientCompanyName,
        String clientPhone,
        String clientEmail,
        String clientTerminal,
        String clientMerchantName,
        String clientRccm,
        String clientSellerName,
        String clientEstablishment,
        String clientPointOfSale,

        String status,
        String template,

        String description,
        String footer,
        String commercialMessage,

        String foreignCurrency,
        BigDecimal foreignCurrencyRate,

        boolean isRne,
        String rne,

        String source,

        Instant createdAt,
        Instant updatedAt,

        List<CertifiedInvoiceItemDTO> items
) {}
