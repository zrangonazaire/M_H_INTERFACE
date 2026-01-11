package com.bzdata.GestionCinema.attributionDroit;

import com.bzdata.GestionCinema.common.HttpResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static java.time.LocalDateTime.now;

@RestController
@RequestMapping("/attributions")
@RequiredArgsConstructor
@Slf4j
@Tag(name="attributions")
public class AttributionController {

    private final AttributionService service;

    // ✅ Créer une attribution
    @PostMapping
    public ResponseEntity<HttpResponse> create(@RequestBody AttributionDTO dto) {
        log.info("Creating attribution: {}", dto);
        AttributionDTO created = service.create(dto);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Attribution created successfully")
                        .statusCode(HttpStatus.CREATED.value())
                        .httpStatus(HttpStatus.CREATED)
                        .data(Map.of("attribution", created))
                        .build()
        );
    }

    // ✅ Mettre à jour une attribution
    @PutMapping("/{id}")
    public ResponseEntity<HttpResponse> update(@PathVariable int id, @RequestBody AttributionDTO dto) {
        log.info("Updating attribution id {} with data {}", id, dto);
        AttributionDTO updated = service.update(id, dto);

        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Attribution updated successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("attribution", updated))
                        .build()
        );
    }

    // ✅ Supprimer une attribution
    @DeleteMapping("/{id}")
    public ResponseEntity<HttpResponse> delete(@PathVariable int id) {
        log.info("Deleting attribution with id {}", id);
        service.delete(id);

        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Attribution deleted successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .build()
        );
    }

    // ✅ Récupérer toutes les attributions
    @GetMapping
    public ResponseEntity<HttpResponse> getAll() {
        log.info("Fetching all attributions");
        List<AttributionDTO> list = service.getAll();

        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Attributions retrieved successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("attributions", list))
                        .build()
        );
    }

    // ✅ Récupérer une attribution par ID
    @GetMapping("/{id}")
    public ResponseEntity<HttpResponse> getById(@PathVariable int id) {
        log.info("Fetching attribution with id {}", id);
        AttributionDTO dto = service.getById(id);

        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Attribution retrieved successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("attribution", dto))
                        .build()
        );
    }

    // ✅ Récupérer les attributions d’un utilisateur
    @GetMapping("/user/{userId}")
    public ResponseEntity<HttpResponse> getByUserId(@PathVariable int userId) {
        log.info("Fetching attributions for userId {}", userId);
        List<AttributionDTO> list = service.getByUserId(userId);

        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("User attributions retrieved successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("attributions", list))
                        .build()
        );
    }
}
