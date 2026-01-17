package com.bzdata.TataFneBackend.FactureFneCerifier;

import java.time.OffsetDateTime;

import lombok.Data;
@Data
public class InvoiceFneCertify {

     private String id;
        private String parentId;
        private String parentReference;

        private String token;
        private String reference;

        private String type;
        private String subtype;

        private OffsetDateTime date;

        private String paymentMethod;

        private Long amount;
        private Long vatAmount;
        private Long fiscalStamp;
        private Integer discount;

        private String clientNcc;
        private String clientCompanyName;
        private String clientPhone;
        private String clientEmail;
        private String clientTerminal;
        private String clientMerchantName;
        private String clientRccm;
        private String clientSellerName;
        private String clientEstablishment;
        private String clientPointOfSale;

        private String status;
        private String template;

        private String description;
        private String footer;
        private String commercialMessage;

        private String foreignCurrency;
        private Integer foreignCurrencyRate;

        private Boolean isRne;
        private String rne;

        private String source;

        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;

        // private List<Item> items;

        // private List<InvoiceCustomTax> customTaxes;
}
