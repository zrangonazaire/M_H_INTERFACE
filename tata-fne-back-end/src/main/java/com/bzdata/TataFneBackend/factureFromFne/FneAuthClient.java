package com.bzdata.TataFneBackend.factureFromFne;


import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class FneAuthClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${fne.base-url}")
    private String baseUrl;

    public FneLoginResponse login(FneLoginRequest request) {
        String loginPath = resolveLoginPath(baseUrl);

        return webClientBuilder
                .baseUrl(baseUrl)
                .build()
                .post()
                .uri(loginPath)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(FneLoginResponse.class)
                .block();
    }

    private String resolveLoginPath(String configuredBaseUrl) {
        String normalizedBaseUrl = configuredBaseUrl == null ? "" : configuredBaseUrl.trim();
        if (normalizedBaseUrl.endsWith("/ws") || normalizedBaseUrl.endsWith("/ws/")) {
            return "/auth/login";
        }
        return "/ws/auth/login";
    }
}
