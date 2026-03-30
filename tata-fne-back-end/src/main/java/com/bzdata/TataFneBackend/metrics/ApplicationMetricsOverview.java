package com.bzdata.TataFneBackend.metrics;

import java.time.Instant;

public record ApplicationMetricsOverview(
        String status,
        Instant collectedAt,
        HttpMetrics http,
        SystemMetrics system,
        FneInvoiceMetrics fneInvoices,
        AuditMetrics audit
) {
    public record HttpMetrics(
            int windowSeconds,
            long totalRequests,
            long successRequests,
            long errorRequests,
            double avgResponseTimeMs,
            long maxResponseTimeMs,
            double successRatePct,
            double errorRatePct
    ) {
    }

    public record SystemMetrics(
            Double cpuUsagePct,
            Double jvmMemoryUsagePct,
            long jvmUsedBytes,
            long jvmMaxBytes,
            String dbStatus,
            Long dbValidationTimeMs,
            Long dbSizeBytes,
            Integer dbActiveConnections,
            Integer dbMaxConnections,
            Double dbUsagePct
    ) {
    }

    public record FneInvoiceMetrics(
            long total,
            long certified,
            long pending,
            long cancelled,
            double certifiedRatePct
    ) {
    }

    public record AuditMetrics(
            long totalActions,
            long successActions,
            long errorActions
    ) {
    }
}
