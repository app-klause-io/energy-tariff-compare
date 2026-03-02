import type { UkRegion } from './wizard';

// --- Octopus Energy API response types ---

export interface OctopusProduct {
	code: string;
	direction: string;
	display_name: string;
	description: string;
	is_variable: boolean;
	is_green: boolean;
	is_tracker: boolean;
	is_prepay: boolean;
	is_business: boolean;
	brand: string;
	available_from: string;
	available_to: string | null;
}

export interface OctopusRate {
	value_exc_vat: number;
	value_inc_vat: number;
	valid_from: string;
	valid_to: string | null;
	payment_method: string | null;
}

export interface TariffInfo {
	productCode: string;
	name: string;
	description: string;
	type: TariffType;
	isGreen: boolean;
	unitRates: OctopusRate[];
	standingChargePence: number;
	hasMultipleRates: boolean;
	offPeakRate?: number;
	peakRate?: number;
	offPeakHours?: string;
}

// --- Comparison engine types ---

/**
 * Tariff types available in the UK market.
 * - flat: Single unit rate all day
 * - economy7: 7 hours of cheaper overnight rate
 * - agile: Half-hourly rates that vary throughout the day
 * - go: Cheap 4-hour overnight window for EV charging
 * - intelligent-go: Cheap 6-hour overnight window (smart charging)
 * - cosy: 3-rate structure (off-peak/standard/peak)
 * - flux: Import/export tariff with time-based rates
 * - standard: Standard variable tariff
 */
export type TariffType =
	| 'flat'
	| 'economy7'
	| 'agile'
	| 'go'
	| 'intelligent-go'
	| 'cosy'
	| 'flux'
	| 'standard';

/**
 * Time-of-use rate definition.
 * Specifies the price per kWh for a particular time window.
 */
export interface TimeOfUseRate {
	/** Start slot (0-47, where 0 = midnight-00:30) */
	startSlot: number;
	/** End slot (0-47, exclusive) */
	endSlot: number;
	/** Unit rate in pence per kWh */
	unitRate: number;
	/** Optional label (e.g., "off-peak", "peak") */
	label?: string;
}

/**
 * Tariff definition with pricing structure.
 * For flat tariffs, rates array has one entry covering all slots (0-48).
 * For ToU tariffs, rates array has multiple entries covering different time periods.
 */
export interface Tariff {
	id: string;
	name: string;
	supplier: string;
	type: TariffType;
	/** Standing charge in pence per day */
	standingCharge: number;
	/** Time-of-use rates (must cover all 48 slots with no gaps) */
	rates: TimeOfUseRate[];
	/** Region this tariff applies to */
	region: UkRegion;
	/** Optional description */
	description?: string;
}

/**
 * Result of comparing a gas tariff against gas consumption.
 */
export interface GasComparisonResult {
	tariff: Tariff;
	annualCost: number;
}

/**
 * Result of comparing a consumption profile against a single tariff.
 */
export interface ComparisonResult {
	tariff: Tariff;
	/** Total annual electricity cost in pounds */
	annualCost: number;
	/** Gas cost for this provider (if matched) */
	gasCost?: number;
	/** Electricity + gas combined */
	totalCost?: number;
	/** Annual savings vs the most expensive option in pounds (negative = more expensive) */
	savingsVsWorst: number;
	/** Breakdown of costs by component */
	breakdown: {
		/** Annual standing charge cost in pounds */
		standingChargeCost: number;
		/** Annual energy cost in pounds */
		energyCost: number;
		/** Energy cost by time period (for ToU tariffs) */
		byTimePeriod?: {
			label: string;
			kwhUsed: number;
			cost: number;
		}[];
	};
}
