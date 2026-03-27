package com.bzdata.TataFneBackend.userSession;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("user-sessions")
@RequiredArgsConstructor
@Tag(name = "User Connection Tracking")
public class UserConnectionSessionController {

    private final UserConnectionSessionService sessionService;

    @PostMapping("/heartbeat")
    public ResponseEntity<Void> heartbeat(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            HttpServletRequest request
    ) {
        sessionService.registerActivity(
                authorizationHeader,
                sessionService.resolveClientIp(request),
                request.getHeader("User-Agent")
        );
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "manual") String reason,
            HttpServletRequest request
    ) {
        sessionService.registerLogout(
                authorizationHeader,
                reason,
                sessionService.resolveClientIp(request),
                request.getHeader("User-Agent")
        );
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<UserConnectionSessionResponse>> getRecentSessions(
            Authentication authentication,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(sessionService.getRecentSessions(authentication, authorizationHeader, limit));
    }
}
