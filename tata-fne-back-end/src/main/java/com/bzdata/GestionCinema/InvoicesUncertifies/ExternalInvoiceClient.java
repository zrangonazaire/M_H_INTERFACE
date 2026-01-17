package com.bzdata.GestionCinema.InvoicesUncertifies;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ExternalInvoiceClient {

    private final RestClient restClient;

    public ExternalInvoiceClient(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://api.mydummyapi.com/").build();
    }

    public String  fetchInvoice() {
        return restClient.get()
                .uri("/categories/finance")
                .retrieve()
                 .body(String.class);
    }
}

