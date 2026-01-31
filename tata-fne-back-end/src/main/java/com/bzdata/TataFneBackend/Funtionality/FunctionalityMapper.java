package com.bzdata.TataFneBackend.Funtionality;

import org.springframework.stereotype.Service;

@Service
public class FunctionalityMapper {

    public FunctionalityDTO FunctionalitymapToDTO(Functionality f) {
        FunctionalityDTO dto = new FunctionalityDTO();
        dto.setCode(f.getCodeFunctionality());
        dto.setNom(f.getNameFunctionality());
        dto.setDescription(f.getDescriptionFunctionality());
        dto.setIdFunctionality(f.getIdFunctionality());
        return dto;
    }
}
