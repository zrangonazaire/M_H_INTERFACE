package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;

import java.util.stream.Collectors;

public class SocieteMapper {

    public static Societe toEntity(SocieteRequestDTO dto) {
        if (dto == null) return null;
        return Societe.builder()
                .raisonSociale(dto.getRaisonSociale())
                .sigle(dto.getSigle())
                .formeJuridique(dto.getFormeJuridique())
                .objetSocial(dto.getObjetSocial())
                .numeroRccm(dto.getNumeroRccm())
                .numeroIfu(dto.getNumeroIfu())
                .capitalSocial(dto.getCapitalSocial())
                .siegeSocial(dto.getSiegeSocial())
                .pays(dto.getPays())
                .ville(dto.getVille())
                .adresse(dto.getAdresse())
                .telephone(dto.getTelephone())
                .email(dto.getEmail())
                .siteWeb(dto.getSiteWeb())
                .dirigeantPrincipal(dto.getDirigeantPrincipal())
                .exerciceComptableDebut(dto.getExerciceComptableDebut())
                .exerciceComptableFin(dto.getExerciceComptableFin())
                .build();
    }

    public static SocieteResponseDTO toResponse(Societe entity) {
        if (entity == null) return null;
        SocieteResponseDTO dto = new SocieteResponseDTO();
        dto.setId(entity.getId());
        dto.setRaisonSociale(entity.getRaisonSociale());
        dto.setFormeJuridique(entity.getFormeJuridique());
        dto.setNumeroRccm(entity.getNumeroRccm());
        dto.setNumeroIfu(entity.getNumeroIfu());
        dto.setVille(entity.getVille());
        dto.setPays(entity.getPays());
        dto.setEmail(entity.getEmail());
        dto.setTelephone(entity.getTelephone());

        if (entity.getEtablissements() != null) {
            dto.setEtablissements(entity.getEtablissements().stream()
                    .map(EtablissementMapper::toResponse)
                    .collect(Collectors.toList()));
        }
        return dto;
    }
}
