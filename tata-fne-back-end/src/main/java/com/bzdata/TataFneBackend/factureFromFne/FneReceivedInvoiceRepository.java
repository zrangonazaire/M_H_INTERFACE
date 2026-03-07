package com.bzdata.TataFneBackend.factureFromFne;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface FneReceivedInvoiceRepository extends
        JpaRepository<FneReceivedInvoiceEntity, String>,
        JpaSpecificationExecutor<FneReceivedInvoiceEntity> {
    Optional<FneReceivedInvoiceEntity> findByExternalId(String externalId);

    List<FneReceivedInvoiceEntity> findAllByExternalIdIn(Collection<String> externalIds);

    boolean existsByParentIdAndSubtypeIgnoreCase(String parentId, String subtype);

    List<FneReceivedInvoiceEntity> findAllByParentIdInAndSubtypeIgnoreCase(Collection<String> parentIds, String subtype);

    List<FneReceivedInvoiceEntity> findAllByParentIdInAndSubtypeIgnoreCaseOrderByInvoiceDateDesc(
            Collection<String> parentIds,
            String subtype);

    Optional<FneReceivedInvoiceEntity> findFirstByParentIdAndSubtypeIgnoreCaseOrderByInvoiceDateDesc(
            String parentId,
            String subtype);
}
