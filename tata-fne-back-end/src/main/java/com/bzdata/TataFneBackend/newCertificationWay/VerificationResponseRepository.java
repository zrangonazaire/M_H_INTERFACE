package com.bzdata.TataFneBackend.newCertificationWay;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationResponseRepository
        extends JpaRepository<VerificationRefundResponse, Long> {

    boolean existsByReference(String reference);
}

