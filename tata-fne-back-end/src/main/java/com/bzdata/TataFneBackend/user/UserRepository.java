package com.bzdata.TataFneBackend.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String username);
    boolean existsByIdAndRoles_Id(Integer userId, Integer roleId);
    boolean existsByIdAndRoles_Name(Integer userId, String roleName);
}