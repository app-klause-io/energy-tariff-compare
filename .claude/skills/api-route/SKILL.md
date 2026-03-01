---
name: api-route
description: Create a SvelteKit API route (+server.ts) for fetching external data (e.g. Octopus Energy API). Used for server-side API proxying with caching.
---

# API Route Pattern

API routes (`+server.ts`) in this project are for:

- **External API proxy** — fetch Octopus Energy tariff data server-side
- **Data transformation** — process and cache API responses

## Example

```typescript
// src/routes/api/tariffs/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/server/logger';

export const GET: RequestHandler = async ({ url }) => {
	const region = url.searchParams.get('region');
	if (!region) throw error(400, 'Region parameter required');

	// Fetch from external API
	// Validate with Zod
	// Return shaped response

	logger.info('tariffs.fetch', { region });
	return json({ tariffs: [] });
};
```

## Rules

- Always validate query params with Zod
- Always return proper HTTP status codes
- Log all API route hits
- Cache responses where appropriate (tariff data doesn't change frequently)
- Never expose API keys to the client
