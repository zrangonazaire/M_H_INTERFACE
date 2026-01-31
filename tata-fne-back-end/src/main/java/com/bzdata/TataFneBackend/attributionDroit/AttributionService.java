package com.bzdata.TataFneBackend.attributionDroit;

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
    // Nouvelle méthode pour vérifier si un utilisateur a un rôle donné
    boolean checkRoleExist(int userId, int roleId);
}
