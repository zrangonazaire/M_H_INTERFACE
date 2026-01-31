package com.bzdata.TataFneBackend.Funtionality;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FunctionalityDTO {
    private int idFunctionality;

    @NotBlank(message = "Le code est obligatoire")
    private String code;

    @NotBlank(message = "Le nom est obligatoire")
    private String nom;

    private String description;
}
