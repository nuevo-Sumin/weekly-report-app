package com.metabuild.weeklyreport.auth.dto;

import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.entity.UserRole;

public record CurrentUserResponse(
        Long userId,
        String loginId,
        String email,
        String name,
        UserRole role
) {

    public static CurrentUserResponse from(User user) {
        return new CurrentUserResponse(
                user.getId(),
                user.getLoginId(),
                user.getEmail(),
                user.getName(),
                user.getRole()
        );
    }
}
