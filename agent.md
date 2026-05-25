# Agent Implementation Plan

## Active Branch

- Work on `dev`.

## Skills Applied

- `spring-api-feature`
- `jwt-auth`

## First Milestone

Implement the first 5 steps of the backend coding plan:

1. Create Spring Boot project skeleton.
2. Add common `ApiResponse` and global exception handling.
3. Add `User`, `UserRole`, and `UserRepository`.
4. Add Spring Security and JWT infrastructure.
5. Implement signup, login, and `/api/auth/me`.

## Scope

This milestone creates the API foundation only. It does not implement weekly report item APIs, unit task APIs, merge APIs, admin APIs, Excel upload, or frontend changes.

## Security Decisions

- Passwords are hashed with BCrypt.
- JWT access tokens are issued after login.
- JWT secret is read from configuration/environment and is not hardcoded in source.
- `/api/auth/**` is unauthenticated.
- All other APIs require authentication.
- `/api/me` verifies token behavior and returns the current user without sensitive fields.
- Signup creates `MEMBER` accounts only. `ADMIN` self-registration is intentionally blocked for safety.

## Planned Files

- `pom.xml`
- `src/main/java/com/metabuild/weeklyreport/WeeklyReportApplication.java`
- `src/main/resources/application.yml`
- `src/main/java/com/metabuild/weeklyreport/common/ApiResponse.java`
- `src/main/java/com/metabuild/weeklyreport/common/ErrorCode.java`
- `src/main/java/com/metabuild/weeklyreport/common/GlobalExceptionHandler.java`
- `src/main/java/com/metabuild/weeklyreport/auth/controller/AuthController.java`
- `src/main/java/com/metabuild/weeklyreport/auth/controller/MeController.java`
- `src/main/java/com/metabuild/weeklyreport/auth/dto/SignupRequest.java`
- `src/main/java/com/metabuild/weeklyreport/auth/dto/LoginRequest.java`
- `src/main/java/com/metabuild/weeklyreport/auth/dto/AuthResponse.java`
- `src/main/java/com/metabuild/weeklyreport/auth/dto/UserResponse.java`
- `src/main/java/com/metabuild/weeklyreport/auth/service/AuthService.java`
- `src/main/java/com/metabuild/weeklyreport/security/SecurityConfig.java`
- `src/main/java/com/metabuild/weeklyreport/security/JwtAuthenticationFilter.java`
- `src/main/java/com/metabuild/weeklyreport/security/JwtTokenProvider.java`
- `src/main/java/com/metabuild/weeklyreport/security/CustomUserDetails.java`
- `src/main/java/com/metabuild/weeklyreport/security/CustomUserDetailsService.java`
- `src/main/java/com/metabuild/weeklyreport/user/entity/User.java`
- `src/main/java/com/metabuild/weeklyreport/user/entity/UserRole.java`
- `src/main/java/com/metabuild/weeklyreport/user/repository/UserRepository.java`
