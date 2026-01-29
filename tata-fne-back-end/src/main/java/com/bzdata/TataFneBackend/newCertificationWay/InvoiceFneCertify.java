package com.bzdata.TataFneBackend.newCertificationWay;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "invoice_fne_certify")
public class InvoiceFneCertify {


    @Id
    @Column(length = 36)
    private String id; // UUID venant de l'API
    private String invoiceType;
//TODO ajouter le rendre unique
   private String numeroFacture;

    private String utilisateurCreateur;

    private String parentId;
    private String parentReference;

    @Column(length = 100)
    private String token;

    @Column(length = 60)
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
    private String clientTaxRegime;
    private String status;
    private String template;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String footer;

    @Column(columnDefinition = "TEXT")
    private String commercialMessage;

    private String foreignCurrency;
    private Integer foreignCurrencyRate;

    private Boolean isRne;
    private String rne;

    private String source;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Long totalBeforeTaxes;
    private Long totalDiscounted;
    private Long totalTaxes;
    private Long totalAfterTaxes;
    private Long totalCustomTaxes;
    private Long totalDue;

    /* ================= Relations ================= */
    @OneToMany(mappedBy = "invoice")
    private List<Item> items = new ArrayList<>();

    @OneToMany(mappedBy = "invoice")
    private List<InvoiceCertifierCustomTax> customTaxes = new ArrayList<>();
}
