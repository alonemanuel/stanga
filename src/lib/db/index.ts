import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Optimized connection configuration for development
const client = postgres(process.env.DATABASE_URL!, { 
  prepare: false,
  max: 1, // Limit to 1 connection for development
  idle_timeout: 20, // Close idle connections after 20 seconds
  max_lifetime: 60 * 30 // Close connections after 30 minutes
});
export const db = drizzle(client, { schema });

export type Database = typeof db;
