---
name: form-action
description: Build a SvelteKit form action with superforms and Zod validation. Use when creating any mutation (create, update, delete) in the app.
---

# Form Action Pattern

All mutations in Shared Wings use SvelteKit form actions with sveltekit-superforms. Never use API routes for mutations.

## File Structure

```
src/routes/(app)/{feature}/
  schema.ts           # Co-located Zod schemas
  +page.server.ts     # load() + actions
  +page.svelte        # UI with superforms
```

## 1. Define Zod Schema

```typescript
// src/routes/(app)/{feature}/schema.ts
import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  groupId: z.string().uuid(),
});
```

## 2. Server: Load + Actions

```typescript
// src/routes/(app)/{feature}/+page.server.ts
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createItemSchema } from './schema';
import { db } from '$lib/server/db';
import { items } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';

export const load = async ({ locals }) => {
  // Always scope by groupId
  const data = await db.select().from(items).where(eq(items.groupId, locals.groupId));
  const form = await superValidate(zod(createItemSchema));
  return { items: data, form };
};

export const actions = {
  create: async ({ request, locals }) => {
    const form = await superValidate(request, zod(createItemSchema));
    if (!form.valid) return fail(400, { form });

    try {
      await db.insert(items).values({
        ...form.data,
        groupId: locals.groupId, // Always set from server, never trust client
      });
    } catch (e) {
      logger.error('Failed to create item', { error: e, userId: locals.userId });
      return fail(500, { form });
    }

    return message(form, 'Item created');
  },
};
```

## 3. Client: Superforms UI

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';

  let { data } = $props();
  const { form, errors, enhance, submitting } = superForm(data.form);
</script>

<form method="POST" action="?/create" use:enhance>
  <input name="name" bind:value={$form.name} />
  {#if $errors.name}<span class="text-red-500 text-sm">{$errors.name}</span>{/if}

  <button type="submit" disabled={$submitting}>
    {$submitting ? 'Saving...' : 'Create'}
  </button>
</form>
```

## Rules

- Always validate with Zod on the server even if client validates too
- Set groupId from server locals, never from the form data
- Use `db.transaction()` if the mutation touches multiple tables
- Use `fail()` for expected errors, `throw error()` for unexpected ones
- Log all action entries and exits via the structured logger
