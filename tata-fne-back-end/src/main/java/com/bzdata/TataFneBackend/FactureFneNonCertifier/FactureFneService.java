package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.util.List;
import java.util.Map;

public interface FactureFneService {
InvoiceCertificationResponseDTO certifyInvoice(InvoiceDTO invoiceDTO)throws Exception   ;
List<InvoiceCertificationResponseDTO>certifyEnMasseInvoice(List<InvoiceDTO> invoiceDTOs)throws Exception    ;
List<InvoiceCertificationResponseDTO> certifyEnMasseByIds(List<Long> invoiceIds) throws Exception;
InvoiceDTO saveInvoiceDTO(InvoiceDTO invoiceDTO)throws Exception ;
ExcelImportResult importInvoices(List<Map<String, String>> rows);
List<FactureNonCertifierListDTO> getAllInvoices();
}
