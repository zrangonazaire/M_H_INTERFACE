package com.bzdata.TataFneBackend.factureFromFne;

import com.fasterxml.jackson.databind.JsonNode;

public record FneInvoiceSyncResult(
        int page,
        int perPage,
        long total,
        int fetchedCount,
        int savedCount,
        int createdCount,
        int updatedCount,
        JsonNode data
) {
}
