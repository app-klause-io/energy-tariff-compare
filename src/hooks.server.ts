import type { Handle, HandleServerError } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

const SKIP_PATHS = new Set(['/_app', '/favicon.ico', '/favicon.png', '/favicon.svg']);

function generateRequestId(): string {
	return crypto.randomUUID().slice(0, 8);
}

export const handle: Handle = async ({ event, resolve }) => {
	const { request } = event;
	const url = new URL(request.url);

	if (SKIP_PATHS.has(url.pathname) || url.pathname.startsWith('/_app/')) {
		return resolve(event);
	}

	const requestId = generateRequestId();
	const startTime = performance.now();

	logger.info('request.start', {
		requestId,
		method: request.method,
		path: url.pathname,
		userAgent: request.headers.get('user-agent') ?? undefined,
	});

	const response = await resolve(event);

	const durationMs = Math.round(performance.now() - startTime);

	const level = response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info';

	logger[level]('request.end', {
		requestId,
		status: response.status,
		durationMs,
	});

	return response;
};

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
	const requestId = generateRequestId();

	logger.error('server.unhandledError', {
		requestId,
		status,
		message,
		method: event.request.method,
		path: new URL(event.request.url).pathname,
		error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
	});

	return {
		message: status === 404 ? 'Not found' : 'An unexpected error occurred',
	};
};
