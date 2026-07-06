// Antrean backup GAS: menyimpan data terbaru per (tableName + '_' + original_id)
const gasQueue = new Map();

// Timer setiap 1 menit (60000 ms) untuk memproses antrean backup ke Google Spreadsheet
setInterval(async () => {
  if (gasQueue.size === 0 || !process.env.GAS_URL) return;

  console.log(`[GAS Sync Timer] Memproses ${gasQueue.size} antrean backup ke GAS...`);
  const items = Array.from(gasQueue.values());
  gasQueue.clear(); // Bersihkan antrean untuk 1 menit berikutnya

  for (const item of items) {
    try {
      await fetch(process.env.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      // Beri jeda 1 detik antar request agar Google Apps Script tidak mengalami Lock Contention / Collision
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`[Backup GAS Gagal]`, err.message);
    }
  }
  console.log(`[GAS Sync Timer] Selesai memproses antrean backup.`);
}, 60000);

/**
 * Menambahkan data ke dalam antrean backup GAS (dieksekusi setiap 1 menit).
 * Data dengan tabel & ID yang sama akan ditimpa dengan status paling baru (deduplikasi otomatis).
 */
export function queueGasBackup(payload) {
  if (!process.env.GAS_URL) return;
  const { tableName, data } = payload;
  const key = `${tableName}_${data.original_id || Date.now()}`;
  gasQueue.set(key, payload);
}
