package com.bzdata.TataFneBackend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ForgotPasswordRequest {

    @Email(message = "Email should be valid")
    @NotBlank(message = "Email is mandatory")
    @NotNull(message = "Email is mandatory")
    private String email;
}