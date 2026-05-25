---
name: spring-api-feature
description: Use this skill when adding or modifying a Spring Boot REST API feature.
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

---
name: code-review
description: Use this skill when reviewing code changes before merging.
---

# Code Review Skill

Review the current changes with the following checklist.

## Checklist

1. Does the code satisfy the requested feature?
2. Are responsibilities separated properly?
3. Is business logic outside the Controller?
4. Are DTOs used instead of exposing Entities?
5. Are validation and error handling sufficient?
6. Are authentication and authorization handled correctly?
7. Are there possible null pointer errors?
8. Are there transaction boundaries where needed?
9. Are there unnecessary dependencies?
10. Are manual test steps clear?

## Output Format

Use this structure:

## Critical Issues
## Functional Issues
## Security Issues
## Maintainability Issues
## Suggested Fixes
## Test Cases
