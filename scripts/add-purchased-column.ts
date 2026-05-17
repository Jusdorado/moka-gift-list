import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cargar variables de entorno desde .env.local
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not load .env.local file');
  }
}

async function addPurchasedColumn() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  const sql = neon(databaseUrl);

  try {
    // Check if column exists
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'purchased'
    `;
    
    if (columns.length === 0) {
      console.log('➕ Adding purchased column...');
      await sql`ALTER TABLE products ADD COLUMN purchased BOOLEAN DEFAULT FALSE`;
      console.log('✅ Column added successfully');
    } else {
      console.log('ℹ️  Column already exists');
    }

    // Also add created_at if missing
    const createdAtColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'created_at'
    `;
    
    if (createdAtColumns.length === 0) {
      console.log('➕ Adding created_at column...');
      await sql`ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
      console.log('✅ created_at column added');
    }

    console.log('🎉 Migration complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addPurchasedColumn();
