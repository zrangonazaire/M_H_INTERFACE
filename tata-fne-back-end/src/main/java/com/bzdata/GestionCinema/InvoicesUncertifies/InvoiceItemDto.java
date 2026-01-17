/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

package com.bzdata.GestionCinema.InvoicesUncertifies;


import java.math.BigDecimal;
import java.util.List;

public class InvoiceItemDto {
    public List<String> taxes;
    public List<CustomTaxDto> customTaxes;

    public String reference;
    public String description;
    public BigDecimal quantity;
    public BigDecimal amount;
    public BigDecimal discount;
    public String measurementUnit;
}
