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
        try {
          const [colRows] = await db.query(`SHOW COLUMNS FROM ${config.tableName} LIKE 'synced_to_gas'`);
          if (colRows.length === 0) {
            await db.query(`ALTER TABLE ${config.tableName} ADD COLUMN synced_to_gas TINYINT(1) DEFAULT 0`);
          }
        } catch (colErr) { void colErr; }

        // Pilih data shift terakhir yang BELUM tersinkronisasi ke Google Spreadsheet (synced_to_gas IS NULL atau 0)
        let sqlQuery = `SELECT * FROM ${config.tableName} WHERE (synced_to_gas IS NULL OR synced_to_gas = 0) AND tanggal >= SUBDATE(CURDATE(), 1)`;
        const queryParams = [];
        if (user?.shift && String(user.shift).trim() !== "") {
          sqlQuery += ` AND shift = ?`;
          queryParams.push(String(user.shift).trim());
        }
        if (user?.group && String(user.group).trim() !== "") {
          sqlQuery += ` AND \`group\` = ?`;
          queryParams.push(String(user.group).trim());
        }
        sqlQuery += ` ORDER BY id ASC`;

        const [rows] = await db.query(sqlQuery, queryParams);

        for (const rowData of rows) {
          if (rowData.tanggal && typeof rowData.tanggal === 'string' && rowData.tanggal.includes('T')) {
            rowData.tanggal = rowData.tanggal.split('T')[0];
          } else if (rowData.tanggal && typeof rowData.tanggal === 'object' && rowData.tanggal.toISOString) {
            rowData.tanggal = rowData.tanggal.toISOString().split('T')[0];
          }
          const gasUser = { ...user, line: lineNum };
          await sendToGAS(gasUrl, {
            action: config.action,
            data: rowData,
            user: gasUser,
            tableName: config.tableName
          });
          await db.query(`UPDATE ${config.tableName} SET synced_to_gas = 1 WHERE id = ?`, [rowData.id]);
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
