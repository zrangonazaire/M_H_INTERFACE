package com.bzdata.TataFneBackend.newCertificationWay;


import lombok.*;

import java.util.List;

import com.bzdata.TataFneBackend.CustomTaxe.CustomTaxe;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class InvoiceItem {
  private List<String> taxes;

    private List<CustomTaxe> customTaxes;

    private String reference;
    private String description;

    private int quantity;
    private double amount;
    private double discount;

    private String measurementUnit;
}
