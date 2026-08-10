import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool, pingMySql } from './mysqlConnection.js';
import { mysqlConfig } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, 'schema.sql');

const REQUIRED_TABLES = [
  'customers',
  'vendors',
  'service_areas',
  'service_area_vendors',
  'decorations',
  'orders',
  'order_items',
  'availability_checks',
];

const EXPECTED_INDEXES = {
  customers: ['PRIMARY', 'idx_customers_email', 'idx_customers_phone'],
  vendors: ['PRIMARY', 'idx_vendors_status'],
  service_areas: ['PRIMARY', 'uq_service_areas_pincode', 'idx_service_areas_serviceable'],
  service_area_vendors: ['PRIMARY', 'uq_service_area_vendor', 'idx_service_area_vendors_pincode', 'idx_service_area_vendors_vendor'],
  decorations: ['PRIMARY', 'idx_decorations_active', 'idx_decorations_category'],
  orders: ['PRIMARY', 'idx_orders_customer', 'idx_orders_vendor', 'idx_orders_status', 'idx_orders_pincode', 'idx_orders_created'],
  order_items: ['PRIMARY', 'idx_order_items_order'],
  availability_checks: ['PRIMARY', 'idx_checks_pincode', 'idx_checks_checked'],
};

async function inspectSchema(pool) {
  const [tableRows] = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [mysqlConfig.database]
  );
  const existingTables = new Set(tableRows.map((r) => r.TABLE_NAME || r.table_name));

  const [indexRows] = await pool.query(
    `SELECT table_name, index_name FROM information_schema.statistics WHERE table_schema = ?`,
    [mysqlConfig.database]
  );

  const existingIndexes = {};
  for (const row of indexRows) {
    const tableName = row.TABLE_NAME || row.table_name;
    const indexName = row.INDEX_NAME || row.index_name;
    if (!existingIndexes[tableName]) {
      existingIndexes[tableName] = new Set();
    }
    existingIndexes[tableName].add(indexName);
  }

  return { existingTables, existingIndexes };
}

async function runStage2SchemaVerification() {
  console.log('=== Stage 2: MySQL Schema & Index Verification ===\n');

  console.log('[Connection] Testing database ping...');
  const ping = await pingMySql();
  if (!ping.ok) {
    throw new Error('Connection failed.');
  }
  console.log('[Connection] Hostinger MySQL connected successfully.\n');

  const pool = getPool();

  // Inspect Initial State
  console.log('[Inspection] Querying existing tables and indexes in information_schema...');
  const initial = await inspectSchema(pool);

  console.log('\n--- Initial Schema State ---');
  for (const table of REQUIRED_TABLES) {
    const exists = initial.existingTables.has(table);
    const indexes = exists ? Array.from(initial.existingIndexes[table] || []) : [];
    console.log(`Table: ${table} -> ${exists ? 'EXISTS' : 'MISSING'}`);
    if (exists) {
      console.log(`  Indexes found: [${indexes.join(', ')}]`);
    }
  }

  // Apply schema.sql safely (CREATE TABLE IF NOT EXISTS)
  console.log('\n[Schema Application] Applying schema.sql definitions safely...');
  const rawSql = await fs.readFile(schemaPath, 'utf8');
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

  // Inspect Final State
  console.log('\n[Re-Inspection] Verifying post-application schema state...');
  const finalState = await inspectSchema(pool);

  const report = [];
  let allHealthy = true;

  for (const table of REQUIRED_TABLES) {
    const exists = finalState.existingTables.has(table);
    const foundIndexes = finalState.existingIndexes[table] || new Set();
    const expected = EXPECTED_INDEXES[table] || [];

    const missingIndexes = expected.filter((idx) => !foundIndexes.has(idx));
    const tableStatus = exists ? (missingIndexes.length === 0 ? 'READY' : 'INDEXES_MISSING') : 'MISSING';

    if (tableStatus !== 'READY') {
      allHealthy = false;
    }

    report.push({
      Table: table,
      Exists: exists,
      Status: tableStatus,
      FoundIndexes: Array.from(foundIndexes).join(', '),
      MissingIndexes: missingIndexes.length > 0 ? missingIndexes.join(', ') : 'None',
    });
  }

  console.log('\n=== Stage 2 Verification Report ===');
  console.table(report);

  if (allHealthy) {
    console.log('\n[Stage 2 SUCCESS] All 8 tables and required indexes exist and are fully verified in Hostinger MySQL.');
  } else {
    console.warn('\n[Stage 2 WARNING] Some tables or indexes require attention.');
  }
}

runStage2SchemaVerification()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n[Stage 2 ERROR]', err.message);
    await closePool();
    process.exit(1);
  });
