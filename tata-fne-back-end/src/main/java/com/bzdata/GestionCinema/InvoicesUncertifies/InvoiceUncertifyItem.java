package com.bzdata.GestionCinema.InvoicesUncertifies;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
public class InvoiceUncertifyItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String reference;

    @Column(length = 255)
    private String description;

    private BigDecimal quantity;
    private BigDecimal amount;
    private BigDecimal discount;
    private String measurementUnit;

    @ElementCollection
    @CollectionTable(name = "invoice_item_taxes", joinColumns = @JoinColumn(name = "item_id"))
    @Column(name = "tax_code")
    private final List<String> taxes = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private InvoiceUncertify invoice;

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CustomUncertifyTax> customTaxes = new ArrayList<>();

     public void addCustomTax(CustomUncertifyTax tax) {
        customTaxes.add(tax);
        tax.setItem(this);
    } 

    // getters/setters...
}
