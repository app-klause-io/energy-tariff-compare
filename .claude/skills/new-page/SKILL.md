---
name: new-page
description: Add a new page to the Energy Tariff Compare app.
---

# Adding a New Page

## Steps

1. **Create the route directory and files:**

```
src/routes/{page-name}/
  +page.svelte         # page UI
  +page.server.ts      # server-side data loading (if needed)
```

2. **Implement the page UI:**

```svelte
<script lang="ts">
	// Use Svelte 5 runes
	let someState = $state(initialValue);
</script>

<div>
	<h1 class="text-2xl font-bold text-slate-900">Page Title</h1>
	<!-- Use shadcn-svelte components for UI -->
</div>
```

3. **Add tests** for any utility functions or models.

4. **Verify:** `pnpm lint && pnpm check && pnpm test:unit`

## Rules

- Use Svelte 5 runes (`$state`, `$derived`, `$props`) — not legacy stores
- Use shadcn-svelte components — don't build custom ones when shadcn has them
- Keep components under 150 lines — split into `$lib/components/` if larger
- Build mobile-first (test at 375px width)
