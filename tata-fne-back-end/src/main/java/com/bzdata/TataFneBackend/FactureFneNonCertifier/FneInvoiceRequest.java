package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.util.List;

import com.bzdata.TataFneBackend.CustomTaxe.CustomTaxDTO;
import com.bzdata.TataFneBackend.LigneFactureFne.LigneFactureDTO;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FneInvoiceRequest(
        String invoiceType,
        String paymentMethod,
        String template,

        String clientNcc,
        String clientCompanyName,
        String clientPhone,
        String clientEmail,
        String clientSellerName,

        String pointOfSale,
        String establishment,
        String commercialMessage,
        String footer,

        String foreignCurrency,
        double foreignCurrencyRate,

        List<LigneFactureDTO> items,
        List<CustomTaxDTO> customTaxes,

        double discount,

        boolean isRne,
        String rne) {
}
