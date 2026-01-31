package com.bzdata.TataFneBackend.role;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByName(String roleStudent);
    List<Role> findAllByUser_Id(Integer userId);
}