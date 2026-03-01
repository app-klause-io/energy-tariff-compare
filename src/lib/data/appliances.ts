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
		usageOptions: {
			question: 'How many months is it active?',
			presets: [
				{ label: 'Winter only (5 months)', value: 'light', multiplier: 0.6, kwhPerYear: 4800 },
				{ label: 'Extended (8 months)', value: 'medium', multiplier: 1.0, kwhPerYear: 8000 },
				{
					label: 'Year-round (12 months)',
					value: 'heavy',
					multiplier: 1.5,
					kwhPerYear: 12000,
				},
			],
			defaultValue: 'medium',
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
		usageOptions: {
			question: 'Hours per day',
			presets: [
				{ label: 'Timer (2 hrs)', value: 'light', multiplier: 0.67, kwhPerYear: 2000 },
				{ label: 'Standard (3 hrs)', value: 'medium', multiplier: 1.0, kwhPerYear: 3000 },
				{ label: 'Heavy (5 hrs)', value: 'heavy', multiplier: 1.67, kwhPerYear: 5000 },
			],
			defaultValue: 'medium',
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
		usageOptions: {
			question: 'How many months is it active?',
			presets: [
				{
					label: 'Winter only (5 months)',
					value: 'light',
					multiplier: 0.6,
					kwhPerYear: 1500,
				},
				{ label: 'Extended (8 months)', value: 'medium', multiplier: 1.0, kwhPerYear: 2500 },
				{
					label: 'Year-round (12 months)',
					value: 'heavy',
					multiplier: 1.5,
					kwhPerYear: 3750,
				},
			],
			defaultValue: 'medium',
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
		usageOptions: {
			question: 'How many miles do you drive per week?',
			presets: [
				{ label: 'Light (50 mi)', value: 'light', multiplier: 0.5, kwhPerYear: 1750 },
				{ label: 'Medium (100 mi)', value: 'medium', multiplier: 1.0, kwhPerYear: 3500 },
				{ label: 'Heavy (200 mi)', value: 'heavy', multiplier: 2.0, kwhPerYear: 7000 },
			],
			defaultValue: 'medium',
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
		usageOptions: {
			question: 'System size',
			presets: [
				{ label: 'Small (2 kW)', value: 'light', multiplier: 0.5, kwhPerYear: -1500 },
				{ label: 'Medium (4 kW)', value: 'medium', multiplier: 1.0, kwhPerYear: -3000 },
				{ label: 'Large (6 kW)', value: 'heavy', multiplier: 1.5, kwhPerYear: -4500 },
			],
			defaultValue: 'medium',
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
		usageOptions: {
			question: 'Meals cooked per week',
			presets: [
				{ label: 'Light (3 meals)', value: 'light', multiplier: 0.6, kwhPerYear: 480 },
				{ label: 'Medium (5 meals)', value: 'medium', multiplier: 1.0, kwhPerYear: 800 },
				{ label: 'Heavy (7+ meals)', value: 'heavy', multiplier: 1.4, kwhPerYear: 1120 },
			],
			defaultValue: 'medium',
		},
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
		usageOptions: {
			question: 'Loads per week',
			presets: [
				{ label: 'Light (2 loads)', value: 'light', multiplier: 0.5, kwhPerYear: 300 },
				{ label: 'Medium (4 loads)', value: 'medium', multiplier: 1.0, kwhPerYear: 600 },
				{ label: 'Heavy (7 loads)', value: 'heavy', multiplier: 1.75, kwhPerYear: 1050 },
			],
			defaultValue: 'medium',
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
		usageOptions: {
			question: 'Showers per day (household)',
			presets: [
				{ label: '1–2 showers', value: 'light', multiplier: 0.5, kwhPerYear: 750 },
				{ label: '3–4 showers', value: 'medium', multiplier: 1.0, kwhPerYear: 1500 },
				{ label: '5+ showers', value: 'heavy', multiplier: 1.7, kwhPerYear: 2550 },
			],
			defaultValue: 'medium',
		},
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
		usageOptions: {
			question: 'How often do you use it?',
			presets: [
				{ label: 'Weekends only', value: 'light', multiplier: 0.5, kwhPerYear: 1500 },
				{
					label: 'Few times a week',
					value: 'medium',
					multiplier: 1.0,
					kwhPerYear: 3000,
				},
				{ label: 'Daily', value: 'heavy', multiplier: 1.5, kwhPerYear: 4500 },
			],
			defaultValue: 'medium',
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
		usageOptions: {
			question: 'Summer months of use',
			presets: [
				{ label: '2 months', value: 'light', multiplier: 0.67, kwhPerYear: 400 },
				{ label: '3 months', value: 'medium', multiplier: 1.0, kwhPerYear: 600 },
				{ label: '4 months', value: 'heavy', multiplier: 1.33, kwhPerYear: 800 },
			],
			defaultValue: 'medium',
		},
	},
];
