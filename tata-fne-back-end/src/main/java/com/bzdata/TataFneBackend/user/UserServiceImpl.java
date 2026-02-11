package com.bzdata.TataFneBackend.user;

import com.bzdata.TataFneBackend.exception.ResourceNonFoundException;
import com.bzdata.TataFneBackend.role.RoleDTO;
import com.bzdata.TataFneBackend.role.RoleMapper;
import com.bzdata.TataFneBackend.role.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

import com.bzdata.TataFneBackend.role.Role;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;

    @Override
    public List<UserDTO> getAllUsers() {
        List<User> users = userRepository.findAll();
        return userMapper.toDTOList(users);
    }

    @Override
    public UserDTO getUserById(Integer id) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            return userMapper.toDTO(userOptional.get());
        }
        throw new RuntimeException("User not found with id: " + id);
    }

    @Override
    public UserDTO toggleAccountLock(Integer id, boolean accountLocked) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setAccountLocked(accountLocked);
            User updatedUser = userRepository.save(user);
            return userMapper.toDTO(updatedUser);
        }
        throw new RuntimeException("User not found with id: " + id);
    }

    @Override
    public UserDTO toggleAccountStatus(Integer id, boolean enabled) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setEnabled(enabled);
            User updatedUser = userRepository.save(user);
            return userMapper.toDTO(updatedUser);
        }
        throw new RuntimeException("User not found with id: " + id);
    }

    @Override
    public RoleDTO getUserRole(Integer idUser) {
        return roleRepository.findAllByUser_Id(idUser).stream()
                .findFirst()
                .map(roleMapper::mapToDTO)
                .orElseThrow(() ->
                        new ResourceNonFoundException("Rôle principal non trouvé")
                );
    }

    @Override
    public boolean getUserByIdAndIdRole(Integer idUser, Integer idRole) {
        return userRepository.existsByIdAndRoles_Id(idUser, idRole);
    }

    @Override
    public boolean getUserByIdAndRoleName(Integer idUser, String idRole) {
        return userRepository.existsByIdAndRoles_Name(idUser, idRole.toUpperCase());
    }

    @Override
    public void addRoleToUser(Integer idUser, String roleName) {
        Optional<User> userOptional = userRepository.findById(idUser);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            Optional<Role> roleOptional = roleRepository.findByName(roleName.toUpperCase());
            if (roleOptional.isPresent()) {
                Role role = roleOptional.get();
                user.getRoles().add(role);
                userRepository.save(user);
            } else {
                throw new RuntimeException("Role not found: " + roleName);
            }
        } else {
            throw new RuntimeException("User not found with id: " + idUser);
        }
    }

    @Override
    public void removeRoleFromUser(Integer idUser, String roleName) {
        Optional<User> userOptional = userRepository.findById(idUser);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            Optional<Role> roleOptional = roleRepository.findByName(roleName.toUpperCase());
            if (roleOptional.isPresent()) {
                Role role = roleOptional.get();
                user.getRoles().remove(role);
                userRepository.save(user);
            } else {
                throw new RuntimeException("Role not found: " + roleName);
            }
        } else {
            throw new RuntimeException("User not found with id: " + idUser);
        }
    }
}