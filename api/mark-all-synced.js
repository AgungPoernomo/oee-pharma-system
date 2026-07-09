import db from './db.js';

export default async function handler(req, res) {
  try {
    const lines = [1, 2, 3, 4];
    const zones = ['c', 'f'];
    const types = ['oee', 'downtime'];

    let totalUpdated = 0;
    const tableResults = [];

    for (const line of lines) {
      for (const zone of zones) {
        for (const type of types) {
          const tableName = `${type}_line${line}_zone${zone}`;
          try {
            // 1. Pastikan kolom synced_to_gas ada
            try {
              const [colRows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE 'synced_to_gas'`);
              if (colRows.length === 0) {
                await db.query(`ALTER TABLE ${tableName} ADD COLUMN synced_to_gas TINYINT(1) DEFAULT 0`);
              }
            } catch (colErr) { void colErr; }

            // 2. Set semua baris yang ada saat ini menjadi synced_to_gas = 1
            const [result] = await db.query(`UPDATE ${tableName} SET synced_to_gas = 1 WHERE synced_to_gas IS NULL OR synced_to_gas = 0 OR synced_to_gas != 1`);
            totalUpdated += result.affectedRows;
            tableResults.push({ tableName, updatedRows: result.affectedRows, status: 'success' });
          } catch (err) {
            tableResults.push({ tableName, updatedRows: 0, status: 'error', error: err.message });
          }
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Berhasil menyetel total ${totalUpdated} baris data menjadi synced_to_gas = 1 di seluruh tabel Line 1-4.`,
      totalUpdated,
      details: tableResults
    });
  } catch (error) {
    console.error('Mark All Synced Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
