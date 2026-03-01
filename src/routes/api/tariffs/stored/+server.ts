import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateBearerToken } from '$lib/server/auth';
import { ensureTariffsTable, getTariffs } from '$lib/server/db';
import { logger } from '$lib/server/logger';

let tableReady = false;

export const GET: RequestHandler = async ({ request, url }) => {
	validateBearerToken(request);

	if (!tableReady) {
		await ensureTariffsTable();
		tableReady = true;
	}

	try {
		const provider = url.searchParams.get('provider') ?? undefined;
		const region = url.searchParams.get('region') ?? undefined;
		const fuel_type = url.searchParams.get('fuel_type') ?? undefined;

		const limitParam = url.searchParams.get('limit');
		const offsetParam = url.searchParams.get('offset');

		const limit = limitParam ? parseInt(limitParam, 10) : undefined;
		const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

		if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 1000)) {
			throw error(400, 'Invalid limit: must be between 1 and 1000');
		}

		if (offset !== undefined && (isNaN(offset) || offset < 0)) {
			throw error(400, 'Invalid offset: must be >= 0');
		}

		const result = await getTariffs({
			provider,
			region,
			fuel_type,
			limit,
			offset,
		});

		logger.info('tariffs.stored.retrieved', {
			count: result.tariffs.length,
			total: result.total,
			provider,
			region,
		});

		return json(result);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('tariffs.stored.error', {
			error: err instanceof Error ? err.message : String(err),
		});

		return json({ error: 'Failed to retrieve tariffs' }, { status: 500 });
	}
};
