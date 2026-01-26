package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocieteServiceImpl implements SocieteService {

    private final SocieteRepository societeRepository;

    @Override
    public SocieteResponseDTO create(SocieteRequestDTO societeRequestDTO) {
        Societe societe = SocieteMapper.toEntity(societeRequestDTO);
        Societe saved = societeRepository.save(societe);
        return SocieteMapper.toResponse(saved);
    }

    @Override
    public SocieteResponseDTO update(int id, SocieteRequestDTO societeRequestDTO) {
        Societe existing = societeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Société non trouvée"));

        // Mise à jour des champs depuis le DTO
        existing.setRaisonSociale(societeRequestDTO.getRaisonSociale());
        existing.setSigle(societeRequestDTO.getSigle());
        existing.setFormeJuridique(societeRequestDTO.getFormeJuridique());
        existing.setObjetSocial(societeRequestDTO.getObjetSocial());
        existing.setNumeroRccm(societeRequestDTO.getNumeroRccm());
        existing.setNumeroIfu(societeRequestDTO.getNumeroIfu());
        existing.setCapitalSocial(societeRequestDTO.getCapitalSocial());
        existing.setSiegeSocial(societeRequestDTO.getSiegeSocial());
        existing.setPays(societeRequestDTO.getPays());
        existing.setVille(societeRequestDTO.getVille());
        existing.setAdresse(societeRequestDTO.getAdresse());
        existing.setTelephone(societeRequestDTO.getTelephone());
        existing.setEmail(societeRequestDTO.getEmail());
        existing.setSiteWeb(societeRequestDTO.getSiteWeb());
        existing.setDirigeantPrincipal(societeRequestDTO.getDirigeantPrincipal());


        Societe updated = societeRepository.save(existing);
        return SocieteMapper.toResponse(updated);
    }

    @Override
    public void delete(int id) {
        if (!societeRepository.existsById(id)) {
            throw new RuntimeException("Société non trouvée");
        }
        //TODO VERIFIE QUE AUCUN ETABLISSEMENT EST LIER ACETTE SOCIETE AVANT DE SUPPRIMER
        societeRepository.deleteById(id);
    }

    @Override
    public SocieteResponseDTO findById(int id) {
        Societe societe = societeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Société non trouvée"));
        return SocieteMapper.toResponse(societe);
    }

    @Override
    public List<SocieteResponseDTO> findAll() {
        return societeRepository.findAll()
                .stream()
                .map(SocieteMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public org.springframework.data.domain.Page<SocieteResponseDTO> findAll(int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<Societe> societePage = societeRepository.findAll(pageable);
        return societePage.map(SocieteMapper::toResponse);
    }
}

