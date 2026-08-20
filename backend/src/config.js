import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const backendRoot = path.resolve(__dirname, '..');
export const projectRoot = path.resolve(backendRoot, '..');

/*
 * Load .env files so secrets (DB password) never live in source code.
 * Candidates, in priority order:
 *   - backend/.env            (local dev: backend/.env)
 *   - <projectRoot>/.env      (deployment / CI)
 * The file is already git-ignored (.gitignore has .env / .env.* / !.env.example).
 */
const envCandidates = [
  path.join(backendRoot, '.env'),
  path.join(projectRoot, '.env'),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
  }
}

export const dataDirectory = process.env.DECORFESTO_DATA_DIR || path.join(backendRoot, '.data');
export const tablePrefix = process.env.DECORFESTO_TABLE_PREFIX || 'decorfesto-dev';
export const useAws = process.env.DECORFESTO_USE_AWS === 'true';
export const localPort = Number(process.env.DECORFESTO_PORT || 4100);

// --- MySQL configuration --------------------------------------------------
export const useMysql = process.env.DECORFESTO_USE_MYSQL === 'true';
export const mysqlConfig = {
  host: process.env.DECORFESTO_DB_HOST || 'srv671.hstgr.io',
  port: Number(process.env.DECORFESTO_DB_PORT || 3306),
  database: process.env.DECORFESTO_DB_NAME || 'u572400884_decorfesto',
  user: process.env.DECORFESTO_DB_USER || 'u572400884_decor_admin',
  password: process.env.DECORFESTO_DB_PASSWORD || '',
  connectionLimit: Number(process.env.DECORFESTO_DB_POOL_LIMIT || 10),
};

export const storageBackend = useAws ? 'aws-dynamodb' : useMysql ? 'mysql' : 'json';

export async function ensureDataDirectory() {
  if (useMysql || useAws) {
    return;
  }
  await fsPromises.mkdir(dataDirectory, { recursive: true });
}

export function tableName(name) {
  return `${tablePrefix}-${name}`;
}

// --- Server-side Authentication & Session Security -----------------------
export const authSecret = process.env.DECORFESTO_AUTH_SECRET || 'server-side-decorfesto-session-secret-key-2026';
export const adminUsername = process.env.DECORFESTO_ADMIN_USERNAME || 'admin';
export const adminPasswordSalt = process.env.DECORFESTO_ADMIN_SALT || 'decorfesto-salt-2026';
export const adminPasswordHash =
  process.env.DECORFESTO_ADMIN_PASSWORD_HASH ||
  'fb5f7c4ab886e7abb83dc2acb2196814a18cc93abc3f58228478678c9fb6e9bffd28d20d0510169a540100bd26709fe462655c80f6ee35103fe64473743e1915';

// --- Razorpay Test Mode Credentials --------------------------------------
export const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TS3odldZqJkQQa';
export const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'decorfesto_test_secret_key';
export const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'decorfesto_webhook_secret';

// --- CORS Security Configuration -----------------------------------------
export const allowedOrigins = new Set([
  'https://decorfesto.com',
  'https://www.decorfesto.com',
  'http://localhost:5173',
  'http://localhost:4100',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4100',
]);

export function getCorsOrigin(reqHeaders = {}) {
  const origin = reqHeaders.origin || reqHeaders.Origin;
  if (origin && allowedOrigins.has(origin)) {
    return origin;
  }
  return process.env.DECORFESTO_ALLOWED_ORIGIN || 'https://decorfesto.com';
}

export function getCorsHeaders(reqHeaders = {}) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(reqHeaders),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-User-Role,X-Admin-Key,X-Customer-Id',
  };
}
