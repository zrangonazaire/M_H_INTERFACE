package com.bzdata.TataFneBackend.metrics;

import com.bzdata.TataFneBackend.auditTrail.UserActionAuditRepository;
import com.bzdata.TataFneBackend.auditTrail.UserActionAuditResult;
import com.bzdata.TataFneBackend.newCertificationWay.InvoiceFneCertifyRepository;
import com.zaxxer.hikari.HikariConfigMXBean;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ApplicationMetricsService {

    private final HttpRequestMetricsRegistry httpMetricsRegistry;
    private final DataSource dataSource;
    private final InvoiceFneCertifyRepository invoiceRepo;
    private final UserActionAuditRepository auditRepo;

    public ApplicationMetricsOverview getOverview() {
        Instant collectedAt = Instant.now();
        DbHealth dbHealth = checkDatabaseHealth();
        boolean databaseUp = dbHealth.up();

        var httpSnapshot = httpMetricsRegistry.snapshot();
        var http = new ApplicationMetricsOverview.HttpMetrics(
                httpSnapshot.windowSeconds(),
                httpSnapshot.totalRequests(),
                httpSnapshot.successRequests(),
                httpSnapshot.errorRequests(),
                round1(httpSnapshot.avgResponseTimeMs()),
                httpSnapshot.maxResponseTimeMs(),
                round1(httpSnapshot.successRatePct()),
                round1(httpSnapshot.errorRatePct())
        );

        var system = buildSystemMetrics(dbHealth);
        var audit = buildAuditMetrics(databaseUp);
        var fne = buildFneInvoiceMetrics(databaseUp);

        String status = dbHealth.status();

        return new ApplicationMetricsOverview(
                status,
                collectedAt,
                http,
                system,
                fne,
                audit
        );
    }

    private ApplicationMetricsOverview.SystemMetrics buildSystemMetrics(DbHealth dbHealth) {
        Double cpuUsagePct = readCpuUsagePct();

        long jvmMaxBytes = Runtime.getRuntime().maxMemory();
        long jvmUsedBytes = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        Double jvmMemoryUsagePct = jvmMaxBytes > 0 ? round1(jvmUsedBytes * 100.0 / jvmMaxBytes) : null;

        DbConnections dbConnections = readDbConnections();

        return new ApplicationMetricsOverview.SystemMetrics(
                cpuUsagePct,
                jvmMemoryUsagePct,
                jvmUsedBytes,
                jvmMaxBytes,
                dbHealth.status(),
                dbHealth.validationTimeMs(),
                dbHealth.sizeBytes(),
                dbConnections.activeConnections(),
                dbConnections.maxConnections(),
                dbConnections.usagePct()
        );
    }

    private ApplicationMetricsOverview.AuditMetrics buildAuditMetrics(boolean databaseUp) {
        if (!databaseUp) {
            return new ApplicationMetricsOverview.AuditMetrics(0, 0, 0);
        }

        try {
            long total = auditRepo.count();
            long success = auditRepo.countByResult(UserActionAuditResult.SUCCESS);
            long error = auditRepo.countByResult(UserActionAuditResult.ERROR);
            return new ApplicationMetricsOverview.AuditMetrics(total, success, error);
        } catch (Exception ignored) {
            return new ApplicationMetricsOverview.AuditMetrics(0, 0, 0);
        }
    }

    private ApplicationMetricsOverview.FneInvoiceMetrics buildFneInvoiceMetrics(boolean databaseUp) {
        if (!databaseUp) {
            return new ApplicationMetricsOverview.FneInvoiceMetrics(0, 0, 0, 0, 0.0);
        }

        try {
            long total = invoiceRepo.count();
            long certified = invoiceRepo.countCertifiedInvoices();
            long pending = invoiceRepo.countPendingInvoices();
            long cancelled = invoiceRepo.countCancelledInvoices();
            double certifiedRate = total == 0 ? 0.0 : (double) certified * 100.0 / total;

            return new ApplicationMetricsOverview.FneInvoiceMetrics(
                    total,
                    certified,
                    pending,
                    cancelled,
                    round1(certifiedRate)
            );
        } catch (Exception ignored) {
            return new ApplicationMetricsOverview.FneInvoiceMetrics(0, 0, 0, 0, 0.0);
        }
    }

    private DbHealth checkDatabaseHealth() {
        if (dataSource == null) {
            return new DbHealth("UP", null, null);
        }

        long startNs = System.nanoTime();
        try (Connection connection = dataSource.getConnection()) {
            boolean up = connection != null && connection.isValid(2);
            Long validationTimeMs = durationMs(startNs);
            Long sizeBytes = up ? readDatabaseSizeBytes(connection) : null;
            return new DbHealth(up ? "UP" : "DOWN", validationTimeMs, sizeBytes);
        } catch (Exception ignored) {
            return new DbHealth("DOWN", durationMs(startNs), null);
        }
    }

    private long durationMs(long startNs) {
        return Math.max(0L, (System.nanoTime() - startNs) / 1_000_000L);
    }

    private Long readDatabaseSizeBytes(Connection connection) {
        if (connection == null) {
            return null;
        }

        try {
            String productName = connection.getMetaData().getDatabaseProductName();
            if (productName == null || !productName.toLowerCase().contains("postgresql")) {
                return null;
            }
        } catch (Exception ignored) {
            return null;
        }

        try (var statement = connection.createStatement();
             var resultSet = statement.executeQuery("select pg_database_size(current_database())")) {
            if (resultSet.next()) {
                long size = resultSet.getLong(1);
                return resultSet.wasNull() ? null : size;
            }
        } catch (Exception ignored) {
            return null;
        }

        return null;
    }

    private Double readCpuUsagePct() {
        var bean = ManagementFactory.getOperatingSystemMXBean();

        if (bean instanceof com.sun.management.OperatingSystemMXBean sunBean) {
            double value = sunBean.getProcessCpuLoad();
            if (value >= 0.0) {
                return round1(value * 100.0);
            }
            value = sunBean.getSystemCpuLoad();
            if (value >= 0.0) {
                return round1(value * 100.0);
            }
        }

        return null;
    }

    private DbConnections readDbConnections() {
        HikariDataSource hikari = unwrapHikari(dataSource);
        if (hikari == null) {
            return new DbConnections(null, null, null);
        }

        Integer activeConnections = null;
        Integer maxConnections = null;

        try {
            HikariPoolMXBean pool = hikari.getHikariPoolMXBean();
            if (pool != null) {
                activeConnections = pool.getActiveConnections();
            }
        } catch (Exception ignored) {
            // Ignore pool lookup errors.
        }

        try {
            HikariConfigMXBean config = hikari.getHikariConfigMXBean();
            if (config != null) {
                maxConnections = config.getMaximumPoolSize();
            }
        } catch (Exception ignored) {
            // Ignore config lookup errors.
        }

        Double usagePct = null;
        if (activeConnections != null && maxConnections != null && maxConnections > 0) {
            usagePct = round1(activeConnections * 100.0 / maxConnections);
        }

        return new DbConnections(activeConnections, maxConnections, usagePct);
    }

    private HikariDataSource unwrapHikari(DataSource candidate) {
        if (candidate == null) {
            return null;
        }

        try {
            if (candidate.isWrapperFor(HikariDataSource.class)) {
                return candidate.unwrap(HikariDataSource.class);
            }
        } catch (Exception ignored) {
            // Continue with manual unwrapping.
        }

        if (candidate instanceof HikariDataSource hikariDataSource) {
            return hikariDataSource;
        }

        if (candidate instanceof DelegatingDataSource delegating && delegating.getTargetDataSource() != null) {
            return unwrapHikari(delegating.getTargetDataSource());
        }

        return null;
    }

    private double round1(double value) {
        if (!Double.isFinite(value)) {
            return 0.0;
        }

        double rounded = Math.round(value * 10.0) / 10.0;
        if (Math.abs(rounded) < 0.05) {
            return 0.0;
        }
        return rounded;
    }

    private record DbConnections(Integer activeConnections, Integer maxConnections, Double usagePct) {
    }

    private record DbHealth(String status, Long validationTimeMs, Long sizeBytes) {
        boolean up() {
            return "UP".equalsIgnoreCase(status);
        }
    }
}
