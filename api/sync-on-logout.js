import db from './db.js';

async function sendToGAS(url, payload) {
  if (!url) return;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) break;
    } catch (err) {
      console.error(`[Backup Log Out GAS Attempt ${attempt} Gagal]`, err.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { user } = req.body;
  if (!user) {
    return res.status(400).json({ status: 'error', message: 'User data required' });
  }

  const rawLine = user?.line || user?.plant || "4";
  const lineNum = rawLine.match(/\d+/) ? rawLine.match(/\d+/)[0] : "4";
  const gasUrl = process.env.GAS_URL;

  if (!gasUrl) {
    console.warn("GAS_URL belum terpasang di .env, skip sync-on-logout");
    return res.status(200).json({ status: 'skip', message: 'No GAS_URL configured' });
  }

  try {
    const tableConfigs = [
      { tableName: `oee_line${lineNum}_zonec`, action: 'submit_reject_c' },
      { tableName: `oee_line${lineNum}_zonef`, action: 'submit_reject_f' },
      { tableName: `downtime_line${lineNum}_zonec`, action: 'submit_downtime_c' },
      { tableName: `downtime_line${lineNum}_zonef`, action: 'submit_downtime_f' }
    ];

    let totalSynced = 0;

    for (const config of tableConfigs) {
      try {
        // Ambil data yang dikerjakan pada hari ini atau shift terakhir (24 jam terakhir)
        const [rows] = await db.query(
          `SELECT * FROM ${config.tableName} WHERE tanggal >= SUBDATE(CURDATE(), 1) ORDER BY id ASC`
        );

        for (const rowData of rows) {
          const gasUser = { ...user, line: lineNum };
          await sendToGAS(gasUrl, {
            action: config.action,
            data: rowData,
            user: gasUser,
            tableName: config.tableName
          });
          totalSynced++;
        }
      } catch (tableErr) {
        // Jika tabel belum ada atau kosong, abaikan dan lanjut ke tabel berikutnya
        console.warn(`[Sync Log Out] Skip table ${config.tableName}:`, tableErr.message);
      }
    }

    console.log(`✅ [Sync On Logout] Berhasil menyinkronkan ${totalSynced} baris dari TiDB ke Google Spreadsheet (Line ${lineNum})`);
    return res.status(200).json({ status: 'success', synced: totalSynced });
  } catch (error) {
    console.error('Sync On Logout Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
