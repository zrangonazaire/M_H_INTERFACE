package com.bzdata.TataFneBackend.userSession;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserConnectionSessionRepository extends JpaRepository<UserConnectionSession, Long> {

    Optional<UserConnectionSession> findByTokenFingerprint(String tokenFingerprint);

    List<UserConnectionSession> findByStatusAndExpiresAtBefore(UserConnectionStatus status, LocalDateTime threshold);

    Page<UserConnectionSession> findByUser_Id(Integer userId, Pageable pageable);
}
