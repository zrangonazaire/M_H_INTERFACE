package com.bzdata.TataFneBackend.newCertificationWay;

import com.bzdata.TataFneBackend.CustomTaxe.CustomTaxe;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InvoiceSignRequest {

 private String invoiceType;
    private String paymentMethod;
    private String template;

    private String numeroFacture;
    private String clientNcc;
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

    private double discount;        // 20
}
