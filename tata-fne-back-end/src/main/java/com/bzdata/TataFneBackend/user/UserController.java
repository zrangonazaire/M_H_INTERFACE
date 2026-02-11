package com.bzdata.TataFneBackend.user;

import com.bzdata.TataFneBackend.common.HttpResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static java.time.LocalDateTime.now;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{idUser}/roles/{idRole}/checkroleexist")
    public ResponseEntity<Boolean> userHasRole(
            @PathVariable Integer idUser,
            @PathVariable Integer idRole) {
        boolean exists = userService.getUserByIdAndIdRole(idUser, idRole);
        return ResponseEntity.ok(exists);
    }

    @GetMapping("/{idUser}/roles/{roleName}/checkrolenameexist")
    public ResponseEntity<Boolean> userHasRoleByName(
            @PathVariable Integer idUser,
            @PathVariable String roleName) {
        boolean exists = userService.getUserByIdAndRoleName(idUser, roleName);
        return ResponseEntity.ok(exists);
    }

    @PostMapping("/addroletouser/{idUser}/roles/{roleName}")
    public ResponseEntity<Void> addRoleToUser(
            @PathVariable Integer idUser,
            @PathVariable String roleName) {
        userService.addRoleToUser(idUser, roleName);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<HttpResponse> getAllUsers() {
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("Users retrieved successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("users", users))
                        .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HttpResponse> getUserById(@PathVariable Integer id) {
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("User retrieved successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("user", user))
                        .build());
    }

    @PutMapping("/{id}/lock")
    public ResponseEntity<HttpResponse> toggleAccountLock(
            @PathVariable Integer id,
            @RequestBody ToggleLockRequest request) {
        UserDTO updatedUser = userService.toggleAccountLock(id, request.isAccountLocked());
        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("User lock status updated successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("user", updatedUser))
                        .build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<HttpResponse> toggleAccountStatus(
            @PathVariable Integer id,
            @RequestBody ToggleStatusRequest request) {
        UserDTO updatedUser = userService.toggleAccountStatus(id, request.isEnabled());
        return ResponseEntity.ok(
                HttpResponse.builder()
                        .timeStamp(now().toString())
                        .message("User status updated successfully")
                        .statusCode(HttpStatus.OK.value())
                        .httpStatus(HttpStatus.OK)
                        .data(Map.of("user", updatedUser))
                        .build()
        );
    }

    @DeleteMapping("/removerolefromuser/{idUser}/roles/{roleName}")
    public ResponseEntity<Void> removeRoleFromUser(
            @PathVariable Integer idUser,
            @PathVariable String roleName) {
        userService.removeRoleFromUser(idUser, roleName);
        return ResponseEntity.ok().build();
    }
}

class ToggleLockRequest {
    private boolean accountLocked;

    public boolean isAccountLocked() {
        return accountLocked;
    }

    public void setAccountLocked(boolean accountLocked) {
        this.accountLocked = accountLocked;
    }
}

class ToggleStatusRequest {
    private boolean enabled;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
