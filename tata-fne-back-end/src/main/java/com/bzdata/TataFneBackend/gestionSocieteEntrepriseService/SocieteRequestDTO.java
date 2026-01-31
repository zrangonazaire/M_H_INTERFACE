package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SocieteRequestDTO {
    private String raisonSociale;
    @NotBlank(message = "Le sigle de la société est obligatoire")
    private String sigle;
    private String ncc;
    private String formeJuridique;
    private String objetSocial;
    private String numeroRccm;
    private String numeroIfu;
    private Double capitalSocial;
    private String siegeSocial;
    private String pays;
    private String ville;
    private String adresse;
    private String telephone;
    private String email;
    private String siteWeb;
    private String dirigeantPrincipal;
    private String exerciceComptableDebut;
    private String exerciceComptableFin;
}