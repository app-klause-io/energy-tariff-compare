import { error } from '@sveltejs/kit';
import { logger } from './logger';

export function validateBearerToken(request: Request): void {
	const expectedToken = process.env.FEEDBACK_API_TOKEN;
	const cronSecret = process.env.CRON_SECRET;

	if (!expectedToken && !cronSecret) {
		logger.error('auth.noTokenConfigured');
		throw error(500, 'Server configuration error');
	}

	const authHeader = request.headers.get('authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw error(401, 'Unauthorized: Missing or invalid authorization header');
	}

	const token = authHeader.substring(7);

	// Accept either the FEEDBACK_API_TOKEN (for manual calls) or CRON_SECRET (for Vercel Cron)
	const isValidToken = (expectedToken && token === expectedToken) || (cronSecret && token === cronSecret);

	if (!isValidToken) {
		throw error(401, 'Unauthorized: Invalid token');
	}
}
