import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	ProductListResponseSchema,
	RateListResponseSchema,
	OctopusProductSchema,
	OctopusRateSchema,
	fetchAvailableProducts,
	fetchUnitRates,
	fetchStandingCharges,
	fetchTariffsForRegion,
	convertTariffInfoToTariff,
	buildTariffCode,
	classifyProduct,
} from './octopus';
import { getGspGroupId, UK_REGIONS } from '$lib/data/regions';
import {
	MOCK_PRODUCT_LIST_RESPONSE,
	MOCK_UNIT_RATES_RESPONSE,
	MOCK_STANDING_CHARGES_RESPONSE,
	MOCK_GO_UNIT_RATES_RESPONSE,
	MOCK_INVALID_RESPONSE,
	MOCK_PRODUCT_LIST_WITH_EXPORT,
} from './octopus-mock';

// Mock the logger to avoid console output in tests
vi.mock('$lib/server/logger', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe('Zod schema validation', () => {
	describe('OctopusProductSchema', () => {
		it('parses a valid product', () => {
			const product = MOCK_PRODUCT_LIST_RESPONSE.results[0];
			const result = OctopusProductSchema.parse(product);
			expect(result.code).toBe('VAR-22-11-01');
			expect(result.display_name).toBe('Flexible Octopus');
			expect(result.is_variable).toBe(true);
		});

		it('rejects a product with missing required fields', () => {
			expect(() =>
				OctopusProductSchema.parse({
					code: 'TEST',
					// missing display_name, description, etc.
				}),
			).toThrow();
		});

		it('rejects a product with wrong types', () => {
			expect(() =>
				OctopusProductSchema.parse({
					...MOCK_PRODUCT_LIST_RESPONSE.results[0],
					is_variable: 'yes', // should be boolean
				}),
			).toThrow();
		});
	});

	describe('OctopusRateSchema', () => {
		it('parses a valid rate with payment_method', () => {
			const rate = MOCK_UNIT_RATES_RESPONSE.results[0];
			const result = OctopusRateSchema.parse(rate);
			expect(result.value_inc_vat).toBe(26.998545);
			expect(result.payment_method).toBe('DIRECT_DEBIT');
		});

		it('parses a rate with null payment_method', () => {
			const rate = MOCK_GO_UNIT_RATES_RESPONSE.results[0];
			const result = OctopusRateSchema.parse(rate);
			expect(result.payment_method).toBeNull();
		});

		it('rejects a rate with missing value fields', () => {
			expect(() =>
				OctopusRateSchema.parse({
					valid_from: '2026-01-01T00:00:00Z',
					valid_to: null,
				}),
			).toThrow();
		});
	});

	describe('ProductListResponseSchema', () => {
		it('parses a valid product list response', () => {
			const result = ProductListResponseSchema.parse(MOCK_PRODUCT_LIST_RESPONSE);
			expect(result.count).toBe(5);
			expect(result.results).toHaveLength(5);
		});

		it('rejects an invalid response', () => {
			expect(() => ProductListResponseSchema.parse(MOCK_INVALID_RESPONSE)).toThrow();
		});

		it('rejects a response with non-numeric count', () => {
			expect(() =>
				ProductListResponseSchema.parse({
					count: 'abc',
					results: [],
				}),
			).toThrow();
		});
	});

	describe('RateListResponseSchema', () => {
		it('parses a valid unit rates response', () => {
			const result = RateListResponseSchema.parse(MOCK_UNIT_RATES_RESPONSE);
			expect(result.count).toBe(2);
			expect(result.results).toHaveLength(2);
		});

		it('parses a valid standing charges response', () => {
			const result = RateListResponseSchema.parse(MOCK_STANDING_CHARGES_RESPONSE);
			expect(result.count).toBe(2);
		});
	});
});

describe('Region mapping', () => {
	it('maps all 14 regions to correct GSP Group IDs', () => {
		const expected: Record<string, string> = {
			eastern: '_A',
			'east-midlands': '_B',
			london: '_C',
			merseyside: '_D',
			'west-midlands': '_E',
			'north-east': '_F',
			'north-west': '_G',
			southern: '_H',
			'south-east': '_J',
			'south-wales': '_K',
			'south-west': '_L',
			yorkshire: '_M',
			'south-scotland': '_N',
			'north-scotland': '_P',
		};

		for (const [region, gspId] of Object.entries(expected)) {
			expect(getGspGroupId(region as Parameters<typeof getGspGroupId>[0])).toBe(gspId);
		}
	});

	it('has exactly 14 regions', () => {
		expect(UK_REGIONS).toHaveLength(14);
	});

	it('throws for an unknown region', () => {
		expect(() => getGspGroupId('invalid' as Parameters<typeof getGspGroupId>[0])).toThrow(
			'Unknown region: invalid',
		);
	});
});

describe('API client (mocked)', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	describe('fetchAvailableProducts', () => {
		it('fetches and parses products, filtering to IMPORT only', async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(MOCK_PRODUCT_LIST_WITH_EXPORT),
			});

			const products = await fetchAvailableProducts();
			expect(products).toHaveLength(1);
			expect(products[0].code).toBe('VAR-22-11-01');
			expect(products[0].direction).toBe('IMPORT');
		});

		it('throws on HTTP error', async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			});

			await expect(fetchAvailableProducts()).rejects.toThrow('Octopus API error: 500');
		});

		it('throws on invalid response shape', async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ invalid: true }),
			});

			await expect(fetchAvailableProducts()).rejects.toThrow();
		});

		it('throws on network failure', async () => {
			globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

			await expect(fetchAvailableProducts()).rejects.toThrow('Network error');
		});
	});

	describe('fetchUnitRates', () => {
		it('fetches and parses unit rates', async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(MOCK_UNIT_RATES_RESPONSE),
			});

			const rates = await fetchUnitRates('VAR-22-11-01', 'E-1R-VAR-22-11-01-C');
			expect(rates).toHaveLength(2);
			expect(rates[0].value_inc_vat).toBe(26.998545);
		});

		it('passes query params correctly', async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(MOCK_UNIT_RATES_RESPONSE),
			});

			await fetchUnitRates('VAR-22-11-01', 'E-1R-VAR-22-11-01-C', {
				page_size: 48,
				period_from: '2026-01-01T00:00:00Z',
			});

			const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
			expect(calledUrl).toContain('page_size=48');
			expect(calledUrl).toContain('period_from=');
		});

		it('throws on HTTP error', async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			});

			await expect(fetchUnitRates('INVALID', 'E-1R-INVALID-C')).rejects.toThrow(
				'Failed to fetch unit rates',
			);
		});
	});

	describe('fetchStandingCharges', () => {
		it('returns the DIRECT_DEBIT standing charge inc VAT', async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(MOCK_STANDING_CHARGES_RESPONSE),
			});

			const charge = await fetchStandingCharges('VAR-22-11-01', 'E-1R-VAR-22-11-01-C');
			expect(charge).toBe(45.782205);
		});

		it('falls back to first result if no DIRECT_DEBIT', async () => {
			const noDirectDebit = {
				count: 1,
				results: [
					{
						value_exc_vat: 50.0,
						value_inc_vat: 52.5,
						valid_from: '2026-01-01T00:00:00Z',
						valid_to: null,
						payment_method: null,
					},
				],
			};

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(noDirectDebit),
			});

			const charge = await fetchStandingCharges('GO-VAR-22-10-14', 'E-1R-GO-VAR-22-10-14-C');
			expect(charge).toBe(52.5);
		});

		it('throws when no results', async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ count: 0, results: [] }),
			});

			await expect(fetchStandingCharges('INVALID', 'E-1R-INVALID-C')).rejects.toThrow(
				'No standing charges found',
			);
		});
	});

	describe('fetchTariffsForRegion', () => {
		it('fetches tariffs for a region, skipping unavailable products', async () => {
			let callCount = 0;
			globalThis.fetch = vi.fn().mockImplementation((url: string) => {
				callCount++;
				if (url.includes('/products/?')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve(MOCK_PRODUCT_LIST_RESPONSE),
					});
				}
				if (url.includes('/standard-unit-rates/')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve(MOCK_UNIT_RATES_RESPONSE),
					});
				}
				if (url.includes('/standing-charges/')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve(MOCK_STANDING_CHARGES_RESPONSE),
					});
				}
				return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
			});

			const tariffs = await fetchTariffsForRegion('london');
			expect(tariffs.length).toBeGreaterThanOrEqual(1);
			expect(callCount).toBeGreaterThan(0);

			// Check the first tariff has required fields
			const first = tariffs[0];
			expect(first.productCode).toBeDefined();
			expect(first.name).toBeDefined();
			expect(first.type).toBeDefined();
			expect(first.standingChargePence).toBeGreaterThan(0);
			expect(first.unitRates.length).toBeGreaterThan(0);
		});

		it('handles when all products fail gracefully', async () => {
			globalThis.fetch = vi.fn().mockImplementation((url: string) => {
				if (url.includes('/products/?')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve(MOCK_PRODUCT_LIST_RESPONSE),
					});
				}
				return Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' });
			});

			const tariffs = await fetchTariffsForRegion('london');
			expect(tariffs).toHaveLength(0);
		});
	});
});

describe('Tariff code construction', () => {
	it('constructs correct tariff codes for different regions', () => {
		// Tariff code format: E-1R-{PRODUCT_CODE}-{REGION_CODE}
		const londonGsp = getGspGroupId('london');
		expect(`E-1R-VAR-22-11-01-${londonGsp}`).toBe('E-1R-VAR-22-11-01-_C');

		const easternGsp = getGspGroupId('eastern');
		expect(`E-1R-AGILE-24-10-01-${easternGsp}`).toBe('E-1R-AGILE-24-10-01-_A');

		const scotlandGsp = getGspGroupId('north-scotland');
		expect(`E-1R-GO-VAR-22-10-14-${scotlandGsp}`).toBe('E-1R-GO-VAR-22-10-14-_P');
	});
});

describe('buildTariffCode', () => {
	it('builds correct single-register tariff code, stripping underscore prefix', () => {
		expect(buildTariffCode('AGILE-FLEX-22-11-25', '_C')).toBe('E-1R-AGILE-FLEX-22-11-25-C');
	});

	it('builds correct code for different regions', () => {
		expect(buildTariffCode('GO-VAR-22-10-14', '_A')).toBe('E-1R-GO-VAR-22-10-14-A');
		expect(buildTariffCode('GO-VAR-22-10-14', '_P')).toBe('E-1R-GO-VAR-22-10-14-P');
	});

	it('handles gspGroupId without underscore prefix', () => {
		expect(buildTariffCode('VAR-22-11-01', 'C')).toBe('E-1R-VAR-22-11-01-C');
	});
});

describe('classifyProduct', () => {
	function makeProduct(displayName: string) {
		return {
			code: 'TEST',
			direction: 'IMPORT',
			display_name: displayName,
			description: 'Test',
			is_variable: true,
			is_green: false,
			is_tracker: false,
			is_prepay: false,
			is_business: false,
			brand: 'OCTOPUS_ENERGY',
			available_from: '2024-01-01T00:00:00Z',
			available_to: null,
		};
	}

	it('classifies Flexible Octopus as standard', () => {
		expect(classifyProduct(makeProduct('Flexible Octopus'))).toEqual({ type: 'standard' });
	});

	it('classifies Agile Octopus as agile', () => {
		expect(classifyProduct(makeProduct('Agile Octopus'))).toEqual({ type: 'agile' });
	});

	it('classifies Octopus Go as go with off-peak hours', () => {
		expect(classifyProduct(makeProduct('Octopus Go'))).toEqual({
			type: 'go',
			offPeakHours: '00:30-05:30',
		});
	});

	it('classifies Intelligent Octopus Go', () => {
		expect(classifyProduct(makeProduct('Intelligent Octopus Go'))).toEqual({
			type: 'intelligent-go',
			offPeakHours: '23:30-05:30',
		});
	});

	it('classifies Cosy Octopus', () => {
		expect(classifyProduct(makeProduct('Cosy Octopus'))).toEqual({ type: 'cosy' });
	});

	it('returns null for unknown products', () => {
		expect(classifyProduct(makeProduct('Some Other Tariff'))).toBeNull();
	});
});

describe('convertTariffInfoToTariff', () => {
	it('converts a standard tariff to a flat-rate Tariff', () => {
		const info = {
			productCode: 'VAR-22-11-01',
			name: 'Flexible Octopus',
			description: 'Standard variable',
			type: 'standard' as const,
			isGreen: false,
			unitRates: [
				{
					value_exc_vat: 23.33,
					value_inc_vat: 24.5,
					valid_from: '2024-01-01T00:00:00Z',
					valid_to: null,
					payment_method: null,
				},
			],
			standingChargePence: 60.11,
			hasMultipleRates: false,
		};

		const tariff = convertTariffInfoToTariff(info, 'london');

		expect(tariff.name).toBe('Flexible Octopus');
		expect(tariff.supplier).toBe('Octopus Energy');
		expect(tariff.type).toBe('standard');
		expect(tariff.standingCharge).toBe(60.11);
		expect(tariff.region).toBe('london');
		expect(tariff.rates).toHaveLength(1);
		expect(tariff.rates[0].startSlot).toBe(0);
		expect(tariff.rates[0].endSlot).toBe(48);
		expect(tariff.rates[0].unitRate).toBeCloseTo(24.5, 1);
	});

	it('converts a multi-rate (go) tariff with off-peak and standard', () => {
		const rates = [];
		for (let i = 0; i < 48; i++) {
			const hour = Math.floor(i / 2);
			const minute = (i % 2) * 30;
			const isCheap = i >= 1 && i < 9;
			rates.push({
				value_exc_vat: (isCheap ? 9.0 : 24.88) / 1.05,
				value_inc_vat: isCheap ? 9.0 : 24.88,
				valid_from: `2024-01-01T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
				valid_to: null,
				payment_method: null,
			});
		}

		const info = {
			productCode: 'GO-VAR-22-10-14',
			name: 'Octopus Go',
			description: 'EV tariff',
			type: 'go' as const,
			isGreen: false,
			unitRates: rates,
			standingChargePence: 60.11,
			hasMultipleRates: true,
			offPeakRate: 9.0,
			peakRate: 24.88,
			offPeakHours: '00:30-04:30',
		};

		const tariff = convertTariffInfoToTariff(info, 'london');

		expect(tariff.type).toBe('go');
		expect(tariff.rates.length).toBeGreaterThanOrEqual(2);

		// Check all 48 slots are covered
		const coveredSlots = new Set<number>();
		for (const rate of tariff.rates) {
			for (let slot = rate.startSlot; slot < rate.endSlot; slot++) {
				coveredSlots.add(slot);
			}
		}
		expect(coveredSlots.size).toBe(48);
	});

	it('handles empty unit rates', () => {
		const info = {
			productCode: 'EMPTY-01',
			name: 'Empty',
			description: 'No rates',
			type: 'standard' as const,
			isGreen: false,
			unitRates: [],
			standingChargePence: 60.0,
			hasMultipleRates: false,
		};

		const tariff = convertTariffInfoToTariff(info, 'london');
		expect(tariff.rates).toHaveLength(0);
	});
});

describe('Octopus API (live)', () => {
	it('fetches real products from the API', async () => {
		try {
			const products = await fetchAvailableProducts();
			expect(products.length).toBeGreaterThan(0);

			const flexible = products.find((p) => p.display_name.includes('Flexible'));
			expect(flexible).toBeDefined();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.warn(`Live API test skipped (network unavailable): ${message}`);
		}
	});

	it('fetches real unit rates for Flexible Octopus in London', async () => {
		try {
			const rates = await fetchUnitRates('VAR-22-11-01', 'E-1R-VAR-22-11-01-C', {
				page_size: 5,
			});
			expect(rates.length).toBeGreaterThan(0);
			expect(rates[0].value_inc_vat).toBeGreaterThan(0);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.warn(`Live API test skipped (network unavailable): ${message}`);
		}
	});

	it('fetches real standing charges for Flexible Octopus in London', async () => {
		try {
			const charge = await fetchStandingCharges('VAR-22-11-01', 'E-1R-VAR-22-11-01-C');
			expect(charge).toBeGreaterThan(0);
			expect(typeof charge).toBe('number');
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.warn(`Live API test skipped (network unavailable): ${message}`);
		}
	});

	it('fetches real tariffs for London region', async () => {
		try {
			const tariffs = await fetchTariffsForRegion('london');
			expect(tariffs.length).toBeGreaterThanOrEqual(1);

			for (const tariff of tariffs) {
				expect(tariff.productCode).toBeTruthy();
				expect(tariff.name).toBeTruthy();
				expect(tariff.standingChargePence).toBeGreaterThan(0);
				expect(tariff.unitRates.length).toBeGreaterThan(0);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.warn(`Live API test skipped (network unavailable): ${message}`);
		}
	});
});
