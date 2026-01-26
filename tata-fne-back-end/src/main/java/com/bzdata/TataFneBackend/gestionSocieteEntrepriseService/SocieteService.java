package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;
import java.util.List;
import org.springframework.data.domain.Page;

public interface SocieteService {
    SocieteResponseDTO create(SocieteRequestDTO societe);
    SocieteResponseDTO update(int id, SocieteRequestDTO societe);
    void delete(int id);
    SocieteResponseDTO findById(int id);
    List<SocieteResponseDTO> findAll();
    Page<SocieteResponseDTO> findAll(int page, int size);
}
