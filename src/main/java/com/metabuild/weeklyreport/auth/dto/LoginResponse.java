package com.metabuild.weeklyreport.auth.dto;

import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.entity.UserRole;

public record LoginResponse(
        String accessToken,
        String tokenType,
        Long userId,
        String loginId,
        String email,
        String name,
        UserRole role
) {

    public static LoginResponse bearer(String accessToken, User user) {
        return new LoginResponse(
                accessToken,
                "Bearer",
                user.getId(),
                user.getLoginId(),
                user.getEmail(),
                user.getName(),
                user.getRole()
        );
    }
}
