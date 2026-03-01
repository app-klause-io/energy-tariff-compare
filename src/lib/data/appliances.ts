import type { Appliance } from '$lib/types/wizard';

export const DEFAULT_APPLIANCES: Appliance[] = [
	// ── Heating & Hot Water ──────────────────────────────────────
	{
		id: 'heat-pump',
		name: 'Heat Pump',
		icon: '🌡️',
		category: 'heating',
		enabled: false,
		annualKwhEstimate: 8000,
		description: 'Air or ground source heat pump',
		subOptions: {
			label: 'Type of heat pump',
			value: 'air-source',
			options: [
				{ label: 'Air source', value: 'air-source' },
				{ label: 'Ground source', value: 'ground-source' },
			],
		},
	},
	{
		id: 'immersion-heater',
		name: 'Electric Immersion Heater',
		icon: '🚿',
		category: 'heating',
		enabled: false,
		annualKwhEstimate: 3000,
		description: 'Hot water cylinder with immersion element',
		subOptions: {
			label: 'When do you heat water?',
			value: 'evening',
			options: [
				{ label: 'Mostly evenings', value: 'evening' },
				{ label: 'Overnight (off-peak)', value: 'overnight' },
			],
		},
	},
	{
		id: 'electric-heating',
		name: 'Electric Heating',
		icon: '🔥',
		category: 'heating',
		enabled: false,
		annualKwhEstimate: 5000,
		description: 'Storage heaters or electric radiators',
		subOptions: {
			label: 'Type',
			value: 'storage',
			options: [
				{ label: 'Storage heaters', value: 'storage' },
				{ label: 'Electric radiators', value: 'radiators' },
			],
		},
	},
	{
		id: 'underfloor-heating',
		name: 'Underfloor Heating',
		icon: '♨️',
		category: 'heating',
		enabled: false,
		annualKwhEstimate: 2500,
		description: 'Electric underfloor heating, seasonal use',
		subOptions: {
			label: 'Coverage',
			value: 'partial',
			options: [
				{ label: 'Partial (bathroom/kitchen)', value: 'partial' },
				{ label: 'Whole house', value: 'whole-house' },
			],
		},
	},

	// ── Transport ────────────────────────────────────────────────
	{
		id: 'ev',
		name: 'Electric Vehicle',
		icon: '🚗',
		category: 'transport',
		enabled: false,
		annualKwhEstimate: 3500,
		description: 'Home charging for your EV',
		subOptions: {
			label: 'Do you charge at home overnight?',
			value: 'overnight',
			options: [
				{ label: 'Yes, mostly overnight', value: 'overnight' },
				{ label: 'No, during the day', value: 'daytime' },
			],
		},
	},

	// ── Generation ───────────────────────────────────────────────
	{
		id: 'solar',
		name: 'Solar Panels',
		icon: '☀️',
		category: 'generation',
		enabled: false,
		annualKwhEstimate: -3000,
		description: 'Rooftop solar PV system',
		subOptions: {
			label: 'Do you have a battery?',
			value: 'no',
			options: [
				{ label: 'Yes', value: 'yes' },
				{ label: 'No', value: 'no' },
			],
		},
	},

	// ── Kitchen & Laundry ────────────────────────────────────────
	{
		id: 'aga',
		name: 'Aga / Range Cooker',
		icon: '🍳',
		category: 'kitchen',
		enabled: false,
		annualKwhEstimate: 4000,
		description: 'Electric Aga or range cooker',
		subOptions: {
			label: 'Type',
			value: 'traditional',
			options: [
				{ label: 'Traditional (always on)', value: 'traditional' },
				{ label: 'Modern (controllable)', value: 'modern' },
			],
		},
	},
	{
		id: 'electric-oven',
		name: 'Electric Oven',
		icon: '🍕',
		category: 'kitchen',
		enabled: false,
		annualKwhEstimate: 800,
		description: '~2kW, typical 5 meals per week',
	},
	{
		id: 'tumble-dryer',
		name: 'Tumble Dryer',
		icon: '👕',
		category: 'kitchen',
		enabled: false,
		annualKwhEstimate: 600,
		description: '~2.5kW per cycle, 3–4 loads/week',
		subOptions: {
			label: 'When do you usually dry?',
			value: 'evening',
			options: [
				{ label: 'Mostly evenings', value: 'evening' },
				{ label: 'During the day', value: 'daytime' },
			],
		},
	},

	// ── Bathroom ─────────────────────────────────────────────────
	{
		id: 'electric-shower',
		name: 'Electric Shower',
		icon: '🚿',
		category: 'bathroom',
		enabled: false,
		annualKwhEstimate: 1500,
		description: '~8.5kW, short bursts morning & evening',
	},

	// ── Other ────────────────────────────────────────────────────
	{
		id: 'hot-tub',
		name: 'Hot Tub',
		icon: '🛁',
		category: 'other',
		enabled: false,
		annualKwhEstimate: 3000,
		description: '~1.5–2kW, evening & weekend use',
		subOptions: {
			label: 'Usage',
			value: 'regular',
			options: [
				{ label: 'Regular (3+ times/week)', value: 'regular' },
				{ label: 'Occasional (weekends)', value: 'occasional' },
			],
		},
	},
	{
		id: 'air-conditioning',
		name: 'Air Conditioning',
		icon: '❄️',
		category: 'other',
		enabled: false,
		annualKwhEstimate: 600,
		description: '~1.5kW, daytime summer use',
	},
];
