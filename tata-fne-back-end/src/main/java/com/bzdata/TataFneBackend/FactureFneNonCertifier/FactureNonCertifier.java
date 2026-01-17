package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.bzdata.TataFneBackend.LigneFactureFne.LigneFactureFne;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Entity
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class FactureNonCertifier {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String invoiceNumber;
    @CreatedDate
    private Instant invoiceDate;
    @CreatedBy
    private String utilisateurCreateur;
    @LastModifiedDate
    private Instant dateDeModification;

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
    private String commercialMessage;
    private String footer;

    private String foreignCurrency;

    @Builder.Default
    private BigDecimal foreignCurrencyRate = BigDecimal.ZERO;

    // Remise globale facture (si ton JSON l’envoie au niveau facture)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "is_rne")
    private boolean rneFlag = false;
    @Builder.Default
    @Column(name = "status_certification")
    private String factureCertifStatus="En attente de certification ";

    private String rne;

    // ✅ Invoice -> Items
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LigneFactureFne> items = new ArrayList<>();

    // Helpers relationnels
    public void addItem(LigneFactureFne item) {
        items.add(item);
        item.setInvoice(this);
    }

    public void removeItem(LigneFactureFne item) {
        items.remove(item);
        item.setInvoice(null);
    }
}
