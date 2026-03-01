import { describe, it, expect } from 'vitest';
import { convertStoredToTariff } from './storedTariffs';
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

describe('convertStoredToTariff', () => {
	it('converts a flat-rate tariff correctly', () => {
		const record = makeTariffRecord();
		const tariff = convertStoredToTariff(record, 'london');

		expect(tariff).not.toBeNull();
		expect(tariff!.name).toBe('Test Tariff');
		expect(tariff!.supplier).toBe('Octopus Energy');
		expect(tariff!.type).toBe('flat');
		expect(tariff!.standingCharge).toBe(60.11);
		expect(tariff!.rates).toHaveLength(1);
		expect(tariff!.rates[0].startSlot).toBe(0);
		expect(tariff!.rates[0].endSlot).toBe(48);
		expect(tariff!.rates[0].unitRate).toBe(24.5);
		expect(tariff!.region).toBe('london');
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

		const tariff = convertStoredToTariff(record, 'london');

		expect(tariff).not.toBeNull();
		expect(tariff!.type).toBe('agile');
		expect(tariff!.rates.length).toBeGreaterThanOrEqual(2);

		const offPeakRate = tariff!.rates.find((r) => r.unitRate === 10);
		expect(offPeakRate).toBeDefined();
		expect(offPeakRate!.startSlot).toBe(0);
		expect(offPeakRate!.endSlot).toBe(14);

		const peakRate = tariff!.rates.find((r) => r.unitRate === 25);
		expect(peakRate).toBeDefined();
		expect(peakRate!.startSlot).toBe(14);
		expect(peakRate!.endSlot).toBe(48);
	});

	it('maps provider names to supplier labels', () => {
		const octopus = convertStoredToTariff(makeTariffRecord({ provider: 'octopus' }), 'london');
		expect(octopus!.supplier).toBe('Octopus Energy');

		const ofgem = convertStoredToTariff(makeTariffRecord({ provider: 'ofgem_cap' }), 'london');
		expect(ofgem!.supplier).toBe('Price Cap');

		const elexon = convertStoredToTariff(makeTariffRecord({ provider: 'elexon' }), 'london');
		expect(elexon!.supplier).toBe('Wholesale');

		const unknown = convertStoredToTariff(makeTariffRecord({ provider: 'british_gas' }), 'london');
		expect(unknown!.supplier).toBe('british_gas');
	});

	it('returns null when unit_rate_p is missing and no half-hourly data', () => {
		const record = makeTariffRecord({
			unit_rate_p: undefined,
			rate_data: { type: 'flat' },
		});

		const tariff = convertStoredToTariff(record, 'london');
		expect(tariff).toBeNull();
	});

	it('generates a unique ID from provider and database ID', () => {
		const record = makeTariffRecord({ id: 42, provider: 'octopus' });
		const tariff = convertStoredToTariff(record, 'london');
		expect(tariff!.id).toBe('stored-octopus-42');
	});

	it('uses region parameter for the tariff region', () => {
		const record = makeTariffRecord();
		const tariff = convertStoredToTariff(record, 'yorkshire');
		expect(tariff!.region).toBe('yorkshire');
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

		const tariff = convertStoredToTariff(record, 'london');
		expect(tariff).not.toBeNull();
		expect(tariff!.rates).toHaveLength(1);
		expect(tariff!.rates[0].unitRate).toBe(20);
	});

	it('defaults standing charge to 0 when missing', () => {
		const record = makeTariffRecord({ standing_charge_p: undefined });
		const tariff = convertStoredToTariff(record, 'london');
		expect(tariff!.standingCharge).toBe(0);
	});
});
