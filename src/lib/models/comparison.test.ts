import { describe, it, expect } from 'vitest';
import { calculateAnnualCost, compareTariffs } from './comparison';
import type { Tariff } from '$lib/types/tariff';
import type { UkRegion } from '$lib/types/wizard';

/** Helper to create a flat tariff */
function makeFlatTariff(id: string, rate: number, standingCharge = 60.0): Tariff {
	return {
		id,
		name: `Flat ${rate}p`,
		supplier: 'Test Supplier',
		type: 'flat',
		standingCharge,
		rates: [{ rate, startSlot: 0, endSlot: 48, label: 'All day' }],
		regions: [],
	};
}

/** Helper to create an Economy 7 style tariff */
function makeEconomy7Tariff(
	id: string,
	nightRate: number,
	dayRate: number,
	standingCharge = 60.0,
): Tariff {
	return {
		id,
		name: 'Economy 7',
		supplier: 'Test Supplier',
		type: 'economy7',
		standingCharge,
		rates: [
			{ rate: nightRate, startSlot: 0, endSlot: 14, label: 'Night (00:00-07:00)' },
			{ rate: dayRate, startSlot: 14, endSlot: 48, label: 'Day (07:00-24:00)' },
		],
		regions: [],
	};
}

/** Helper to create a uniform daily profile (flat usage) */
function makeUniformProfile(): number[] {
	return new Array(48).fill(1 / 48);
}

/** Helper to create a high overnight profile (night owl) */
function makeOvernightProfile(): number[] {
	const profile = new Array(48).fill(0);
	// 60% overnight (slots 0-13), 40% daytime (slots 14-47)
	for (let i = 0; i < 14; i++) {
		profile[i] = 0.6 / 14;
	}
	for (let i = 14; i < 48; i++) {
		profile[i] = 0.4 / 34;
	}
	return profile;
}

/** Helper to create a high peak profile (evening heavy) */
function makeEveningPeakProfile(): number[] {
	const profile = new Array(48).fill(0);
	// 10% overnight (0-13), 20% daytime (14-31), 60% evening peak (32-37), 10% late evening (38-47)
	for (let i = 0; i < 14; i++) {
		profile[i] = 0.1 / 14;
	}
	for (let i = 14; i < 32; i++) {
		profile[i] = 0.2 / 18;
	}
	for (let i = 32; i < 38; i++) {
		profile[i] = 0.6 / 6;
	}
	for (let i = 38; i < 48; i++) {
		profile[i] = 0.1 / 10;
	}
	return profile;
}

// ============================================================
// calculateAnnualCost tests
// ============================================================

describe('calculateAnnualCost', () => {
	it('throws error if daily profile does not have 48 slots', () => {
		const tariff = makeFlatTariff('test', 20.0);
		expect(() => calculateAnnualCost(tariff, [], 3000)).toThrow(
			'Daily profile must have exactly 48 half-hour slots',
		);
		expect(() => calculateAnnualCost(tariff, new Array(47).fill(0), 3000)).toThrow(
			'Daily profile must have exactly 48 half-hour slots',
		);
	});

	it('calculates correct cost for flat tariff with uniform profile', () => {
		const tariff = makeFlatTariff('flat-20p', 20.0, 60.0);
		const profile = makeUniformProfile();
		const annualKwh = 3650; // 10 kWh per day

		const cost = calculateAnnualCost(tariff, profile, annualKwh);

		// Standing charge: 60p/day * 365 = £219
		// Energy: 3650 kWh * 20p = £730
		// Total: £949
		expect(cost).toBeCloseTo(949.0, 2);
	});

	it('calculates correct standing charge contribution', () => {
		const tariff = makeFlatTariff('test', 20.0, 50.0);
		const profile = makeUniformProfile();
		const cost = calculateAnnualCost(tariff, profile, 0); // Zero consumption

		// Standing charge only: 50p/day * 365 = £182.50
		expect(cost).toBeCloseTo(182.5, 2);
	});

	it('calculates correct energy cost for flat tariff', () => {
		const tariff = makeFlatTariff('test', 25.0, 0); // Zero standing charge
		const profile = makeUniformProfile();
		const annualKwh = 4000;

		const cost = calculateAnnualCost(tariff, profile, annualKwh);

		// Energy only: 4000 kWh * 25p = £1000
		expect(cost).toBeCloseTo(1000.0, 2);
	});

	it('calculates correct cost for Economy 7 with uniform profile', () => {
		// Uniform profile → 14/48 overnight, 34/48 day
		const tariff = makeEconomy7Tariff('e7', 9.0, 28.0, 60.0);
		const profile = makeUniformProfile();
		const annualKwh = 3650;

		const cost = calculateAnnualCost(tariff, profile, annualKwh);

		const dailyKwh = 10;
		const nightKwh = dailyKwh * (14 / 48);
		const dayKwh = dailyKwh * (34 / 48);
		const dailyEnergyCost = nightKwh * 9.0 + dayKwh * 28.0; // pence
		const annualEnergyCost = (dailyEnergyCost * 365) / 100; // pounds
		const standingChargeCost = (60.0 * 365) / 100;
		const expected = standingChargeCost + annualEnergyCost;

		expect(cost).toBeCloseTo(expected, 2);
	});

	it('Economy 7 is cheaper with high overnight usage', () => {
		const flatTariff = makeFlatTariff('flat', 24.0, 60.0);
		const e7Tariff = makeEconomy7Tariff('e7', 9.0, 28.0, 60.0);
		const overnightProfile = makeOvernightProfile();
		const annualKwh = 3650;

		const flatCost = calculateAnnualCost(flatTariff, overnightProfile, annualKwh);
		const e7Cost = calculateAnnualCost(e7Tariff, overnightProfile, annualKwh);

		expect(e7Cost).toBeLessThan(flatCost);
	});

	it('flat tariff is cheaper with high peak usage', () => {
		const flatTariff = makeFlatTariff('flat', 24.0, 60.0);
		const agileTariff: Tariff = {
			id: 'agile',
			name: 'Agile',
			supplier: 'Test',
			type: 'agile',
			standingCharge: 60.0,
			rates: [
				{ rate: 10.0, startSlot: 0, endSlot: 14, label: 'Night' },
				{ rate: 22.0, startSlot: 14, endSlot: 32, label: 'Day' },
				{ rate: 35.0, startSlot: 32, endSlot: 38, label: 'Peak' },
				{ rate: 22.0, startSlot: 38, endSlot: 48, label: 'Evening' },
			],
			regions: [],
		};
		const peakProfile = makeEveningPeakProfile();
		const annualKwh = 3650;

		const flatCost = calculateAnnualCost(flatTariff, peakProfile, annualKwh);
		const agileCost = calculateAnnualCost(agileTariff, peakProfile, annualKwh);

		// High peak usage should make Agile more expensive
		expect(agileCost).toBeGreaterThan(flatCost);
	});

	it('handles zero annual consumption', () => {
		const tariff = makeFlatTariff('test', 20.0, 60.0);
		const profile = makeUniformProfile();
		const cost = calculateAnnualCost(tariff, profile, 0);

		// Only standing charge
		expect(cost).toBeCloseTo(219.0, 2);
	});

	it('handles very large annual consumption', () => {
		const tariff = makeFlatTariff('test', 20.0, 60.0);
		const profile = makeUniformProfile();
		const annualKwh = 50000;

		const cost = calculateAnnualCost(tariff, profile, annualKwh);

		// Standing: £219, Energy: 50000 * 0.20 = £10000
		expect(cost).toBeCloseTo(10219.0, 2);
	});
});

// ============================================================
// compareTariffs tests
// ============================================================

describe('compareTariffs', () => {
	it('returns empty array for empty tariff list', () => {
		const profile = makeUniformProfile();
		const results = compareTariffs([], profile, 3000);
		expect(results).toHaveLength(0);
	});

	it('returns single result for single tariff', () => {
		const tariff = makeFlatTariff('test', 20.0);
		const profile = makeUniformProfile();
		const results = compareTariffs([tariff], profile, 3000);

		expect(results).toHaveLength(1);
		expect(results[0].tariff.id).toBe('test');
		expect(results[0].annualCost).toBeGreaterThan(0);
		expect(results[0].savingsVsBaseline).toBe(0); // No baseline to compare
	});

	it('sorts tariffs by annual cost (cheapest first)', () => {
		const expensive = makeFlatTariff('expensive', 30.0);
		const cheap = makeFlatTariff('cheap', 15.0);
		const medium = makeFlatTariff('medium', 22.0);

		const profile = makeUniformProfile();
		const results = compareTariffs([expensive, cheap, medium], profile, 3000);

		expect(results).toHaveLength(3);
		expect(results[0].tariff.id).toBe('cheap');
		expect(results[1].tariff.id).toBe('medium');
		expect(results[2].tariff.id).toBe('expensive');
	});

	it('calculates savings vs baseline (most expensive)', () => {
		const cheap = makeFlatTariff('cheap', 15.0, 60.0);
		const expensive = makeFlatTariff('expensive', 30.0, 60.0);

		const profile = makeUniformProfile();
		const annualKwh = 3650;
		const results = compareTariffs([cheap, expensive], profile, annualKwh);

		const cheapCost = results[0].annualCost;
		const expensiveCost = results[1].annualCost;

		expect(results[0].savingsVsBaseline).toBeCloseTo(expensiveCost - cheapCost, 2);
		expect(results[1].savingsVsBaseline).toBeCloseTo(0, 2); // Most expensive has zero savings
	});

	it('breakdown totals match annual cost', () => {
		const tariff = makeFlatTariff('test', 20.0, 60.0);
		const profile = makeUniformProfile();
		const results = compareTariffs([tariff], profile, 3000);

		const breakdown = results[0].breakdown;
		expect(breakdown.totalCost).toBeCloseTo(results[0].annualCost, 2);
		expect(breakdown.totalCost).toBeCloseTo(breakdown.standingChargeCost + breakdown.energyCost, 2);
	});

	it('filters tariffs by region when specified', () => {
		const ukWide = makeFlatTariff('uk-wide', 20.0);
		ukWide.regions = [];

		const londonOnly = makeFlatTariff('london-only', 18.0);
		londonOnly.regions = ['london'];

		const scotlandOnly = makeFlatTariff('scotland-only', 19.0);
		scotlandOnly.regions = ['north-scotland'];

		const profile = makeUniformProfile();

		const londonResults = compareTariffs(
			[ukWide, londonOnly, scotlandOnly],
			profile,
			3000,
			'london',
		);
		expect(londonResults).toHaveLength(2);
		expect(londonResults.some((r) => r.tariff.id === 'uk-wide')).toBe(true);
		expect(londonResults.some((r) => r.tariff.id === 'london-only')).toBe(true);
		expect(londonResults.some((r) => r.tariff.id === 'scotland-only')).toBe(false);

		const scotlandResults = compareTariffs(
			[ukWide, londonOnly, scotlandOnly],
			profile,
			3000,
			'north-scotland',
		);
		expect(scotlandResults).toHaveLength(2);
		expect(scotlandResults.some((r) => r.tariff.id === 'uk-wide')).toBe(true);
		expect(scotlandResults.some((r) => r.tariff.id === 'scotland-only')).toBe(true);
		expect(scotlandResults.some((r) => r.tariff.id === 'london-only')).toBe(false);
	});

	it('includes all tariffs when region is not specified', () => {
		const ukWide = makeFlatTariff('uk-wide', 20.0);
		ukWide.regions = [];

		const londonOnly = makeFlatTariff('london-only', 18.0);
		londonOnly.regions = ['london'];

		const profile = makeUniformProfile();
		const results = compareTariffs([ukWide, londonOnly], profile, 3000);

		expect(results).toHaveLength(2);
	});

	it('handles different consumption profiles correctly', () => {
		const flatTariff = makeFlatTariff('flat', 24.0);
		const e7Tariff = makeEconomy7Tariff('e7', 9.0, 28.0);

		const uniformProfile = makeUniformProfile();
		const overnightProfile = makeOvernightProfile();

		const uniformResults = compareTariffs([flatTariff, e7Tariff], uniformProfile, 3650);
		const overnightResults = compareTariffs([flatTariff, e7Tariff], overnightProfile, 3650);

		// With overnight profile, E7 should be cheaper and ranked first
		expect(overnightResults[0].tariff.id).toBe('e7');
		expect(overnightResults[1].tariff.id).toBe('flat');

		// Savings should be greater with overnight profile
		const overnightSavings = overnightResults[0].savingsVsBaseline;
		const uniformSavings = uniformResults.find((r) => r.tariff.id === 'e7')!.savingsVsBaseline;
		expect(overnightSavings).toBeGreaterThan(uniformSavings);
	});
});

// ============================================================
// Integration tests
// ============================================================

describe('integration: realistic scenarios', () => {
	it('typical 3-bed semi with evening profile prefers flat tariff', () => {
		const tariffs = [
			makeFlatTariff('flat-24p', 24.0, 60.0),
			makeEconomy7Tariff('e7', 9.0, 28.0, 60.0),
		];

		// Evening-heavy profile (mostly 16:00-21:00)
		const profile = new Array(48).fill(0);
		for (let i = 0; i < 14; i++) profile[i] = 0.05 / 14;
		for (let i = 14; i < 32; i++) profile[i] = 0.2 / 18;
		for (let i = 32; i < 42; i++) profile[i] = 0.6 / 10;
		for (let i = 42; i < 48; i++) profile[i] = 0.15 / 6;

		const annualKwh = 3500;
		const results = compareTariffs(tariffs, profile, annualKwh);

		// Flat should be cheaper or very close for evening usage
		expect(results[0].tariff.id).toBe('flat-24p');
	});

	it('EV owner with overnight charging prefers Economy 7', () => {
		const tariffs = [
			makeFlatTariff('flat-24p', 24.0, 60.0),
			makeEconomy7Tariff('e7', 9.0, 28.0, 60.0),
		];

		const overnightProfile = makeOvernightProfile();
		const annualKwh = 7000; // Higher due to EV

		const results = compareTariffs(tariffs, overnightProfile, annualKwh);

		expect(results[0].tariff.id).toBe('e7');
		expect(results[0].savingsVsBaseline).toBeGreaterThan(100); // Significant savings
	});

	it('all tariffs produce valid comparison results', () => {
		const tariffs = [
			makeFlatTariff('flat', 24.0),
			makeEconomy7Tariff('e7', 9.0, 28.0),
			{
				id: 'agile',
				name: 'Agile',
				supplier: 'Test',
				type: 'agile' as const,
				standingCharge: 60.0,
				rates: [
					{ rate: 10.0, startSlot: 0, endSlot: 14, label: 'Night' },
					{ rate: 22.0, startSlot: 14, endSlot: 32, label: 'Day' },
					{ rate: 35.0, startSlot: 32, endSlot: 38, label: 'Peak' },
					{ rate: 22.0, startSlot: 38, endSlot: 48, label: 'Evening' },
				],
				regions: [] as UkRegion[],
			},
		];

		const profile = makeUniformProfile();
		const results = compareTariffs(tariffs, profile, 3500);

		expect(results).toHaveLength(3);
		for (const result of results) {
			expect(result.annualCost).toBeGreaterThan(0);
			expect(result.breakdown.standingChargeCost).toBeGreaterThan(0);
			expect(result.breakdown.energyCost).toBeGreaterThan(0);
			expect(result.breakdown.totalCost).toBeCloseTo(result.annualCost, 2);
		}

		// Savings should be non-negative and sorted
		for (let i = 0; i < results.length - 1; i++) {
			expect(results[i].savingsVsBaseline).toBeGreaterThanOrEqual(results[i + 1].savingsVsBaseline);
		}
		expect(results[results.length - 1].savingsVsBaseline).toBeCloseTo(0, 2);
	});

	it('zero consumption returns only standing charge costs', () => {
		const tariffs = [makeFlatTariff('test1', 20.0, 50.0), makeFlatTariff('test2', 25.0, 60.0)];

		const profile = makeUniformProfile();
		const results = compareTariffs(tariffs, profile, 0);

		expect(results[0].annualCost).toBeCloseTo((50.0 * 365) / 100, 2);
		expect(results[1].annualCost).toBeCloseTo((60.0 * 365) / 100, 2);
		expect(results[0].breakdown.energyCost).toBeCloseTo(0, 2);
	});
});
