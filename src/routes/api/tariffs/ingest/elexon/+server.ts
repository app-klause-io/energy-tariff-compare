import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { validateBearerToken } from '$lib/server/auth';
import { ensureTariffsTable, upsertTariffs } from '$lib/server/db';
import type { TariffRow } from '$lib/server/db';
import { logger } from '$lib/server/logger';

let tableReady = false;

const ELEXON_BMRS_BASE = 'https://data.elexon.co.uk/bmrs/api/v1';

const ElexonPriceSchema = z.object({
	settlementDate: z.string(),
	settlementPeriod: z.number(),
	startTime: z.string(),
	price: z.number(),
});

const ElexonResponseSchema = z.array(ElexonPriceSchema);

/**
 * Fetch day-ahead wholesale electricity prices from Elexon BMRS.
 * Returns 48 half-hour settlement period prices for the given date.
 */
async function fetchDayAheadPrices(
	date: string,
): Promise<{ slot: number; price_gbp_mwh: number; start_time: string }[]> {
	const url = `${ELEXON_BMRS_BASE}/balancing/settlement/system-prices?settlementDate=${date}&format=json`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Elexon API error: ${response.status} ${response.statusText}`);
	}

	const data: unknown = await response.json();
	const parsed = ElexonResponseSchema.parse(data);

	return parsed
		.filter((p) => p.settlementPeriod >= 1 && p.settlementPeriod <= 48)
		.map((p) => ({
			slot: p.settlementPeriod - 1,
			price_gbp_mwh: p.price,
			start_time: p.startTime,
		}))
		.sort((a, b) => a.slot - b.slot);
}

/**
 * Convert wholesale price (£/MWh) to retail-equivalent pence per kWh.
 * Adds a typical non-commodity cost uplift to approximate what an agile tariff would charge.
 *
 * Wholesale £/MWh → p/kWh: divide by 10
 * Then add ~12p/kWh for network charges, balancing, margins, VAT etc.
 */
function wholesaleToRetailPence(priceGbpMwh: number): number {
	const wholesalePencePerKwh = priceGbpMwh / 10;
	const nonCommodityUplift = 12.0;
	return Math.round((wholesalePencePerKwh + nonCommodityUplift) * 100) / 100;
}

// Vercel Cron sends GET requests — alias so both methods work.
export { POST as GET };

export const POST: RequestHandler = async ({ request }) => {
	validateBearerToken(request);

	if (!tableReady) {
		await ensureTariffsTable();
		tableReady = true;
	}

	const startTime = Date.now();

	try {
		// Fetch yesterday's settlement prices (today's may not be available yet)
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const dateStr = yesterday.toISOString().split('T')[0];

		const prices = await fetchDayAheadPrices(dateStr);

		logger.info('ingest.elexon.pricesFetched', {
			date: dateStr,
			count: prices.length,
		});

		if (prices.length === 0) {
			logger.warn('ingest.elexon.noPrices', { date: dateStr });
			return json({
				success: true,
				upserted: 0,
				message: `No settlement prices available for ${dateStr}`,
			});
		}

		const avgWholesale = prices.reduce((sum, p) => sum + p.price_gbp_mwh, 0) / prices.length;
		const minWholesale = Math.min(...prices.map((p) => p.price_gbp_mwh));
		const maxWholesale = Math.max(...prices.map((p) => p.price_gbp_mwh));

		const halfHourlyRates = prices.map((p) => ({
			slot: p.slot,
			wholesale_gbp_mwh: p.price_gbp_mwh,
			retail_p_kwh: wholesaleToRetailPence(p.price_gbp_mwh),
			start_time: p.start_time,
		}));

		const row: TariffRow = {
			provider: 'elexon',
			tariff_code: `ELEXON-WHOLESALE-${dateStr}`,
			tariff_name: `Wholesale Day-Ahead (${dateStr})`,
			region: 'national',
			fuel_type: 'electricity',
			unit_rate_p: wholesaleToRetailPence(avgWholesale),
			rate_data: {
				date: dateStr,
				type: 'wholesale',
				half_hourly_rates: halfHourlyRates,
				summary: {
					avg_wholesale_gbp_mwh: Math.round(avgWholesale * 100) / 100,
					min_wholesale_gbp_mwh: Math.round(minWholesale * 100) / 100,
					max_wholesale_gbp_mwh: Math.round(maxWholesale * 100) / 100,
					avg_retail_p_kwh: wholesaleToRetailPence(avgWholesale),
					min_retail_p_kwh: wholesaleToRetailPence(minWholesale),
					max_retail_p_kwh: wholesaleToRetailPence(maxWholesale),
				},
			},
			valid_from: prices[0]?.start_time,
			valid_to: `${dateStr}T23:59:59Z`,
			source: 'elexon_bmrs',
		};

		const totalUpserted = await upsertTariffs([row]);
		const durationMs = Date.now() - startTime;

		logger.info('ingest.elexon.complete', {
			date: dateStr,
			totalUpserted,
			avgWholesale: Math.round(avgWholesale * 100) / 100,
			durationMs,
		});

		return json({
			success: true,
			upserted: totalUpserted,
			date: dateStr,
			summary: {
				avg_wholesale_gbp_mwh: Math.round(avgWholesale * 100) / 100,
				avg_retail_p_kwh: wholesaleToRetailPence(avgWholesale),
				periods: prices.length,
			},
			durationMs,
		});
	} catch (err) {
		logger.error('ingest.elexon.failed', {
			error: err instanceof Error ? err.message : String(err),
		});

		return json(
			{
				success: false,
				error: 'Elexon ingestion failed',
				details: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 },
		);
	}
};
