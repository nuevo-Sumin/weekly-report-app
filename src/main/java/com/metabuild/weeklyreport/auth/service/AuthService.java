package com.metabuild.weeklyreport.auth.service;

import com.metabuild.weeklyreport.auth.dto.CurrentUserResponse;
import com.metabuild.weeklyreport.auth.dto.LoginRequest;
import com.metabuild.weeklyreport.auth.dto.LoginResponse;
import com.metabuild.weeklyreport.auth.dto.SignupRequest;
import com.metabuild.weeklyreport.auth.dto.SignupResponse;
import com.metabuild.weeklyreport.security.JwtTokenProvider;
import com.metabuild.weeklyreport.user.entity.RoleApprovalStatus;
import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.entity.UserRole;
import com.metabuild.weeklyreport.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.Locale;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        String loginId = normalizeLoginId(request.loginId());
        String email = normalizeEmail(request.email());
        String name = request.name().trim();

        if (userRepository.existsByLoginId(loginId)) {
            throw new IllegalArgumentException("Login id already exists.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists.");
        }

        UserRole requestedRole = request.requestedRole() == null ? UserRole.USER : request.requestedRole();
        UserRole grantedRole = requestedRole == UserRole.MANAGER ? UserRole.USER : requestedRole;
        RoleApprovalStatus roleApprovalStatus = requestedRole == UserRole.MANAGER
                ? RoleApprovalStatus.PENDING
                : RoleApprovalStatus.APPROVED;

        User user = new User(
                loginId,
                email,
                passwordEncoder.encode(request.password()),
                name,
                grantedRole,
                requestedRole,
                roleApprovalStatus
        );

        User savedUser = userRepository.save(user);
        return new SignupResponse(
                savedUser.getId(),
                savedUser.getLoginId(),
                savedUser.getEmail(),
                savedUser.getName(),
                savedUser.getRole(),
                savedUser.getRequestedRole(),
                savedUser.getRoleApprovalStatus()
        );
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String loginId = normalizeLoginId(request.loginId());

        User user = userRepository.findByLoginId(loginId)
                .filter(found -> passwordEncoder.matches(request.password(), found.getPasswordHash()))
                .filter(User::isActive)
                .orElseThrow(() -> new BadCredentialsException("Invalid login id or password."));

        String accessToken = jwtTokenProvider.createAccessToken(user);
        return LoginResponse.bearer(accessToken, user);
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUser(String loginId) {
        User user = userRepository.findByLoginId(loginId)
                .orElseThrow(() -> new EntityNotFoundException("User not found."));
        return CurrentUserResponse.from(user);
    }

    private String normalizeLoginId(String loginId) {
        return loginId.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
