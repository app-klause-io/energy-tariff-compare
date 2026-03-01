import { error } from '@sveltejs/kit';
import { logger } from './logger';

export function validateBearerToken(request: Request): void {
	const expectedToken = process.env.FEEDBACK_API_TOKEN;

	if (!expectedToken) {
		logger.error('auth.noTokenConfigured');
		throw error(500, 'Server configuration error');
	}

	const authHeader = request.headers.get('authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw error(401, 'Unauthorized: Missing or invalid authorization header');
	}

	const token = authHeader.substring(7);
	if (token !== expectedToken) {
		throw error(401, 'Unauthorized: Invalid token');
	}
}
