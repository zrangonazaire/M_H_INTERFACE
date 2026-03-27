package com.bzdata.TataFneBackend.auditTrail;

import com.bzdata.TataFneBackend.common.HttpResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

@RestController
@RequestMapping("audit-logs")
@RequiredArgsConstructor
@Tag(name = "User Action Audit")
public class UserActionAuditController {

    private final UserActionAuditService auditService;

    @GetMapping
    public ResponseEntity<HttpResponse> getAuditLogs(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String httpMethod,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        var auditPage = auditService.findAuditLogs(
                authentication,
                page,
                size,
                search,
                module,
                httpMethod,
                result,
                fromDate,
                toDate
        );

        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(LocalTime.now().toString())
                        .message("Journal d'audit recupere avec succes")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of(
                                "auditLogs", auditPage.getContent(),
                                "currentPage", auditPage.getNumber(),
                                "totalItems", auditPage.getTotalElements(),
                                "totalPages", auditPage.getTotalPages()
                        ))
                        .build()
        );
    }

    @GetMapping("/modules")
    public ResponseEntity<HttpResponse> getModules(Authentication authentication) {
        var modules = auditService.findAvailableModules(authentication);

        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(LocalTime.now().toString())
                        .message("Modules d'audit recuperes avec succes")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("modules", modules))
                        .build()
        );
    }
}
