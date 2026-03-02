import type { PropertyDetails, Appliance, UsageHabits, UsagePattern } from '$lib/types/wizard';

const SLOTS = 48;

/** Base annual kWh by property type */
const BASE_KWH: Record<string, number> = {
	flat: 2000,
	terrace: 2800,
	'semi-detached': 3500,
	detached: 4500,
};

/** UK average as fallback when property type is null */
const DEFAULT_BASE_KWH = 3100;

/** Additional kWh per bedroom above 2 */
const KWH_PER_EXTRA_BEDROOM = 400;

/** Additional kWh per occupant above 2 */
const KWH_PER_EXTRA_OCCUPANT = 500;

/** Minimum annual consumption floor (kWh) */
const MIN_ANNUAL_KWH = 500;

/** Appliance kWh overrides based on sub-options */
const APPLIANCE_SUB_OPTION_KWH: Record<string, Record<string, number>> = {
	ev: { overnight: 3500, daytime: 3500 },
	'heat-pump': { 'air-source': 8000, 'ground-source': 7000 },
	aga: { traditional: 4000, modern: 2500 },
	solar: { no: -3000, yes: -3500 },
	'electric-heating': { storage: 5000, radiators: 6000 },
	'immersion-heater': { evening: 3000, overnight: 2700 },
	'underfloor-heating': { partial: 1500, 'whole-house': 3500 },
	'tumble-dryer': { evening: 600, daytime: 600 },
	'hot-tub': { regular: 3000, occasional: 1800 },
};

export interface GasConsumptionProfile {
	annualKwh: number;
	breakdown: {
		baseKwh: number;
		applianceKwh: number;
		totalKwh: number;
	};
}

export interface ConsumptionProfile {
	annualKwh: number;
	dailyProfile: number[];
	seasonalFactors: {
		winter: number;
		spring: number;
		summer: number;
		autumn: number;
	};
	breakdown: {
		baseKwh: number;
		applianceKwh: number;
		totalKwh: number;
	};
	gas?: GasConsumptionProfile;
}

/**
 * Distribute a proportion of daily usage evenly across a range of slots.
 */
function fillSlots(profile: number[], start: number, end: number, proportion: number): void {
	const count = end - start;
	if (count <= 0) return;
	const perSlot = proportion / count;
	for (let i = start; i < end; i++) {
		const idx = ((i % SLOTS) + SLOTS) % SLOTS;
		profile[idx] += perSlot;
	}
}

/**
 * Generate the base daily profile (48 half-hour slots summing to ~1.0)
 * based on the user's usage pattern.
 */
function generateBaseProfile(pattern: UsagePattern | null): number[] {
	const profile = new Array<number>(SLOTS).fill(0);
	const p = pattern ?? 'evening';

	switch (p) {
		case 'morning':
			fillSlots(profile, 14, 20, 0.4); // 7:00-10:00
			fillSlots(profile, 8, 14, 0.1); // 4:00-7:00
			fillSlots(profile, 20, 36, 0.3); // 10:00-18:00
			fillSlots(profile, 36, 46, 0.15); // 18:00-23:00
			// Overnight: 23:00-4:00 → slots 46-48 + 0-8
			fillSlots(profile, 46, 48, 0.05 * (2 / 10));
			fillSlots(profile, 0, 8, 0.05 * (8 / 10));
			break;

		case 'daytime':
			fillSlots(profile, 20, 32, 0.45); // 10:00-16:00
			fillSlots(profile, 14, 20, 0.15); // 7:00-10:00
			fillSlots(profile, 32, 42, 0.25); // 16:00-21:00
			// 21:00-4:00 → slots 42-48 + 0-8
			fillSlots(profile, 42, 48, 0.1 * (6 / 14));
			fillSlots(profile, 0, 8, 0.1 * (8 / 14));
			// Early morning 4:00-7:00
			fillSlots(profile, 8, 14, 0.05);
			break;

		case 'evening':
			fillSlots(profile, 32, 42, 0.45); // 16:00-21:00
			fillSlots(profile, 14, 20, 0.15); // 7:00-10:00
			fillSlots(profile, 20, 32, 0.2); // 10:00-16:00
			fillSlots(profile, 42, 48, 0.15); // 21:00-24:00
			// Overnight 0:00-7:00
			fillSlots(profile, 0, 14, 0.05);
			break;

		case 'night':
			// 21:00-4:00 → slots 42-48 + 0-8
			fillSlots(profile, 42, 48, 0.4 * (6 / 14));
			fillSlots(profile, 0, 8, 0.4 * (8 / 14));
			fillSlots(profile, 32, 42, 0.25); // 16:00-21:00
			fillSlots(profile, 8, 20, 0.15); // 4:00-10:00
			fillSlots(profile, 20, 32, 0.2); // 10:00-16:00
			break;
	}

	return profile;
}

/**
 * Overlay appliance-specific usage patterns onto the base profile.
 * Returns the profile with appliance adjustments (still normalised to ~1.0).
 */
function overlayApplianceProfiles(
	profile: number[],
	appliances: Appliance[],
	totalKwh: number,
): number[] {
	const result = [...profile];

	for (const appliance of appliances) {
		if (!appliance.enabled) continue;

		const applianceKwh = getApplianceKwh(appliance);
		if (totalKwh <= 0) continue;
		const weight = Math.abs(applianceKwh) / totalKwh;

		switch (appliance.id) {
			case 'ev': {
				const subOption = appliance.selectedSubOption ?? 'overnight';
				if (subOption === 'overnight') {
					// Add spike at slots 0-13 (midnight-7am)
					for (let i = 0; i < 14; i++) {
						result[i] += weight * (1 / 14);
					}
				}
				// Daytime EV charging is already captured by the base profile
				break;
			}

			case 'heat-pump':
				// Spread across heating hours (slots 10-44, 5am-10pm), heavier morning/evening
				for (let i = 10; i < 44; i++) {
					const isMorningEvening = (i >= 14 && i < 20) || (i >= 32 && i < 42);
					const slotWeight = isMorningEvening ? 1.5 : 0.75;
					result[i] += (weight * slotWeight) / 34;
				}
				break;

			case 'electric-heating': {
				const subOption = appliance.selectedSubOption ?? 'storage';
				if (subOption === 'storage') {
					// Concentrated overnight (slots 0-13, midnight-7am)
					for (let i = 0; i < 14; i++) {
						result[i] += weight * (1 / 14);
					}
				}
				// Radiators follow the general profile, no special overlay
				break;
			}

			case 'immersion-heater': {
				const subOption = appliance.selectedSubOption ?? 'evening';
				if (subOption === 'overnight') {
					// Concentrated overnight (slots 0-10, midnight-5am)
					for (let i = 0; i < 10; i++) {
						result[i] += weight * (1 / 10);
					}
				} else {
					// Evening heating (slots 34-42, 5pm-9pm) with some morning (slots 12-16, 6am-8am)
					for (let i = 34; i < 42; i++) {
						result[i] += weight * 0.7 * (1 / 8);
					}
					for (let i = 12; i < 16; i++) {
						result[i] += weight * 0.3 * (1 / 4);
					}
				}
				break;
			}

			case 'solar':
				// Negative values during daylight (slots 16-34, 8am-5pm)
				for (let i = 16; i < 34; i++) {
					result[i] -= weight * (1 / 18);
				}
				break;

			case 'underfloor-heating':
				// Daytime weighted (slots 14-36, 7am-6pm), seasonal adjustment handled separately
				for (let i = 14; i < 36; i++) {
					const isMorning = i >= 14 && i < 20;
					const slotWeight = isMorning ? 1.3 : 0.9;
					result[i] += (weight * slotWeight) / 22;
				}
				break;

			case 'tumble-dryer': {
				const subOption = appliance.selectedSubOption ?? 'evening';
				if (subOption === 'evening') {
					// Evening weighted (slots 34-44, 5pm-10pm)
					for (let i = 34; i < 44; i++) {
						result[i] += weight * (1 / 10);
					}
				} else {
					// Daytime (slots 20-32, 10am-4pm)
					for (let i = 20; i < 32; i++) {
						result[i] += weight * (1 / 12);
					}
				}
				break;
			}

			case 'electric-oven':
				// Evening weighted (slots 34-40, 5pm-8pm) with some lunchtime (slots 24-28, 12pm-2pm)
				for (let i = 34; i < 40; i++) {
					result[i] += weight * 0.75 * (1 / 6);
				}
				for (let i = 24; i < 28; i++) {
					result[i] += weight * 0.25 * (1 / 4);
				}
				break;

			case 'electric-shower':
				// Morning peak (slots 14-16, 7am-8am) and evening peak (slots 36-40, 6pm-8pm)
				for (let i = 14; i < 16; i++) {
					result[i] += weight * 0.45 * (1 / 2);
				}
				for (let i = 36; i < 40; i++) {
					result[i] += weight * 0.55 * (1 / 4);
				}
				break;

			case 'hot-tub':
				// Evening weighted (slots 36-46, 6pm-11pm)
				for (let i = 36; i < 46; i++) {
					result[i] += weight * (1 / 10);
				}
				break;

			case 'air-conditioning':
				// Daytime summer weighted (slots 20-36, 10am-6pm), seasonal adjustment handled separately
				for (let i = 20; i < 36; i++) {
					const isAfternoon = i >= 26 && i < 34;
					const slotWeight = isAfternoon ? 1.4 : 0.7;
					result[i] += (weight * slotWeight) / 16;
				}
				break;
		}
	}

	return result;
}

/**
 * Apply overnight appliance shift — move 10% of daytime load to overnight slots.
 */
function applyOvernightShift(profile: number[]): number[] {
	const result = [...profile];
	const shiftAmount = 0.1;

	// Calculate total daytime load (slots 14-42, 7am-9pm)
	let daytimeLoad = 0;
	for (let i = 14; i < 42; i++) {
		daytimeLoad += result[i];
	}

	const toShift = daytimeLoad * shiftAmount;
	const nightSlots = 8; // slots 0-7

	// Remove from daytime proportionally
	for (let i = 14; i < 42; i++) {
		if (daytimeLoad > 0) {
			result[i] -= (result[i] / daytimeLoad) * toShift;
		}
	}

	// Add to overnight slots 0-7
	for (let i = 0; i < nightSlots; i++) {
		result[i] += toShift / nightSlots;
	}

	return result;
}

/**
 * Apply flexibility adjustment to the profile.
 * High flexibility flattens peaks; low flexibility makes peaks sharper.
 */
function applyFlexibility(profile: number[], flexibility: string | null): number[] {
	if (!flexibility || flexibility === 'medium') return profile;

	const result = [...profile];
	const avg = 1 / SLOTS;

	const factor = flexibility === 'high' ? 0.3 : -0.2;

	for (let i = 0; i < SLOTS; i++) {
		result[i] = result[i] + (avg - result[i]) * factor;
	}

	return result;
}

/**
 * Normalise the profile so it sums to 1.0.
 */
function normalise(profile: number[]): number[] {
	const sum = profile.reduce((a, b) => a + b, 0);
	if (sum <= 0) {
		// Uniform distribution fallback
		return new Array<number>(SLOTS).fill(1 / SLOTS);
	}
	return profile.map((v) => v / sum);
}

/**
 * Get the usage multiplier for an appliance based on its selected usage preset.
 * Returns 1.0 if no usage options or no selection (defaults to medium).
 */
function getUsageMultiplier(appliance: Appliance): number {
	if (!appliance.usageOptions) return 1.0;
	const selected = appliance.selectedUsage ?? appliance.usageOptions.defaultValue;
	const preset = appliance.usageOptions.presets.find((p) => p.value === selected);
	return preset?.multiplier ?? 1.0;
}

/**
 * Get the effective kWh for an appliance, accounting for sub-options and usage level.
 */
function getApplianceKwh(appliance: Appliance): number {
	let baseKwh = appliance.annualKwhEstimate;

	const subOptionMap = APPLIANCE_SUB_OPTION_KWH[appliance.id];
	if (subOptionMap && appliance.selectedSubOption) {
		const override = subOptionMap[appliance.selectedSubOption];
		if (override !== undefined) baseKwh = override;
	}

	return baseKwh * getUsageMultiplier(appliance);
}

// ── Gas consumption constants ────────────────────────────────────────────────

const GAS_BASE_KWH: Record<string, number> = {
	flat: 8000,
	terrace: 11000,
	'semi-detached': 13000,
	detached: 17000,
};
const DEFAULT_GAS_BASE_KWH = 11500;
const GAS_KWH_PER_EXTRA_BEDROOM = 800;
const GAS_KWH_PER_EXTRA_OCCUPANT = 400;
const INSULATION_FACTOR: Record<string, number> = {
	'well-insulated': 0.8,
	average: 1.0,
	draughty: 1.3,
};
const MIN_GAS_ANNUAL_KWH = 500;

const GAS_APPLIANCE_SUB_OPTION_KWH: Record<string, Record<string, number>> = {
	'gas-boiler': { combi: 12000, system: 13000, 'back-boiler': 15000 },
};

function getUsageMultiplierForGas(appliance: Appliance): number {
	if (!appliance.usageOptions) return 1.0;
	const selected = appliance.selectedUsage ?? appliance.usageOptions.defaultValue;
	const preset = appliance.usageOptions.presets.find((p) => p.value === selected);
	return preset?.multiplier ?? 1.0;
}

/**
 * Calculate gas consumption profile from property details and gas appliances.
 */
export function calculateGasConsumption(
	property: PropertyDetails,
	appliances: Appliance[],
): GasConsumptionProfile {
	if (!property.hasGas) {
		return { annualKwh: 0, breakdown: { baseKwh: 0, applianceKwh: 0, totalKwh: 0 } };
	}

	const gasAppliances = appliances.filter((a) => a.category === 'gas' && a.enabled);

	// If no gas appliances selected but hasGas=true, return 0
	if (gasAppliances.length === 0) {
		return { annualKwh: 0, breakdown: { baseKwh: 0, applianceKwh: 0, totalKwh: 0 } };
	}

	// Base from property type (only if boiler selected)
	const hasBoiler = gasAppliances.some((a) => a.id === 'gas-boiler');
	let baseKwh = 0;
	if (hasBoiler) {
		baseKwh = property.type
			? (GAS_BASE_KWH[property.type] ?? DEFAULT_GAS_BASE_KWH)
			: DEFAULT_GAS_BASE_KWH;
		const extraBedrooms = Math.max(0, property.bedrooms - 2);
		baseKwh += extraBedrooms * GAS_KWH_PER_EXTRA_BEDROOM;
		const extraOccupants = Math.max(0, property.occupants - 2);
		baseKwh += extraOccupants * GAS_KWH_PER_EXTRA_OCCUPANT;
		baseKwh *= INSULATION_FACTOR[property.insulation] ?? 1.0;
	}

	// Appliance additions (non-boiler gas appliances add their own kWh)
	let applianceKwh = 0;
	for (const appliance of gasAppliances) {
		if (appliance.id === 'gas-boiler') continue;
		let kwhBase = appliance.annualKwhEstimate;
		const subMap = GAS_APPLIANCE_SUB_OPTION_KWH[appliance.id];
		if (subMap && appliance.selectedSubOption) {
			kwhBase = subMap[appliance.selectedSubOption] ?? kwhBase;
		}
		const multiplier = getUsageMultiplierForGas(appliance);
		applianceKwh += kwhBase * multiplier;
	}

	// For the boiler, use its usage multiplier on the base
	if (hasBoiler) {
		const boiler = gasAppliances.find((a) => a.id === 'gas-boiler')!;
		const multiplier = getUsageMultiplierForGas(boiler);
		baseKwh *= multiplier;
	}

	const totalKwh = Math.max(MIN_GAS_ANNUAL_KWH, baseKwh + applianceKwh);

	return {
		annualKwh: totalKwh,
		breakdown: { baseKwh, applianceKwh, totalKwh },
	};
}

/**
 * Calculate the total annual consumption and daily profile from wizard inputs.
 */
export function calculateConsumption(
	property: PropertyDetails,
	appliances: Appliance[],
	habits: UsageHabits,
): ConsumptionProfile {
	// Base consumption from property type
	const baseFromType = property.type
		? (BASE_KWH[property.type] ?? DEFAULT_BASE_KWH)
		: DEFAULT_BASE_KWH;

	// Bedroom modifier (above 2)
	const extraBedrooms = Math.max(0, property.bedrooms - 2);
	const bedroomKwh = extraBedrooms * KWH_PER_EXTRA_BEDROOM;

	// Occupant modifier (above 2)
	const extraOccupants = Math.max(0, property.occupants - 2);
	const occupantKwh = extraOccupants * KWH_PER_EXTRA_OCCUPANT;

	const baseKwh = baseFromType + bedroomKwh + occupantKwh;

	// Appliance additions
	let applianceKwh = 0;
	for (const appliance of appliances) {
		if (appliance.enabled) {
			applianceKwh += getApplianceKwh(appliance);
		}
	}

	// Total with floor
	const totalKwh = Math.max(MIN_ANNUAL_KWH, baseKwh + applianceKwh);

	// Daily profile
	let profile = generateBaseProfile(habits.pattern);
	profile = overlayApplianceProfiles(profile, appliances, totalKwh);

	if (habits.overnightAppliances) {
		profile = applyOvernightShift(profile);
	}

	profile = applyFlexibility(profile, habits.flexibility);
	profile = normalise(profile);

	// Seasonal factors
	const hasHeatPump = appliances.some((a) => a.id === 'heat-pump' && a.enabled);
	const hasSolar = appliances.some((a) => a.id === 'solar' && a.enabled);
	const hasUnderfloorHeating = appliances.some((a) => a.id === 'underfloor-heating' && a.enabled);
	const hasAC = appliances.some((a) => a.id === 'air-conditioning' && a.enabled);

	let winterFactor = 1.4;
	const springFactor = 0.9;
	let summerFactor = 0.7;
	const autumnFactor = 1.0;

	if (hasHeatPump) {
		winterFactor = 1.6;
		summerFactor = 0.6;
	}

	if (hasUnderfloorHeating) {
		winterFactor += 0.15;
	}

	if (hasSolar) {
		summerFactor -= 0.1;
	}

	if (hasAC) {
		summerFactor += 0.2;
	}

	const gasProfile = calculateGasConsumption(property, appliances);

	return {
		annualKwh: totalKwh,
		dailyProfile: profile,
		seasonalFactors: {
			winter: winterFactor,
			spring: springFactor,
			summer: summerFactor,
			autumn: autumnFactor,
		},
		breakdown: {
			baseKwh,
			applianceKwh,
			totalKwh,
		},
		gas: gasProfile.annualKwh > 0 ? gasProfile : undefined,
	};
}
