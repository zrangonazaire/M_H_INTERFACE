package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bzdata.TataFneBackend.newCertificationWay.InvoiceCertificationService;
import com.bzdata.TataFneBackend.newCertificationWay.VerificationRefundResponse;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("invoices")
@Tag(name = "Factures non certifiees")
@RequiredArgsConstructor
public class FactureFneController {
    private final FactureFneService factureFneService;
    private final InvoiceCertificationService invoiceCertificationService;

    @GetMapping
    public List<FactureNonCertifierListDTO> getAllInvoices() {
        return factureFneService.getAllInvoices();
    }

    @PostMapping("/certify-mass")
    public List<InvoiceCertificationResponseDTO> certifyEnMasse(@RequestBody MassCertificationRequest request)
            throws Exception {
        if (request == null || request.invoiceIds() == null || request.invoiceIds().isEmpty()) {
            throw new IllegalArgumentException("invoiceIds must not be empty");
        }
        return factureFneService.certifyEnMasseByIds(request.invoiceIds());
    }

    @PostMapping("/certify-mass-invoices")
    public List<InvoiceCertificationResponseDTO> certifyEnMasseInvoices(@RequestBody List<InvoiceDTO> invoiceDTOs)
            throws Exception {
        if (invoiceDTOs == null || invoiceDTOs.isEmpty()) {
            throw new IllegalArgumentException("invoiceDTOs must not be empty");
        }
        return factureFneService.certifyEnMasseInvoice(invoiceDTOs);
    }
@PostMapping("/certify-one")
    public void certifyByInvoice(@RequestBody InvoiceDTO invoiceDTO)  {
        factureFneService.certifyByInvoice(invoiceDTO);
    }

    @GetMapping("/list-facture-avoir")
    public List<VerificationRefundResponse> getAllRefunds() {
        return invoiceCertificationService.getAllRefunds();
    }
}
