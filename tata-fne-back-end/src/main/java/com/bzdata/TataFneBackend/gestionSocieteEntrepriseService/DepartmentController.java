package com.bzdata.TataFneBackend.gestionSocieteEntrepriseService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.bzdata.TataFneBackend.common.HttpResponse;
import com.bzdata.TataFneBackend.user.User;

import java.util.List;
import java.util.Map;

import static java.time.LocalTime.now;
import static org.springframework.http.HttpStatus.OK;

@Slf4j
@RestController
@RequestMapping("/departments")
@Tag(name="department")
@RequiredArgsConstructor
public class DepartmentController {


    private final DepartmentService departmentService;


    @PostMapping("/create")
    public ResponseEntity<HttpResponse> create(@RequestBody DepartmentRequestDto service) {
        DepartmentResponseDto saved = departmentService.create(service);
        log.info("We are created a new ServiceUnit{}", saved);
        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("ServiceUnit created successfully")
                        .statusCode(OK.value())
                        .data(Map.of("ServiceUnit", saved))
                        .build()
        );
    }


    @PostMapping("/{serviceId}/utilisateurs")
    public ResponseEntity<HttpResponse> addUsers(@PathVariable Long serviceId, @RequestBody List<Integer> utilisateurIds) {
        var saved= departmentService.addUsers(serviceId, utilisateurIds);
        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("ServiceUnit created successfully")
                        .statusCode(OK.value())
                        .data(Map.of("ServiceUnit", saved))
                        .build()
        );
    }


    @DeleteMapping("/{serviceId}/utilisateurs/{utilisateurId}")
    public ResponseEntity<HttpResponse>  removeUser(@PathVariable Long serviceId, @PathVariable int utilisateurId) {
       var ListOfDepartment= departmentService.removeUser(serviceId, utilisateurId);
        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("ServiceUnit created successfully")
                        .statusCode(OK.value())
                        .data(Map.of("ServiceUnit", ListOfDepartment))
                        .build()
        );
    }


    @GetMapping("/etablissement/{etablissementId}")
    public ResponseEntity<HttpResponse> getServicesByEtablissement(@PathVariable int etablissementId) {
        var all= departmentService.getServicesByEtablissement(etablissementId);

        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("ServiceUnit created successfully")
                        .statusCode(OK.value())
                        .data(Map.of("ServiceUnit", all))
                        .build()
        );
    }


    @GetMapping("/{serviceId}/utilisateurs")
    public ResponseEntity<HttpResponse> getUtilisateursByService(@PathVariable Long serviceId) {
     var   allusersByservices= departmentService.getUtilisateursByService(serviceId);

        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Users retrieved successfully")
                        .statusCode(OK.value())
                        .data(Map.of("users", allusersByservices))
                        .build()
        );
    }


    @PutMapping("/{id}")
    public ResponseEntity<HttpResponse> update(@PathVariable Long id, @RequestBody Department service) {
         var updateDepartment=departmentService.updateService(id, service.getNom(), service.getCode());

        return ResponseEntity.ok().body(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("ServiceUnit created successfully")
                        .statusCode(OK.value())
                        .data(Map.of("ServiceUnit", updateDepartment))
                        .build()
        );
    }


    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        departmentService.deleteService(id);
    }
}
