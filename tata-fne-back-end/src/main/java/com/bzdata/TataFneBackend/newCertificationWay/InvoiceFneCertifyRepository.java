package com.bzdata.TataFneBackend.newCertificationWay;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface InvoiceFneCertifyRepository extends JpaRepository<InvoiceFneCertify, String> {
    long countByNumeroFacture(String numeroFacture);

    List<InvoiceFneCertify> findByNumeroFactureOrderByCreatedAtDesc(String numeroFacture);

    List<InvoiceFneCertify> findAllByOrderByCreatedAtDesc();

    Optional<InvoiceFneCertify> findByNumeroFacture(String numFacture);


    boolean existsByNumeroFacture(String numeroFacture);

    @Query("""
            select count(i)
            from InvoiceFneCertify i
            where i.status is not null and (
                lower(i.status) like '%certifi%'
                or lower(i.status) like '%certified%'
                or lower(i.status) like '%valide%'
                or lower(i.status) like '%validated%'
            )
            """)
    long countCertifiedInvoices();

    @Query("""
            select count(i)
            from InvoiceFneCertify i
            where i.status is not null and (
                lower(i.status) like '%attente%'
                or lower(i.status) like '%pending%'
                or lower(i.status) like '%in_progress%'
                or lower(i.status) like '%in progress%'
            )
            """)
    long countPendingInvoices();

    @Query("""
            select count(i)
            from InvoiceFneCertify i
            where i.status is not null and (
                lower(i.status) like '%annul%'
                or lower(i.status) like '%cancel%'
            )
            """)
    long countCancelledInvoices();

}
