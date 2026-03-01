import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureFeedbackTable, insertFeedback } from '$lib/server/db';
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
