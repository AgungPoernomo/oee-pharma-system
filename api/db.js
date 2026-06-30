// api/db.js
const mysql = require('mysql2/promise');

// Jika berjalan di lokal, kita gunakan dotenv untuk membaca file .env
// Vercel akan secara otomatis mengabaikan ini di production dan menggunakan Environment Variables dari dashboard
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Membuat Connection Pool
// Menggunakan pool sangat penting untuk Vercel Serverless agar koneksi tidak menumpuk dan bocor
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: process.env.TIDB_PORT || 4000,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 3, // Diset kecil agar efisien untuk fungsi Serverless yang mati-nyala otomatis
  maxIdle: 3, 
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

module.exports = pool;