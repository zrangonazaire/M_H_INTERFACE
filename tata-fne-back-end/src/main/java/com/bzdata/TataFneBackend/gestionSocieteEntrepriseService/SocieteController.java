package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.bzdata.TataFneBackend.common.HttpResponse;

import java.util.Map;
import static java.time.LocalTime.now;
import static org.springframework.http.HttpStatus.OK;

@RestController
@RequestMapping("/societes")
@RequiredArgsConstructor
@Tag(name = "societes")
@Slf4j
public class SocieteController {

    @PostMapping("/societe/save")
    public ResponseEntity<HttpResponse> saveSociete(@RequestBody SocieteRequestDTO request) {
        log.info("We are going to save a new societe via singular endpoint {}", request.toString());
        var saved = societeService.create(request);

        log.info("We have saved a new societe via singular endpoint {}", saved);
        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("societe saved successfully")
                        .statusCode(OK.value())
                        .data(Map.of("societe", saved))
                        .build()
        );
    }

    private final SocieteService societeService;

    @PostMapping("/create")
    public ResponseEntity<HttpResponse> create(@RequestBody SocieteRequestDTO request) {
        log.info("We are going to create a new role {}", request.toString());
        var saved = societeService.create(request);

        log.info("We are created a new user{}", saved);
        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("societe created successfully")
                        .statusCode(OK.value())
                        .data(Map.of("societe", saved))
                        .build()
        );
    }

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
    @GetMapping
    public ResponseEntity<HttpResponse> findAll() {
        log.info("Fetching all societes...");
     var allSocietes = societeService.findAll();
        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Societes retrieved successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("societies", allSocietes))
                        .build()
        );
    }

    @GetMapping("/paginated")
    public ResponseEntity<HttpResponse> findAllPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching paginated societes - page: {}, size: {}", page, size);
        var societePage = societeService.findAll(page, size);
        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Societes retrieved successfully with pagination")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of(
                                "societies", societePage.getContent(),
                                "currentPage", societePage.getNumber(),
                                "totalItems", societePage.getTotalElements(),
                                "totalPages", societePage.getTotalPages()
                        ))
                        .build()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<HttpResponse> findById(@PathVariable int id) {
       log.info("Fetching societe with id {}", id);
      var getSociete=  societeService.findById(id);
        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("societe retrieved successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("societe", getSociete))
                        .build()
        );

    }

}
