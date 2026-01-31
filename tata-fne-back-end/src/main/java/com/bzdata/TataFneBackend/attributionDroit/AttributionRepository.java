package com.bzdata.TataFneBackend.attributionDroit;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AttributionRepository extends JpaRepository<Attribution, Integer> {
    List<Attribution> findByUser_Id(int user_Id);
    List<Attribution> findByFunctionality_IdFunctionality(int functionality_Id);
    Optional<Attribution> findByUser_IdAndFunctionality_IdFunctionality(int user_Id, int functionality_Id);
    boolean existsByUser_IdAndFunctionality_IdFunctionalityIn(int user_Id, List<Integer> functionalityIds);
}


