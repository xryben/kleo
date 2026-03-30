# Kleo v2 — Coding Standards

> No code ships without Tech Lead approval. These standards are enforced by linting, pre-commit hooks, and PR review.

---

## 1. TypeScript

### Strict Mode (Required)

Both backend and frontend MUST compile with strict TypeScript settings enabled.

- **No `any`** — use explicit types. If truly unavoidable, add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a justification comment.
- **No non-null assertions (`!`)** — use proper null checks, optional chaining (`?.`), or nullish coalescing (`??`).
- **No `as` type assertions** unless casting from `unknown` after validation.
- **Prefer `unknown` over `any`** for values of uncertain type — validate before using.

### Naming Conventions

| Element         | Convention            | Example                    |
|-----------------|-----------------------|----------------------------|
| Files           | `kebab-case`          | `view-tracking.service.ts` |
| Classes         | `PascalCase`          | `PaymentsService`          |
| Interfaces      | `PascalCase`          | `CampaignFilter`           |
| Functions       | `camelCase`           | `calculateEarnings`        |
| Constants       | `UPPER_SNAKE_CASE`    | `MAX_UPLOAD_SIZE`          |
| Enums           | `PascalCase`          | `ClaimStatus`              |
| Enum members    | `UPPER_SNAKE_CASE`    | `ClaimStatus.PENDING`      |
| DB columns      | `camelCase` (Prisma)  | `stripeCustomerId`         |

---

## 2. Backend (NestJS)

### Input Validation

- **Every endpoint** must use a DTO class with `class-validator` decorators.
- `ValidationPipe` is globally enabled with `whitelist: true` and `forbidNonWhitelisted: true`.
- Validate pagination: `page >= 1`, `limit` between 1–100.
- Validate all numeric query parameters (no negative values, no NaN).

### Authorization

- **Every non-public endpoint** must use `@UseGuards(AuthGuard('jwt'))`.
- **Ownership checks are mandatory** — never return data the user doesn't own unless it's explicitly public.
- Document public endpoints with `// PUBLIC` comment on the route decorator.

### Security

- **Never use `execSync()` or `exec()` with string interpolation.** Use `execFileSync()` with argument arrays.
- **Validate file paths** — ensure all file operations stay within `UPLOADS_PATH` using `path.resolve()` + prefix check.
- **Sanitize external input** before embedding in shell commands, database queries, or template strings.
- **Stripe webhooks** — always verify signatures. Add idempotency checks for payment events.
- **No secrets in code** — all credentials via environment variables.

### Error Handling

- Use NestJS built-in exceptions (`NotFoundException`, `ForbiddenException`, `BadRequestException`, etc.).
- **Never swallow errors** — empty `catch {}` blocks are forbidden.
- Log errors server-side with context. Return generic messages to clients.
- Use structured logging: `this.logger.error('message', { context, userId, entityId })`.

### Database (Prisma)

- **No raw SQL** unless reviewed and parameterized.
- **Avoid N+1 queries** — use `include` or `select` to fetch related data in one query.
- **Use transactions** for multi-step writes (especially payments, claims, earnings).
- **Add database indexes** for columns used in WHERE, ORDER BY, or JOIN clauses.
- **Migrations must be reversible** — test rollback before merging.

### Configuration

- Access environment variables through `ConfigService`, not `process.env` directly.
- Validate all required env vars at application startup.
- No hardcoded magic numbers — extract to named constants or config.

### Testing

- **Unit tests** for all services and utility functions.
- **Integration tests** for API endpoints (use real database, not mocks).
- **Minimum coverage target**: 60% line coverage for new code.
- Test files live alongside source files: `*.spec.ts` for unit, `*.e2e-spec.ts` for integration.

---

## 3. Frontend (Next.js)

### Component Standards

- Use functional components with hooks. No class components.
- One component per file. File name matches component name.
- Co-locate styles, types, and tests with the component.

### State & Data Fetching

- Handle all three states: **loading**, **error**, **success** — never render stale/empty UI silently.
- Add cleanup/abort signals to `useEffect` data fetching to prevent memory leaks.
- Never access `localStorage` or `window` without a `typeof window !== 'undefined'` guard at call-time (not module-level).

### Security

- **No `dangerouslySetInnerHTML`** without sanitization.
- **No tokens in localStorage** for new features — migrate to HttpOnly cookies.
- Validate and sanitize all URLs before rendering in `<a>`, `<img>`, or `<iframe>` tags.

### Error Handling

- **No `alert()` or `confirm()`** — use Radix UI Toast and Dialog components.
- Catch errors with typed handlers, not `catch (err: any)`.
- Add React Error Boundaries at page level.

### Accessibility

- All interactive elements must be keyboard-accessible.
- Images require `alt` text.
- Form inputs require `<label>` or `aria-label`.
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`).
- Use Radix UI primitives for modals, dropdowns, tooltips — not custom `<div>` overlays.

### UI Consistency

- Use components from `src/components/ui/` — don't inline duplicate styles.
- Use design tokens from `src/lib/design-tokens.ts` for colors and status mappings.
- Use Next.js `<Image>` component instead of `<img>` for optimized loading.

---

## 4. Code Quality Rules

### Forbidden Patterns

```typescript
// ❌ NEVER DO THIS
const filter: any = {};                        // Use proper types
execSync(`command ${userInput}`);              // Command injection risk
catch {}                                       // Swallowed error
catch (err: any) { err.response.data }        // Untyped error access
user!.stripeCustomerId!                        // Non-null assertion chain
createReadStream(record.filePath)             // Unvalidated file path
```

```typescript
// ✅ DO THIS INSTEAD
const filter: Prisma.CampaignWhereInput = {};  // Typed
execFileSync('command', [userInput]);           // Safe execution
catch (err) { logger.error('msg', err); throw err; }  // Logged + re-thrown
catch (err) { if (err instanceof AxiosError) { ... } } // Type-narrowed
if (user?.stripeCustomerId) { ... }            // Safe access
const resolved = path.resolve(UPLOADS_PATH, filename);
if (!resolved.startsWith(UPLOADS_PATH)) throw new ForbiddenException();
```

### Performance

- Paginate all list queries. Maximum page size: 100.
- Add timeouts to all external HTTP calls (10s default).
- Use database indexes for filtered/sorted columns.
- Avoid loading entire collections into memory.

### Code Organization

- No business logic in controllers — controllers validate input and delegate to services.
- No database access outside services/repositories.
- Extract shared logic into well-named utility modules (only when used 3+ times).

---

## 5. Git & PR Standards

### Branch Naming

- `feature/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `refactor/<short-description>` — refactoring
- `chore/<short-description>` — tooling, CI, dependencies

### Commit Messages

Imperative mood, concise:
- `add multi-URL submission endpoint`
- `fix earnings aggregation for cross-platform claims`
- `update Prisma schema for claim-level earnings`

### Pull Requests

- Fill out the PR template completely.
- Link the relevant issue.
- No `console.log` or debug code.
- All checks must pass (lint, type-check, tests) before review.
- **Tech Lead is a required reviewer.**
- Squash-merge into `main`.

### Pre-Commit Hooks

The following run automatically on every commit:
1. **ESLint** — code quality and error detection
2. **Prettier** — code formatting
3. **TypeScript** — type checking
4. **Tests** — affected test files

---

## 6. Enforcement

- **Linting**: ESLint with `@typescript-eslint` rules (errors, not warnings).
- **Formatting**: Prettier with project config (enforced on save and pre-commit).
- **Type Checking**: `tsc --noEmit` in CI and pre-commit.
- **PR Review**: Tech Lead reviews every PR for architecture, correctness, security, performance, and test coverage.
- **CI Pipeline**: All checks must pass before merge is allowed.
