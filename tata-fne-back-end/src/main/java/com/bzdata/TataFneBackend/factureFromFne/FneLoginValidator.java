package com.bzdata.TataFneBackend.factureFromFne;


import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class FneLoginValidator {
    public void validate(FneLoginRequest req) {
        if (req == null) throw new IllegalArgumentException("Payload requis.");
        if (!StringUtils.hasText(req.getUsername())) throw new IllegalArgumentException("username requis.");
        if (!StringUtils.hasText(req.getPassword())) throw new IllegalArgumentException("password requis.");
        if (req.getUsername().length() > 50) throw new IllegalArgumentException("username trop long.");
    }
}
