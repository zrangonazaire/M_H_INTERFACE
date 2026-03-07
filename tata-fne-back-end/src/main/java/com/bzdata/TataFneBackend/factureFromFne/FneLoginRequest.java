package com.bzdata.TataFneBackend.factureFromFne;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FneLoginRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String password;
}