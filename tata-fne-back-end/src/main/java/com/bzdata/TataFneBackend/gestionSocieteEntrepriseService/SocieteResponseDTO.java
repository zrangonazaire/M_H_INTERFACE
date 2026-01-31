package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class SocieteResponseDTO {
    private int id;
    private String raisonSociale;
    private String formeJuridique;
    private String numeroRccm;
    private String numeroIfu;
    private String ncc;
    private String ville;
    private String pays;
    private String email;
    private String telephone;
    private List<EtablissementResponseDTO> etablissements; // Liste des établissements rattachés
}
