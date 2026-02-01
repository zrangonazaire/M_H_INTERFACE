package com.bzdata.TataFneBackend.newCertificationWay;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class VerificationRefundResponseDto {
private String ncc;

    @JsonProperty("reference")
    private String reference;

    @JsonProperty("token")
    private String token;

    @JsonProperty("warning")
    private boolean warning;

    @JsonProperty("balance_sticker")
    private int balanceSticker;
}
