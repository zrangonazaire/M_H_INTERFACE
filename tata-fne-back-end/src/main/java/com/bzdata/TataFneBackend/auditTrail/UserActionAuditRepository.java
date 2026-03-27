package com.bzdata.TataFneBackend.auditTrail;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserActionAuditRepository extends JpaRepository<UserActionAudit, Long>, JpaSpecificationExecutor<UserActionAudit> {

    @Query("select distinct audit.module from UserActionAudit audit where audit.module is not null order by audit.module asc")
    List<String> findDistinctModules();

    @Query("select distinct audit.module from UserActionAudit audit where audit.module is not null and audit.userId = :userId order by audit.module asc")
    List<String> findDistinctModulesByUserId(@Param("userId") Integer userId);
}
