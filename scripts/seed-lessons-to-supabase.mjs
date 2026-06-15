import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const JSON_PATH = resolve(ROOT, 'casual_english_10000.json');
const MIGRATION_PATH = resolve(ROOT, 'supabase/migrations/001_create_lessons.sql');
const BATCH_SIZE = 500;

function loadEnvFile() {
  try {
    const content = readFileSync(resolve(ROOT, '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional if vars are already exported
  }
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

function getProjectRef(url) {
  const match = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1];
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = getProjectRef(getSupabaseUrl());
  if (!password || !ref) return null;

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

function toRow(lesson) {
  return {
    id: lesson.id,
    casual: lesson.casual,
    spoken_text: lesson.spokenText,
    breakdowns: lesson.breakdowns ?? [],
  };
}

async function ensureTableExists() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error('Table public.lessons does not exist yet.');
    console.error('Add one of these to .env, then rerun:');
    console.error('  SUPABASE_DB_PASSWORD=your-database-password');
    console.error('  DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres');
    console.error('\nPassword: Supabase Dashboard → Project Settings → Database');
    process.exit(1);
  }

  const sql = readFileSync(MIGRATION_PATH, 'utf8');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Running migration...');
  await client.connect();
  try {
    await client.query(sql);
    console.log('Migration complete.');
  } finally {
    await client.end();
  }
}

async function main() {
  loadEnvFile();

  const url = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env or environment.',
    );
    process.exit(1);
  }

  const lessons = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  if (!Array.isArray(lessons) || lessons.length === 0) {
    throw new Error(`No lessons found in ${JSON_PATH}`);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: probeError } = await supabase.from('lessons').select('id').limit(1);
  if (probeError?.code === 'PGRST205') {
    await ensureTableExists();
  } else if (probeError) {
    throw probeError;
  }

  console.log(`Uploading ${lessons.length} lessons in batches of ${BATCH_SIZE}...`);

  let uploaded = 0;
  for (let i = 0; i < lessons.length; i += BATCH_SIZE) {
    const batch = lessons.slice(i, i + BATCH_SIZE).map(toRow);
    const { error } = await supabase.from('lessons').upsert(batch, { onConflict: 'id' });

    if (error) throw error;

    uploaded += batch.length;
    console.log(`  ${uploaded}/${lessons.length}`);
  }

  const { count, error: countError } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  console.log(`Done. lessons table now has ${count} rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
