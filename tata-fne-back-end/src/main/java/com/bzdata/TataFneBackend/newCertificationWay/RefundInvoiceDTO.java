package com.bzdata.TataFneBackend.newCertificationWay;

import lombok.Data;
import java.util.List;

@Data
public class RefundInvoiceDTO {
    private String invoiceId;
    private List<RefundItemDTO> items;
}
