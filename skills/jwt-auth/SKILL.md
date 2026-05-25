---
name: jwt-auth
description: Use this skill when implementing or modifying JWT authentication in a Spring Boot project, including signup, login, BCrypt password hashing, token issuance, JWT filters, protected APIs, /api/me, and role-based 401/403 behavior.
---

# JWT Auth Skill

Use this skill for JWT login, signup, token validation, and protected APIs.

## Required Flow

1. Implement signup.
2. Hash password with BCrypt.
3. Implement login.
4. Issue access token.
5. Validate Authorization header.
6. Register JWT filter before UsernamePasswordAuthenticationFilter.
7. Allow unauthenticated access to /api/auth/**
8. Require authentication for protected APIs.
9. Add /api/me or equivalent endpoint to verify token behavior.

## Security Rules

- Never store plain text passwords.
- Never log raw JWT tokens.
- Never hardcode JWT secret in source code.
- Use environment variable or application config.
- Keep access token expiration configurable.
- Return 401 for unauthenticated requests.
- Return 403 for unauthorized role access.

## Output

Explain:

- Auth flow
- Modified security files
- Token claims
- Test requests
- Failure cases
