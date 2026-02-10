package com.bzdata.TataFneBackend.user;

import com.bzdata.TataFneBackend.role.RoleDTO;

import java.util.List;

public interface UserService {
    List<UserDTO> getAllUsers();
    UserDTO getUserById(Integer id);
    UserDTO toggleAccountLock(Integer id, boolean accountLocked);
    UserDTO toggleAccountStatus(Integer id, boolean enabled);
    RoleDTO getUserRole(Integer idUser);
    boolean getUserByIdAndIdRole(Integer idUser, Integer idRole);
    boolean getUserByIdAndRoleName(Integer idUser, String idRole);
}
