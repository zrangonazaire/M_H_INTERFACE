package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.bzdata.TataFneBackend.common.HttpResponse;

import java.util.Map;
import static java.time.LocalTime.now;
import static org.springframework.http.HttpStatus.OK;

@RestController
@RequestMapping("/societe")
@RequiredArgsConstructor
@Tag(name = "societe")
@Slf4j
public class SocieteSingularController {

    private final SocieteService societeService;

    @PostMapping("/save")
    public ResponseEntity<HttpResponse> save(@RequestBody SocieteRequestDTO request) {
        log.info("We are going to save a new societe {}", request.toString());
        var saved = societeService.create(request);

        log.info("We have saved a new societe {}", saved);
        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("societe saved successfully")
                        .statusCode(OK.value())
                        .data(Map.of("societe", saved))
                        .build()
        );
    }
}