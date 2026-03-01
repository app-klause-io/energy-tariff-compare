import type { UkRegion } from './wizard';

export type TariffType = 'flat' | 'economy7' | 'agile' | 'go' | 'intelligent-go' | 'cosy' | 'flux';

/**
 * Time-of-use rate with a time window.
 * Slot indexes refer to half-hour slots (0-47), where slot 0 = 00:00-00:30.
 */
export interface TimeOfUseRate {
	/** Price per kWh in pence */
	rate: number;
	/** Start slot (inclusive) */
	startSlot: number;
	/** End slot (exclusive) */
	endSlot: number;
	/** Human-readable label for this period */
	label: string;
}

/**
 * Tariff structure with pricing details.
 * Flat tariffs have a single rate; time-of-use tariffs have multiple rates with time windows.
 */
export interface Tariff {
	/** Unique identifier */
	id: string;
	/** Display name */
	name: string;
	/** Energy supplier */
	supplier: string;
	/** Tariff type */
	type: TariffType;
	/** Daily standing charge in pence */
	standingCharge: number;
	/** Unit rates — flat tariffs have one rate, ToU tariffs have multiple with time windows */
	rates: TimeOfUseRate[];
	/** UK regions this tariff is available in (empty = all regions) */
	regions: UkRegion[];
}

/**
 * Result of comparing a consumption profile against a tariff.
 */
export interface ComparisonResult {
	/** The tariff being compared */
	tariff: Tariff;
	/** Estimated annual cost in pounds */
	annualCost: number;
	/** Savings in pounds compared to the most expensive tariff (0 = baseline, positive = cheaper than baseline) */
	savingsVsBaseline: number;
	/** Breakdown of costs */
	breakdown: {
		/** Standing charge cost per year (365 days) */
		standingChargeCost: number;
		/** Energy consumption cost per year */
		energyCost: number;
		/** Total annual cost */
		totalCost: number;
	};
}
