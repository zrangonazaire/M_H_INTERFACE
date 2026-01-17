package com.bzdata.TataFneBackend.LigneFactureFne;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import com.bzdata.TataFneBackend.CustomTaxe.CustomTaxe;
import com.bzdata.TataFneBackend.FactureFneNonCertifier.FactureNonCertifier;

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
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "invoice_items")
@Builder
public class LigneFactureFne {
  @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Lien vers Invoice
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private FactureNonCertifier invoice;

    // ✅ taxes standards sur la ligne: ["TVA", "TVAC", ...]
    @ElementCollection
    @CollectionTable(name = "item_taxes", joinColumns = @JoinColumn(name = "item_id"))
    @Column(name = "tax", nullable = false)
    @Builder.Default
    private List<String> taxes = new ArrayList<>();

    // ✅ customTaxes sur la ligne
    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CustomTaxe> customTaxes = new ArrayList<>();

    private String reference;

    @Column(length = 500)
    private String description;

    @Builder.Default
    private BigDecimal quantity = BigDecimal.ZERO;

    // champ JSON: amount
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    // remise ligne
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    private String measurementUnit;

    // Helpers relationnels
    public void addCustomTax(CustomTaxe tax) {
        customTaxes.add(tax);
        tax.setItem(this);
    }

    public void removeCustomTax(CustomTaxe tax) {
        customTaxes.remove(tax);
        tax.setItem(null);
    }
}
