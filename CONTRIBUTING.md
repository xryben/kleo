# Contributing to Kleo

## Code Review Process

Every change to `main` requires a pull request with CTO approval. No exceptions.

### Rules

1. **No direct pushes to `main`.** All changes go through a PR.
2. **No force-pushing to `main`.** Ever.
3. **CTO is a required reviewer** on all PRs.
4. **PRs must have a clear description** — what changed and why.
5. **Tests are required** for new features and bug fixes.

### PR Workflow

1. Create a feature branch from `main` (`feature/description` or `fix/description`).
2. Make your changes. Commit with clear messages.
3. Open a PR using the provided template — fill out every section.
4. CTO reviews and approves (or requests changes).
5. After approval, squash-merge into `main`.

### Quality Standards

- **TypeScript** — no untyped `any` without justification.
- **Error handling** — handle errors explicitly; never swallow them.
- **Security** — no secrets in code, no SQL injection, no XSS. Follow OWASP guidelines.
- **Database migrations** — must be reversible. Test rollback before merging.
- **Tests** — unit tests for services/utils, integration tests for API endpoints, E2E tests for critical flows.

### Tech Stack

| Layer    | Stack                            |
|----------|----------------------------------|
| Backend  | NestJS, Prisma, PostgreSQL       |
| Frontend | Next.js, Tailwind CSS, TypeScript|

### Branch Naming

- `feature/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `refactor/<short-description>` — refactoring
- `chore/<short-description>` — tooling, CI, dependencies

### Commit Messages

Use concise, imperative messages:
- `add multi-URL submission endpoint`
- `fix earnings aggregation for cross-platform claims`
- `update Prisma schema for claim-level earnings`
