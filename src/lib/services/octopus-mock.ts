export const MOCK_PRODUCT_LIST_RESPONSE = {
	count: 5,
	results: [
		{
			code: 'VAR-22-11-01',
			direction: 'IMPORT',
			display_name: 'Flexible Octopus',
			description:
				'Flexible Octopus offers an electricity tariff where the weights are reviewed every quarter.',
			is_variable: true,
			is_green: false,
			is_tracker: false,
			is_prepay: false,
			is_business: false,
			brand: 'OCTOPUS_ENERGY',
			available_from: '2022-11-01T00:00:00Z',
			available_to: null,
		},
		{
			code: 'AGILE-24-10-01',
			direction: 'IMPORT',
			display_name: 'Agile Octopus',
			description:
				'With Agile Octopus, you get access to half-hourly energy prices, tied to wholesale prices and updated daily.',
			is_variable: true,
			is_green: true,
			is_tracker: false,
			is_prepay: false,
			is_business: false,
			brand: 'OCTOPUS_ENERGY',
			available_from: '2024-10-01T00:00:00+01:00',
			available_to: null,
		},
		{
			code: 'GO-VAR-22-10-14',
			direction: 'IMPORT',
			display_name: 'Octopus Go',
			description:
				'The smart EV tariff with super cheap electricity between 00:30 - 05:30 every night.',
			is_variable: true,
			is_green: false,
			is_tracker: false,
			is_prepay: false,
			is_business: false,
			brand: 'OCTOPUS_ENERGY',
			available_from: '2022-10-14T00:00:00+01:00',
			available_to: null,
		},
		{
			code: 'INTELLI-VAR-22-10-14',
			direction: 'IMPORT',
			display_name: 'Intelligent Octopus Go',
			description:
				'Intelligent Octopus Go gives you a super cheap overnight rate and smart charging for your EV.',
			is_variable: true,
			is_green: false,
			is_tracker: false,
			is_prepay: false,
			is_business: false,
			brand: 'OCTOPUS_ENERGY',
			available_from: '2022-10-14T00:00:00+01:00',
			available_to: null,
		},
		{
			code: 'COSY-22-12-08',
			direction: 'IMPORT',
			display_name: 'Cosy Octopus',
			description:
				'Cosy Octopus is a heat pump tariff with eight hours of super cheap electricity every day.',
			is_variable: true,
			is_green: false,
			is_tracker: false,
			is_prepay: false,
			is_business: false,
			brand: 'OCTOPUS_ENERGY',
			available_from: '2022-12-13T00:00:00Z',
			available_to: null,
		},
	],
};

export const MOCK_UNIT_RATES_RESPONSE = {
	count: 2,
	results: [
		{
			value_exc_vat: 25.7129,
			value_inc_vat: 26.998545,
			valid_from: '2026-01-01T00:00:00Z',
			valid_to: null,
			payment_method: 'DIRECT_DEBIT',
		},
		{
			value_exc_vat: 26.5595,
			value_inc_vat: 27.887475,
			valid_from: '2026-01-01T00:00:00Z',
			valid_to: null,
			payment_method: 'NON_DIRECT_DEBIT',
		},
	],
};

export const MOCK_STANDING_CHARGES_RESPONSE = {
	count: 2,
	results: [
		{
			value_exc_vat: 43.6021,
			value_inc_vat: 45.782205,
			valid_from: '2026-01-01T00:00:00Z',
			valid_to: null,
			payment_method: 'DIRECT_DEBIT',
		},
		{
			value_exc_vat: 49.8643,
			value_inc_vat: 52.357515,
			valid_from: '2026-01-01T00:00:00Z',
			valid_to: null,
			payment_method: 'NON_DIRECT_DEBIT',
		},
	],
};

export const MOCK_GO_UNIT_RATES_RESPONSE = {
	count: 4,
	results: [
		{
			value_exc_vat: 29.3029,
			value_inc_vat: 30.768045,
			valid_from: '2026-03-02T05:30:00Z',
			valid_to: '2026-03-03T00:30:00Z',
			payment_method: null,
		},
		{
			value_exc_vat: 8.5714,
			value_inc_vat: 8.99997,
			valid_from: '2026-03-02T00:30:00Z',
			valid_to: '2026-03-02T05:30:00Z',
			payment_method: null,
		},
		{
			value_exc_vat: 29.3029,
			value_inc_vat: 30.768045,
			valid_from: '2026-03-01T05:30:00Z',
			valid_to: '2026-03-02T00:30:00Z',
			payment_method: null,
		},
		{
			value_exc_vat: 8.5714,
			value_inc_vat: 8.99997,
			valid_from: '2026-03-01T00:30:00Z',
			valid_to: '2026-03-01T05:30:00Z',
			payment_method: null,
		},
	],
};

export const MOCK_AGILE_UNIT_RATES_RESPONSE = {
	count: 48,
	results: Array.from({ length: 48 }, (_, i) => {
		const hour = Math.floor(i / 2);
		const minute = (i % 2) * 30;
		const baseRate = 10 + Math.sin((hour * Math.PI) / 12) * 15;
		return {
			value_exc_vat: Math.round(baseRate * 100) / 100,
			value_inc_vat: Math.round(baseRate * 1.05 * 100) / 100,
			valid_from: `2026-03-01T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
			valid_to: `2026-03-01T${String(hour).padStart(2, '0')}:${String((minute + 30) % 60).padStart(2, '0')}:00Z`,
			payment_method: null,
		};
	}),
};

export const MOCK_INVALID_RESPONSE = {
	count: 'not-a-number',
	results: [{ invalid: true }],
};

export const MOCK_PRODUCT_LIST_WITH_EXPORT = {
	count: 2,
	results: [
		...MOCK_PRODUCT_LIST_RESPONSE.results.slice(0, 1),
		{
			code: 'AGILE-OUTGOING-19-05-13',
			direction: 'EXPORT',
			display_name: 'Agile Outgoing Octopus',
			description: 'Export tariff — should be filtered out.',
			is_variable: true,
			is_green: true,
			is_tracker: false,
			is_prepay: false,
			is_business: false,
			brand: 'OCTOPUS_ENERGY',
			available_from: '2019-05-13T00:00:00Z',
			available_to: null,
		},
	],
};
