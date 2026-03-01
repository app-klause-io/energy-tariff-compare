import type { ConsumptionProfile } from './consumption';
import type { Tariff, ComparisonResult } from '$lib/types/tariff';
import type { UkRegion } from '$lib/types/wizard';
import { getTariffsForRegion } from '$lib/data/tariffs';

/**
 * Calculate the annual cost of a consumption profile on a given tariff.
 *
 * @param profile - Consumption profile from calculateConsumption
 * @param tariff - Tariff to calculate cost for
 * @returns Annual cost in pounds
 */
export function calculateTariffCost(profile: ConsumptionProfile, tariff: Tariff): number {
	// Annual standing charge cost
	const standingChargeCost = (tariff.standingCharge * 365) / 100; // pence to pounds

	// Calculate energy cost by mapping each half-hour slot to the tariff's rate
	// dailyProfile is normalized to 1.0, so multiply by annualKwh / 365 to get daily kWh per slot
	const dailyKwh = profile.dailyProfile.map((proportion) => (proportion * profile.annualKwh) / 365);

	// Build a rate lookup table for fast access
	const rateBySlot = new Array<number>(48).fill(0);
	for (const rate of tariff.rates) {
		for (let slot = rate.startSlot; slot < rate.endSlot; slot++) {
			rateBySlot[slot] = rate.unitRate;
		}
	}

	// Calculate daily energy cost
	let dailyEnergyCost = 0;
	for (let slot = 0; slot < 48; slot++) {
		const kwhInSlot = dailyKwh[slot];
		const rateInPence = rateBySlot[slot];
		dailyEnergyCost += (kwhInSlot * rateInPence) / 100; // pence to pounds
	}

	// Scale to annual cost
	// Note: profile.annualKwh already includes seasonal variation in aggregate,
	// and dailyProfile represents the average daily distribution across the year.
	// Seasonal factors are informational only - don't reapply them here.
	const annualEnergyCost = dailyEnergyCost * 365;

	return standingChargeCost + annualEnergyCost;
}

/**
 * Calculate the annual cost breakdown for a tariff.
 * Returns detailed breakdown including time-of-use periods.
 */
export function calculateTariffCostBreakdown(
	profile: ConsumptionProfile,
	tariff: Tariff,
): ComparisonResult['breakdown'] {
	// Standing charge
	const standingChargeCost = (tariff.standingCharge * 365) / 100;

	// Energy cost calculation with time period breakdown
	const dailyKwh = profile.dailyProfile.map((proportion) => (proportion * profile.annualKwh) / 365);

	// Build rate lookup and track usage by time period
	const rateBySlot = new Array<number>(48).fill(0);
	const usageByPeriod = new Map<string, { label: string; kwhUsed: number; unitRate: number }>();

	for (const rate of tariff.rates) {
		const label = rate.label ?? 'standard';
		for (let slot = rate.startSlot; slot < rate.endSlot; slot++) {
			rateBySlot[slot] = rate.unitRate;

			if (!usageByPeriod.has(label)) {
				usageByPeriod.set(label, { label, kwhUsed: 0, unitRate: rate.unitRate });
			}
		}
	}

	// Accumulate usage by period
	for (let slot = 0; slot < 48; slot++) {
		const kwhInSlot = dailyKwh[slot];
		const rate = tariff.rates.find(
			(r: { startSlot: number; endSlot: number }) => slot >= r.startSlot && slot < r.endSlot,
		);
		if (rate) {
			const label = rate.label ?? 'standard';
			const period = usageByPeriod.get(label)!;
			period.kwhUsed += kwhInSlot;
		}
	}

	// Scale to annual usage and calculate costs
	// Note: profile.annualKwh already includes seasonal variation, don't reapply
	const byTimePeriod = Array.from(usageByPeriod.values()).map((period) => {
		const annualKwh = period.kwhUsed * 365;
		const cost = (annualKwh * period.unitRate) / 100; // pence to pounds
		return {
			label: period.label,
			kwhUsed: annualKwh,
			cost,
		};
	});

	const energyCost = byTimePeriod.reduce((sum, p) => sum + p.cost, 0);

	return {
		standingChargeCost,
		energyCost,
		byTimePeriod: tariff.type === 'flat' ? undefined : byTimePeriod,
	};
}

/**
 * Compare a consumption profile across all available tariffs for a region.
 * Uses hardcoded fallback data. For live API data, use compareTariffsWithData.
 * Returns results sorted by annual cost (cheapest first).
 */
export function compareTariffs(profile: ConsumptionProfile, region: UkRegion): ComparisonResult[] {
	const tariffs = getTariffsForRegion(region);
	return compareTariffsWithData(profile, tariffs);
}

/**
 * Compare a consumption profile against a provided set of tariffs.
 * Use this with live API data or any pre-fetched tariff set.
 * Returns results sorted by annual cost (cheapest first).
 */
export function compareTariffsWithData(
	profile: ConsumptionProfile,
	tariffs: Tariff[],
): ComparisonResult[] {
	if (tariffs.length === 0) return [];

	const results: ComparisonResult[] = tariffs.map((tariff) => {
		const annualCost = calculateTariffCost(profile, tariff);
		const breakdown = calculateTariffCostBreakdown(profile, tariff);

		return {
			tariff,
			annualCost,
			savingsVsWorst: 0,
			breakdown,
		};
	});

	results.sort((a, b) => a.annualCost - b.annualCost);

	const worstCost = results[results.length - 1].annualCost;
	for (const result of results) {
		result.savingsVsWorst = worstCost - result.annualCost;
	}

	return results;
}
