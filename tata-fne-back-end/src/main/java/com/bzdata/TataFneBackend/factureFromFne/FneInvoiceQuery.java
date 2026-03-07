package com.bzdata.TataFneBackend.factureFromFne;

import java.time.LocalDate;

import org.springframework.util.StringUtils;

public record FneInvoiceQuery(
        Integer page,
        Integer perPage,
        LocalDate fromDate,
        LocalDate toDate,
        String sortBy,
        String listing,
        Boolean complete
) {
    public int resolvedPage() {
        return page == null || page < 1 ? 1 : page;
    }

    public int resolvedPerPage() {
        return perPage == null || perPage < 1 ? 12 : perPage;
    }

    public String resolvedSortBy() {
        return StringUtils.hasText(sortBy) ? sortBy.trim() : "-date";
    }

    public String resolvedListing() {
        if (!StringUtils.hasText(listing)) {
            return "issued";
        }
        String normalized = listing.trim().toLowerCase();
        return switch (normalized) {
            case "received", "fournisseur", "fournisseurs", "supplier", "suppliers" -> "received";
            default -> "issued";
        };
    }

    public boolean resolvedComplete() {
        return complete == null || complete;
    }

    public LocalDate resolvedToDate() {
        return toDate == null ? LocalDate.now() : toDate;
    }

    public LocalDate resolvedFromDate() {
        LocalDate candidate = fromDate == null ? resolvedToDate().minusDays(14) : fromDate;
        LocalDate to = resolvedToDate();
        return candidate.isAfter(to) ? to : candidate;
    }
}
