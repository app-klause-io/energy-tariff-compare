import type { Tariff, ComparisonResult } from '$lib/types/tariff';
import type { UkRegion } from '$lib/types/wizard';

/**
 * Calculate the annual cost for a given tariff and consumption profile.
 *
 * @param tariff - The tariff to calculate cost for
 * @param dailyProfile - Normalized daily consumption profile (48 slots summing to ~1.0)
 * @param annualKwh - Total annual consumption in kWh
 * @returns Annual cost in pounds
 */
export function calculateAnnualCost(
	tariff: Tariff,
	dailyProfile: number[],
	annualKwh: number,
): number {
	if (dailyProfile.length !== 48) {
		throw new Error('Daily profile must have exactly 48 half-hour slots');
	}

	// Calculate standing charge cost (365 days)
	const standingChargeCost = (tariff.standingCharge * 365) / 100; // Convert pence to pounds

	// Calculate energy cost based on time-of-use rates
	let energyCost = 0;

	// Create a slot-to-rate map for efficient lookup
	const slotRates = new Array<number>(48).fill(0);
	for (const rateWindow of tariff.rates) {
		const { rate, startSlot, endSlot } = rateWindow;
		for (let slot = startSlot; slot < endSlot; slot++) {
			const wrappedSlot = ((slot % 48) + 48) % 48;
			slotRates[wrappedSlot] = rate;
		}
	}

	// Calculate energy cost for each slot
	const dailyKwh = annualKwh / 365;
	for (let slot = 0; slot < 48; slot++) {
		const slotKwh = dailyProfile[slot] * dailyKwh;
		const slotCostPence = slotKwh * slotRates[slot];
		energyCost += slotCostPence;
	}

	// Convert daily energy cost to annual and pence to pounds
	energyCost = (energyCost * 365) / 100;

	return standingChargeCost + energyCost;
}

/**
 * Compare a consumption profile against multiple tariffs.
 *
 * @param tariffs - Array of tariffs to compare
 * @param dailyProfile - Normalized daily consumption profile (48 slots summing to ~1.0)
 * @param annualKwh - Total annual consumption in kWh
 * @param region - UK region for filtering region-specific tariffs
 * @returns Array of comparison results, sorted by annual cost (cheapest first)
 */
export function compareTariffs(
	tariffs: Tariff[],
	dailyProfile: number[],
	annualKwh: number,
	region?: UkRegion,
): ComparisonResult[] {
	// Filter tariffs by region if specified
	const availableTariffs = region
		? tariffs.filter((t) => t.regions.length === 0 || t.regions.includes(region))
		: tariffs;

	// Calculate costs for each tariff
	const results: ComparisonResult[] = availableTariffs.map((tariff) => {
		const annualCost = calculateAnnualCost(tariff, dailyProfile, annualKwh);
		const standingChargeCost = (tariff.standingCharge * 365) / 100;
		const energyCost = annualCost - standingChargeCost;

		return {
			tariff,
			annualCost,
			savingsVsBaseline: 0, // Will be calculated after sorting
			breakdown: {
				standingChargeCost,
				energyCost,
				totalCost: annualCost,
			},
		};
	});

	// Sort by annual cost (cheapest first)
	results.sort((a, b) => a.annualCost - b.annualCost);

	// Calculate savings vs most expensive tariff (baseline)
	if (results.length > 0) {
		const mostExpensive = results[results.length - 1].annualCost;
		for (const result of results) {
			result.savingsVsBaseline = mostExpensive - result.annualCost;
		}
	}

	return results;
}
