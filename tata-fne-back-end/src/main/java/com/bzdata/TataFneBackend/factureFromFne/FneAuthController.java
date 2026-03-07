package com.bzdata.TataFneBackend.factureFromFne;

import java.time.Instant;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping({ "/fne/auth", "/fne" })
@RequiredArgsConstructor
public class FneAuthController {

    private final FneAuthService service;

    @PostMapping("/login")
    public ResponseEntity<LoginStoredResponse> loginAndStore(@Valid @RequestBody FneLoginRequest request) {
        FneAuthTokenEntity saved = service.loginAndStoreToken(request);

        // On ne renvoie pas le token en clair côté API interne (bonne pratique).
        return ResponseEntity.ok(new LoginStoredResponse(
                saved.getUsername(),
                saved.getExpiresAt(),
                "Token enregistré avec succès"
        ));
    }

    public record LoginStoredResponse(String username, Instant expiresAt, String message) {}
}
