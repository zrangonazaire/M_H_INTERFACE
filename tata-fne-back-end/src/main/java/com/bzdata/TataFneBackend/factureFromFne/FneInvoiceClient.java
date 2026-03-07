package com.bzdata.TataFneBackend.factureFromFne;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class FneInvoiceClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${fne.base-url}")
    private String baseUrl;

    public JsonNode fetchInvoices(String bearerToken, FneInvoiceQuery query) {
        String invoicesPath = resolveInvoicesPath(baseUrl);

        return webClientBuilder
                .baseUrl(baseUrl)
                .build()
                .get()
                .uri(uriBuilder -> {
                    return uriBuilder.path(invoicesPath)
                            .queryParam("page", query.resolvedPage())
                            .queryParam("perPage", query.resolvedPerPage())
                            .queryParam("fromDate", query.resolvedFromDate())
                            .queryParam("toDate", query.resolvedToDate())
                            .queryParam("sortBy", query.resolvedSortBy())
                            .queryParam("listing", query.resolvedListing())
                            .queryParam("complete", query.resolvedComplete())
                            .build();
                })
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
    }

    private String resolveInvoicesPath(String configuredBaseUrl) {
        String normalizedBaseUrl = configuredBaseUrl == null ? "" : configuredBaseUrl.trim();
        if (normalizedBaseUrl.endsWith("/ws") || normalizedBaseUrl.endsWith("/ws/")) {
            return "/invoices";
        }
        return "/ws/invoices";
    }
}
