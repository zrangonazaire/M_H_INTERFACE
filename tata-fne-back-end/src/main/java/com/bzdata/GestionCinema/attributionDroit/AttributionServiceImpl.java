package com.bzdata.GestionCinema.attributionDroit;

import com.bzdata.GestionCinema.Funtionality.Functionality;
import com.bzdata.GestionCinema.Funtionality.FunctionalityRepository;
import com.bzdata.GestionCinema.rolefunctionality.RoleFunctionality;
import com.bzdata.GestionCinema.rolefunctionality.RoleFunctionalityRepository;
import com.bzdata.GestionCinema.user.User;
import com.bzdata.GestionCinema.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AttributionServiceImpl implements AttributionService {

    private final AttributionRepository repository;
    private final UserRepository userRepository;
    private final RoleFunctionalityRepository roleFunctionalityRepository;
    private final FunctionalityRepository functionalityRepository;
    private final AttributionMapper mapper;

    @Override
    public AttributionDTO create(AttributionDTO dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        Functionality functionality = functionalityRepository.findById(dto.getFunctionalityId())
                .orElseThrow(() -> new RuntimeException("Fonctionnalité non trouvée"));

        Attribution entity = mapper.toEntity(dto, user, functionality);
        Attribution saved = repository.save(entity);
        return mapper.toDTO(saved);
    }

    @Override
    public AttributionDTO update(int id, AttributionDTO dto) {
        Attribution entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attribution non trouvée"));

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        Functionality functionality = functionalityRepository.findById(dto.getFunctionalityId())
                .orElseThrow(() -> new RuntimeException("Fonctionnalité non trouvée"));

        entity.setUser(user);
        entity.setFunctionality(functionality);
        entity.setLecture(dto.isLecture());
        entity.setWriting(dto.isWriting());
        entity.setModification(dto.isModification());
        entity.setDeletion(dto.isDeletion());
        entity.setValidation(dto.isValidation());

        return mapper.toDTO(repository.save(entity));
    }

    @Override
    public void delete(int id) {
        repository.deleteById(id);
    }

    @Override
    public List<AttributionDTO> getAll() {
        return repository.findAll().stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public AttributionDTO getById(int id) {
        Attribution entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attribution non trouvée"));
        return mapper.toDTO(entity);
    }

    @Override
    public List<AttributionDTO> getByUserId(int userId) {
        return repository.findByUser_Id(userId).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<AttributionDTO> getFunctionalitiesByRoleId(int roleId) {
        // Récupérer toutes les fonctionnalités associées au rôle
        List<RoleFunctionality> roleFunctionalities = roleFunctionalityRepository.findByRole_Id(roleId);

        // Extraire les ids des fonctionnalités
        List<Integer> functionalityIds = roleFunctionalities.stream()
                .map(rf -> rf.getFunctionality().getIdFunctionality())
                .toList();

        // Récupérer toutes les attributions correspondant à ces fonctionnalités
        List<Attribution> attributions = repository.findAll().stream()
                .filter(attr -> functionalityIds.contains(attr.getFunctionality().getIdFunctionality()))
                .toList();

        // Mapper en DTO
        return attributions.stream()
                .map(mapper::toDTO)
                .toList();
    }

}
