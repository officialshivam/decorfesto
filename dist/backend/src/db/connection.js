import mysql from 'mysql2/promise';
import { mysqlConfig, useMysql } from '../config.js';

let pool = null;

export function getDbPool() {
  if (!useMysql) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      database: mysqlConfig.database,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      waitForConnections: true,
      connectionLimit: mysqlConfig.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }

  return pool;
}

export async function query(sql, params = []) {
  const activePool = getDbPool();
  if (!activePool) {
    throw new Error('MySQL is not enabled in backend configuration.');
  }

  const [rows] = await activePool.execute(sql, params);
  return rows;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
