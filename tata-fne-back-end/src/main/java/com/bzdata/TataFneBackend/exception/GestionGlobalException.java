package com.bzdata.TataFneBackend.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.bzdata.TataFneBackend.common.HttpResponse;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Slf4j
@RestControllerAdvice
public class GestionGlobalException {

    // 🔹 Gestion erreur "Ressource non trouvée"
    @ExceptionHandler(ResourceNonFoundException.class)
    public ResponseEntity<HttpResponse> handleNotFound(ResourceNonFoundException ex) {
        return ResponseEntity.status(NOT_FOUND).body(
                HttpResponse.builder()
                        .timeStamp(ZonedDateTime.now().toString())
                        .statusCode(NOT_FOUND.value())
                        .httpStatus(NOT_FOUND)
                        .reason("Ressource non trouvée")
                        .message(ex.getMessage())
                        .build()
        );
    }

    // 🔹 Gestion erreurs de validation DTO (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<HttpResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
                .getAllErrors()
                .stream()
                .map(error -> {
                    if (error instanceof FieldError fieldError) {
                        return fieldError.getDefaultMessage();
                    } else {
                        return error.getDefaultMessage();
                    }
                })
                .collect(Collectors.toList());

        return ResponseEntity.status(BAD_REQUEST).body(
                HttpResponse.builder()
                        .timeStamp(ZonedDateTime.now().toString())
                        .statusCode(BAD_REQUEST.value())
                        .httpStatus(BAD_REQUEST)
                        .reason("Erreur de validation des champs")
                        .data(Map.of("errors", errors))
                        .message(null)
                        .messageDeveloper(null)
                        .build()
                // on ajoute une extension pour les erreurs
        );
    }

    // 🔹 Gestion des contraintes sur les paramètres (ex: @Min, @Max)
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<HttpResponse> handleConstraintViolation(ConstraintViolationException ex) {
        List<String> errors = ex.getConstraintViolations()
                .stream()
                .map(v -> v.getMessage())
                .collect(Collectors.toList());

        return ResponseEntity.status(BAD_REQUEST).body(
                HttpResponse.builder()
                        .timeStamp(ZonedDateTime.now().toString())
                        .statusCode(BAD_REQUEST.value())
                        .httpStatus(BAD_REQUEST)
                        .reason("Violation de contrainte")
                        .data(Map.of("errors", errors))
                        .messageDeveloper(String.join(", ", errors))
                        .build()
        );
    }

    // 🔹 Gestion d'erreurs fonctionnelles (ex: API externe en 4xx)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<HttpResponse> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(BAD_REQUEST).body(
                HttpResponse.builder()
                        .timeStamp(ZonedDateTime.now().toString())
                        .statusCode(BAD_REQUEST.value())
                        .httpStatus(BAD_REQUEST)
                        .reason("Erreur de validation des champs")
                        .messageDeveloper(ex.getMessage())
                        .build()
        );
    }

    // 🔹 Gestion des erreurs d'authentification Spring Security
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<HttpResponse> handleAuthenticationException(AuthenticationException ex) {
        return ResponseEntity.status(UNAUTHORIZED).body(
                HttpResponse.builder()
                        .timeStamp(ZonedDateTime.now().toString())
                        .statusCode(UNAUTHORIZED.value())
                        .httpStatus(UNAUTHORIZED)
                        .reason("Authentification échouée")
                        .message("Email ou mot de passe incorrect.")
                        .messageDeveloper(ex.getMessage())
                        .build()
        );
    }

    // 🔹 Gestion d'erreurs génériques
    @ExceptionHandler(Exception.class)
    public ResponseEntity<HttpResponse> handleGeneric(Exception ex) {
        log.error("Erreur interne du serveur : ", ex);
        return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(
                HttpResponse.builder()
                        .timeStamp(ZonedDateTime.now().toString())
                        .statusCode(INTERNAL_SERVER_ERROR.value())
                        .httpStatus(INTERNAL_SERVER_ERROR)
                        .reason("Erreur interne du serveur")
                        .message("Une erreur inattendue s’est produite, veuillez contacter l’administrateur.")
                        .messageDeveloper(ex.getMessage())
                        .build()
        );
    }
}
