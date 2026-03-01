import { describe, it, expect } from 'vitest';
import { calculateConsumption } from './consumption';
import type { PropertyDetails, Appliance, UsageHabits } from '$lib/types/wizard';
import { DEFAULT_APPLIANCES } from '$lib/data/appliances';

/** Helper to create a default property */
function makeProperty(overrides: Partial<PropertyDetails> = {}): PropertyDetails {
	return {
		type: 'semi-detached',
		bedrooms: 3,
		occupants: 2,
		region: 'london',
		...overrides,
	};
}

/** Helper to create default habits */
function makeHabits(overrides: Partial<UsageHabits> = {}): UsageHabits {
	return {
		pattern: 'evening',
		overnightAppliances: false,
		flexibility: 'medium',
		...overrides,
	};
}

/** Helper to create a fresh copy of default appliances */
function makeAppliances(): Appliance[] {
	return structuredClone(DEFAULT_APPLIANCES);
}

/** Helper to enable a specific appliance by ID */
function enableAppliance(appliances: Appliance[], id: string, subOption?: string): Appliance[] {
	return appliances.map((a) =>
		a.id === id
			? { ...a, enabled: true, ...(subOption ? { selectedSubOption: subOption } : {}) }
			: a,
	);
}

// ============================================================
// Base consumption tests
// ============================================================

describe('base consumption', () => {
	const habits = makeHabits();
	const appliances = makeAppliances(); // all disabled

	it('flat gives 2,000 kWh base', () => {
		const result = calculateConsumption(
			makeProperty({ type: 'flat', bedrooms: 2, occupants: 2 }),
			appliances,
			habits,
		);
		expect(result.breakdown.baseKwh).toBe(2000);
	});

	it('terrace gives 2,800 kWh base', () => {
		const result = calculateConsumption(
			makeProperty({ type: 'terrace', bedrooms: 2, occupants: 2 }),
			appliances,
			habits,
		);
		expect(result.breakdown.baseKwh).toBe(2800);
	});

	it('semi-detached gives 3,500 kWh base', () => {
		const result = calculateConsumption(
			makeProperty({ type: 'semi-detached', bedrooms: 2, occupants: 2 }),
			appliances,
			habits,
		);
		expect(result.breakdown.baseKwh).toBe(3500);
	});

	it('detached gives 4,500 kWh base', () => {
		const result = calculateConsumption(
			makeProperty({ type: 'detached', bedrooms: 2, occupants: 2 }),
			appliances,
			habits,
		);
		expect(result.breakdown.baseKwh).toBe(4500);
	});

	it('null property type uses default average (3,100 kWh)', () => {
		const result = calculateConsumption(
			makeProperty({ type: null, bedrooms: 2, occupants: 2 }),
			appliances,
			habits,
		);
		expect(result.breakdown.baseKwh).toBe(3100);
	});

	it('adds 400 kWh per bedroom above 2', () => {
		const base = calculateConsumption(makeProperty({ bedrooms: 2 }), appliances, habits);
		const extra = calculateConsumption(makeProperty({ bedrooms: 4 }), appliances, habits);
		expect(extra.breakdown.baseKwh - base.breakdown.baseKwh).toBe(800);
	});

	it('adds 500 kWh per occupant above 2', () => {
		const base = calculateConsumption(makeProperty({ occupants: 2 }), appliances, habits);
		const extra = calculateConsumption(makeProperty({ occupants: 4 }), appliances, habits);
		expect(extra.breakdown.baseKwh - base.breakdown.baseKwh).toBe(1000);
	});

	it('does not add extra for bedrooms at or below 2', () => {
		const one = calculateConsumption(
			makeProperty({ bedrooms: 1, occupants: 2 }),
			appliances,
			habits,
		);
		const two = calculateConsumption(
			makeProperty({ bedrooms: 2, occupants: 2 }),
			appliances,
			habits,
		);
		expect(one.breakdown.baseKwh).toBe(two.breakdown.baseKwh);
	});

	it('does not add extra for occupants at or below 2', () => {
		const one = calculateConsumption(
			makeProperty({ occupants: 1, bedrooms: 2 }),
			appliances,
			habits,
		);
		const two = calculateConsumption(
			makeProperty({ occupants: 2, bedrooms: 2 }),
			appliances,
			habits,
		);
		expect(one.breakdown.baseKwh).toBe(two.breakdown.baseKwh);
	});
});

// ============================================================
// Appliance tests
// ============================================================

describe('appliance additions', () => {
	const property = makeProperty({ bedrooms: 2, occupants: 2 });
	const habits = makeHabits();

	it('EV adds 3,500 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'ev', 'overnight');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(3500);
	});

	it('heat pump air source adds 8,000 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'heat-pump', 'air-source');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(8000);
	});

	it('heat pump ground source adds 7,000 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'heat-pump', 'ground-source');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(7000);
	});

	it('Aga traditional adds 4,000 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'aga', 'traditional');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(4000);
	});

	it('Aga modern adds 2,500 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'aga', 'modern');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(2500);
	});

	it('solar panels without battery subtracts 3,000 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'solar', 'no');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(-3000);
	});

	it('solar panels with battery subtracts 3,500 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'solar', 'yes');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(-3500);
	});

	it('electric heating storage adds 5,000 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'electric-heating', 'storage');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(5000);
	});

	it('electric heating radiators adds 6,000 kWh', () => {
		const appliances = enableAppliance(makeAppliances(), 'electric-heating', 'radiators');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(6000);
	});

	it('no enabled appliances means zero appliance kWh', () => {
		const appliances = makeAppliances(); // all disabled
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(0);
	});

	it('multiple appliances combine correctly', () => {
		let appliances = makeAppliances();
		appliances = enableAppliance(appliances, 'ev', 'overnight');
		appliances = enableAppliance(appliances, 'heat-pump', 'air-source');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(3500 + 8000);
	});

	it('uses default annualKwhEstimate when no sub-option is selected', () => {
		let appliances = makeAppliances();
		// Enable without setting selectedSubOption
		appliances = appliances.map((a) => (a.id === 'ev' ? { ...a, enabled: true } : a));
		const result = calculateConsumption(property, appliances, habits);
		expect(result.breakdown.applianceKwh).toBe(3500);
	});
});

// ============================================================
// Profile tests
// ============================================================

describe('daily profile', () => {
	const property = makeProperty({ bedrooms: 2, occupants: 2 });
	const appliances = makeAppliances();

	it('has exactly 48 slots', () => {
		const result = calculateConsumption(property, appliances, makeHabits());
		expect(result.dailyProfile).toHaveLength(48);
	});

	it('sums to approximately 1.0', () => {
		const result = calculateConsumption(property, appliances, makeHabits());
		const sum = result.dailyProfile.reduce((a, b) => a + b, 0);
		expect(sum).toBeCloseTo(1.0, 5);
	});

	it('morning pattern peaks at slots 14-19 (7:00-10:00)', () => {
		const result = calculateConsumption(property, appliances, makeHabits({ pattern: 'morning' }));
		const morningSlots = result.dailyProfile.slice(14, 20);
		const avgMorning = morningSlots.reduce((a, b) => a + b, 0) / morningSlots.length;
		const avgAll = 1 / 48;
		expect(avgMorning).toBeGreaterThan(avgAll * 2);
	});

	it('evening pattern peaks at slots 32-41 (16:00-21:00)', () => {
		const result = calculateConsumption(property, appliances, makeHabits({ pattern: 'evening' }));
		const eveningSlots = result.dailyProfile.slice(32, 42);
		const avgEvening = eveningSlots.reduce((a, b) => a + b, 0) / eveningSlots.length;
		const avgAll = 1 / 48;
		expect(avgEvening).toBeGreaterThan(avgAll * 2);
	});

	it('night owl pattern peaks at overnight slots', () => {
		const result = calculateConsumption(property, appliances, makeHabits({ pattern: 'night' }));
		// Night slots: 42-47 + 0-7
		const nightSlots = [...result.dailyProfile.slice(42, 48), ...result.dailyProfile.slice(0, 8)];
		const nightProportion = nightSlots.reduce((a, b) => a + b, 0);
		// 40% of usage should be in these 14 slots (vs 14/48 = 29% if uniform)
		expect(nightProportion).toBeGreaterThan(0.35);
	});

	it('daytime pattern peaks at slots 20-31 (10:00-16:00)', () => {
		const result = calculateConsumption(property, appliances, makeHabits({ pattern: 'daytime' }));
		const dayProportion = result.dailyProfile.slice(20, 32).reduce((a, b) => a + b, 0);
		// 45% of usage should be in these 12 slots (vs 12/48 = 25% if uniform)
		expect(dayProportion).toBeGreaterThan(0.4);
	});

	it('overnight appliances shift load to overnight slots', () => {
		const withoutOvernight = calculateConsumption(
			property,
			appliances,
			makeHabits({ overnightAppliances: false }),
		);
		const withOvernight = calculateConsumption(
			property,
			appliances,
			makeHabits({ overnightAppliances: true }),
		);

		// Overnight slots 0-7 should have more load
		const nightSumBefore = withoutOvernight.dailyProfile.slice(0, 8).reduce((a, b) => a + b, 0);
		const nightSumAfter = withOvernight.dailyProfile.slice(0, 8).reduce((a, b) => a + b, 0);
		expect(nightSumAfter).toBeGreaterThan(nightSumBefore);
	});

	it('high flexibility flattens the profile', () => {
		const medium = calculateConsumption(
			property,
			appliances,
			makeHabits({ flexibility: 'medium' }),
		);
		const high = calculateConsumption(property, appliances, makeHabits({ flexibility: 'high' }));

		// Calculate variance — high flexibility should have lower variance
		const avg = 1 / 48;
		const varianceMedium = medium.dailyProfile.reduce((sum, v) => sum + (v - avg) ** 2, 0);
		const varianceHigh = high.dailyProfile.reduce((sum, v) => sum + (v - avg) ** 2, 0);
		expect(varianceHigh).toBeLessThan(varianceMedium);
	});

	it('low flexibility makes the profile peakier', () => {
		const medium = calculateConsumption(
			property,
			appliances,
			makeHabits({ flexibility: 'medium' }),
		);
		const low = calculateConsumption(property, appliances, makeHabits({ flexibility: 'low' }));

		const avg = 1 / 48;
		const varianceMedium = medium.dailyProfile.reduce((sum, v) => sum + (v - avg) ** 2, 0);
		const varianceLow = low.dailyProfile.reduce((sum, v) => sum + (v - avg) ** 2, 0);
		expect(varianceLow).toBeGreaterThan(varianceMedium);
	});

	it('all slot values are non-negative after normalisation', () => {
		// Even with solar subtracting, normalised profile should be non-negative
		const solarAppliances = enableAppliance(makeAppliances(), 'solar', 'yes');
		const result = calculateConsumption(property, solarAppliances, makeHabits());
		for (const value of result.dailyProfile) {
			expect(value).toBeGreaterThanOrEqual(0);
		}
	});
});

// ============================================================
// Seasonal factor tests
// ============================================================

describe('seasonal factors', () => {
	const property = makeProperty({ bedrooms: 2, occupants: 2 });
	const habits = makeHabits();

	it('default seasonal factors are correct', () => {
		const result = calculateConsumption(property, makeAppliances(), habits);
		expect(result.seasonalFactors.winter).toBe(1.4);
		expect(result.seasonalFactors.spring).toBe(0.9);
		expect(result.seasonalFactors.summer).toBe(0.7);
		expect(result.seasonalFactors.autumn).toBe(1.0);
	});

	it('heat pump increases winter factor to 1.6', () => {
		const appliances = enableAppliance(makeAppliances(), 'heat-pump', 'air-source');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.seasonalFactors.winter).toBe(1.6);
	});

	it('heat pump decreases summer factor to 0.6', () => {
		const appliances = enableAppliance(makeAppliances(), 'heat-pump', 'air-source');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.seasonalFactors.summer).toBe(0.6);
	});

	it('solar panels decrease summer factor by 0.1', () => {
		const appliances = enableAppliance(makeAppliances(), 'solar', 'no');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.seasonalFactors.summer).toBeCloseTo(0.6, 5);
	});

	it('heat pump + solar combined summer factor', () => {
		let appliances = makeAppliances();
		appliances = enableAppliance(appliances, 'heat-pump', 'air-source');
		appliances = enableAppliance(appliances, 'solar', 'yes');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.seasonalFactors.summer).toBeCloseTo(0.5, 5);
	});

	it('spring and autumn are unaffected by appliances', () => {
		let appliances = makeAppliances();
		appliances = enableAppliance(appliances, 'heat-pump', 'air-source');
		appliances = enableAppliance(appliances, 'solar', 'yes');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.seasonalFactors.spring).toBe(0.9);
		expect(result.seasonalFactors.autumn).toBe(1.0);
	});
});

// ============================================================
// Edge cases
// ============================================================

describe('edge cases', () => {
	const habits = makeHabits();

	it('all appliances enabled produces valid output', () => {
		const appliances = makeAppliances().map((a) => ({ ...a, enabled: true }));
		const result = calculateConsumption(makeProperty(), appliances, habits);
		expect(result.annualKwh).toBeGreaterThan(0);
		expect(result.dailyProfile).toHaveLength(48);
		const sum = result.dailyProfile.reduce((a, b) => a + b, 0);
		expect(sum).toBeCloseTo(1.0, 5);
	});

	it('no appliances enabled returns base only', () => {
		const appliances = makeAppliances();
		const property = makeProperty({ type: 'flat', bedrooms: 2, occupants: 2 });
		const result = calculateConsumption(property, appliances, habits);
		expect(result.annualKwh).toBe(2000);
		expect(result.breakdown.applianceKwh).toBe(0);
	});

	it('minimum property: 1-bed flat, 1 occupant', () => {
		const property = makeProperty({ type: 'flat', bedrooms: 1, occupants: 1 });
		const result = calculateConsumption(property, makeAppliances(), habits);
		expect(result.annualKwh).toBe(2000);
		expect(result.breakdown.baseKwh).toBe(2000);
	});

	it('maximum property: detached, 5+ bed, 4+ occupants', () => {
		const property = makeProperty({ type: 'detached', bedrooms: 5, occupants: 4 });
		const result = calculateConsumption(property, makeAppliances(), habits);
		// 4500 + (3 bedrooms above 2 * 400) + (2 occupants above 2 * 500) = 4500 + 1200 + 1000 = 6700
		expect(result.breakdown.baseKwh).toBe(6700);
	});

	it('solar exceeding base consumption floors at minimum', () => {
		// 1-bed flat = 2000 kWh, solar with battery = -3500 kWh
		const property = makeProperty({ type: 'flat', bedrooms: 1, occupants: 1 });
		const appliances = enableAppliance(makeAppliances(), 'solar', 'yes');
		const result = calculateConsumption(property, appliances, habits);
		expect(result.annualKwh).toBe(500); // MIN_ANNUAL_KWH floor
	});

	it('empty appliances array works', () => {
		const result = calculateConsumption(makeProperty(), [], habits);
		expect(result.annualKwh).toBeGreaterThan(0);
		expect(result.breakdown.applianceKwh).toBe(0);
	});

	it('null pattern defaults to evening profile shape', () => {
		const withNull = calculateConsumption(
			makeProperty(),
			makeAppliances(),
			makeHabits({ pattern: null }),
		);
		const withEvening = calculateConsumption(
			makeProperty(),
			makeAppliances(),
			makeHabits({ pattern: 'evening' }),
		);
		expect(withNull.dailyProfile).toEqual(withEvening.dailyProfile);
	});

	it('null flexibility treated as medium (no change)', () => {
		const withNull = calculateConsumption(
			makeProperty(),
			makeAppliances(),
			makeHabits({ flexibility: null }),
		);
		const withMedium = calculateConsumption(
			makeProperty(),
			makeAppliances(),
			makeHabits({ flexibility: 'medium' }),
		);
		expect(withNull.dailyProfile).toEqual(withMedium.dailyProfile);
	});
});

// ============================================================
// Integration tests
// ============================================================

describe('integration: realistic scenarios', () => {
	it('typical 3-bed semi with EV should be roughly 7,000-8,000 kWh', () => {
		const property = makeProperty({ type: 'semi-detached', bedrooms: 3, occupants: 3 });
		const appliances = enableAppliance(makeAppliances(), 'ev', 'overnight');
		const habits = makeHabits({ pattern: 'evening', flexibility: 'medium' });
		const result = calculateConsumption(property, appliances, habits);
		// Base: 3500 + 400 (1 extra bedroom) + 500 (1 extra occupant) = 4400
		// EV: 3500 → total 7900
		expect(result.annualKwh).toBeGreaterThanOrEqual(7000);
		expect(result.annualKwh).toBeLessThanOrEqual(8500);
	});

	it('1-bed flat with no extras should be roughly 2,000 kWh', () => {
		const property = makeProperty({ type: 'flat', bedrooms: 1, occupants: 1 });
		const habits = makeHabits();
		const result = calculateConsumption(property, makeAppliances(), habits);
		expect(result.annualKwh).toBe(2000);
	});

	it('large detached with heat pump and EV produces high but valid consumption', () => {
		const property = makeProperty({ type: 'detached', bedrooms: 5, occupants: 4 });
		let appliances = makeAppliances();
		appliances = enableAppliance(appliances, 'ev', 'overnight');
		appliances = enableAppliance(appliances, 'heat-pump', 'air-source');
		const habits = makeHabits({
			pattern: 'morning',
			overnightAppliances: true,
			flexibility: 'high',
		});
		const result = calculateConsumption(property, appliances, habits);
		// Base: 6700, EV: 3500, HP: 8000 → 18200
		expect(result.annualKwh).toBe(18200);
		expect(result.dailyProfile).toHaveLength(48);
		const sum = result.dailyProfile.reduce((a, b) => a + b, 0);
		expect(sum).toBeCloseTo(1.0, 5);
	});

	it('profile remains valid with all patterns', () => {
		const patterns = ['morning', 'daytime', 'evening', 'night'] as const;
		const property = makeProperty();
		const appliances = makeAppliances();
		for (const pattern of patterns) {
			const result = calculateConsumption(property, appliances, makeHabits({ pattern }));
			expect(result.dailyProfile).toHaveLength(48);
			const sum = result.dailyProfile.reduce((a, b) => a + b, 0);
			expect(sum).toBeCloseTo(1.0, 5);
			for (const v of result.dailyProfile) {
				expect(v).toBeGreaterThanOrEqual(0);
			}
		}
	});

	it('breakdown totals match annual kWh', () => {
		let appliances = makeAppliances();
		appliances = enableAppliance(appliances, 'ev', 'overnight');
		appliances = enableAppliance(appliances, 'aga', 'modern');
		const result = calculateConsumption(makeProperty(), appliances, makeHabits());
		expect(result.breakdown.totalKwh).toBe(result.annualKwh);
		expect(result.breakdown.totalKwh).toBe(
			Math.max(500, result.breakdown.baseKwh + result.breakdown.applianceKwh),
		);
	});
});
