---
name: new-page
description: Add a new route/page to the Shared Wings app. Use when creating a new section like expenses, compliance, or any new page under the (app) layout.
---

# Adding a New Page

## Steps

1. **Create the route directory and files:**

```
src/routes/(app)/{page-name}/
  +page.server.ts     # load function (required for all app pages)
  +page.svelte         # page UI
  schema.ts            # Zod schemas (if page has forms)
```

2. **Implement the load function:**

```typescript
// +page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	// Always scope queries by groupId
	// Keep load functions thin — query, shape, return
	return {
		/* data */
	};
};
```

3. **Implement the page UI:**

```svelte
<!-- +page.svelte -->
<script lang="ts">
	let { data } = $props();
</script>

<div>
	<h1 class="text-2xl font-bold text-slate-900">Page Title</h1>
	<p class="mt-1 text-sm text-slate-500">Description</p>
	<!-- Use shadcn-svelte components for UI -->
</div>
```

4. **Add nav item** (if top-level page) in `src/routes/(app)/+layout.svelte`:

```typescript
const navItems = [
	// ... existing items
	{ href: '/{page-name}', label: 'Label', icon: '🔖' },
];
```

5. **Add tests** for any Zod schemas or utility functions.

6. **Verify:** `pnpm lint && pnpm check && pnpm test:unit`

## Rules

- Every app page must have a `+page.server.ts` — never load data client-side
- Use Svelte 5 runes (`$state`, `$derived`, `$props`) — not legacy stores
- Use shadcn-svelte components — don't build custom ones when shadcn has them
- Keep components under 150 lines — split into `$lib/components/app/` if larger
