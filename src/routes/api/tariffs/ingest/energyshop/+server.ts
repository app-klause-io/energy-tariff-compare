import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateBearerToken } from '$lib/server/auth';
import { ensureTariffsTable, upsertTariffs } from '$lib/server/db';
import type { TariffRow } from '$lib/server/db';
import { logger } from '$lib/server/logger';

let tableReady = false;

/**
 * Supplier pages on TheEnergyShop.com that publish tariff tables.
 * Each has an HTML table with columns:
 *   Tariff Name | Electricity Unit Price | Electricity Standing Charge | Gas Unit Price | Gas Standing Charge
 *
 * Note: Standing charges show 0.00p (national average pages don't have regional data).
 * Unit rates are national averages — close enough to rank tariffs correctly.
 */
const SUPPLIER_PAGES: {
	slug: string;
	provider: string;
	providerName: string;
	tableIndex: number;
}[] = [
	{ slug: 'british-gas', provider: 'british-gas', providerName: 'British Gas', tableIndex: 0 },
	{ slug: 'eon', provider: 'eon', providerName: 'E.ON Next', tableIndex: 0 },
	{ slug: 'edf-energy', provider: 'edf', providerName: 'EDF', tableIndex: 0 },
	{ slug: 'ovo-energy', provider: 'ovo', providerName: 'OVO Energy', tableIndex: 0 },
	{
		slug: 'scottish-power',
		provider: 'scottish-power',
		providerName: 'Scottish Power',
		tableIndex: 0,
	},
	{
		slug: 'outfox-energy',
		provider: 'outfox',
		providerName: 'Outfox the Market',
		tableIndex: 1,
	},
];

interface ParsedTariff {
	tariffName: string;
	elecUnitRate: number;
	gasUnitRate: number;
	elecStandingCharge: number;
	gasStandingCharge: number;
}

/**
 * Parse a pence value from text like "26.74p" or "0.00p".
 */
function parsePence(text: string): number {
	const cleaned = text.replace(/[^0-9.]/g, '');
	return parseFloat(cleaned) || 0;
}

/**
 * Parse the HTML table from a supplier page.
 * Tables have a header row then data rows with tab-separated cells.
 */
function parseSupplierTable(html: string, tableIndex: number): ParsedTariff[] {
	const tariffs: ParsedTariff[] = [];

	// Extract table contents using regex — these are standard HTML tables
	const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
	const tables: string[] = [];
	let match;
	while ((match = tableRegex.exec(html)) !== null) {
		tables.push(match[1]);
	}

	if (tableIndex >= tables.length) return tariffs;

	const tableHtml = tables[tableIndex];

	// Extract rows
	const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
	const rows: string[] = [];
	while ((match = rowRegex.exec(tableHtml)) !== null) {
		rows.push(match[1]);
	}

	// Skip header row (index 0)
	for (let i = 1; i < rows.length; i++) {
		const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
		const cells: string[] = [];
		while ((match = cellRegex.exec(rows[i])) !== null) {
			// Strip HTML tags from cell content
			cells.push(match[1].replace(/<[^>]*>/g, '').trim());
		}

		// Expected: Tariff Name | Elec Unit Price | Elec Standing Charge | Gas Unit Price | Gas Standing Charge
		if (cells.length >= 5) {
			const tariffName = cells[0];
			const elecUnitRate = parsePence(cells[1]);
			const elecStandingCharge = parsePence(cells[2]);
			const gasUnitRate = parsePence(cells[3]);
			const gasStandingCharge = parsePence(cells[4]);

			// Skip entries with zero unit rates (invalid data)
			if (elecUnitRate > 0) {
				tariffs.push({
					tariffName,
					elecUnitRate,
					gasUnitRate,
					elecStandingCharge,
					gasStandingCharge,
				});
			}
		}
	}

	return tariffs;
}

/**
 * Classify a tariff name to determine if it's fixed, variable, or tracker.
 */
function classifyTariff(name: string): 'fixed' | 'variable' | 'tracker' {
	const lower = name.toLowerCase();
	if (lower.includes('fix') || lower.includes('lock')) return 'fixed';
	if (lower.includes('tracker') || lower.includes('track')) return 'tracker';
	return 'variable';
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
		for (const supplier of SUPPLIER_PAGES) {
			try {
				const url = `https://www.theenergyshop.com/energy-suppliers/${supplier.slug}`;
				const response = await fetch(url, {
					headers: {
						'User-Agent':
							'BestEnergyTariffs/1.0 (tariff comparison; contact@bestenergytariffs.co.uk)',
					},
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status} for ${url}`);
				}

				const html = await response.text();
				const parsed = parseSupplierTable(html, supplier.tableIndex);

				if (parsed.length === 0) {
					logger.warn('ingest.energyshop.noTariffs', {
						supplier: supplier.provider,
						slug: supplier.slug,
					});
					continue;
				}

				const rows: TariffRow[] = [];

				for (const tariff of parsed) {
					const tariffClass = classifyTariff(tariff.tariffName);
					const tariffCode = makeTariffCode(supplier.provider, tariff.tariffName);

					// Electricity tariff — stored without region (national average)
					rows.push({
						provider: supplier.provider,
						tariff_code: tariffCode + '-ELEC',
						tariff_name: tariff.tariffName,
						region: null as unknown as undefined,
						fuel_type: 'electricity',
						payment_method: 'direct_debit',
						unit_rate_p: tariff.elecUnitRate,
						standing_charge_p:
							tariff.elecStandingCharge > 0 ? tariff.elecStandingCharge : undefined,
						rate_data: {
							type: tariffClass === 'variable' ? 'flat' : tariffClass,
							source_provider_name: supplier.providerName,
							tariff_class: tariffClass,
							gas_unit_rate_p: tariff.gasUnitRate > 0 ? tariff.gasUnitRate : undefined,
							gas_standing_charge_p:
								tariff.gasStandingCharge > 0 ? tariff.gasStandingCharge : undefined,
						},
						source: 'theenergyshop',
					});

					// Gas tariff
					if (tariff.gasUnitRate > 0) {
						rows.push({
							provider: supplier.provider,
							tariff_code: tariffCode + '-GAS',
							tariff_name: tariff.tariffName,
							region: null as unknown as undefined,
							fuel_type: 'gas',
							payment_method: 'direct_debit',
							unit_rate_p: tariff.gasUnitRate,
							standing_charge_p:
								tariff.gasStandingCharge > 0 ? tariff.gasStandingCharge : undefined,
							rate_data: {
								type: tariffClass === 'variable' ? 'flat' : tariffClass,
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
					tariffs: parsed.length,
				});

				logger.info('ingest.energyshop.supplierDone', {
					supplier: supplier.provider,
					tariffsParsed: parsed.length,
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
