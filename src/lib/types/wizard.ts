export type PropertyType = 'flat' | 'terrace' | 'semi-detached' | 'detached';

export type UkRegion =
	| 'eastern'
	| 'east-midlands'
	| 'london'
	| 'merseyside'
	| 'north-east'
	| 'north-west'
	| 'north-scotland'
	| 'south-east'
	| 'south-scotland'
	| 'south-wales'
	| 'south-west'
	| 'southern'
	| 'west-midlands'
	| 'yorkshire';

export interface PropertyDetails {
	type: PropertyType | null;
	bedrooms: number;
	occupants: number;
	region: UkRegion | null;
}

export interface ApplianceSubOption {
	label: string;
	value: string;
	options: { label: string; value: string }[];
}

export interface Appliance {
	id: string;
	name: string;
	icon: string;
	enabled: boolean;
	annualKwhEstimate: number;
	subOptions?: ApplianceSubOption;
	selectedSubOption?: string;
}

export type UsagePattern = 'morning' | 'daytime' | 'evening' | 'night';
export type FlexibilityLevel = 'low' | 'medium' | 'high';

export interface UsageHabits {
	pattern: UsagePattern | null;
	overnightAppliances: boolean;
	flexibility: FlexibilityLevel | null;
}

export interface WizardState {
	step: number;
	property: PropertyDetails;
	appliances: Appliance[];
	habits: UsageHabits;
}
