package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.util.List;

public record MassCertificationRequest(List<Long> invoiceIds) {
}
