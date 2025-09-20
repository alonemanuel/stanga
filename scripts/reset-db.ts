import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🗑️  Resetting database...');
  
  // Create connection
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client);

  try {
    // Drop all tables in reverse dependency order
    console.log('🧹 Dropping all tables...');
    
    await client`DROP TABLE IF EXISTS activity_log CASCADE`;
    await client`DROP TABLE IF EXISTS penalty_kicks CASCADE`;
    await client`DROP TABLE IF EXISTS penalty_shootouts CASCADE`;
    await client`DROP TABLE IF EXISTS game_events CASCADE`;
    await client`DROP TABLE IF EXISTS games CASCADE`;
    await client`DROP TABLE IF EXISTS team_assignments CASCADE`;
    await client`DROP TABLE IF EXISTS teams CASCADE`;
    await client`DROP TABLE IF EXISTS matchdays CASCADE`;
    await client`DROP TABLE IF EXISTS players CASCADE`;
    await client`DROP TABLE IF EXISTS users CASCADE`;
    
    console.log('✅ All tables dropped successfully');

  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Reset script failed:', error);
  process.exit(1);
});
