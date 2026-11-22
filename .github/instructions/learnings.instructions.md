---
description: Lessons for planning, delegating, and integrating Voltask feature work
applyTo: '**/*'
---

## Learnings

- Split parallel work into end-to-end feature slices with agreed API, data, and UI contracts; avoid artificial file-ownership boundaries when they leave connected functionality unimplemented. Name an integration owner and verify the combined branches, not just each branch in isolation.
- Prompts must list acceptance criteria for complete user flows, including removal/deletion where applicable, profile loading and saving, and empty states such as a user with no teams. Require a report of completed criteria and anything left out.
- Frontend work must use a consistent shared palette/design system and verify readable contrast and usable interactions; do not accept arbitrary colors, unreadable text, static mockups, or a profile page that does not persist changes. Validate the integrated frontend and backend builds and core flows before considering the work complete.
