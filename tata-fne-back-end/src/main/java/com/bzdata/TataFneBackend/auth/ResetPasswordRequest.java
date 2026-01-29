package com.bzdata.TataFneBackend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResetPasswordRequest {

    @NotBlank(message = "Token is mandatory")
    @NotNull(message = "Token is mandatory")
    private String token;

    @NotBlank(message = "New password is mandatory")
    @NotNull(message = "New password is mandatory")
    @Size(min = 8, message = "New password must be at least 8 characters long")
    private String newPassword;

    @NotBlank(message = "Please confirm the new password")
    @NotNull(message = "Please confirm the new password")
    private String confirmPassword;
}