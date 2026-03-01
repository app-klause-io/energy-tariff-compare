import type { Tariff } from '$lib/types/tariff';

/**
 * Hardcoded UK tariff data for MVP.
 * Rates are representative averages as of early 2025.
 * Standing charges and unit rates are in pence.
 */
export const TARIFFS: Tariff[] = [
	{
		id: 'octopus-flexible',
		name: 'Octopus Flexible',
		supplier: 'Octopus Energy',
		type: 'flat',
		standingCharge: 60.99, // ~61p/day
		rates: [
			{
				rate: 24.5,
				startSlot: 0,
				endSlot: 48,
				label: 'All day',
			},
		],
		regions: [],
	},
	{
		id: 'standard-variable',
		name: 'Standard Variable Tariff',
		supplier: 'Generic Supplier',
		type: 'flat',
		standingCharge: 61.64,
		rates: [
			{
				rate: 24.5,
				startSlot: 0,
				endSlot: 48,
				label: 'All day',
			},
		],
		regions: [],
	},
	{
		id: 'economy-7',
		name: 'Economy 7',
		supplier: 'Generic Supplier',
		type: 'economy7',
		standingCharge: 61.64,
		rates: [
			{
				rate: 9.0,
				startSlot: 0, // 00:00
				endSlot: 14, // 07:00
				label: 'Off-peak (00:00-07:00)',
			},
			{
				rate: 28.0,
				startSlot: 14, // 07:00
				endSlot: 48, // 24:00
				label: 'Day rate (07:00-24:00)',
			},
		],
		regions: [],
	},
	{
		id: 'octopus-go',
		name: 'Octopus Go',
		supplier: 'Octopus Energy',
		type: 'go',
		standingCharge: 60.99,
		rates: [
			{
				rate: 9.0,
				startSlot: 1, // 00:30
				endSlot: 9, // 04:30
				label: 'Off-peak (00:30-04:30)',
			},
			{
				rate: 25.0,
				startSlot: 9, // 04:30
				endSlot: 48, // 24:00
				label: 'Day rate (04:30-24:00)',
			},
			{
				rate: 25.0,
				startSlot: 0, // 00:00
				endSlot: 1, // 00:30
				label: 'Day rate (00:00-00:30)',
			},
		],
		regions: [],
	},
	{
		id: 'octopus-intelligent-go',
		name: 'Octopus Intelligent Go',
		supplier: 'Octopus Energy',
		type: 'intelligent-go',
		standingCharge: 60.99,
		rates: [
			{
				rate: 9.0,
				startSlot: 47, // 23:30
				endSlot: 48, // 24:00
				label: 'Off-peak (23:30-05:30)',
			},
			{
				rate: 9.0,
				startSlot: 0, // 00:00
				endSlot: 11, // 05:30
				label: 'Off-peak (23:30-05:30)',
			},
			{
				rate: 25.0,
				startSlot: 11, // 05:30
				endSlot: 47, // 23:30
				label: 'Day rate (05:30-23:30)',
			},
		],
		regions: [],
	},
	{
		id: 'octopus-cosy',
		name: 'Octopus Cosy',
		supplier: 'Octopus Energy',
		type: 'cosy',
		standingCharge: 60.99,
		rates: [
			{
				rate: 12.5,
				startSlot: 0, // 00:00
				endSlot: 8, // 04:00
				label: 'Off-peak (00:00-04:00)',
			},
			{
				rate: 12.5,
				startSlot: 26, // 13:00
				endSlot: 32, // 16:00
				label: 'Off-peak (13:00-16:00)',
			},
			{
				rate: 22.0,
				startSlot: 8, // 04:00
				endSlot: 26, // 13:00
				label: 'Mid-rate (04:00-13:00)',
			},
			{
				rate: 22.0,
				startSlot: 32, // 16:00
				endSlot: 48, // 24:00
				label: 'Mid-rate (16:00-24:00)',
			},
		],
		regions: [],
	},
	{
		id: 'octopus-agile',
		name: 'Octopus Agile',
		supplier: 'Octopus Energy',
		type: 'agile',
		standingCharge: 60.99,
		rates: [
			{
				rate: 10.0,
				startSlot: 0, // 00:00
				endSlot: 14, // 07:00
				label: 'Overnight (00:00-07:00)',
			},
			{
				rate: 22.0,
				startSlot: 14, // 07:00
				endSlot: 32, // 16:00
				label: 'Daytime (07:00-16:00)',
			},
			{
				rate: 35.0,
				startSlot: 32, // 16:00
				endSlot: 38, // 19:00
				label: 'Peak (16:00-19:00)',
			},
			{
				rate: 22.0,
				startSlot: 38, // 19:00
				endSlot: 48, // 24:00
				label: 'Evening (19:00-24:00)',
			},
		],
		regions: [],
	},
];
