package com.bzdata.TataFneBackend.factureFromFne;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class FneCredentialCipher {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_SIZE = 12;
    private static final int KEY_SIZE = 16;

    private final SecretKeySpec secretKeySpec;
    private final SecureRandom secureRandom = new SecureRandom();

    public FneCredentialCipher(
            @Value("${fne.credentials.encryption-secret:${application.security.jwt.secret-key:}}") String secret
    ) {
        if (!StringUtils.hasText(secret)) {
            throw new IllegalStateException(
                    "La cle de chiffrement des credentials FNE est manquante: "
                            + "fne.credentials.encryption-secret"
            );
        }
        this.secretKeySpec = new SecretKeySpec(deriveKey(secret.trim()), "AES");
    }

    public String encrypt(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_SIZE];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(rawValue.getBytes(StandardCharsets.UTF_8));

            byte[] payload = ByteBuffer.allocate(iv.length + encrypted.length)
                    .put(iv)
                    .put(encrypted)
                    .array();

            return Base64.getEncoder().encodeToString(payload);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Impossible de chiffrer les credentials FNE.", ex);
        }
    }

    public String decrypt(String encryptedValue) {
        if (!StringUtils.hasText(encryptedValue)) {
            return null;
        }
        try {
            byte[] payload = Base64.getDecoder().decode(encryptedValue);
            if (payload.length <= IV_SIZE) {
                throw new IllegalStateException("Format invalide des credentials FNE chiffres.");
            }

            byte[] iv = Arrays.copyOfRange(payload, 0, IV_SIZE);
            byte[] cipherText = Arrays.copyOfRange(payload, IV_SIZE, payload.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_BITS, iv));

            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("Impossible de dechiffrer les credentials FNE.", ex);
        }
    }

    private byte[] deriveKey(String secret) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            return Arrays.copyOf(hash, KEY_SIZE);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Impossible d'initialiser la cle de chiffrement FNE.", ex);
        }
    }
}
