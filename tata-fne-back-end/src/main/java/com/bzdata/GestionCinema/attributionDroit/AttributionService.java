package com.bzdata.GestionCinema.attributionDroit;

import java.util.List;

public interface AttributionService {
    AttributionDTO create(AttributionDTO dto);
    AttributionDTO update(int id, AttributionDTO dto);
    void delete(int id);
    List<AttributionDTO> getAll();
    AttributionDTO getById(int id);
    List<AttributionDTO> getByUserId(int userId);
    // Nouvelle méthode pour lister les fonctionnalités par role
    List<AttributionDTO> getFunctionalitiesByRoleId(int roleId);
}
