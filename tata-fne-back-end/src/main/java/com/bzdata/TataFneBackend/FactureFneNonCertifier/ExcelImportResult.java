package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.util.List;

public record ExcelImportResult(int processed, int inserted, int updated, int skipped, List<String> errors) {
}
