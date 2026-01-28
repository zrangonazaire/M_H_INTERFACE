package com.bzdata.TataFneBackend.user;

import java.util.List;

public interface UserService {
    List<UserDTO> getAllUsers();
    UserDTO getUserById(Integer id);
    UserDTO toggleAccountLock(Integer id, boolean accountLocked);
    UserDTO toggleAccountStatus(Integer id, boolean enabled);
}
