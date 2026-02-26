Scaffold a new feature for Shared Wings. Follow these steps:

1. **Create the route files:**
   - `src/routes/(app)/{feature}/+page.server.ts` — load function + form actions
   - `src/routes/(app)/{feature}/+page.svelte` — UI using $props() for data
   - `src/routes/(app)/{feature}/schema.ts` — co-located Zod schemas for this feature's forms

2. **Add nav item** to `src/routes/(app)/+layout.svelte` if this is a top-level page.

3. **Create tests:**
   - `src/routes/(app)/{feature}/schema.test.ts` — unit tests for Zod schemas (valid + invalid inputs)

4. **Verify:** Run `pnpm lint`, `pnpm check`, `pnpm test:unit` — all must pass.

Use form actions (not API routes) for all mutations. Use sveltekit-superforms for form handling. Always scope DB queries by groupId. See CLAUDE.md for full standards.
