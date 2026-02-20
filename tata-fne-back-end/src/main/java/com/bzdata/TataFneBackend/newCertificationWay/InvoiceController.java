package com.bzdata.TataFneBackend.newCertificationWay;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/new-invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceCertificationService service;
    private final InvoiceApiProperties props;

    @PostMapping("/certify")
    public JsonNode certify(@RequestBody InvoiceSignRequest request) {
        return service.certifyInvoice(request);
    }
    @PostMapping("/certify-final")
    public void certifyFinal(@RequestBody InvoiceSignRequest request) {
        service.saveFromJsonToDataba(service.certifyInvoice(request));
    }
    @PostMapping(value = "/certify-final-facture/{numFacture}/{utilisateur}", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE) 
    public void certifyFinalWithNumFacture(@RequestBody InvoiceSignRequest request,@PathVariable("numFacture") String numFacture ,@PathVariable("utilisateur")  String utilisateur) {
        service.saveFromJsonToDatabaWithNumFacture(service.certifyInvoice(request),numFacture,utilisateur);
    }
    @PostMapping(value = "/certify-propre", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<InvoiceMainResponse>  certifyPropre(@RequestBody InvoiceSignRequest request) {
        return ResponseEntity.ok().body(service.certifyInvoicePropre(request));
    }

    // 2) LISTE toutes les factures: /api/invoices
    @GetMapping("/all-certified-invoices")
    public ResponseEntity<List<InvoiceFneCertifyDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    // 3) LISTE par numeroFacture: /api/invoices/by-numero?numeroFacture=FAC-001
    @GetMapping("/by-numero")
    public ResponseEntity<List<InvoiceFneCertifyDto>> getByNumero(@RequestParam String numeroFacture) {
        return ResponseEntity.ok(service.getByNumeroFacture(numeroFacture));
    }

    @GetMapping("/environment-label")
    public ResponseEntity<Map<String, String>> getEnvironmentLabel() {
        String baseUrl = props.getBaseUrl() == null ? "" : props.getBaseUrl().trim();
        String label = baseUrl.startsWith("https://www")
                ? "ENVIRONNEMENT DE PRODUCTION"
                : "ENVIRONNEMENT DE TEST";
        return ResponseEntity.ok(Map.of(
                "label", label,
                "baseUrl", baseUrl));
    }

     @PostMapping("/refund-invoice")

    @ResponseStatus(HttpStatus.OK)
    public VerificationRefundResponse refundInvoice(
            @RequestBody RefundInvoiceDTO refundDto
    ) {
        return service.refundInvoice(refundDto);
    }

     @GetMapping("/list-facture-avoir")
    public List<VerificationRefundResponse> getAllRefunds() {
        return service.getAllRefunds();
    }


    /**
     * 🔹 Liste des refunds par facture
     */
    @GetMapping("/invoice/{invoiceId}")
    public List<VerificationRefundResponse> getRefundsByInvoice(
            @PathVariable String invoiceId
    ) {
        return service.getRefundsByInvoiceId(invoiceId);
    }
}
