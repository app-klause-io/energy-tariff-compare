import { describe, it, expect } from 'vitest';
import { convertStoredToTariffs } from './storedTariffs';
import type { TariffRecord } from '$lib/server/db';

function makeTariffRecord(overrides: Partial<TariffRecord> = {}): TariffRecord {
	return {
		id: 1,
		provider: 'octopus',
		tariff_code: 'E-1R-TEST-C',
		tariff_name: 'Test Tariff',
		region: 'london',
		fuel_type: 'electricity',
		payment_method: 'direct_debit',
		unit_rate_p: 24.5,
		standing_charge_p: 60.11,
		day_rate_p: undefined,
		night_rate_p: undefined,
		peak_rate_p: undefined,
		offpeak_rate_p: undefined,
		rate_data: { type: 'flat' },
		valid_from: '2026-01-01T00:00:00Z',
		valid_to: '2026-03-31T23:59:59Z',
		source: 'octopus_api',
		fetched_at: new Date(),
		created_at: new Date(),
		...overrides,
	};
}

describe('convertStoredToTariffs', () => {
	it('converts a flat-rate octopus tariff correctly', () => {
		const record = makeTariffRecord();
		const tariffs = convertStoredToTariffs(record, 'london');

		expect(tariffs).toHaveLength(1);
		const tariff = tariffs[0];
		expect(tariff.name).toBe('Test Tariff');
		expect(tariff.supplier).toBe('Octopus Energy');
		expect(tariff.type).toBe('flat');
		expect(tariff.standingCharge).toBe(60.11);
		expect(tariff.rates).toHaveLength(1);
		expect(tariff.rates[0].startSlot).toBe(0);
		expect(tariff.rates[0].endSlot).toBe(48);
		expect(tariff.rates[0].unitRate).toBe(24.5);
		expect(tariff.region).toBe('london');
	});

	it('converts a tariff with half-hourly rate data', () => {
		const halfHourlyRates = Array.from({ length: 48 }, (_, i) => ({
			slot: i,
			rate_p: i < 14 ? 10 : 25,
		}));

		const record = makeTariffRecord({
			rate_data: {
				type: 'agile',
				half_hourly_rates: halfHourlyRates,
			},
		});

		const tariffs = convertStoredToTariffs(record, 'london');

		expect(tariffs).toHaveLength(1);
		const tariff = tariffs[0];
		expect(tariff.type).toBe('agile');
		expect(tariff.rates.length).toBeGreaterThanOrEqual(2);

		const offPeakRate = tariff.rates.find((r) => r.unitRate === 10);
		expect(offPeakRate).toBeDefined();
		expect(offPeakRate!.startSlot).toBe(0);
		expect(offPeakRate!.endSlot).toBe(14);

		const peakRate = tariff.rates.find((r) => r.unitRate === 25);
		expect(peakRate).toBeDefined();
		expect(peakRate!.startSlot).toBe(14);
		expect(peakRate!.endSlot).toBe(48);
	});

	it('expands ofgem_cap direct_debit records into individual provider tariffs', () => {
		const record = makeTariffRecord({
			provider: 'ofgem_cap',
			tariff_name: 'Price Cap (Q1 2026)',
			payment_method: 'direct_debit',
		});

		const tariffs = convertStoredToTariffs(record, 'london');

		expect(tariffs.length).toBe(5);
		const suppliers = tariffs.map((t) => t.supplier);
		expect(suppliers).toContain('British Gas');
		expect(suppliers).toContain('EDF');
		expect(suppliers).toContain('E.ON');
		expect(suppliers).toContain('Scottish Power');
		expect(suppliers).toContain('OVO Energy');

		for (const tariff of tariffs) {
			expect(tariff.rates[0].unitRate).toBe(24.5);
			expect(tariff.standingCharge).toBe(60.11);
		}
	});

	it('skips ofgem_cap prepayment records', () => {
		const record = makeTariffRecord({
			provider: 'ofgem_cap',
			payment_method: 'prepayment',
		});

		const tariffs = convertStoredToTariffs(record, 'london');
		expect(tariffs).toHaveLength(0);
	});

	it('skips elexon wholesale records', () => {
		const record = makeTariffRecord({ provider: 'elexon' });
		const tariffs = convertStoredToTariffs(record, 'london');
		expect(tariffs).toHaveLength(0);
	});

	it('returns empty array when unit_rate_p is missing and no half-hourly data', () => {
		const record = makeTariffRecord({
			unit_rate_p: undefined,
			rate_data: { type: 'flat' },
		});

		const tariffs = convertStoredToTariffs(record, 'london');
		expect(tariffs).toHaveLength(0);
	});

	it('generates unique IDs for octopus tariffs', () => {
		const record = makeTariffRecord({ id: 42, provider: 'octopus' });
		const tariffs = convertStoredToTariffs(record, 'london');
		expect(tariffs[0].id).toBe('stored-octopus-42');
	});

	it('uses region parameter for the tariff region', () => {
		const record = makeTariffRecord();
		const tariffs = convertStoredToTariffs(record, 'yorkshire');
		expect(tariffs[0].region).toBe('yorkshire');
	});

	it('handles retail_p_kwh format in half-hourly data', () => {
		const halfHourlyRates = Array.from({ length: 48 }, (_, i) => ({
			slot: i,
			retail_p_kwh: 20,
		}));

		const record = makeTariffRecord({
			rate_data: {
				type: 'flat',
				half_hourly_rates: halfHourlyRates,
			},
		});

		const tariffs = convertStoredToTariffs(record, 'london');
		expect(tariffs).toHaveLength(1);
		expect(tariffs[0].rates).toHaveLength(1);
		expect(tariffs[0].rates[0].unitRate).toBe(20);
	});

	it('defaults standing charge to 0 when missing', () => {
		const record = makeTariffRecord({ standing_charge_p: undefined });
		const tariffs = convertStoredToTariffs(record, 'london');
		expect(tariffs[0].standingCharge).toBe(0);
	});
});
