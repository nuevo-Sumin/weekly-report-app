package com.metabuild.weeklyreport.auth.dto;

import com.metabuild.weeklyreport.user.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank
        @Size(min = 4, max = 80)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "must contain only letters, numbers, dots, underscores, or hyphens")
        String loginId,

        @NotBlank
        @Size(min = 8, max = 100)
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "must contain at least one letter and one number")
        String password,

        @NotBlank
        @Email
        @Size(max = 160)
        String email,

        @NotBlank
        @Size(max = 80)
        String name,

        UserRole requestedRole
) {

    public SignupRequest(String loginId, String password, String email, String name) {
        this(loginId, password, email, name, UserRole.USER);
    }
}
