import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchTariffsForRegion, convertTariffInfoToTariff } from '$lib/services/octopus';
import { fetchStoredTariffsForRegion } from '$lib/services/storedTariffs';
import { getTariffsForRegion as getFallbackTariffs } from '$lib/data/tariffs';
import { UK_REGIONS } from '$lib/data/regions';
import { logger } from '$lib/server/logger';
import type { Tariff } from '$lib/types/tariff';
import type { UkRegion } from '$lib/types/wizard';

/**
 * Major UK energy providers at Ofgem price cap rate (Q1 2026).
 * These are added to all comparison results to show users how much they can save
 * compared to the big providers on standard variable tariffs.
 */
function getMajorProvidersAtCapRate(region: UkRegion): Tariff[] {
	const providers = [
		'British Gas',
		'EDF',
		'E.ON Next',
		'Scottish Power',
		'OVO Energy',
		'Shell Energy',
	];

	// Ofgem price cap Q1 2026: 24.50p/kWh, 61.64p/day standing charge
	const unitRate = 24.5;
	const standingCharge = 61.64;

	return providers.map((provider) => ({
		id: `cap-${provider.toLowerCase().replace(/\s+/g, '-')}`,
		name: 'Standard Variable',
		supplier: provider,
		type: 'standard' as const,
		standingCharge,
		rates: [{ startSlot: 0, endSlot: 48, unitRate }],
		region,
		description: 'Standard variable tariff at Ofgem price cap rate (Q1 2026)',
	}));
}

export const GET: RequestHandler = async ({ url }) => {
	const region = url.searchParams.get('region');

	if (!region) {
		throw error(400, 'Region parameter is required');
	}

	const validRegion = UK_REGIONS.find((r) => r.value === region);
	if (!validRegion) {
		throw error(400, `Invalid region: ${region}`);
	}

	let tariffs: Tariff[] = [];
	let source: string;

	// Try stored tariffs first
	const storedTariffs = await fetchStoredTariffsForRegion(validRegion.value);
	if (storedTariffs.length > 0) {
		tariffs = storedTariffs;
		source = 'stored';

		logger.info('tariffs.fetch', {
			region: validRegion.value,
			tariffCount: tariffs.length,
			source: 'stored',
		});
	} else {
		// Fall back to live Octopus API
		try {
			const tariffInfos = await fetchTariffsForRegion(validRegion.value);
			tariffs = tariffInfos.map((info) => convertTariffInfoToTariff(info, validRegion.value));
			source = 'live';

			logger.info('tariffs.fetch', {
				region: validRegion.value,
				tariffCount: tariffs.length,
				source: 'live',
			});
		} catch (err) {
			logger.error('tariffs.fetchError', {
				region: validRegion.value,
				error: err instanceof Error ? err.message : String(err),
			});

			tariffs = getFallbackTariffs(validRegion.value);
			source = 'fallback';

			logger.info('tariffs.fallback', {
				region: validRegion.value,
				tariffCount: tariffs.length,
			});
		}
	}

	// Add major UK providers at Ofgem cap rate
	const capRateTariffs = getMajorProvidersAtCapRate(validRegion.value);
	tariffs = [...tariffs, ...capRateTariffs];

	logger.info('tariffs.withCapRates', {
		region: validRegion.value,
		totalTariffCount: tariffs.length,
		capRateCount: capRateTariffs.length,
	});

	return json({ tariffs, source, lastUpdated: new Date().toISOString() });
};
