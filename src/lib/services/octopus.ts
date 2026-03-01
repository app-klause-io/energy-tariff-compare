import { z } from 'zod';
import { getGspGroupId } from '$lib/data/regions';
import { logger } from '$lib/server/logger';
import type { OctopusProduct, OctopusRate, TariffInfo, TariffType } from '$lib/types/tariff';
import type { UkRegion } from '$lib/types/wizard';

const OctopusProductSchema = z.object({
	code: z.string(),
	direction: z.string().optional().default('IMPORT'),
	display_name: z.string(),
	description: z.string(),
	is_variable: z.boolean(),
	is_green: z.boolean(),
	is_tracker: z.boolean(),
	is_prepay: z.boolean(),
	is_business: z.boolean(),
	brand: z.string(),
	available_from: z.string(),
	available_to: z.string().nullable(),
});

const OctopusRateSchema = z.object({
	value_exc_vat: z.number(),
	value_inc_vat: z.number(),
	valid_from: z.string(),
	valid_to: z.string().nullable(),
	payment_method: z.string().nullable().optional().default(null),
});

const ProductListResponseSchema = z.object({
	count: z.number(),
	results: z.array(OctopusProductSchema),
});

const RateListResponseSchema = z.object({
	count: z.number(),
	results: z.array(OctopusRateSchema),
});

export {
	OctopusProductSchema,
	OctopusRateSchema,
	ProductListResponseSchema,
	RateListResponseSchema,
};

const OCTOPUS_API_BASE = 'https://api.octopus.energy/v1';

interface TargetProduct {
	namePattern: RegExp;
	type: TariffType;
	offPeakHours?: string;
}

const TARGET_PRODUCTS: TargetProduct[] = [
	{ namePattern: /^Flexible Octopus$/i, type: 'standard' },
	{ namePattern: /^Agile Octopus$/i, type: 'agile' },
	{ namePattern: /^Octopus Go$/i, type: 'go', offPeakHours: '00:30-05:30' },
	{ namePattern: /^Intelligent Octopus Go$/i, type: 'intelligent-go', offPeakHours: '23:30-05:30' },
	{ namePattern: /^Cosy Octopus$/i, type: 'cosy' },
];

export async function fetchAvailableProducts(): Promise<OctopusProduct[]> {
	const url = `${OCTOPUS_API_BASE}/products/?is_variable=true&is_business=false&is_prepay=false`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Octopus API error: ${response.status} ${response.statusText}`);
	}

	const data: unknown = await response.json();
	const parsed = ProductListResponseSchema.parse(data);

	return parsed.results.filter(
		(p) => p.direction === 'IMPORT' || !('direction' in p),
	) as OctopusProduct[];
}

export async function fetchUnitRates(
	productCode: string,
	tariffCode: string,
	params?: { period_from?: string; period_to?: string; page_size?: number },
): Promise<OctopusRate[]> {
	const searchParams = new URLSearchParams();
	if (params?.period_from) searchParams.set('period_from', params.period_from);
	if (params?.period_to) searchParams.set('period_to', params.period_to);
	if (params?.page_size) searchParams.set('page_size', String(params.page_size));

	const qs = searchParams.toString();
	const url = `${OCTOPUS_API_BASE}/products/${productCode}/electricity-tariffs/${tariffCode}/standard-unit-rates/${qs ? `?${qs}` : ''}`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch unit rates for ${tariffCode}: ${response.status} ${response.statusText}`,
		);
	}

	const data: unknown = await response.json();
	const parsed = RateListResponseSchema.parse(data);

	return parsed.results as OctopusRate[];
}

export async function fetchStandingCharges(
	productCode: string,
	tariffCode: string,
): Promise<number> {
	const url = `${OCTOPUS_API_BASE}/products/${productCode}/electricity-tariffs/${tariffCode}/standing-charges/`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch standing charges for ${tariffCode}: ${response.status} ${response.statusText}`,
		);
	}

	const data: unknown = await response.json();
	const parsed = RateListResponseSchema.parse(data);

	// Find the latest direct debit standing charge
	const directDebit = parsed.results.find((r) => r.payment_method === 'DIRECT_DEBIT');
	const latest = directDebit ?? parsed.results[0];

	if (!latest) {
		throw new Error(`No standing charges found for ${tariffCode}`);
	}

	return latest.value_inc_vat;
}

function classifyProduct(
	product: OctopusProduct,
): { type: TariffType; offPeakHours?: string } | null {
	for (const target of TARGET_PRODUCTS) {
		if (target.namePattern.test(product.display_name)) {
			return { type: target.type, offPeakHours: target.offPeakHours };
		}
	}
	return null;
}

function buildTariffCode(productCode: string, gspGroupId: string): string {
	return `E-1R-${productCode}-${gspGroupId}`;
}

function extractMultiRateInfo(
	rates: OctopusRate[],
	tariffType: TariffType,
): { hasMultipleRates: boolean; offPeakRate?: number; peakRate?: number } {
	if (tariffType === 'standard') {
		return { hasMultipleRates: false };
	}

	if (tariffType === 'agile') {
		return { hasMultipleRates: true };
	}

	// For Go, Intelligent Go, and Cosy: find distinct rate values
	const uniqueRates = [...new Set(rates.map((r) => r.value_inc_vat))].sort((a, b) => a - b);

	if (uniqueRates.length <= 1) {
		return { hasMultipleRates: false };
	}

	return {
		hasMultipleRates: true,
		offPeakRate: uniqueRates[0],
		peakRate: uniqueRates[uniqueRates.length - 1],
	};
}

export async function fetchTariffsForRegion(region: UkRegion): Promise<TariffInfo[]> {
	const gspGroupId = getGspGroupId(region);

	const products = await fetchAvailableProducts();
	const tariffs: TariffInfo[] = [];

	for (const product of products) {
		const classification = classifyProduct(product);
		if (!classification) continue;

		const tariffCode = buildTariffCode(product.code, gspGroupId);

		try {
			const [unitRates, standingCharge] = await Promise.all([
				fetchUnitRates(product.code, tariffCode, { page_size: 48 }),
				fetchStandingCharges(product.code, tariffCode),
			]);

			const rateInfo = extractMultiRateInfo(unitRates, classification.type);

			tariffs.push({
				productCode: product.code,
				name: product.display_name,
				description: product.description,
				type: classification.type,
				isGreen: product.is_green,
				unitRates,
				standingChargePence: standingCharge,
				hasMultipleRates: rateInfo.hasMultipleRates,
				offPeakRate: rateInfo.offPeakRate,
				peakRate: rateInfo.peakRate,
				offPeakHours: classification.offPeakHours,
			});

			logger.info('tariff.fetched', {
				product: product.code,
				tariffCode,
				region,
				rateCount: unitRates.length,
			});
		} catch (err) {
			logger.warn('tariff.skipProduct', {
				product: product.code,
				tariffCode,
				region,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	return tariffs;
}
