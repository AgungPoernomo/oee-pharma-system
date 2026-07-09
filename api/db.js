import mysql from 'mysql2/promise';
import 'dotenv/config';

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: Number(process.env.TIDB_PORT) || 4000,
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
      },
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      dateStrings: true
    });
  }
  return pool;
}

const db = {
  async query(sql, params) {
    let currentPool = getPool();
    try {
      return await currentPool.query(sql, params);
    } catch (err) {
      if (
        err.code === 'PROTOCOL_CONNECTION_LOST' ||
        err.code === 'ECONNRESET' ||
        err.code === 'EPIPE' ||
        err.message?.includes('closed state') ||
        err.message?.includes('connection is in closed state')
      ) {
        console.warn('[Database] Connection severed/closed. Reconnecting pool...');
        try { await currentPool.end(); } catch (e) { void e; }
        pool = null;
        currentPool = getPool();
        return await currentPool.query(sql, params);
      }
      throw err;
    }
  },
  async getConnection() {
    let currentPool = getPool();
    try {
      return await currentPool.getConnection();
    } catch (err) {
      if (
        err.code === 'PROTOCOL_CONNECTION_LOST' ||
        err.code === 'ECONNRESET' ||
        err.code === 'EPIPE' ||
        err.message?.includes('closed state') ||
        err.message?.includes('connection is in closed state')
      ) {
        console.warn('[Database] Connection severed on getConnection. Reconnecting...');
        try { await currentPool.end(); } catch (e) { void e; }
        pool = null;
        currentPool = getPool();
        return await currentPool.getConnection();
      }
      throw err;
    }
  }
};

export default db;