package com.bzdata.TataFneBackend.factureFromFne;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

public final class JwtTimeExtractor {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JwtTimeExtractor() {}

    public static Instant getExp(String jwt) {
        JsonNode payload = decodePayload(jwt);
        if (payload.hasNonNull("exp")) {
            return Instant.ofEpochSecond(payload.get("exp").asLong());
        }
        return null;
    }

    public static Instant getIat(String jwt) {
        JsonNode payload = decodePayload(jwt);
        if (payload.hasNonNull("iat")) {
            return Instant.ofEpochSecond(payload.get("iat").asLong());
        }
        return null;
    }

    private static JsonNode decodePayload(String jwt) {
        try {
            String[] parts = jwt.split("\\.");
            if (parts.length < 2) throw new IllegalArgumentException("JWT invalide");
            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            String json = new String(decoded, StandardCharsets.UTF_8);
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new IllegalArgumentException("Impossible de décoder le JWT", e);
        }
    }
}
