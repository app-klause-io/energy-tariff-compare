import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error('DATABASE_URL environment variable is required');
}

// Use max 1 connection in serverless (Vercel)
// Render's PgBouncer handles pooling on the DB side
const client = postgres(connectionString, { max: 1 });

export const db = drizzle(client, { schema });
