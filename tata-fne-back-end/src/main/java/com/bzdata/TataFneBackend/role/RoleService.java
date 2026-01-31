package com.bzdata.TataFneBackend.role;

import java.util.List;

public interface RoleService {
    RoleDTO create(RoleDTO dto);
    RoleDTO update(int id, RoleDTO dto);
    void delete(int id);
    RoleDTO getById(int id);

    List<RoleDTO> getAll();
}