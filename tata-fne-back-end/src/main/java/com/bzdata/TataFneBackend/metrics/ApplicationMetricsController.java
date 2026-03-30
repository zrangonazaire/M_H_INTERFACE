package com.bzdata.TataFneBackend.metrics;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/metrics")
@RequiredArgsConstructor
public class ApplicationMetricsController {

    private final ApplicationMetricsService metricsService;

    @GetMapping("/overview")
    public ApplicationMetricsOverview getOverview() {
        return metricsService.getOverview();
    }
}

