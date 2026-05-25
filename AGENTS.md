# AGENTS.md

## Project Goal

This project is a weekly report web application derived from an existing project.

The final goal is:
- Users upload or enter weekly work report data.
- Users select items using checkboxes.
- Selected items can be merged by work category.
- The merged result is displayed as plain text.
- The final output should be easy to copy to clipboard.

## Development Rules

- Do not rewrite the whole project unless explicitly requested.
- Prefer small, reviewable changes.
- Before changing code, explain which files will be modified.
- Preserve existing authentication/session logic unless asked otherwise.
- Do not store sensitive user data in session unless already required by existing architecture.
- Use the existing project style, package structure, naming convention, and database access pattern.
- Add comments only where the logic is not obvious.
- Do not introduce new libraries without explaining why.

## Output Requirements

For every task:
1. Summarize the change.
2. List modified files.
3. Explain how to test manually.
4. Mention any assumptions.
5. ask the permission to commit, do not automatically commit.

## Weekly Report Domain

Core concepts:
- Weekly report
- Report item
- Unit task category
- Detail content
- Progress content
- Due date or completion status
- Selected item
- Merged report output
- Admin/User role
- Admin will merge the report that users submitted

Important UX:
- Desktop-first UI
- Checkbox selection
- Merge preview
- Copy-to-clipboard output
- Temporary save
- Save
- Edit
- Export later if needed
- login/logout (to check who is admin)