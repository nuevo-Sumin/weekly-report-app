package com.metabuild.weeklyreport.auth.dto;

import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.entity.UserRole;

public record SignupResponse(
        Long id,
        String loginId,
        String email,
        String name,
        UserRole role
) {

    public static SignupResponse from(User user) {
        return new SignupResponse(
                user.getId(),
                user.getLoginId(),
                user.getEmail(),
                user.getName(),
                user.getRole()
        );
    }
}
