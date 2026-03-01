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
