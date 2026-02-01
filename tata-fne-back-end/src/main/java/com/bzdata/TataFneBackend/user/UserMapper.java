package com.bzdata.TataFneBackend.user;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class UserMapper {

    public UserDTO toDTO(User user) {
        if (user == null) {
            return null;
        }

        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setFirstname(user.getFirstname());
        dto.setLastname(user.getLastname());
        dto.setEmail(user.getEmail());
        dto.setDateOfBirth(user.getDateOfBirth());
        dto.setAgence(user.getAgence());
        dto.setImageUrl(user.getImageUrl());
        dto.setAccountLocked(user.isAccountLocked());
        dto.setEnabled(user.isEnabled());
        dto.setPdvFne(user.getPdvFne());
        dto.setEtablisssementFne(user.getEtablisssementFne());

        // Convert roles to list of role names
        if (user.getRoles() != null) {
            dto.setRoles(user.getRoles().stream()
                    .map(role -> role.getName())
                    .collect(Collectors.toList()));
        }

        // Format dates as strings
        if (user.getCreatedDate() != null) {
            dto.setCreatedDate(user.getCreatedDate().toString());
        }
        if (user.getLastModifiedDate() != null) {
            dto.setLastModifiedDate(user.getLastModifiedDate().toString());
        }

        return dto;
    }

    public User toEntity(UserDTO dto) {
        if (dto == null) {
            return null;
        }

        User user = new User();
        user.setId(dto.getId());
        user.setFirstname(dto.getFirstname());
        user.setLastname(dto.getLastname());
        user.setEmail(dto.getEmail());
        user.setDateOfBirth(dto.getDateOfBirth());
        user.setAgence(dto.getAgence());
        user.setImageUrl(dto.getImageUrl());
        user.setAccountLocked(dto.isAccountLocked());
        user.setEnabled(dto.isEnabled());

        return user;
    }

    public List<UserDTO> toDTOList(List<User> users) {
        return users.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<User> toEntityList(List<UserDTO> dtos) {
        return dtos.stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
    }
}