package com.metabuild.weeklyreport.auth.controller;

import com.metabuild.weeklyreport.auth.dto.UserResponse;
import com.metabuild.weeklyreport.auth.service.AuthService;
import com.metabuild.weeklyreport.common.ApiResponse;
import com.metabuild.weeklyreport.security.CustomUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MeController {

    private final AuthService authService;

    public MeController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(authService.me(userDetails));
    }
}
