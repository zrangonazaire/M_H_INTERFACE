package com.bzdata.TataFneBackend.factureFromFne;

import com.fasterxml.jackson.databind.JsonNode;

public interface FneInvoiceService {
    FneInvoiceSyncResult syncAndStore(FneInvoiceQuery query, String username);

    FneInvoiceSyncResult findFromDatabase(FneInvoiceQuery query);

    JsonNode findInvoiceByExternalId(String externalId);
}
