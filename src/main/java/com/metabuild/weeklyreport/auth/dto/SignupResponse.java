package com.metabuild.weeklyreport.auth.dto;

import com.metabuild.weeklyreport.user.entity.UserRole;

public record SignupResponse(
        Long id,
        String loginId,
        String email,
        String name,
        UserRole role
) {
}
