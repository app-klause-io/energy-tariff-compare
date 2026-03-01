import type { Appliance } from '$lib/types/wizard';

export const DEFAULT_APPLIANCES: Appliance[] = [
	{
		id: 'ev',
		name: 'Electric Vehicle',
		icon: '\u{1F697}',
		enabled: false,
		annualKwhEstimate: 3500,
		subOptions: {
			label: 'Do you charge at home overnight?',
			value: 'overnight',
			options: [
				{ label: 'Yes, mostly overnight', value: 'overnight' },
				{ label: 'No, during the day', value: 'daytime' },
			],
		},
	},
	{
		id: 'heat-pump',
		name: 'Heat Pump',
		icon: '\u{1F321}\u{FE0F}',
		enabled: false,
		annualKwhEstimate: 8000,
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
		id: 'aga',
		name: 'Aga / Range Cooker',
		icon: '\u{1F373}',
		enabled: false,
		annualKwhEstimate: 4000,
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
		id: 'solar',
		name: 'Solar Panels',
		icon: '\u{2600}\u{FE0F}',
		enabled: false,
		annualKwhEstimate: -3000,
		subOptions: {
			label: 'Do you have a battery?',
			value: 'no',
			options: [
				{ label: 'Yes', value: 'yes' },
				{ label: 'No', value: 'no' },
			],
		},
	},
	{
		id: 'electric-heating',
		name: 'Electric Heating',
		icon: '\u{1F525}',
		enabled: false,
		annualKwhEstimate: 5000,
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
		id: 'immersion-heater',
		name: 'Electric Immersion Heater',
		icon: '\u{1F6BF}',
		enabled: false,
		annualKwhEstimate: 3000,
		subOptions: {
			label: 'When do you heat water?',
			value: 'evening',
			options: [
				{ label: 'Mostly evenings', value: 'evening' },
				{ label: 'Overnight (off-peak)', value: 'overnight' },
			],
		},
	},
];
