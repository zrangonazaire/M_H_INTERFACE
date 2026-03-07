package com.bzdata.TataFneBackend.factureFromFne;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FneLoginResponse {
    private String token;
    private FneUser user;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FneUser {
        private String id;
        private String username;
        private String lastLogin;
        private Company company;

        @Getter
        @Setter
        @NoArgsConstructor
        @AllArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Company {
            private String id;
            private String name;
            private String ncc;
            private Integer availableInvoiceStickers;
        }
    }
}