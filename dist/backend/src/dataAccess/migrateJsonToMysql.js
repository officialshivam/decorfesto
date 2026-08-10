import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDirectory } from '../config.js';
import { pingMySql, getPool, closePool } from './mysqlConnection.js';
import { MySqlRepository } from './repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, 'schema.sql');

async function backupJsonData() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(path.dirname(dataDirectory), `.data_backup_${timestamp}`);
  await fs.mkdir(backupDir, { recursive: true });

  let files = [];
  try {
    files = await fs.readdir(dataDirectory);
  } catch (err) {
    console.log(`[Backup] Data directory not present or empty (${err.message}). Skipping file copy.`);
    return backupDir;
  }

  let copied = 0;
  for (const file of files) {
    if (file.endsWith('.json')) {
      const src = path.join(dataDirectory, file);
      const dest = path.join(backupDir, file);
      await fs.copyFile(src, dest);
      copied++;
    }
  }

  console.log(`[Backup] Preserved ${copied} JSON source files to ${backupDir}`);
  return backupDir;
}

async function verifyConnection() {
  console.log('[Connection] Testing MySQL connection to Hostinger...');
  const result = await pingMySql();
  if (!result.ok) {
    throw new Error('MySQL ping failed.');
  }
  console.log('[Connection] MySQL connection established successfully.');
}

async function applyAndVerifySchema() {
  console.log('[Schema] Applying schema.sql definitions...');
  const rawSql = await fs.readFile(schemaPath, 'utf8');
  const pool = getPool();

  const cleanSql = rawSql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const statements = cleanSql
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log('[Schema] Verifying tables in database...');
  const expectedTables = [
    'customers',
    'vendors',
    'service_areas',
    'service_area_vendors',
    'decorations',
    'orders',
    'order_items',
    'availability_checks',
  ];

  const [rows] = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
  );

  const existingTables = new Set(rows.map((row) => row.TABLE_NAME || row.table_name));
  const missingTables = expectedTables.filter((table) => !existingTables.has(table));

  if (missingTables.length > 0) {
    throw new Error(`Missing expected MySQL tables: ${missingTables.join(', ')}`);
  }

  console.log('[Schema] All 8 tables verified in MySQL schema.');
}

async function migrateTable(resourceName, jsonFilename) {
  const repo = new MySqlRepository(resourceName);
  const filePath = path.join(dataDirectory, jsonFilename);

  let items = [];
  try {
    const content = await fs.readFile(filePath, 'utf8');
    items = JSON.parse(content);
  } catch {
    // File doesn't exist or is empty
  }

  const result = {
    resourceName,
    tableName: repo.table,
    found: items.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (items.length === 0) {
    return result;
  }

  for (const item of items) {
    try {
      const existing = item.id ? await repo.getById(item.id) : null;
      if (existing) {
        result.skipped++;
        continue;
      }

      await repo.create(item);
      result.inserted++;
    } catch (err) {
      result.failed++;
      result.errors.push({ id: item.id || 'unknown', message: err.message });
    }
  }

  return result;
}

export async function runMigration() {
  console.log('=== DecorFesto Idempotent JSON-to-MySQL Data Migration ===\n');

  // Step 1: Backup
  await backupJsonData();

  // Step 2: Verify Connection
  await verifyConnection();

  // Step 3: Schema Setup & Verification
  await applyAndVerifySchema();

  // Step 4: Foreign-Key Ordered Migration
  console.log('\n[Migration] Migrating JSON data to MySQL tables in foreign-key order...');

  const migrationSequence = [
    { resourceName: 'customers', file: 'decorfesto-dev-customers.json' },
    { resourceName: 'vendors', file: 'decorfesto-dev-vendors.json' },
    { resourceName: 'decorations', file: 'decorfesto-dev-decorations.json' },
    { resourceName: 'service-areas', file: 'decorfesto-dev-service-areas.json' },
    { resourceName: 'service-area-vendors', file: 'decorfesto-dev-service-area-vendors.json' },
    { resourceName: 'orders', file: 'decorfesto-dev-orders.json' },
    { resourceName: 'availability-checks', file: 'decorfesto-dev-availability-checks.json' },
  ];

  const summaries = [];
  for (const step of migrationSequence) {
    const summary = await migrateTable(step.resourceName, step.file);
    summaries.push(summary);
  }

  // Print Structured Migration Summary
  console.log('\n=== Migration Execution Summary ===');
  console.table(
    summaries.map((s) => ({
      Resource: s.resourceName,
      Table: s.tableName,
      Found: s.found,
      Inserted: s.inserted,
      Skipped: s.skipped,
      Failed: s.failed,
    }))
  );

  const totalFailed = summaries.reduce((acc, curr) => acc + curr.failed, 0);
  if (totalFailed > 0) {
    console.warn(`\n[Warning] ${totalFailed} records failed to migrate. Details:`);
    for (const s of summaries) {
      if (s.errors.length > 0) {
        console.warn(`\nTable ${s.tableName} errors:`, s.errors);
      }
    }
  } else {
    console.log('\n[Success] Migration completed with 0 errors.');
  }

  return summaries;
}

// Allow direct CLI execution: node backend/src/dataAccess/migrateJsonToMysql.js
if (process.argv[1] && process.argv[1].endsWith('migrateJsonToMysql.js')) {
  runMigration()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('\n[Migration Error]', err);
      await closePool();
      process.exit(1);
    });
}
