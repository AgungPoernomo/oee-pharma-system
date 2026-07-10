import db from '../api/db.js';

async function markAllSynced() {
  console.log("=== Mula Menyetel Semua Data TiDB Menjadi synced_to_gas = 1 ===");
  const lines = [1, 2, 3, 4];
  const zones = ['c', 'f'];
  const types = ['oee', 'downtime'];

  let totalUpdated = 0;

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
              console.log(`[ALTER] Kolom synced_to_gas ditambahkan pada ${tableName}`);
            }
          } catch (colErr) { void colErr; }

          // 2. Set semua baris menjadi synced_to_gas = 1
          const [result] = await db.query(`UPDATE ${tableName} SET synced_to_gas = 1 WHERE synced_to_gas IS NULL OR synced_to_gas = 0 OR synced_to_gas != 1`);
          console.log(`✅ [UPDATE ${tableName}] Berhasil menyetel ${result.affectedRows} baris menjadi synced_to_gas = 1`);
          totalUpdated += result.affectedRows;
        } catch (err) {
          console.warn(`[WARN] Tabel ${tableName} dilewati atau error:`, err.code, err.message, err);
        }
      }
    }
  }

  console.log(`\n🎉 SELESAI! Total ${totalUpdated} baris data dari seluruh line (1-4) telah disetel menjadi synced_to_gas = 1.`);
  process.exit(0);
}

markAllSynced().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
