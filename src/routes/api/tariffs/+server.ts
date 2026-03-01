import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchTariffsForRegion } from '$lib/services/octopus';
import { UK_REGIONS } from '$lib/data/regions';
import { logger } from '$lib/server/logger';

export const GET: RequestHandler = async ({ url }) => {
	const region = url.searchParams.get('region');

	if (!region) {
		throw error(400, 'Region parameter is required');
	}

	const validRegion = UK_REGIONS.find((r) => r.value === region);
	if (!validRegion) {
		throw error(400, `Invalid region: ${region}`);
	}

	try {
		const tariffs = await fetchTariffsForRegion(validRegion.value);

		logger.info('tariffs.fetch', {
			region: validRegion.value,
			tariffCount: tariffs.length,
		});

		return json({ tariffs });
	} catch (err) {
		logger.error('tariffs.fetchError', {
			region: validRegion.value,
			error: err instanceof Error ? err.message : String(err),
		});
		throw error(502, 'Unable to fetch tariff data. Please try again.');
	}
};
