Scaffold a new feature for Energy Tariff Compare. Follow these steps:

1. **Create the route files** (if needed):
   - `src/routes/{feature}/+page.svelte` — UI using $props() for data
   - `src/routes/{feature}/+page.server.ts` — server-side data loading (if needed)

2. **Create library modules** (if needed):
   - `$lib/models/{feature}.ts` — business logic
   - `$lib/services/{feature}.ts` — external API integration

3. **Create tests:**
   - `$lib/models/{feature}.test.ts` — unit tests for business logic
   - `$lib/services/{feature}.test.ts` — unit tests with mocked API responses

4. **Verify:** Run `pnpm lint`, `pnpm check`, `pnpm test:unit` — all must pass.

Use Svelte 5 runes ($state, $derived). Build mobile-first. See CLAUDE.md for full standards.
