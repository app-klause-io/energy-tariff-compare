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

export type TariffType = 'standard' | 'agile' | 'go' | 'intelligent-go' | 'cosy';

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
