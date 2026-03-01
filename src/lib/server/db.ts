import { neon } from '@neondatabase/serverless';
import { logger } from './logger';

function getDbUrl(): string {
	const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
	if (!url) {
		throw new Error('POSTGRES_URL or DATABASE_URL environment variable is not set');
	}
	return url;
}

export async function ensureFeedbackTable(): Promise<void> {
	const sql = neon(getDbUrl());
	await sql`
		CREATE TABLE IF NOT EXISTS feedback (
			id SERIAL PRIMARY KEY,
			rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
			comment TEXT,
			suggestion TEXT,
			current_provider TEXT,
			would_share BOOLEAN,
			email TEXT,
			wizard_selections JSONB,
			best_tariff TEXT,
			annual_cost NUMERIC,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`;
	logger.info('feedback.tableEnsured');
}

export interface FeedbackRow {
	rating: 'thumbs_up' | 'thumbs_down';
	comment?: string;
	suggestion?: string;
	current_provider?: string;
	would_share?: boolean;
	email?: string;
	wizard_selections?: Record<string, unknown>;
	best_tariff?: string;
	annual_cost?: number;
}

export async function insertFeedback(data: FeedbackRow): Promise<void> {
	const sql = neon(getDbUrl());
	await sql`
		INSERT INTO feedback (
			rating, comment, suggestion, current_provider,
			would_share, email, wizard_selections, best_tariff, annual_cost
		) VALUES (
			${data.rating},
			${data.comment ?? null},
			${data.suggestion ?? null},
			${data.current_provider ?? null},
			${data.would_share ?? null},
			${data.email ?? null},
			${JSON.stringify(data.wizard_selections ?? null)},
			${data.best_tariff ?? null},
			${data.annual_cost ?? null}
		)
	`;
}

export interface FeedbackQueryOptions {
	limit?: number;
	offset?: number;
	rating?: 'thumbs_up' | 'thumbs_down';
	since?: string;
}

export interface FeedbackRecord extends FeedbackRow {
	id: number;
	created_at: Date;
}

export async function getFeedback(
	options: FeedbackQueryOptions = {},
): Promise<{ feedback: FeedbackRecord[]; total: number }> {
	const sql = neon(getDbUrl());
	const { limit = 50, offset = 0, rating, since } = options;

	// Build WHERE clause conditions
	const conditions: string[] = [];
	const params: unknown[] = [];

	if (rating) {
		conditions.push(`rating = $${params.length + 1}`);
		params.push(rating);
	}

	if (since) {
		conditions.push(`created_at >= $${params.length + 1}`);
		params.push(since);
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	// Get total count
	const countQuery = `SELECT COUNT(*) as count FROM feedback ${whereClause}`;
	const countResult = await sql.unsafe(countQuery, params);
	const total = Number(countResult[0]?.count ?? 0);

	// Get feedback entries
	const dataQuery = `
		SELECT id, rating, comment, suggestion, current_provider,
		       would_share, email, wizard_selections, best_tariff,
		       annual_cost, created_at
		FROM feedback
		${whereClause}
		ORDER BY created_at DESC
		LIMIT $${params.length + 1} OFFSET $${params.length + 2}
	`;

	const feedback = await sql.unsafe(dataQuery, [...params, limit, offset]);

	return { feedback: feedback as FeedbackRecord[], total };
}

// --- Tariff storage ---

export async function ensureTariffsTable(): Promise<void> {
	const sql = neon(getDbUrl());
	await sql`
		CREATE TABLE IF NOT EXISTS tariffs (
			id SERIAL PRIMARY KEY,
			provider TEXT NOT NULL,
			tariff_code TEXT,
			tariff_name TEXT NOT NULL,
			region TEXT,
			fuel_type TEXT DEFAULT 'electricity',
			payment_method TEXT,
			unit_rate_p NUMERIC,
			standing_charge_p NUMERIC,
			day_rate_p NUMERIC,
			night_rate_p NUMERIC,
			peak_rate_p NUMERIC,
			offpeak_rate_p NUMERIC,
			rate_data JSONB,
			valid_from TIMESTAMP,
			valid_to TIMESTAMP,
			source TEXT,
			fetched_at TIMESTAMP DEFAULT NOW(),
			created_at TIMESTAMP DEFAULT NOW()
		)
	`;
	await sql`
		CREATE INDEX IF NOT EXISTS idx_tariffs_provider_region ON tariffs(provider, region)
	`;
	await sql`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'tariffs_upsert_key'
			) THEN
				ALTER TABLE tariffs ADD CONSTRAINT tariffs_upsert_key
					UNIQUE (provider, tariff_code, region, fuel_type);
			END IF;
		END
		$$
	`;
	logger.info('tariffs.tableEnsured');
}

export interface TariffRow {
	provider: string;
	tariff_code?: string;
	tariff_name: string;
	region?: string;
	fuel_type?: string;
	payment_method?: string;
	unit_rate_p?: number;
	standing_charge_p?: number;
	day_rate_p?: number;
	night_rate_p?: number;
	peak_rate_p?: number;
	offpeak_rate_p?: number;
	rate_data?: Record<string, unknown>;
	valid_from?: string;
	valid_to?: string;
	source?: string;
}

export interface TariffRecord extends TariffRow {
	id: number;
	fetched_at: Date;
	created_at: Date;
}

export async function upsertTariff(data: TariffRow): Promise<void> {
	const sql = neon(getDbUrl());
	await sql`
		INSERT INTO tariffs (
			provider, tariff_code, tariff_name, region, fuel_type,
			payment_method, unit_rate_p, standing_charge_p, day_rate_p,
			night_rate_p, peak_rate_p, offpeak_rate_p, rate_data,
			valid_from, valid_to, source, fetched_at
		) VALUES (
			${data.provider},
			${data.tariff_code ?? null},
			${data.tariff_name},
			${data.region ?? null},
			${data.fuel_type ?? 'electricity'},
			${data.payment_method ?? null},
			${data.unit_rate_p ?? null},
			${data.standing_charge_p ?? null},
			${data.day_rate_p ?? null},
			${data.night_rate_p ?? null},
			${data.peak_rate_p ?? null},
			${data.offpeak_rate_p ?? null},
			${JSON.stringify(data.rate_data ?? null)},
			${data.valid_from ?? null},
			${data.valid_to ?? null},
			${data.source ?? null},
			NOW()
		)
		ON CONFLICT ON CONSTRAINT tariffs_upsert_key
		DO UPDATE SET
			tariff_name = EXCLUDED.tariff_name,
			fuel_type = EXCLUDED.fuel_type,
			payment_method = EXCLUDED.payment_method,
			unit_rate_p = EXCLUDED.unit_rate_p,
			standing_charge_p = EXCLUDED.standing_charge_p,
			day_rate_p = EXCLUDED.day_rate_p,
			night_rate_p = EXCLUDED.night_rate_p,
			peak_rate_p = EXCLUDED.peak_rate_p,
			offpeak_rate_p = EXCLUDED.offpeak_rate_p,
			rate_data = EXCLUDED.rate_data,
			valid_from = EXCLUDED.valid_from,
			valid_to = EXCLUDED.valid_to,
			source = EXCLUDED.source,
			fetched_at = NOW()
	`;
}

export async function upsertTariffs(rows: TariffRow[]): Promise<number> {
	let count = 0;
	for (const row of rows) {
		await upsertTariff(row);
		count++;
	}
	return count;
}

export interface TariffQueryOptions {
	provider?: string;
	region?: string;
	fuel_type?: string;
	limit?: number;
	offset?: number;
}

export async function getTariffs(
	options: TariffQueryOptions = {},
): Promise<{ tariffs: TariffRecord[]; total: number }> {
	const sql = neon(getDbUrl());
	const { limit = 100, offset = 0, provider, region, fuel_type } = options;

	const conditions: string[] = [];
	const params: unknown[] = [];

	if (provider) {
		conditions.push(`provider = $${params.length + 1}`);
		params.push(provider);
	}

	if (region) {
		conditions.push(`region = $${params.length + 1}`);
		params.push(region);
	}

	if (fuel_type) {
		conditions.push(`fuel_type = $${params.length + 1}`);
		params.push(fuel_type);
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const countQuery = `SELECT COUNT(*) as count FROM tariffs ${whereClause}`;
	const countResult = await sql.unsafe(countQuery, params);
	const total = Number(countResult[0]?.count ?? 0);

	const dataQuery = `
		SELECT id, provider, tariff_code, tariff_name, region, fuel_type,
		       payment_method, unit_rate_p, standing_charge_p, day_rate_p,
		       night_rate_p, peak_rate_p, offpeak_rate_p, rate_data,
		       valid_from, valid_to, source, fetched_at, created_at
		FROM tariffs
		${whereClause}
		ORDER BY provider, region, tariff_name
		LIMIT $${params.length + 1} OFFSET $${params.length + 2}
	`;

	const tariffs = (await sql.unsafe(dataQuery, [...params, limit, offset])) as TariffRecord[];

	return { tariffs, total };
}
