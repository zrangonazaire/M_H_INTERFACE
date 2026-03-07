package com.bzdata.TataFneBackend.factureFromFne;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FneAuthServiceImpl implements FneAuthService {

    private static final long TOKEN_EXPIRY_SAFETY_SECONDS = 30;

    private final FneAuthClient client;
    private final FneAuthTokenRepository repository;
    private final FneLoginValidator validator;
    private final FneCredentialCipher credentialCipher;

    @Value("${fne.auth.username:}")
    private String configuredUsername;

    @Value("${fne.auth.password:}")
    private String configuredPassword;

    @Transactional
    @Override
    public FneAuthTokenEntity loginAndStoreToken(FneLoginRequest req) {
        validator.validate(req);

        String username = req.getUsername().trim();
        FneAuthTokenEntity entity = repository.findByUsername(username)
                .orElseGet(() -> FneAuthTokenEntity.builder().username(username).build());

        return loginAndPersist(entity, req.getPassword());
    }

    @Transactional
    @Override
    public String resolveValidToken(String username) {
        if (StringUtils.hasText(username)) {
            return resolveValidTokenForUsername(username.trim());
        }
        return resolveValidTokenFromRecentLogins();
    }

    @Transactional
    @Override
    public String refreshToken(String username) {
        if (StringUtils.hasText(username)) {
            FneAuthTokenEntity entity = resolveTokenEntity(username.trim());
            return refreshSingleToken(entity).getToken();
        }
        return refreshTokenFromRecentLogins();
    }

    private FneAuthTokenEntity resolveTokenEntity(String username) {
        if (StringUtils.hasText(username)) {
            String normalizedUsername = username.trim();
            return repository.findByUsername(normalizedUsername)
                    .orElseThrow(() -> new IllegalStateException(
                            "Aucun token FNE trouve pour l'utilisateur: " + normalizedUsername
                    ));
        }
        return repository.findTopByOrderByUpdatedAtDesc()
                .orElseThrow(() -> new IllegalStateException(
                        "Aucun token FNE disponible. Connectez-vous d'abord via /fne/auth/login."
                ));
    }

    private String resolveValidTokenForUsername(String username) {
        FneAuthTokenEntity entity = resolveTokenEntity(username);
        if (isTokenStillValid(entity)) {
            return entity.getToken();
        }
        return refreshSingleToken(entity).getToken();
    }

    private String resolveValidTokenFromRecentLogins() {
        List<FneAuthTokenEntity> candidates = resolveRecentCandidates();
        IllegalStateException lastFailure = null;

        for (FneAuthTokenEntity candidate : candidates) {
            if (isTokenStillValid(candidate)) {
                return candidate.getToken();
            }
            try {
                return refreshSingleToken(candidate).getToken();
            } catch (IllegalStateException ex) {
                lastFailure = ex;
            }
        }

        throw new IllegalStateException(
                "Aucun token FNE valide n'est disponible. Reconnectez-vous via /fne/auth/login.",
                lastFailure
        );
    }

    private String refreshTokenFromRecentLogins() {
        List<FneAuthTokenEntity> candidates = resolveRecentCandidates();
        IllegalStateException lastFailure = null;

        for (FneAuthTokenEntity candidate : candidates) {
            try {
                return refreshSingleToken(candidate).getToken();
            } catch (IllegalStateException ex) {
                lastFailure = ex;
            }
        }

        throw new IllegalStateException(
                "Impossible de rafraichir un token FNE. Reconnectez-vous via /fne/auth/login.",
                lastFailure
        );
    }

    private List<FneAuthTokenEntity> resolveRecentCandidates() {
        List<FneAuthTokenEntity> candidates = repository.findAllByOrderByUpdatedAtDesc();
        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalStateException(
                    "Aucun token FNE disponible. Connectez-vous d'abord via /fne/auth/login."
            );
        }
        return candidates;
    }

    private boolean isTokenStillValid(FneAuthTokenEntity tokenEntity) {
        if (tokenEntity == null || !StringUtils.hasText(tokenEntity.getToken())) {
            return false;
        }
        Instant expiresAt = tokenEntity.getExpiresAt();
        return expiresAt == null || expiresAt.isAfter(Instant.now().plusSeconds(TOKEN_EXPIRY_SAFETY_SECONDS));
    }

    private FneAuthTokenEntity refreshSingleToken(FneAuthTokenEntity entity) {
        String password = resolveRefreshPassword(entity);
        return loginAndPersist(entity, password);
    }

    private String resolveRefreshPassword(FneAuthTokenEntity entity) {
        if (StringUtils.hasText(entity.getEncryptedPassword())) {
            return credentialCipher.decrypt(entity.getEncryptedPassword());
        }

        if (StringUtils.hasText(configuredPassword)
                && (!StringUtils.hasText(configuredUsername)
                || entity.getUsername().equals(configuredUsername.trim()))) {
            return configuredPassword;
        }

        throw new IllegalStateException(
                "Le token FNE est expire et aucun credential de rafraichissement n'est disponible. "
                        + "Reconnectez-vous via /fne/auth/login."
        );
    }

    private FneAuthTokenEntity loginAndPersist(FneAuthTokenEntity entity, String rawPassword) {
        FneLoginRequest loginRequest = new FneLoginRequest(entity.getUsername(), rawPassword);
        validator.validate(loginRequest);

        FneLoginResponse response;
        try {
            response = client.login(loginRequest);
        } catch (WebClientResponseException ex) {
            throw new IllegalStateException(
                    "Echec d'authentification FNE (" + ex.getStatusCode().value() + "). Verifiez les credentials.",
                    ex
            );
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Impossible d'obtenir un token FNE.", ex);
        }

        if (response == null || !StringUtils.hasText(response.getToken())) {
            throw new IllegalStateException("Token non retourne par la FNE.");
        }

        Instant exp = JwtTimeExtractor.getExp(response.getToken());
        Instant iat = JwtTimeExtractor.getIat(response.getToken());

        entity.setToken(response.getToken());
        entity.setEncryptedPassword(credentialCipher.encrypt(rawPassword));
        entity.setIssuedAt(iat);
        entity.setExpiresAt(exp);
        entity.setLastLoginAt(Instant.now());

        return repository.save(entity);
    }
}
