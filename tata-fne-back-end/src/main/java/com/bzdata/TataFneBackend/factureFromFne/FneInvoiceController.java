package com.bzdata.TataFneBackend.factureFromFne;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/fne/invoices")
@RequiredArgsConstructor
public class FneInvoiceController {

    private final FneInvoiceService invoiceService;

    @GetMapping("/{id}")
    public ResponseEntity<JsonNode> findInvoiceByExternalId(@PathVariable("id") String id) {
        return ResponseEntity.ok(invoiceService.findInvoiceByExternalId(id));
    }

    @GetMapping
    public ResponseEntity<FneInvoiceSyncResult> findInvoicesFromDatabase(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "12") Integer perPage,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "-date") String sortBy,
            @RequestParam(defaultValue = "issued") String listing,
            @RequestParam(defaultValue = "true") Boolean complete
    ) {
        FneInvoiceQuery query = new FneInvoiceQuery(
                page,
                perPage,
                fromDate,
                toDate,
                sortBy,
                listing,
                complete
        );

        return ResponseEntity.ok(invoiceService.findFromDatabase(query));
    }

    @PostMapping("/sync")
    public ResponseEntity<FneInvoiceSyncResult> fetchAndStoreInvoices(
            @RequestParam(required = false) String username,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "12") Integer perPage,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "-date") String sortBy,
            @RequestParam(defaultValue = "issued") String listing,
            @RequestParam(defaultValue = "true") Boolean complete
    ) {
        FneInvoiceQuery query = new FneInvoiceQuery(
                page,
                perPage,
                fromDate,
                toDate,
                sortBy,
                listing,
                complete
        );

        return ResponseEntity.ok(invoiceService.syncAndStore(query, username));
    }
}
