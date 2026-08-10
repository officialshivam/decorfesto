import mysql from 'mysql2/promise';
import { mysqlConfig } from '../config.js';

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(mysqlConfig);
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function pingMySql() {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    return { ok: true };
  } finally {
    connection.release();
  }
}
