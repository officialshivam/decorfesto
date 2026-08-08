import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const backendRoot = path.resolve(__dirname, '..');
export const dataDirectory = process.env.DECORFESTO_DATA_DIR || path.join(backendRoot, '.data');
export const tablePrefix = process.env.DECORFESTO_TABLE_PREFIX || 'decorfesto-dev';
export const useAws = process.env.DECORFESTO_USE_AWS === 'true';
export const awsRegion = process.env.AWS_REGION || 'ap-south-1';
export const localPort = Number(process.env.DECORFESTO_PORT || 4100);

export async function ensureDataDirectory() {
  await fs.mkdir(dataDirectory, { recursive: true });
}

export function tableName(name) {
  return `${tablePrefix}-${name}`;
}
