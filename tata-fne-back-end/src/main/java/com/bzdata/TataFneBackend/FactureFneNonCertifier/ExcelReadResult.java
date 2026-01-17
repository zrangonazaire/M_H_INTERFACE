package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.util.List;
import java.util.Map;

public record ExcelReadResult(List<String> headers, List<Map<String, String>> rows, int rowCount) {
}
