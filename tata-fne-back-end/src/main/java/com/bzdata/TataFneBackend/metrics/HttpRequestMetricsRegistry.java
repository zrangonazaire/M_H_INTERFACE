package com.bzdata.TataFneBackend.metrics;

import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class HttpRequestMetricsRegistry {
    private static final int WINDOW_SECONDS = 30;

    private final Object lock = new Object();
    private final Bucket[] buckets = new Bucket[WINDOW_SECONDS];

    public void record(int httpStatus, long durationMs) {
        long epochSecond = Instant.now().getEpochSecond();
        int index = (int) (epochSecond % WINDOW_SECONDS);

        synchronized (lock) {
            Bucket bucket = buckets[index];
            if (bucket == null || bucket.epochSecond != epochSecond) {
                bucket = new Bucket(epochSecond);
                buckets[index] = bucket;
            }

            bucket.total++;
            if (httpStatus >= 200 && httpStatus < 400) {
                bucket.success++;
            } else {
                bucket.error++;
            }

            bucket.totalDurationMs += durationMs;
            if (durationMs > bucket.maxDurationMs) {
                bucket.maxDurationMs = durationMs;
            }
        }
    }

    public Snapshot snapshot() {
        long nowSecond = Instant.now().getEpochSecond();
        long total = 0;
        long success = 0;
        long error = 0;
        long totalDurationMs = 0;
        long maxDurationMs = 0;

        synchronized (lock) {
            for (Bucket bucket : buckets) {
                if (bucket == null) {
                    continue;
                }
                if (nowSecond - bucket.epochSecond >= WINDOW_SECONDS) {
                    continue;
                }
                total += bucket.total;
                success += bucket.success;
                error += bucket.error;
                totalDurationMs += bucket.totalDurationMs;
                maxDurationMs = Math.max(maxDurationMs, bucket.maxDurationMs);
            }
        }

        double avg = total == 0 ? 0.0 : (double) totalDurationMs / total;
        double successRate = total == 0 ? 0.0 : (double) success * 100.0 / total;
        double errorRate = total == 0 ? 0.0 : (double) error * 100.0 / total;

        return new Snapshot(
                WINDOW_SECONDS,
                total,
                success,
                error,
                avg,
                maxDurationMs,
                successRate,
                errorRate
        );
    }

    public record Snapshot(
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

    private static final class Bucket {
        private final long epochSecond;
        private long total;
        private long success;
        private long error;
        private long totalDurationMs;
        private long maxDurationMs;

        private Bucket(long epochSecond) {
            this.epochSecond = epochSecond;
        }
    }
}

