import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateBearerToken } from '$lib/server/auth';
import { ensureTariffsTable, upsertTariffs } from '$lib/server/db';
import type { TariffRow } from '$lib/server/db';
import { UK_REGIONS } from '$lib/data/regions';
import { logger } from '$lib/server/logger';

let tableReady = false;

/**
 * Ofgem Q1 2026 price cap rates (January–March 2026).
 * These are the default/cap rates that most big-six suppliers charge.
 * Rates vary slightly by region and payment method.
 *
 * Source: https://www.ofgem.gov.uk/check-if-energy-price-cap-affects-you
 *
 * Regional adjustments are small (±1-2p/kWh) — we use the national
 * typical values and apply a small regional offset.
 */
const OFGEM_CAP_Q1_2026 = {
	electricity: {
		unit_rate_p: 24.5,
		standing_charge_p: 61.64,
	},
	gas: {
		unit_rate_p: 6.76,
		standing_charge_p: 32.76,
	},
	valid_from: '2025-10-01T00:00:00Z',
	valid_to: '2026-03-31T23:59:59Z',
	quarter: 'Q1 2026',
};

/**
 * Regional offsets from national average (pence per kWh).
 * Based on Ofgem Annex 9 regional variations.
 */
const REGIONAL_OFFSETS: Record<string, { elec_unit: number; elec_standing: number }> = {
	eastern: { elec_unit: 0.2, elec_standing: 0.5 },
	'east-midlands': { elec_unit: -0.1, elec_standing: -0.3 },
	london: { elec_unit: 0.0, elec_standing: 0.0 },
	merseyside: { elec_unit: 0.3, elec_standing: 0.8 },
	'west-midlands': { elec_unit: 0.1, elec_standing: 0.2 },
	'north-east': { elec_unit: -0.2, elec_standing: -0.5 },
	'north-west': { elec_unit: 0.2, elec_standing: 0.4 },
	southern: { elec_unit: 0.4, elec_standing: 1.0 },
	'south-east': { elec_unit: 0.5, elec_standing: 1.2 },
	'south-wales': { elec_unit: 0.1, elec_standing: 0.3 },
	'south-west': { elec_unit: 0.6, elec_standing: 1.5 },
	yorkshire: { elec_unit: -0.3, elec_standing: -0.4 },
	'south-scotland': { elec_unit: -0.4, elec_standing: -0.8 },
	'north-scotland': { elec_unit: 0.8, elec_standing: 2.0 },
};

const PAYMENT_METHODS = ['direct_debit', 'prepayment'] as const;

const PREPAYMENT_UPLIFT_P = 1.5; // Prepayment typically ~1.5p/kWh more

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
			const offset = REGIONAL_OFFSETS[regionEntry.value] ?? { elec_unit: 0, elec_standing: 0 };

			for (const paymentMethod of PAYMENT_METHODS) {
				const prepayUplift = paymentMethod === 'prepayment' ? PREPAYMENT_UPLIFT_P : 0;

				// Electricity price cap tariff
				rows.push({
					provider: 'ofgem_cap',
					tariff_code: `OFGEM-CAP-ELEC-${regionEntry.gspGroupId}-${paymentMethod.toUpperCase()}`,
					tariff_name: `Price Cap (${OFGEM_CAP_Q1_2026.quarter})`,
					region: regionEntry.value,
					fuel_type: 'electricity',
					payment_method: paymentMethod,
					unit_rate_p: OFGEM_CAP_Q1_2026.electricity.unit_rate_p + offset.elec_unit + prepayUplift,
					standing_charge_p: OFGEM_CAP_Q1_2026.electricity.standing_charge_p + offset.elec_standing,
					rate_data: {
						quarter: OFGEM_CAP_Q1_2026.quarter,
						type: 'flat',
						national_unit_rate_p: OFGEM_CAP_Q1_2026.electricity.unit_rate_p,
						national_standing_charge_p: OFGEM_CAP_Q1_2026.electricity.standing_charge_p,
						regional_offset_unit: offset.elec_unit,
						regional_offset_standing: offset.elec_standing,
						payment_method: paymentMethod,
					},
					valid_from: OFGEM_CAP_Q1_2026.valid_from,
					valid_to: OFGEM_CAP_Q1_2026.valid_to,
					source: 'ofgem_annex9',
				});

				// Gas price cap tariff
				rows.push({
					provider: 'ofgem_cap',
					tariff_code: `OFGEM-CAP-GAS-${regionEntry.gspGroupId}-${paymentMethod.toUpperCase()}`,
					tariff_name: `Price Cap Gas (${OFGEM_CAP_Q1_2026.quarter})`,
					region: regionEntry.value,
					fuel_type: 'gas',
					payment_method: paymentMethod,
					unit_rate_p: OFGEM_CAP_Q1_2026.gas.unit_rate_p + prepayUplift,
					standing_charge_p: OFGEM_CAP_Q1_2026.gas.standing_charge_p,
					rate_data: {
						quarter: OFGEM_CAP_Q1_2026.quarter,
						type: 'flat',
						payment_method: paymentMethod,
					},
					valid_from: OFGEM_CAP_Q1_2026.valid_from,
					valid_to: OFGEM_CAP_Q1_2026.valid_to,
					source: 'ofgem_annex9',
				});
			}
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
			quarter: OFGEM_CAP_Q1_2026.quarter,
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
