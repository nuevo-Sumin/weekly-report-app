package com.metabuild.weeklyreport.auth.service;

import com.metabuild.weeklyreport.auth.dto.SignupRequest;
import com.metabuild.weeklyreport.auth.dto.SignupResponse;
import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        if (userRepository.existsByLoginId(request.loginId())) {
            throw new IllegalArgumentException("Login id already exists.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists.");
        }

        User user = new User(
                request.loginId(),
                request.email(),
                passwordEncoder.encode(request.password()),
                request.name(),
                request.role()
        );

        return SignupResponse.from(userRepository.save(user));
    }
}
