import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureFeedbackTable, insertFeedback, getFeedback } from '$lib/server/db';
import { logger } from '$lib/server/logger';

let tableReady = false;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		const { rating } = body;
		if (!rating || (rating !== 'thumbs_up' && rating !== 'thumbs_down')) {
			throw error(400, 'Invalid rating: must be "thumbs_up" or "thumbs_down"');
		}

		// Sanitise text fields
		const sanitise = (val: unknown): string | undefined => {
			if (typeof val !== 'string') return undefined;
			return val.trim().slice(0, 1000) || undefined;
		};

		const feedbackData = {
			rating: rating as 'thumbs_up' | 'thumbs_down',
			comment: sanitise(body.comment),
			suggestion: sanitise(body.suggestion),
			current_provider: sanitise(body.current_provider),
			would_share: typeof body.would_share === 'boolean' ? body.would_share : undefined,
			email: sanitise(body.email),
			wizard_selections:
				body.wizard_selections && typeof body.wizard_selections === 'object'
					? body.wizard_selections
					: undefined,
			best_tariff: sanitise(body.best_tariff),
			annual_cost:
				typeof body.annual_cost === 'number' && isFinite(body.annual_cost)
					? body.annual_cost
					: undefined,
		};

		if (!tableReady) {
			await ensureFeedbackTable();
			tableReady = true;
		}

		await insertFeedback(feedbackData);

		logger.info('feedback.submitted', { rating: feedbackData.rating });

		return json({ success: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('feedback.error', {
			error: err instanceof Error ? err.message : String(err),
		});

		return json({ success: false, error: 'Failed to save feedback' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		// Check authorization header
		const authHeader = request.headers.get('authorization');
		const expectedToken = process.env.FEEDBACK_API_TOKEN;

		if (!expectedToken) {
			logger.error('feedback.noTokenConfigured');
			throw error(500, 'Server configuration error');
		}

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw error(401, 'Unauthorized: Missing or invalid authorization header');
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix
		if (token !== expectedToken) {
			throw error(401, 'Unauthorized: Invalid token');
		}

		// Parse query parameters
		const limitParam = url.searchParams.get('limit');
		const offsetParam = url.searchParams.get('offset');
		const ratingParam = url.searchParams.get('rating');
		const sinceParam = url.searchParams.get('since');

		const limit = limitParam ? parseInt(limitParam, 10) : undefined;
		const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

		// Validate parameters
		if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 1000)) {
			throw error(400, 'Invalid limit: must be between 1 and 1000');
		}

		if (offset !== undefined && (isNaN(offset) || offset < 0)) {
			throw error(400, 'Invalid offset: must be >= 0');
		}

		if (ratingParam && ratingParam !== 'thumbs_up' && ratingParam !== 'thumbs_down') {
			throw error(400, 'Invalid rating: must be "thumbs_up" or "thumbs_down"');
		}

		// Validate since parameter (ISO date format)
		if (sinceParam && isNaN(Date.parse(sinceParam))) {
			throw error(400, 'Invalid since: must be a valid ISO date string');
		}

		if (!tableReady) {
			await ensureFeedbackTable();
			tableReady = true;
		}

		const result = await getFeedback({
			limit,
			offset,
			rating: ratingParam as 'thumbs_up' | 'thumbs_down' | undefined,
			since: sinceParam || undefined,
		});

		logger.info('feedback.retrieved', { count: result.feedback.length, total: result.total });

		return json(result);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('feedback.getError', {
			error: err instanceof Error ? err.message : String(err),
		});

		return json({ error: 'Failed to retrieve feedback' }, { status: 500 });
	}
};
