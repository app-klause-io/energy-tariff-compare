import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Tariff } from '$lib/types/tariff';
import { fetchTariffsForRegion, convertTariffInfoToTariff } from '$lib/services/octopus';
import { fetchStoredTariffsForRegion, fetchStoredGasTariffsForRegion } from '$lib/services/storedTariffs';
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

	// Fetch live Octopus tariffs, stored electricity tariffs, and gas tariffs in parallel
	const [octopusResult, storedResult, gasResult] = await Promise.allSettled([
		fetchTariffsForRegion(validRegion.value).then((infos) =>
			infos.map((info) => convertTariffInfoToTariff(info, validRegion.value)),
		),
		fetchStoredTariffsForRegion(validRegion.value),
		fetchStoredGasTariffsForRegion(validRegion.value),
	]);

	const liveTariffs: Tariff[] =
		octopusResult.status === 'fulfilled' ? octopusResult.value : [];
	const dbTariffs: Tariff[] =
		storedResult.status === 'fulfilled' ? storedResult.value : [];
	const gasTariffs: Tariff[] =
		gasResult.status === 'fulfilled' ? gasResult.value : [];

	if (octopusResult.status === 'rejected') {
		logger.error('tariffs.octopusFetchError', {
			region: validRegion.value,
			error:
				octopusResult.reason instanceof Error
					? octopusResult.reason.message
					: String(octopusResult.reason),
		});
	}

	// Merge: live Octopus tariffs take priority, then stored tariffs from DB.
	// De-duplicate by supplier: if a supplier appears in live data, skip stored version.
	const liveSuppliers = new Set(liveTariffs.map((t) => t.supplier));
	const mergedTariffs = [
		...liveTariffs,
		...dbTariffs.filter((t) => !liveSuppliers.has(t.supplier)),
	];

	if (mergedTariffs.length > 0) {
		logger.info('tariffs.fetch', {
			region: validRegion.value,
			live: liveTariffs.length,
			stored: dbTariffs.length,
			merged: mergedTariffs.length,
			source: 'merged',
		});

		return json({ tariffs: mergedTariffs, gasTariffs, source: 'merged' });
	}

	// Final fallback: hardcoded data
	const fallbackTariffs = getFallbackTariffs(validRegion.value);

	logger.info('tariffs.fallback', {
		region: validRegion.value,
		tariffCount: fallbackTariffs.length,
	});

	return json({ tariffs: fallbackTariffs, gasTariffs, source: 'fallback' });
};
