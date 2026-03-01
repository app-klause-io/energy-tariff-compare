import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateBearerToken } from '$lib/server/auth';
import { ensureTariffsTable, upsertTariffs } from '$lib/server/db';
import type { TariffRow } from '$lib/server/db';
import {
	fetchAvailableProducts,
	classifyProduct,
	buildTariffCode,
	fetchUnitRates,
	fetchStandingCharges,
} from '$lib/services/octopus';
import { UK_REGIONS } from '$lib/data/regions';
import { logger } from '$lib/server/logger';

let tableReady = false;

// Vercel Cron sends GET requests — alias so both methods work.
export { POST as GET };

export const POST: RequestHandler = async ({ request }) => {
	validateBearerToken(request);

	if (!tableReady) {
		await ensureTariffsTable();
		tableReady = true;
	}

	const startTime = Date.now();
	let totalUpserted = 0;
	const errors: { product?: string; region?: string; error: string }[] = [];

	try {
		const products = await fetchAvailableProducts();

		logger.info('ingest.octopus.productsFound', { count: products.length });

		for (const product of products) {
			const classification = classifyProduct(product);
			if (!classification) continue;

			for (const regionEntry of UK_REGIONS) {
				const tariffCode = buildTariffCode(product.code, regionEntry.gspGroupId);

				try {
					const [unitRates, standingCharge] = await Promise.all([
						fetchUnitRates(product.code, tariffCode, { page_size: 48 }),
						fetchStandingCharges(product.code, tariffCode),
					]);

					const uniqueRates = [...new Set(unitRates.map((r) => r.value_inc_vat))].sort(
						(a, b) => a - b,
					);

					const avgRate = unitRates.reduce((sum, r) => sum + r.value_inc_vat, 0) / unitRates.length;

					const rateSchedule = unitRates
						.slice(0, 48)
						.reverse()
						.map((r, i) => ({
							slot: i,
							rate_p: r.value_inc_vat,
							valid_from: r.valid_from,
							valid_to: r.valid_to,
						}));

					const row: TariffRow = {
						provider: 'octopus',
						tariff_code: tariffCode,
						tariff_name: product.display_name,
						region: regionEntry.value,
						fuel_type: 'electricity',
						payment_method: 'direct_debit',
						unit_rate_p: avgRate,
						standing_charge_p: standingCharge,
						day_rate_p: uniqueRates.length > 1 ? uniqueRates[uniqueRates.length - 1] : undefined,
						night_rate_p: uniqueRates.length > 1 ? uniqueRates[0] : undefined,
						rate_data: {
							type: classification.type,
							product_code: product.code,
							is_green: product.is_green,
							half_hourly_rates: rateSchedule,
							rate_count: unitRates.length,
						},
						valid_from:
							unitRates.length > 0 ? unitRates[unitRates.length - 1].valid_from : undefined,
						valid_to: unitRates.length > 0 ? (unitRates[0].valid_to ?? undefined) : undefined,
						source: 'octopus_api',
					};

					await upsertTariffs([row]);
					totalUpserted++;

					logger.info('ingest.octopus.tariffStored', {
						product: product.code,
						region: regionEntry.value,
						tariffCode,
					});
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : String(err);
					errors.push({
						product: product.code,
						region: regionEntry.value,
						error: errorMsg,
					});
					logger.warn('ingest.octopus.tariffError', {
						product: product.code,
						region: regionEntry.value,
						tariffCode,
						error: errorMsg,
					});
				}
			}
		}

		const durationMs = Date.now() - startTime;

		logger.info('ingest.octopus.complete', {
			totalUpserted,
			errorCount: errors.length,
			durationMs,
		});

		return json({
			success: true,
			upserted: totalUpserted,
			errors: errors.length,
			errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined,
			durationMs,
		});
	} catch (err) {
		logger.error('ingest.octopus.failed', {
			error: err instanceof Error ? err.message : String(err),
			upsertedBeforeFailure: totalUpserted,
		});

		return json(
			{
				success: false,
				error: 'Octopus ingestion failed',
				upserted: totalUpserted,
				errors: errors.length,
			},
			{ status: 500 },
		);
	}
};
