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
