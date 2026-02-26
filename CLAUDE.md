# Shared Wings — Engineering Standards

This is the single source of truth for any AI agent or developer working on this codebase.

## Project Overview

Shared Wings is a SvelteKit web app for UK aircraft co-ownership groups (2–6 people). It handles booking, expenses, compliance tracking, and maintenance logging for shared aircraft.

## Tech Stack

- **Framework:** SvelteKit (latest, Svelte 5 runes)
- **Language:** TypeScript (strict mode)
- **UI:** shadcn-svelte + Tailwind CSS v4 (no tailwind.config — uses `@theme` in app.css + `@tailwindcss/vite` plugin)
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL on Render (managed, PgBouncer connection pooling)
- **Auth:** Clerk (hosted auth, organisations, invitations) via `svelte-clerk`
- **Hosting:** Vercel (`adapter-vercel`)
- **Payments:** Stripe (Checkout + Billing Portal) — not yet implemented
- **Email:** Resend
- **Testing:** Vitest (unit/integration) + Playwright (e2e)
- **Linting:** ESLint 9 (flat config) + Prettier + eslint-plugin-svelte
- **Package Manager:** pnpm
- **Forms:** sveltekit-superforms + Zod

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm check            # TypeScript + svelte-check
pnpm lint             # Prettier + ESLint check
pnpm format           # Auto-format with Prettier
pnpm test:unit        # Run unit tests (Vitest)
pnpm test:e2e         # Run e2e tests (Playwright)
pnpm db:generate      # Generate Drizzle migration
pnpm db:migrate       # Apply Drizzle migration
pnpm db:studio        # Open Drizzle Studio
```

## Naming Conventions

### Files

- Svelte components: `PascalCase.svelte` (BookingCard.svelte, ExpenseForm.svelte)
- TypeScript modules: `camelCase.ts` (validation.ts, format.ts)
- Route files: SvelteKit convention (+page.svelte, +page.server.ts, +server.ts)
- Test files: `[name].test.ts` (schema.test.ts, booking.test.ts)
- E2E tests: `[feature].spec.ts` (calendar.spec.ts)

### Code

- Variables/functions: `camelCase` (getUserBookings, formatCurrency)
- Types/interfaces: `PascalCase` (Booking, ExpenseSplit, ComplianceItem)
- Constants: `SCREAMING_SNAKE_CASE` (MAX_MEMBERS_PER_GROUP, ALERT_DAYS_DEFAULT)
- Drizzle tables: `camelCase` plural (bookings, expenses, complianceItems)
- Database columns: `camelCase` (createdAt, dueDate, engineHours)
- CSS: Tailwind utilities only. No custom CSS classes unless absolutely necessary.
- Environment variables: `SCREAMING_SNAKE_CASE` with `PUBLIC_` prefix for client-exposed vars

## SvelteKit Patterns

### Data Loading

- Always use `+page.server.ts` for loading data. Never fetch from the client on page load.
- The `load` function returns typed data that `+page.svelte` receives as `$props()`.
- Keep load functions thin — query the DB, shape the data, return it. No business logic.

### Mutations (Form Actions)

- Use SvelteKit form actions for **all** write operations (create, update, delete).
- Define actions in `+page.server.ts` alongside the load function.
- Use `sveltekit-superforms` for form handling: ties Zod validation to form actions with client-side validation, progressive enhancement, and typed errors.
- Always validate input with Zod in the action before touching the database.
- Return via `message(form, '...')` on success or `fail(400, { form })` on validation error.
- Forms must work without JavaScript (progressive enhancement).

### API Routes (+server.ts)

- **Only use for:** webhooks, cron jobs, file downloads (.ics), and endpoints consumed by external services.
- **Never use for:** data that a page needs (use load functions) or form mutations (use form actions).
- Always return proper HTTP status codes and typed JSON responses.
- Always validate request body/params with Zod.

### Components

- Use shadcn-svelte for all base UI (Button, Card, Input, Dialog, Table, etc.).
- Never build a custom component if shadcn-svelte has one.
- App-specific components go in `$lib/components/app/` and compose shadcn primitives.
- Keep components under 150 lines. Split if exceeding.
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) — not legacy stores.

## Database & Drizzle Patterns

### Schema

- All tables in `$lib/server/db/schema.ts`.
- Use Drizzle's `pgTable` with explicit column types.
- Every table must have: `id` (uuid, primaryKey, defaultRandom), `createdAt` (timestamp, defaultNow), `updatedAt` (timestamp).
- Use `pgEnum` for constrained text fields (roles, categories, types).
- Use `relations()` to define relationships between tables.
- Add `onDelete: 'cascade'` on foreign keys where appropriate.
- Add database indexes for columns you filter/sort on (groupId, aircraftId, dueDate).
- Add unique composite constraints where needed (e.g., groupMembers on groupId+userId).

### Queries

- Write queries directly in `+page.server.ts` load functions and form actions. No repository/service layer.
- Use Drizzle's query builder (`db.select()`, `db.insert()`, `db.update()`, `db.delete()`).
- **Always scope queries by groupId** to enforce data isolation between partnerships.
- Use `db.transaction()` for operations that modify multiple tables or need atomicity (e.g., booking conflict detection + insert).

### Migrations

- Generate: `pnpm db:generate`
- Apply: `pnpm db:migrate`
- Never edit generated migration files.
- Commit migration files to git.

## Validation

- Define Zod schemas in `$lib/utils/validation.ts` for shared schemas, or co-locate in route `schema.ts` files for route-specific schemas.
- Every form action must validate input with Zod before any DB operation.
- Every API route must validate request body/params with Zod.
- Use `sveltekit-superforms` with the `zod` adapter for form handling.
- Never trust client input. Re-validate on the server even if client-side validation exists.

## Auth Patterns (Clerk)

Clerk handles authentication, user management, and organisation/invitation flows. No session tables, no password hashing — Clerk owns all of it. SvelteKit integration via `svelte-clerk`.

### Server hook

```typescript
// src/hooks.server.ts
import { withClerkHandler } from 'svelte-clerk/server';
import type { Handle } from '@sveltejs/kit';
export const handle: Handle = withClerkHandler();
```

### Protected route layout

```typescript
// src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
export const load = async ({ locals }) => {
	const { userId } = locals.auth;
	if (!userId) throw redirect(302, '/login');
	return { userId };
};
```

### Auth rules

- All `(app)` routes are protected by the layout guard above.
- Use Clerk's hosted components (`<SignIn />`, `<SignUp />`) — no custom auth forms.
- Use Clerk Organisations for aircraft partnership groups (one Clerk org = one partnership).
- Sync Clerk data to Postgres via webhooks (user.created, user.updated, organization.created, etc.).
- Env vars: `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

## Logging

Use the structured logger at `$lib/server/logger.ts`. All logs are JSON for Vercel log drain compatibility.

### What to log

- Every form action entry and exit (action name, userId, groupId, success/failure)
- Every API route hit (method, path, userId if authed, response status)
- Auth events (failed auth attempts, webhook events)
- Errors (full stack trace, request context, userId)

### What NOT to log

- Passwords, tokens, card numbers, session secrets
- Full request bodies (log only relevant fields)

## Error Handling

```typescript
// In load functions: throw error()
import { error } from '@sveltejs/kit';
if (!group) throw error(404, 'Group not found');

// In form actions: return fail()
import { fail } from '@sveltejs/kit';
if (!form.valid) return fail(400, { form });
```

- Create `+error.svelte` pages for user-friendly error display.
- Use `handleError` in `hooks.server.ts` for logging unexpected errors.
- Never expose stack traces or internal details to the client in production.

## Testing

### Three layers

1. **Unit tests (Vitest)** — pure logic, utilities, Zod schemas. In `src/**/*.test.ts`. Run: `pnpm test:unit`
2. **Integration tests (Vitest)** — server-side load functions, form actions against a test DB. In `tests/integration/`. Run separately.
3. **E2E tests (Playwright)** — full user flows through the browser. In `tests/e2e/`. Run: `pnpm test:e2e`

### Rules

- Every Zod schema gets a unit test with valid and invalid inputs.
- Every form action gets an integration test (success + validation failure paths).
- Critical user flows (auth, booking, payment) get e2e coverage.
- No mocking Drizzle queries in integration tests — use a real test database.

## Environment Variables

All env vars listed in `.env.example`. Never commit `.env` files. Access via `$env/static/private` or `$env/dynamic/private` on the server.

Validate all required env vars at startup in `$lib/server/env.ts` using Zod.

## Hard Rules — Never Do

1. **Never use `any`:** Use `unknown` + type guards if the type is genuinely unknown.
2. **Never use inline styles:** Tailwind classes only.
3. **Never skip validation:** Every form input and API payload validated with Zod on the server.
4. **Never trust the client:** Always re-validate and re-authorise on the server.
5. **Never raw SQL:** All queries through Drizzle. No `db.execute()` with string interpolation.
6. **Never commit secrets:** No API keys, tokens, or passwords in code. Use env vars.
7. **Never disable TypeScript strict mode:** No `@ts-ignore`, no `@ts-expect-error` without explanation.
8. **Never use GET for mutations:** All data changes go through form actions or POST API routes.
9. **Never query without scoping:** Every database query in `(app)` routes must filter by the user's groupId.
10. **Never ship without tests:** Every feature PR must include unit tests at minimum.
11. **Never use `console.log` in production:** Use the structured logger.
12. **Never ignore errors silently:** Every catch block must log or re-throw. No empty catch blocks.

## Common Agent Mistakes

These are patterns that previous agents got wrong on this codebase. Avoid them:

1. **Using API routes for mutations** — use form actions with superforms instead.
2. **Forgetting `onDelete: 'cascade'` on foreign keys** — every FK needs explicit cascade behaviour.
3. **Missing indexes on foreign key columns** — every FK column needs an index.
4. **Using `process.env` directly** — use `$env/dynamic/private` or the validated `serverEnv` from `$lib/server/env.ts`.
5. **Creating placeholder pages with hardcoded data** — don't create a route until the feature is built.
6. **Missing null checks after DB lookups** — always check if the record exists before using it.
7. **Not scoping queries by groupId** — every query in app routes must filter by the user's group.
8. **Skipping `db.transaction()` for multi-step mutations** — booking conflict detection + insert must be atomic.
9. **Interpolating user input into HTML emails** — always HTML-escape user data in templates.
10. **Using `confirm()` browser dialogs** — use proper modal components with a11y support.
