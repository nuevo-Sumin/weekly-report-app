package com.metabuild.weeklyreport.auth.controller;

import com.metabuild.weeklyreport.auth.dto.CurrentUserResponse;
import com.metabuild.weeklyreport.auth.service.AuthService;
import com.metabuild.weeklyreport.common.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    private final AuthService authService;

    public MeController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/api/me")
    public ApiResponse<CurrentUserResponse> me(Authentication authentication) {
        return ApiResponse.success(authService.getCurrentUser(authentication.getName()));
    }
}
