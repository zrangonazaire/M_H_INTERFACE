package com.bzdata.TataFneBackend.newCertificationWay;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

public interface InvoiceCertificationService {
    JsonNode certifyInvoice(InvoiceSignRequest request);

public VerificationRefundResponse refundInvoice(RefundInvoiceDTO refundDto);

    InvoiceMainResponse certifyInvoicePropre(InvoiceSignRequest request);

    InvoiceMainResponse saveFromJson(JsonNode json);

    void saveFromJsonToDataba(JsonNode json);

    void saveFromJsonToDatabaWithNumFacture(JsonNode json, String numFacture, String utiliseur);

    Long countByNumeroFacture(String numeroFacture);

    List<InvoiceFneCertifyDto> getAll();

    List<InvoiceFneCertifyDto> getByNumeroFacture(String numeroFacture);

}
