package com.bzdata.TataFneBackend.attributionDroit;
import org.springframework.stereotype.Component;

import com.bzdata.TataFneBackend.Funtionality.Functionality;
import com.bzdata.TataFneBackend.user.User;

@Component
public class AttributionMapper {

    public Attribution toEntity(AttributionDTO dto, User user, Functionality functionality) {
        if (dto == null || user == null || functionality == null) return null;

        Attribution entity = new Attribution();
        entity.setUser(user);
        entity.setFunctionality(functionality);
        entity.setLecture(dto.isLecture());
        entity.setWriting(dto.isWriting());
        entity.setModification(dto.isModification());
        entity.setDeletion(dto.isDeletion());
        entity.setImpression(dto.isImpression());
        entity.setValidation(dto.isValidation());
        return entity;
    }

    public AttributionDTO toDTO(Attribution entity) {
        if (entity == null) return null;

        AttributionDTO dto = new AttributionDTO();
        dto.setUserId(entity.getUser().getId());
        dto.setFunctionalityId(entity.getFunctionality().getIdFunctionality());
        dto.setLecture(entity.isLecture());
        dto.setWriting(entity.isWriting());
        dto.setModification(entity.isModification());
        dto.setDeletion(entity.isDeletion());
        dto.setImpression(entity.isImpression());
        dto.setValidation(entity.isValidation());
        return dto;
    }
}

