package com.metabuild.weeklyreport.auth.controller;

import com.metabuild.weeklyreport.auth.dto.LoginRequest;
import com.metabuild.weeklyreport.auth.dto.LoginResponse;
import com.metabuild.weeklyreport.auth.dto.SignupRequest;
import com.metabuild.weeklyreport.auth.dto.SignupResponse;
import com.metabuild.weeklyreport.auth.service.AuthService;
import com.metabuild.weeklyreport.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<SignupResponse>> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(authService.signup(request), "Signup completed."));
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request), "Login completed.");
    }
}
