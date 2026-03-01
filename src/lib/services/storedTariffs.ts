import { logger } from '$lib/server/logger';
import { getTariffs, ensureTariffsTable } from '$lib/server/db';
import type { TariffRecord } from '$lib/server/db';
import type { Tariff, TariffType, TimeOfUseRate } from '$lib/types/tariff';
import type { UkRegion } from '$lib/types/wizard';

let tableReady = false;

/**
 * Major UK energy providers that charge at or near the Ofgem price cap
 * for their standard variable tariffs.
 */
const CAP_RATE_PROVIDERS = [
	{ id: 'british-gas', name: 'British Gas', tariffName: 'Standard Variable' },
	{ id: 'edf', name: 'EDF', tariffName: 'Standard Variable' },
	{ id: 'eon', name: 'E.ON', tariffName: 'Next Online v54' },
	{ id: 'scottish-power', name: 'Scottish Power', tariffName: 'Standard Variable' },
	{ id: 'ovo', name: 'OVO Energy', tariffName: 'Variable Rate' },
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
 * used by the comparison engine. For ofgem_cap records, expands into
 * individual provider tariffs for each major UK supplier.
 */
export function convertStoredToTariffs(record: TariffRecord, region: UkRegion): Tariff[] {
	const rateData = record.rate_data as Record<string, unknown> | null;
	const tariffType = (rateData?.type as TariffType) ?? 'flat';
	const rates = buildRates(record);
	if (!rates) return [];

	const standingCharge = record.standing_charge_p != null ? Number(record.standing_charge_p) : 0;

	// For Ofgem cap records, expand into individual provider tariffs
	if (record.provider === 'ofgem_cap' && record.payment_method === 'direct_debit') {
		return CAP_RATE_PROVIDERS.map((provider) => ({
			id: `cap-${provider.id}-${record.id}`,
			name: provider.tariffName,
			supplier: provider.name,
			type: tariffType,
			standingCharge,
			rates,
			region,
		}));
	}

	// Skip prepayment cap records and elexon wholesale (not useful for consumer comparison)
	if (record.provider === 'ofgem_cap' || record.provider === 'elexon') {
		return [];
	}

	const supplier =
		record.provider === 'octopus' ? 'Octopus Energy' : record.provider;

	return [
		{
			id: `stored-${record.provider}-${record.id}`,
			name: record.tariff_name,
			supplier,
			type: tariffType,
			standingCharge,
			rates,
			region,
		},
	];
}

/**
 * Fetch stored tariffs for a given region and convert them to the Tariff format
 * used by the comparison engine. Returns tariffs from all providers that have
 * data for the specified region.
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

		const tariffs: Tariff[] = [];

		for (const record of result.tariffs) {
			tariffs.push(...convertStoredToTariffs(record, region));
		}

		logger.info('storedTariffs.fetched', {
			region,
			total: result.total,
			converted: tariffs.length,
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
