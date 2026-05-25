package com.metabuild.weeklyreport.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank
        @Size(min = 4, max = 80)
        String loginId,

        @NotBlank
        @Size(min = 8, max = 100)
        String password,

        @NotBlank
        @Email
        @Size(max = 160)
        String email,

        @NotBlank
        @Size(max = 80)
        String name
) {
}
