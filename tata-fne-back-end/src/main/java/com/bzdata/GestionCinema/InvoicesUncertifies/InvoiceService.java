package com.bzdata.GestionCinema.InvoicesUncertifies;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    public InvoiceService(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    @Transactional
    public InvoiceUncertify saveFromDto(InvoiceDto dto) {
        InvoiceUncertify inv = new InvoiceUncertify();
        inv.setInvoiceType(dto.invoiceType);
        inv.setPaymentMethod(dto.paymentMethod);
        inv.setTemplate(dto.template);

        inv.setClientNcc(dto.clientNcc);
        inv.setClientCompanyName(dto.clientCompanyName);
        inv.setClientPhone(dto.clientPhone);
        inv.setClientEmail(dto.clientEmail);
        inv.setClientSellerName(dto.clientSellerName);

        inv.setPointOfSale(dto.pointOfSale);
        inv.setEstablishment(dto.establishment);
        inv.setCommercialMessage(dto.commercialMessage);
        inv.setFooter(dto.footer);

        inv.setForeignCurrency(dto.foreignCurrency);
        inv.setForeignCurrencyRate(dto.foreignCurrencyRate);
        inv.setDiscount(dto.discount);

        // taxes custom niveau facture
        if (dto.customTaxes != null) {
            for (CustomTaxDto t : dto.customTaxes) {
                CustomUncertifyTax tax = new CustomUncertifyTax();
                tax.setName(t.name);
                tax.setAmount(t.amount);
                inv.addCustomTax(tax);
            }
        }

        // items
        if (dto.items != null) {
            for (InvoiceItemDto it : dto.items) {
                InvoiceUncertifyItem item = new InvoiceUncertifyItem();
                item.setReference(it.reference);
                item.setDescription(it.description);
                item.setQuantity(it.quantity);
                item.setAmount(it.amount);
                item.setDiscount(it.discount);
                item.setMeasurementUnit(it.measurementUnit);

                if (it.taxes != null) item.getTaxes().addAll(it.taxes);

                // taxes custom niveau item
                if (it.customTaxes != null) {
                    for (CustomTaxDto t : it.customTaxes) {
                        CustomUncertifyTax tax = new CustomUncertifyTax();
                        tax.setName(t.name);
                        tax.setAmount(t.amount);
                        item.addCustomTax(tax);
                    }
                }

                inv.addItem(item);
            }
        }

        return invoiceRepository.save(inv);
    }
}

