package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.util.List;

import com.bzdata.TataFneBackend.CustomTaxe.CustomTaxDTO;
import com.bzdata.TataFneBackend.LigneFactureFne.LigneFactureDTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record InvoiceDTO(

        @NotBlank(message = "invoiceType is required")
        String invoiceType,
        @NotBlank(message = "paymentMethod is required")
        String paymentMethod,
        @NotBlank(message = "template is required")
        @Pattern(regexp = "^(B2B|B2F|B2G|B2C)$", message = "template must be one of: B2B, B2F, B2G, B2C")
        String template,

        String clientNcc,
        @NotBlank(message = "clientCompanyName is required")
        String clientCompanyName,
        @NotBlank(message = "clientPhone is required")
        String clientPhone,
        @NotBlank(message = "clientEmail is required")
        @Email(message = "clientEmail must be valid")
        String clientEmail,
        String clientSellerName,

        @NotBlank(message = "pointOfSale is required")
        String pointOfSale,
        @NotBlank(message = "establishment is required")
        String establishment,
        String commercialMessage,
        String footer,

        String foreignCurrency,
        @PositiveOrZero(message = "foreignCurrencyRate must be >= 0")
        double foreignCurrencyRate,

        // ✅ lignes
        @NotNull(message = "items is required")
        @Size(min = 1, message = "items must contain at least one item")
        @Valid
        List<LigneFactureDTO> items,

        @Valid
        List<CustomTaxDTO> customTaxes,

        // ✅ remise globale facture (si tu l’envoies toujours)
        @PositiveOrZero(message = "discount must be >= 0")
        double discount,

        Boolean isRne,
        String rne) {
}
