package com.bzdata.TataFneBackend.factureFromFne;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FneAuthTokenRepository extends JpaRepository<FneAuthTokenEntity, String> {
    Optional<FneAuthTokenEntity> findByUsername(String username);

    Optional<FneAuthTokenEntity> findTopByOrderByUpdatedAtDesc();

    List<FneAuthTokenEntity> findAllByOrderByUpdatedAtDesc();
}
