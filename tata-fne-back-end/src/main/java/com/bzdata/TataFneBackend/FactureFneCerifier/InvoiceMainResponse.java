package com.bzdata.TataFneBackend.FactureFneCerifier;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

//@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class InvoiceMainResponse {
 private String ncc;
    private String reference;
    private String token;

    private boolean warning;

    @JsonProperty("balance_sticker")
    private Integer balanceSticker;

    private InvoiceFneCertify invoice;
}
