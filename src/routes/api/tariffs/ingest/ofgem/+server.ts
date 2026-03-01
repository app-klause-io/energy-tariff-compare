import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateBearerToken } from '$lib/server/auth';
import { ensureTariffsTable, upsertTariffs } from '$lib/server/db';
import type { TariffRow } from '$lib/server/db';
import { UK_REGIONS } from '$lib/data/regions';
import { logger } from '$lib/server/logger';

let tableReady = false;

/**
 * Ofgem price cap rates by region, extracted from:
 * https://www.ofgem.gov.uk/information-consumers/energy-advice-households/get-energy-price-cap-standing-charges-and-unit-rates-region
 *
 * Data covers Q1 2026 (Jan-Mar) and Q2 2026 (Apr-Jun).
 * Values: sc = standing charge (pence/day), ur = unit rate (pence/kWh)
 *
 * Map key = our app region value, data from Ofgem's regional tables.
 */

interface RegionalRates {
	elec_sc_q1: number;
	elec_sc_q2: number;
	elec_ur_q1: number;
	elec_ur_q2: number;
	gas_sc_q1: number;
	gas_sc_q2: number;
	gas_ur_q1: number;
	gas_ur_q2: number;
}

// Direct Debit, single rate electricity + gas
const OFGEM_REGIONAL_DD: Record<string, RegionalRates> = {
	'north-west': {
		elec_sc_q1: 52.22, elec_sc_q2: 47.63, elec_ur_q1: 28.45, elec_ur_q2: 24.70,
		gas_sc_q1: 35.23, gas_sc_q2: 29.22, gas_ur_q1: 5.89, gas_ur_q2: 5.65,
	},
	'north-east': {
		elec_sc_q1: 60.93, elec_sc_q2: 64.30, elec_ur_q1: 26.75, elec_ur_q2: 23.81,
		gas_sc_q1: 35.21, gas_sc_q2: 29.20, gas_ur_q1: 5.93, gas_ur_q2: 5.69,
	},
	yorkshire: {
		elec_sc_q1: 59.72, elec_sc_q2: 64.40, elec_ur_q1: 26.69, elec_ur_q2: 23.85,
		gas_sc_q1: 35.18, gas_sc_q2: 29.18, gas_ur_q1: 5.90, gas_ur_q2: 5.68,
	},
	'north-scotland': {
		elec_sc_q1: 62.07, elec_sc_q2: 57.57, elec_ur_q1: 28.36, elec_ur_q2: 25.02,
		gas_sc_q1: 35.28, gas_sc_q2: 29.27, gas_ur_q1: 5.89, gas_ur_q2: 5.64,
	},
	southern: {
		elec_sc_q1: 45.70, elec_sc_q2: 49.70, elec_ur_q1: 27.83, elec_ur_q2: 24.98,
		gas_sc_q1: 34.56, gas_sc_q2: 28.56, gas_ur_q1: 6.00, gas_ur_q2: 5.94,
	},
	'south-scotland': {
		elec_sc_q1: 57.62, elec_sc_q2: 64.20, elec_ur_q1: 27.18, elec_ur_q2: 24.40,
		gas_sc_q1: 35.30, gas_sc_q2: 29.30, gas_ur_q1: 5.89, gas_ur_q2: 5.64,
	},
	merseyside: {
		elec_sc_q1: 71.01, elec_sc_q2: 70.78, elec_ur_q1: 29.09, elec_ur_q2: 26.19,
		gas_sc_q1: 35.49, gas_sc_q2: 29.48, gas_ur_q1: 5.94, gas_ur_q2: 5.69,
	},
	london: {
		elec_sc_q1: 47.11, elec_sc_q2: 44.83, elec_ur_q1: 27.00, elec_ur_q2: 24.90,
		gas_sc_q1: 35.63, gas_sc_q2: 29.60, gas_ur_q1: 6.03, gas_ur_q2: 5.91,
	},
	'south-east': {
		elec_sc_q1: 48.66, elec_sc_q2: 54.45, elec_ur_q1: 28.27, elec_ur_q2: 25.23,
		gas_sc_q1: 34.68, gas_sc_q2: 28.67, gas_ur_q1: 5.83, gas_ur_q2: 5.80,
	},
	eastern: {
		elec_sc_q1: 49.33, elec_sc_q2: 53.95, elec_ur_q1: 27.88, elec_ur_q2: 24.94,
		gas_sc_q1: 34.74, gas_sc_q2: 28.74, gas_ur_q1: 5.87, gas_ur_q2: 5.67,
	},
	'east-midlands': {
		elec_sc_q1: 50.17, elec_sc_q2: 53.61, elec_ur_q1: 26.89, elec_ur_q2: 23.67,
		gas_sc_q1: 34.82, gas_sc_q2: 28.82, gas_ur_q1: 5.79, gas_ur_q2: 5.60,
	},
	'west-midlands': {
		elec_sc_q1: 54.08, elec_sc_q2: 59.72, elec_ur_q1: 26.99, elec_ur_q2: 23.89,
		gas_sc_q1: 35.12, gas_sc_q2: 29.11, gas_ur_q1: 5.85, gas_ur_q2: 5.69,
	},
	'south-west': {
		elec_sc_q1: 55.11, elec_sc_q2: 57.90, elec_ur_q1: 28.16, elec_ur_q2: 24.97,
		gas_sc_q1: 34.71, gas_sc_q2: 28.72, gas_ur_q1: 6.15, gas_ur_q2: 5.89,
	},
	'south-wales': {
		elec_sc_q1: 52.75, elec_sc_q2: 57.86, elec_ur_q1: 28.18, elec_ur_q2: 24.90,
		gas_sc_q1: 35.35, gas_sc_q2: 29.35, gas_ur_q1: 6.11, gas_ur_q2: 5.84,
	},
};

/**
 * Determine which quarter we're currently in and return the appropriate rates.
 */
function getCurrentQuarterRates(rates: RegionalRates): {
	elec_sc: number;
	elec_ur: number;
	gas_sc: number;
	gas_ur: number;
	quarter: string;
	valid_from: string;
	valid_to: string;
} {
	const now = new Date();
	const month = now.getMonth() + 1; // 1-12

	if (month >= 4 && month <= 6) {
		return {
			elec_sc: rates.elec_sc_q2,
			elec_ur: rates.elec_ur_q2,
			gas_sc: rates.gas_sc_q2,
			gas_ur: rates.gas_ur_q2,
			quarter: 'Q2 2026',
			valid_from: '2026-04-01T00:00:00Z',
			valid_to: '2026-06-30T23:59:59Z',
		};
	}

	// Default to Q1 (or latest available data)
	return {
		elec_sc: rates.elec_sc_q1,
		elec_ur: rates.elec_ur_q1,
		gas_sc: rates.gas_sc_q1,
		gas_ur: rates.gas_ur_q1,
		quarter: 'Q1 2026',
		valid_from: '2026-01-01T00:00:00Z',
		valid_to: '2026-03-31T23:59:59Z',
	};
}

export const POST: RequestHandler = async ({ request }) => {
	validateBearerToken(request);

	if (!tableReady) {
		await ensureTariffsTable();
		tableReady = true;
	}

	const startTime = Date.now();
	let totalUpserted = 0;

	try {
		const rows: TariffRow[] = [];

		for (const regionEntry of UK_REGIONS) {
			const regionalRates = OFGEM_REGIONAL_DD[regionEntry.value];
			if (!regionalRates) {
				logger.warn('ingest.ofgem.noRegionData', { region: regionEntry.value });
				continue;
			}

			const current = getCurrentQuarterRates(regionalRates);

			// Electricity price cap tariff (Direct Debit)
			rows.push({
				provider: 'ofgem_cap',
				tariff_code: `OFGEM-CAP-ELEC-${regionEntry.gspGroupId}-DD`,
				tariff_name: `Price Cap (${current.quarter})`,
				region: regionEntry.value,
				fuel_type: 'electricity',
				payment_method: 'direct_debit',
				unit_rate_p: current.elec_ur,
				standing_charge_p: current.elec_sc,
				rate_data: {
					quarter: current.quarter,
					type: 'flat',
					payment_method: 'direct_debit',
					q1_unit_rate: regionalRates.elec_ur_q1,
					q1_standing_charge: regionalRates.elec_sc_q1,
					q2_unit_rate: regionalRates.elec_ur_q2,
					q2_standing_charge: regionalRates.elec_sc_q2,
				},
				valid_from: current.valid_from,
				valid_to: current.valid_to,
				source: 'ofgem_regional',
			});

			// Gas price cap tariff (Direct Debit)
			rows.push({
				provider: 'ofgem_cap',
				tariff_code: `OFGEM-CAP-GAS-${regionEntry.gspGroupId}-DD`,
				tariff_name: `Price Cap Gas (${current.quarter})`,
				region: regionEntry.value,
				fuel_type: 'gas',
				payment_method: 'direct_debit',
				unit_rate_p: current.gas_ur,
				standing_charge_p: current.gas_sc,
				rate_data: {
					quarter: current.quarter,
					type: 'flat',
					payment_method: 'direct_debit',
					q1_unit_rate: regionalRates.gas_ur_q1,
					q1_standing_charge: regionalRates.gas_sc_q1,
					q2_unit_rate: regionalRates.gas_ur_q2,
					q2_standing_charge: regionalRates.gas_sc_q2,
				},
				valid_from: current.valid_from,
				valid_to: current.valid_to,
				source: 'ofgem_regional',
			});
		}

		totalUpserted = await upsertTariffs(rows);

		const durationMs = Date.now() - startTime;

		logger.info('ingest.ofgem.complete', {
			totalUpserted,
			durationMs,
		});

		return json({
			success: true,
			upserted: totalUpserted,
			regions: UK_REGIONS.length,
			durationMs,
		});
	} catch (err) {
		logger.error('ingest.ofgem.failed', {
			error: err instanceof Error ? err.message : String(err),
			upsertedBeforeFailure: totalUpserted,
		});

		return json(
			{
				success: false,
				error: 'Ofgem ingestion failed',
				details: err instanceof Error ? err.message : String(err),
				upserted: totalUpserted,
			},
			{ status: 500 },
		);
	}
};
