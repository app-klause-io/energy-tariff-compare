import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateBearerToken } from '$lib/server/auth';
import { ensureTariffsTable, upsertTariffs } from '$lib/server/db';
import type { TariffRow } from '$lib/server/db';
import { logger } from '$lib/server/logger';

let tableReady = false;

/**
 * Supplier configurations for TheEnergyShop.com JSON API.
 *
 * Data is fetched from their internal Umbraco API endpoint:
 *   /umbraco/surface/GuidesBackend/GetSupplierTariffs?supplierId={id}
 *
 * The supplier pages load tariff tables via client-side JavaScript,
 * so we call the underlying JSON API directly instead of scraping HTML.
 *
 * Supplier IDs are extracted from the `data-id` attribute on each
 * supplier's page table element.
 */
const SUPPLIERS: {
	supplierId: number;
	provider: string;
	providerName: string;
}[] = [
	{ supplierId: 5, provider: 'british-gas', providerName: 'British Gas' },
	{ supplierId: 150, provider: 'eon', providerName: 'E.ON Next' },
	{ supplierId: 68, provider: 'edf', providerName: 'EDF' },
	{ supplierId: 76, provider: 'ovo', providerName: 'OVO Energy' },
	{ supplierId: 16, provider: 'scottish-power', providerName: 'Scottish Power' },
	{ supplierId: 149, provider: 'outfox', providerName: 'Outfox the Market' },
];

/**
 * Shape of the JSON returned by TheEnergyShop's API.
 */
interface EnergyShopTariff {
	supplierName: string;
	tariffName: string;
	serviceType: string;
	standingChargeElec: number;
	yearlyStandingChargeElec: number;
	standingChargeGas: number;
	yearlyStandingChargeGas: number;
	price1Elec: number;
	price1Gas: number;
	wayOutFlag: boolean;
}

/**
 * Classify a tariff name and map to a valid TariffType.
 * TariffType union: 'flat' | 'economy7' | 'agile' | 'go' | 'intelligent-go' | 'cosy' | 'flux' | 'standard'
 */
function classifyTariffType(name: string): { type: 'flat' | 'standard'; tariffClass: string } {
	const lower = name.toLowerCase();
	if (lower.includes('fix') || lower.includes('lock')) return { type: 'flat', tariffClass: 'fixed' };
	if (lower.includes('tracker') || lower.includes('track')) return { type: 'flat', tariffClass: 'tracker' };
	return { type: 'standard', tariffClass: 'variable' };
}

/**
 * Generate a stable tariff code from provider and tariff name.
 */
function makeTariffCode(provider: string, tariffName: string): string {
	const slug = tariffName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.substring(0, 50);
	return `ESHOP-${provider.toUpperCase()}-${slug}`;
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
	let totalUpserted = 0;
	const errors: { supplier: string; error: string }[] = [];
	const supplierSummaries: { supplier: string; tariffs: number }[] = [];

	try {
		for (const supplier of SUPPLIERS) {
			try {
				const url = `https://www.theenergyshop.com/umbraco/surface/GuidesBackend/GetSupplierTariffs?supplierId=${supplier.supplierId}`;
				const response = await fetch(url, {
					headers: {
						'User-Agent':
							'BestEnergyTariffs/1.0 (tariff comparison; contact@bestenergytariffs.co.uk)',
					},
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status} for ${supplier.providerName}`);
				}

				const data: EnergyShopTariff[] = await response.json();

				if (data.length === 0) {
					logger.warn('ingest.energyshop.noTariffs', {
						supplier: supplier.provider,
						supplierId: supplier.supplierId,
					});
					continue;
				}

				const rows: TariffRow[] = [];

				for (const tariff of data) {
					const { type, tariffClass } = classifyTariffType(tariff.tariffName);
					const tariffCode = makeTariffCode(supplier.provider, tariff.tariffName);

					// Standing charge: yearlyStandingCharge is in pence/year,
					// divide by 365 to get pence/day
					const elecStandingCharge = tariff.yearlyStandingChargeElec > 0
						? Math.round((tariff.yearlyStandingChargeElec / 365) * 100) / 100
						: undefined;
					const gasStandingCharge = tariff.yearlyStandingChargeGas > 0
						? Math.round((tariff.yearlyStandingChargeGas / 365) * 100) / 100
						: undefined;

					// Electricity tariff — stored with 'national' region sentinel
					if (tariff.price1Elec > 0) {
						rows.push({
							provider: supplier.provider,
							tariff_code: tariffCode + '-ELEC',
							tariff_name: tariff.tariffName,
							region: 'national',
							fuel_type: 'electricity',
							payment_method: 'direct_debit',
							unit_rate_p: tariff.price1Elec,
							standing_charge_p: elecStandingCharge,
							rate_data: {
								type,
								source_provider_name: supplier.providerName,
								tariff_class: tariffClass,
								gas_unit_rate_p: tariff.price1Gas > 0 ? tariff.price1Gas : undefined,
								gas_standing_charge_p: gasStandingCharge,
							},
							source: 'theenergyshop',
						});
					}

					// Gas tariff
					if (tariff.price1Gas > 0) {
						rows.push({
							provider: supplier.provider,
							tariff_code: tariffCode + '-GAS',
							tariff_name: tariff.tariffName,
							region: 'national',
							fuel_type: 'gas',
							payment_method: 'direct_debit',
							unit_rate_p: tariff.price1Gas,
							standing_charge_p: gasStandingCharge,
							rate_data: {
								type,
								source_provider_name: supplier.providerName,
								tariff_class: tariffClass,
							},
							source: 'theenergyshop',
						});
					}
				}

				const upserted = await upsertTariffs(rows);
				totalUpserted += upserted;

				supplierSummaries.push({
					supplier: supplier.providerName,
					tariffs: data.length,
				});

				logger.info('ingest.energyshop.supplierDone', {
					supplier: supplier.provider,
					tariffsParsed: data.length,
					rowsUpserted: upserted,
				});
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				errors.push({ supplier: supplier.provider, error: errorMsg });
				logger.warn('ingest.energyshop.supplierError', {
					supplier: supplier.provider,
					error: errorMsg,
				});
			}
		}

		const durationMs = Date.now() - startTime;

		logger.info('ingest.energyshop.complete', {
			totalUpserted,
			supplierCount: supplierSummaries.length,
			errorCount: errors.length,
			durationMs,
		});

		return json({
			success: true,
			upserted: totalUpserted,
			suppliers: supplierSummaries,
			errors: errors.length,
			errorDetails: errors.length > 0 ? errors : undefined,
			durationMs,
		});
	} catch (err) {
		logger.error('ingest.energyshop.failed', {
			error: err instanceof Error ? err.message : String(err),
			upsertedBeforeFailure: totalUpserted,
		});

		return json(
			{
				success: false,
				error: 'EnergyShop ingestion failed',
				details: err instanceof Error ? err.message : String(err),
				upserted: totalUpserted,
			},
			{ status: 500 },
		);
	}
};
