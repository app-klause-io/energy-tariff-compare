import type { Tariff } from '$lib/types/tariff';
import type { UkRegion } from '$lib/types/wizard';

/**
 * Hardcoded UK tariff data for MVP.
 * Rates are representative averages for London region (March 2026).
 * Regional variations are ±2p/kWh but we use London as default.
 *
 * All unit rates are in pence per kWh.
 * All standing charges are in pence per day.
 *
 * Slot mapping:
 * - Slot 0 = 00:00-00:30
 * - Slot 1 = 00:30-01:00
 * - ...
 * - Slot 47 = 23:30-24:00
 */

/** Helper to create flat-rate tariff covering all 48 slots */
function flatRate(unitRate: number): { startSlot: number; endSlot: number; unitRate: number }[] {
	return [{ startSlot: 0, endSlot: 48, unitRate }];
}

/**
 * Get all available tariffs for a given region.
 * Returns hardcoded tariff data for MVP.
 */
export function getTariffsForRegion(region: UkRegion): Tariff[] {
	// For MVP, we only have London data.
	// In production, we'd fetch region-specific rates from API.
	const isLondon = region === 'london';
	const regionalAdjustment = isLondon ? 0 : 1; // ±1p for non-London regions

	return [
		// Standard Variable Tariff (Price Cap)
		{
			id: 'svt-price-cap',
			name: 'Standard Variable Tariff (Price Cap)',
			supplier: 'Generic',
			type: 'flat',
			standingCharge: 61.64,
			rates: flatRate(24.5 + regionalAdjustment),
			region,
			description: 'Ofgem price cap standard variable rate',
		},

		// Octopus Standard Variable
		{
			id: 'octopus-standard',
			name: 'Octopus Flexible',
			supplier: 'Octopus Energy',
			type: 'flat',
			standingCharge: 60.11,
			rates: flatRate(24.82 + regionalAdjustment),
			region,
			description: 'Octopus standard variable rate tariff',
		},

		// Economy 7
		{
			id: 'economy7-generic',
			name: 'Economy 7',
			supplier: 'Generic',
			type: 'economy7',
			standingCharge: 65.5,
			rates: [
				// Off-peak: 00:30-07:30 (slots 1-14 = 7 hours)
				{ startSlot: 1, endSlot: 15, unitRate: 18.5 + regionalAdjustment, label: 'off-peak' },
				// Day rate: 07:30-00:30 (slots 15-48 + 0-1)
				{ startSlot: 0, endSlot: 1, unitRate: 28.2 + regionalAdjustment, label: 'day' },
				{ startSlot: 15, endSlot: 48, unitRate: 28.2 + regionalAdjustment, label: 'day' },
			],
			region,
			description: 'Economy 7 with 7-hour off-peak window',
		},

		// Octopus Agile
		{
			id: 'octopus-agile',
			name: 'Octopus Agile',
			supplier: 'Octopus Energy',
			type: 'agile',
			standingCharge: 60.11,
			rates: [
				// Overnight cheap: 00:00-07:00 (slots 0-14)
				{ startSlot: 0, endSlot: 14, unitRate: 10.0 + regionalAdjustment, label: 'overnight' },
				// Morning moderate: 07:00-16:00 (slots 14-32)
				{ startSlot: 14, endSlot: 32, unitRate: 22.0 + regionalAdjustment, label: 'daytime' },
				// Peak expensive: 16:00-19:00 (slots 32-38)
				{ startSlot: 32, endSlot: 38, unitRate: 35.0 + regionalAdjustment, label: 'peak' },
				// Evening moderate: 19:00-00:00 (slots 38-48)
				{ startSlot: 38, endSlot: 48, unitRate: 22.0 + regionalAdjustment, label: 'evening' },
			],
			region,
			description: 'Half-hourly rates that vary with wholesale prices',
		},

		// Octopus Go
		{
			id: 'octopus-go',
			name: 'Octopus Go',
			supplier: 'Octopus Energy',
			type: 'go',
			standingCharge: 60.11,
			rates: [
				// Cheap overnight: 00:30-04:30 (slots 1-9)
				{ startSlot: 1, endSlot: 9, unitRate: 9.0 + regionalAdjustment, label: 'off-peak' },
				// Standard day rate: all other times
				{ startSlot: 0, endSlot: 1, unitRate: 24.88 + regionalAdjustment, label: 'standard' },
				{ startSlot: 9, endSlot: 48, unitRate: 24.88 + regionalAdjustment, label: 'standard' },
			],
			region,
			description: '4-hour cheap overnight window for EV charging',
		},

		// Octopus Intelligent Go
		{
			id: 'octopus-intelligent-go',
			name: 'Octopus Intelligent Go',
			supplier: 'Octopus Energy',
			type: 'intelligent-go',
			standingCharge: 60.11,
			rates: [
				// Cheap overnight: 23:30-05:30 (slots 47-48 + 0-11)
				{ startSlot: 47, endSlot: 48, unitRate: 9.0 + regionalAdjustment, label: 'off-peak' },
				{ startSlot: 0, endSlot: 11, unitRate: 9.0 + regionalAdjustment, label: 'off-peak' },
				// Standard day rate: 05:30-23:30
				{ startSlot: 11, endSlot: 47, unitRate: 24.88 + regionalAdjustment, label: 'standard' },
			],
			region,
			description: '6-hour cheap overnight window with smart charging',
		},

		// Octopus Cosy
		{
			id: 'octopus-cosy',
			name: 'Octopus Cosy',
			supplier: 'Octopus Energy',
			type: 'cosy',
			standingCharge: 60.11,
			rates: [
				// Off-peak: 04:00-07:00 + 13:00-16:00 + 22:00-04:00 (slots 8-14, 26-32, 44-48 + 0-8)
				{ startSlot: 0, endSlot: 8, unitRate: 13.7 + regionalAdjustment, label: 'off-peak' },
				{ startSlot: 8, endSlot: 14, unitRate: 13.7 + regionalAdjustment, label: 'off-peak' },
				{ startSlot: 26, endSlot: 32, unitRate: 13.7 + regionalAdjustment, label: 'off-peak' },
				{ startSlot: 44, endSlot: 48, unitRate: 13.7 + regionalAdjustment, label: 'off-peak' },
				// Peak: 16:00-19:00 (slots 32-38)
				{ startSlot: 32, endSlot: 38, unitRate: 39.6 + regionalAdjustment, label: 'peak' },
				// Standard: all other times
				{ startSlot: 14, endSlot: 26, unitRate: 23.8 + regionalAdjustment, label: 'standard' },
				{ startSlot: 38, endSlot: 44, unitRate: 23.8 + regionalAdjustment, label: 'standard' },
			],
			region,
			description: 'Three-rate tariff optimised for heat pumps',
		},
	];
}

/**
 * Get all available tariffs across all regions.
 * For MVP, returns tariffs for London only.
 */
export function getAllTariffs(): Tariff[] {
	return getTariffsForRegion('london');
}
