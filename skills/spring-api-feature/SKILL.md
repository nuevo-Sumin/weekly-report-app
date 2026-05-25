---
name: spring-api-feature
description: Use this skill when adding or modifying a Spring Boot REST API feature, including controller, service, repository, DTO, validation, ApiResponse, and API tests.
---

# Spring API Feature Skill

When implementing a new API feature, follow this order.

## Steps

1. Identify the domain package.
2. Create or update request/response DTOs.
3. Keep Controller thin.
4. Put business rules in Service.
5. Put DB access only in Repository.
6. Add validation annotations to request DTOs.
7. Use existing ApiResponse format if available.
8. Add or update tests when possible.
9. Explain manual test steps.

## Rules

- Do not put business logic in Controller.
- Do not return Entity directly from Controller.
- Do not introduce new dependencies without explaining why.
- Preserve existing package naming conventions.
- Keep changes small and reviewable.

## Output

After changes, report:

- Modified files
- API endpoint summary
- Validation rules
- Manual test steps
- Known assumptions
