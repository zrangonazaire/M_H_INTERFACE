package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Societe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String raisonSociale;
    private String sigle;
    private String code;
    private String ncc;
    private String libelleSocielle;
    private String formeJuridique;
    @Column(length = 500)
    private String objetSocial;
    private String numeroRccm;
    private String numeroIfu;
    private Double capitalSocial;
    private String siegeSocial;
    private String pays;
    private String imageUrl;
    private String ville;
    private String adresse;
    private String telephone;
    private String email;
    private String siteWeb;
    private String dirigeantPrincipal;
    private String exerciceComptableDebut;
    private String exerciceComptableFin;
    @OneToMany(mappedBy = "societe")
    private List<Etablissement> etablissements;
}
