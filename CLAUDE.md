# Energy Tariff Compare — Engineering Standards

This is the single source of truth for any AI agent or developer working on this codebase.

## Project Overview

Energy Tariff Compare is a no-login, single-purpose web tool that helps UK households find the best energy tariff. It estimates consumption from property details and appliances, then compares against live Octopus Energy tariff rates.

## Tech Stack

- **Framework:** SvelteKit (latest, Svelte 5 runes)
- **Language:** TypeScript (strict mode)
- **UI:** shadcn-svelte + Tailwind CSS v4 (no tailwind.config — uses `@theme` in app.css + `@tailwindcss/vite` plugin)
- **Hosting:** Vercel (`adapter-vercel`)
- **Testing:** Vitest (unit) + Playwright (e2e)
- **Linting:** ESLint 9 (flat config) + Prettier + eslint-plugin-svelte
- **Package Manager:** pnpm
- **Validation:** Zod

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
```

## Naming Conventions

### Files

- Svelte components: `PascalCase.svelte` (WizardStep.svelte, TariffCard.svelte)
- TypeScript modules: `camelCase.ts` (consumption.ts, comparison.ts)
- Route files: SvelteKit convention (+page.svelte, +page.server.ts, +server.ts)
- Test files: `[name].test.ts` (consumption.test.ts, octopus.test.ts)
- E2E tests: `[feature].spec.ts` (wizard.spec.ts)

### Code

- Variables/functions: `camelCase` (calculateConsumption, fetchTariffs)
- Types/interfaces: `PascalCase` (ConsumptionProfile, TariffRate, WizardState)
- Constants: `SCREAMING_SNAKE_CASE` (UK_REGIONS, DEFAULT_OCCUPANTS)
- CSS: Tailwind utilities only. No custom CSS classes unless absolutely necessary.
- Environment variables: `SCREAMING_SNAKE_CASE` with `PUBLIC_` prefix for client-exposed vars

## SvelteKit Patterns

### Client-Side State (Wizard)

This app is primarily a client-side wizard. State management uses Svelte 5 runes:

```svelte
<script lang="ts">
	let step = $state(1);
	let propertyType = $state<PropertyType | null>(null);
	let appliances = $state<Appliance[]>([]);

	let totalKwh = $derived(calculateConsumption(propertyType, appliances));
</script>
```

### API Routes (+server.ts)

API routes are used for server-side data fetching from external APIs (Octopus Energy):

- Always validate query params with Zod
- Cache responses where appropriate
- Never expose API keys to the client
- Return proper HTTP status codes and typed JSON

### Components

- Use shadcn-svelte for all base UI (Button, Card, Input, etc.).
- Never build a custom component if shadcn-svelte has one.
- App-specific components go in `$lib/components/` and compose shadcn primitives.
- Keep components under 150 lines. Split if exceeding.
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) — not legacy stores.

## Validation

- Use Zod for all input validation and API response parsing.
- Validate API responses from external services (Octopus Energy).
- Validate wizard form inputs before calculating results.

## Logging

Use the structured logger at `$lib/server/logger.ts`. All logs are JSON for Vercel log drain compatibility.

### What to log

- Every API route hit (method, path, response status)
- External API calls (service, endpoint, status, duration)
- Errors (full stack trace, request context)

### What NOT to log

- API keys, tokens, or secrets
- Full request/response bodies from external APIs

## Error Handling

```typescript
import { error } from '@sveltejs/kit';
if (!region) throw error(400, 'Region parameter required');
```

- Create `+error.svelte` pages for user-friendly error display.
- Use `handleError` in `hooks.server.ts` for logging unexpected errors.
- Never expose stack traces or internal details to the client.

## Testing

### Two layers

1. **Unit tests (Vitest)** — consumption model, comparison engine, Zod schemas, utilities. In `src/**/*.test.ts`. Run: `pnpm test:unit`
2. **E2E tests (Playwright)** — full wizard flow from landing to results. In `tests/e2e/`. Run: `pnpm test:e2e`

### Rules

- Every model/calculator gets comprehensive unit tests.
- Every Zod schema gets tests with valid and invalid inputs.
- The complete wizard flow gets e2e coverage.
- Mock external API calls in unit tests — never hit real Octopus API in tests.

## Hard Rules — Never Do

1. **Never use `any`:** Use `unknown` + type guards if the type is genuinely unknown.
2. **Never use inline styles:** Tailwind classes only.
3. **Never skip validation:** Every API payload validated with Zod on the server.
4. **Never commit secrets:** No API keys, tokens, or passwords in code. Use env vars.
5. **Never disable TypeScript strict mode:** No `@ts-ignore`, no `@ts-expect-error` without explanation.
6. **Never use `console.log` in production:** Use the structured logger.
7. **Never ignore errors silently:** Every catch block must log or re-throw. No empty catch blocks.
8. **Never ship without tests:** Every feature PR must include unit tests at minimum.

## Common Agent Mistakes

1. **Forgetting mobile-first** — always test at 375px width. Min 44px touch targets.
2. **Using `process.env` directly** — use `$env/dynamic/private` or validated env module.
3. **Not validating Octopus API responses** — always parse with Zod, APIs can change.
4. **Building custom components** — check shadcn-svelte first.
5. **Using legacy Svelte stores** — use Svelte 5 runes ($state, $derived, $effect).
6. **Skipping error states** — every API call needs loading + error + empty states.
7. **Over-engineering** — this is a simple tool. Keep it simple.
