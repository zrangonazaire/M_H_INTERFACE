package com.bzdata.GestionCinema.InvoicesUncertifies;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/sync")
public class InvoiceSyncController {
/* 
    private final ExternalInvoiceClient client;
    private final InvoiceService invoiceService;

    public InvoiceSyncController(ExternalInvoiceClient client, InvoiceService invoiceService) {
        this.client = client;
        this.invoiceService = invoiceService;
    }

    // GET qui "synchronise" (techniquement possible, mais attention REST)
    @GetMapping("/invoices/")
    public ResponseEntity<?> syncInvoice() {
        String  dto = client.fetchInvoice();
        /* InvoiceUncertify saved = invoiceService.saveFromDto(dto);
        return ResponseEntity.ok(saved.getId());
        return ResponseEntity.ok("ok");
    }
}
 */ 


    private final ExternalInvoiceClient client;
    private final ExternalInvoiceMapperService mapper;
    private final InvoiceService invoiceService; // ton service qui save en BD

    public InvoiceSyncController(ExternalInvoiceClient client,
                                 ExternalInvoiceMapperService mapper,
                                 InvoiceService invoiceService) {
        this.client = client;
        this.mapper = mapper;
        this.invoiceService = invoiceService;
    }

    @GetMapping("/invoices")
    public ResponseEntity<?> syncInvoice() {
        String rawJson = client.fetchInvoice();

        // mapping manuel JSON -> InvoiceDto
        InvoiceDto dto = mapper.mapExternalFinanceJsonToInvoiceDto(rawJson);

        // mapping InvoiceDto -> Entity + save
        InvoiceUncertify saved = invoiceService.saveFromDto(dto);

        return ResponseEntity.ok(saved.getId());
    }
}