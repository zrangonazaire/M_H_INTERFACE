package com.bzdata.TataFneBackend.newCertificationWay;

import com.bzdata.TataFneBackend.CustomTaxe.CustomTaxe;
import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.*;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InvoiceSignRequest {

    @NotNull(message = "Le type de facture est requis!")
    @NotBlank(message = "Le type de facture ne peut pas être vide!")
    private String invoiceType;
    @NotNull(message = "Le mode de paiement est requis!")
    @NotBlank(message = "Le mode de paiement ne peut pas être vide!")
    private String paymentMethod;
    @NotNull(message = "Le type de client est requis!")
    @NotBlank(message = "Le type de client ne peut pas être vide!")
    private String template;
    @NotNull(message = "Le numéro de facture est requis!")
    @NotBlank(message = "Le numéro de facture ne peut pas être vide!")
    private String numeroFacture;
    private String clientNcc;
    @NotNull(message = "Le nom du client est requis!")
    @NotBlank(message = "Le nom du client ne peut pas être vide!")
    private String clientCompanyName;
    private String clientPhone;
    private String clientEmail;
    private String clientSellerName;

    private String pointOfSale;
    private String establishment;

    private String commercialMessage;
    private String footer;

    private String foreignCurrency;
    private double foreignCurrencyRate;

    private List<InvoiceItem> items;

    private List<CustomTaxe> customTaxes;

    private double discount; // 20
}
