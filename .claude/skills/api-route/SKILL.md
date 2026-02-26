---
name: api-route
description: Create a SvelteKit API route (+server.ts). Use ONLY for webhooks, cron jobs, file downloads, or external service endpoints. Never for page data or form mutations.
---

# API Route Pattern

API routes (`+server.ts`) are ONLY for:
- **Webhooks** (Clerk, Stripe) — external services POST to these
- **File downloads** (.ics calendar files, CSV exports)
- **Cron jobs** — Vercel cron hits these endpoints
- **External API consumers** — if a third-party service needs data

**Never use for:**
- Loading data for a page → use `+page.server.ts` load function
- Form mutations → use form actions in `+page.server.ts`

## Webhook Example

```typescript
// src/routes/api/webhooks/{service}/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request }) => {
  // 1. Verify signature
  // 2. Parse and validate payload with Zod
  // 3. Process the event
  // 4. Return acknowledgement

  logger.info('Webhook received', { type: 'service.event' });
  return json({ received: true });
};
```

## File Download Example

```typescript
// src/routes/api/bookings/[id]/ics/+server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  // 1. Auth check
  // 2. Fetch data (scoped by groupId)
  // 3. Generate file content
  // 4. Return with correct headers

  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar',
      'Content-Disposition': `attachment; filename="booking.ics"`,
    },
  });
};
```

## Rules

- Always validate request body/params with Zod
- Always return proper HTTP status codes
- Log all API route hits (method, path, userId, status)
- Webhooks must verify signatures before processing
- Never use GET for mutations
