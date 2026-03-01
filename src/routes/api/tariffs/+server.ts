import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchTariffsForRegion, convertTariffInfoToTariff } from '$lib/services/octopus';
import { getTariffsForRegion as getFallbackTariffs } from '$lib/data/tariffs';
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
		const tariffInfos = await fetchTariffsForRegion(validRegion.value);
		const tariffs = tariffInfos.map((info) => convertTariffInfoToTariff(info, validRegion.value));

		logger.info('tariffs.fetch', {
			region: validRegion.value,
			tariffCount: tariffs.length,
			source: 'live',
		});

		return json({ tariffs, source: 'live' });
	} catch (err) {
		logger.error('tariffs.fetchError', {
			region: validRegion.value,
			error: err instanceof Error ? err.message : String(err),
		});

		const fallbackTariffs = getFallbackTariffs(validRegion.value);

		logger.info('tariffs.fallback', {
			region: validRegion.value,
			tariffCount: fallbackTariffs.length,
		});

		return json({ tariffs: fallbackTariffs, source: 'fallback' });
	}
};
