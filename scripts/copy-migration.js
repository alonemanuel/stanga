const fs = require('fs');
const path = require('path');

// Read the migration SQL file
const migrationPath = path.join(__dirname, '../drizzle/0000_normal_vampiro.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('='.repeat(80));
console.log('📋 COPY THIS SQL TO YOUR SUPABASE SQL EDITOR:');
console.log('='.repeat(80));
console.log(sql);
console.log('='.repeat(80));
console.log('✅ After running this SQL in Supabase, the database will be ready!');
console.log('🔗 Go to: https://supabase.com/dashboard/project/iybyjgiuqvcczlzbhvwq/sql/new');
console.log('='.repeat(80));
