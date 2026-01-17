package com.bzdata.GestionCinema.InvoicesUncertifies;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class InvoiceUncertify {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String invoiceType;
    private String paymentMethod;
    private String template;

    private String clientNcc;
    private String clientCompanyName;
    private String clientPhone;
    private String clientEmail;
    private String clientSellerName;

    private String pointOfSale;
    private String establishment;

    @Column(length = 500)
    private String commercialMessage;

    @Column(length = 500)
    private String footer;

    private String foreignCurrency;
    private BigDecimal foreignCurrencyRate;

    private BigDecimal discount; // discount global

    @OneToMany(mappedBy = "invoice")
    private List<InvoiceUncertifyItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "invoice")
    private List<CustomUncertifyTax> customTaxes = new ArrayList<>();

    // helpers
    public void addItem(InvoiceUncertifyItem item) {
        items.add(item);
        item.setInvoice(this);
    } 

   public void addCustomTax(CustomUncertifyTax tax) {
        customTaxes.add(tax);
        tax.setInvoice(this);
    } 

    // getters/setters...

}
