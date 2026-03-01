import { logger } from '$lib/server/logger';
import { getTariffs, ensureTariffsTable } from '$lib/server/db';
import type { TariffRecord } from '$lib/server/db';
import type { Tariff, TariffType, TimeOfUseRate } from '$lib/types/tariff';
import type { UkRegion } from '$lib/types/wizard';

let tableReady = false;

/**
 * Provider display names for EnergyShop-sourced tariffs.
 */
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
	'british-gas': 'British Gas',
	eon: 'E.ON Next',
	edf: 'EDF',
	ovo: 'OVO Energy',
	'scottish-power': 'Scottish Power',
	outfox: 'Outfox the Market',
	octopus: 'Octopus Energy',
};

/**
 * Providers that charge at the Ofgem price cap for their SVT.
 * Only used as fallback when no EnergyShop data exists for a provider.
 */
const CAP_RATE_PROVIDERS = [
	{ id: 'british-gas', name: 'British Gas', tariffName: 'Standard Variable' },
	{ id: 'edf', name: 'EDF', tariffName: 'Standard Variable' },
	{ id: 'eon', name: 'E.ON Next', tariffName: 'Next Flex' },
	{ id: 'scottish-power', name: 'Scottish Power', tariffName: 'Standard Variable' },
	{ id: 'ovo', name: 'OVO Energy', tariffName: 'Simpler Energy' },
] as const;

/**
 * Build rate structure from a stored tariff record.
 */
function buildRates(record: TariffRecord): TimeOfUseRate[] | null {
	const rateData = record.rate_data as Record<string, unknown> | null;

	const halfHourlyRates = rateData?.half_hourly_rates as
		| { slot: number; retail_p_kwh?: number; rate_p?: number }[]
		| undefined;

	if (halfHourlyRates && halfHourlyRates.length > 0) {
		const slotRates = new Array<number>(48).fill(0);
		for (const hr of halfHourlyRates) {
			const rate = hr.retail_p_kwh ?? hr.rate_p ?? 0;
			if (hr.slot >= 0 && hr.slot < 48) {
				slotRates[hr.slot] = rate;
			}
		}

		const rates: TimeOfUseRate[] = [];
		let currentRate = slotRates[0];
		let startSlot = 0;

		for (let i = 1; i < 48; i++) {
			if (Math.abs(slotRates[i] - currentRate) > 0.01) {
				rates.push({ startSlot, endSlot: i, unitRate: currentRate });
				currentRate = slotRates[i];
				startSlot = i;
			}
		}
		rates.push({ startSlot, endSlot: 48, unitRate: currentRate });
		return rates;
	} else if (record.unit_rate_p != null) {
		return [{ startSlot: 0, endSlot: 48, unitRate: Number(record.unit_rate_p) }];
	}

	return null;
}

/**
 * Convert a stored tariff record from the database into the Tariff format
 * used by the comparison engine.
 *
 * For ofgem_cap records: expands into individual provider SVT tariffs (fallback
 * when no real EnergyShop data exists for those providers).
 *
 * For EnergyShop records (region IS NULL): uses the provided standing charge
 * or falls back to 0 (the comparison engine uses Ofgem regional cap standing
 * charges when available).
 */
export function convertStoredToTariffs(
	record: TariffRecord,
	region: UkRegion,
	capStandingCharge?: number,
	realProviders?: Set<string>,
): Tariff[] {
	const rateData = record.rate_data as Record<string, unknown> | null;
	const tariffType = (rateData?.type as TariffType) ?? 'flat';
	const rates = buildRates(record);
	if (!rates) return [];

	const standingCharge = record.standing_charge_p != null ? Number(record.standing_charge_p) : 0;

	// For Ofgem cap records, expand into individual provider SVT tariffs
	// but only for providers we don't already have real data for
	if (record.provider === 'ofgem_cap' && record.payment_method === 'direct_debit') {
		const providers = realProviders
			? CAP_RATE_PROVIDERS.filter((p) => !realProviders.has(p.id))
			: CAP_RATE_PROVIDERS;

		return providers.map((provider) => ({
			id: `cap-${provider.id}-${record.id}`,
			name: provider.tariffName,
			supplier: provider.name,
			type: tariffType,
			standingCharge,
			rates,
			region,
		}));
	}

	// Skip prepayment cap records and elexon wholesale
	if (record.provider === 'ofgem_cap' || record.provider === 'elexon') {
		return [];
	}

	// For EnergyShop records (null region / national averages), use the regional
	// cap standing charge as the standing charge estimate, since the EnergyShop
	// pages show 0.00p for standing charges.
	const effectiveStandingCharge =
		standingCharge > 0 ? standingCharge : (capStandingCharge ?? 0);

	const supplier =
		PROVIDER_DISPLAY_NAMES[record.provider] ?? record.provider;

	return [
		{
			id: `stored-${record.provider}-${record.id}`,
			name: record.tariff_name,
			supplier,
			type: tariffType,
			standingCharge: effectiveStandingCharge,
			rates,
			region,
		},
	];
}

/**
 * Fetch stored tariffs for a given region and convert them to the Tariff format
 * used by the comparison engine. Returns tariffs from all providers that have
 * data for the specified region, including national-average tariffs from
 * TheEnergyShop.
 */
export async function fetchStoredTariffsForRegion(region: UkRegion): Promise<Tariff[]> {
	if (!tableReady) {
		try {
			await ensureTariffsTable();
			tableReady = true;
		} catch (err) {
			logger.warn('storedTariffs.tableCheckFailed', {
				error: err instanceof Error ? err.message : String(err),
			});
			return [];
		}
	}

	try {
		const result = await getTariffs({
			region,
			fuel_type: 'electricity',
			limit: 500,
		});

		// First pass: identify which providers have real EnergyShop data
		const realProviders = new Set<string>();
		for (const record of result.tariffs) {
			if (record.source === 'theenergyshop') {
				realProviders.add(record.provider);
			}
		}

		// Find the Ofgem cap standing charge for this region (to use for
		// EnergyShop tariffs that don't have regional standing charges)
		let capStandingCharge = 0;
		for (const record of result.tariffs) {
			if (
				record.provider === 'ofgem_cap' &&
				record.region === region &&
				record.payment_method === 'direct_debit' &&
				record.standing_charge_p != null
			) {
				capStandingCharge = Number(record.standing_charge_p);
				break;
			}
		}

		const tariffs: Tariff[] = [];

		for (const record of result.tariffs) {
			tariffs.push(
				...convertStoredToTariffs(record, region, capStandingCharge, realProviders),
			);
		}

		logger.info('storedTariffs.fetched', {
			region,
			total: result.total,
			converted: tariffs.length,
			realProviders: Array.from(realProviders),
			capStandingCharge,
		});

		return tariffs;
	} catch (err) {
		logger.warn('storedTariffs.fetchFailed', {
			region,
			error: err instanceof Error ? err.message : String(err),
		});
		return [];
	}
}
