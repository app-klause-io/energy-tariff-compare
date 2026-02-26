import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use empty string fallback so the module can be imported during SvelteKit's
// postbuild analysis (which imports server code but never runs queries).
// At runtime, postgres will fail on first query if DATABASE_URL is missing.
const connectionString = process.env.DATABASE_URL ?? '';

// Use max 1 connection in serverless (Vercel)
// Render's PgBouncer handles pooling on the DB side
const client = postgres(connectionString, { max: 1 });

export const db = drizzle(client, { schema });
