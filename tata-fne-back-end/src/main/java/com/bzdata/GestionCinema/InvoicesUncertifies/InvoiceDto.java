package com.bzdata.GestionCinema.InvoicesUncertifies;

import java.math.BigDecimal;
import java.util.List;

public class InvoiceDto {
    public String invoiceType;
    public String paymentMethod;
    public String template;

    public String clientNcc;
    public String clientCompanyName;
    public String clientPhone;
    public String clientEmail;
    public String clientSellerName;

    public String pointOfSale;
    public String establishment;
    public String commercialMessage;
    public String footer;

    public String foreignCurrency;
    public BigDecimal foreignCurrencyRate;

    public List<InvoiceItemDto> items;
    public List<CustomTaxDto> customTaxes;

    public BigDecimal discount;
}


