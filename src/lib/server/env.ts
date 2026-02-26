import { z } from 'zod';

const envSchema = z
	.object({
		DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
		PUBLIC_CLERK_PUBLISHABLE_KEY: z
			.string()
			.min(1, 'PUBLIC_CLERK_PUBLISHABLE_KEY is required')
			.startsWith('pk_', 'PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_'),
		CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
		CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required'),
		RESEND_API_KEY: z.string().optional(),
		EMAIL_FROM: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.RESEND_API_KEY && !data.EMAIL_FROM) return false;
			if (!data.RESEND_API_KEY && data.EMAIL_FROM) return false;
			return true;
		},
		{ message: 'RESEND_API_KEY and EMAIL_FROM must both be set or both be unset' },
	);

function validateEnv() {
	const result = envSchema.safeParse(process.env);
	if (!result.success) {
		const formatted = result.error.issues
			.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
			.join('\n');
		throw new Error(`Missing or invalid environment variables:\n${formatted}`);
	}
	return result.data;
}

export const env = validateEnv();
