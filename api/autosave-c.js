import db from './db.js';

// [BUG-05 FIX] Cache dengan TTL 5 menit agar perubahan skema tabel (ALTER TABLE) langsung terdeteksi
const CACHE_TTL_MS = 5 * 60 * 1000;
const columnCache = {}; // { tableName: { cols: Set, ts: number } }
async function getValidColumns(tableName) {
  const now = Date.now();
  if (columnCache[tableName] && (now - columnCache[tableName].ts) < CACHE_TTL_MS) {
    return columnCache[tableName].cols;
  }
  try {
    let [colRows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
    let cols = colRows.map(c => c.Field);
    if (!cols.includes('synced_to_gas')) {
      try {
        await db.query(`ALTER TABLE ${tableName} ADD COLUMN synced_to_gas TINYINT(1) DEFAULT 0`);
        cols.push('synced_to_gas');
      } catch (alterErr) {
        console.warn(`[Database] ADD COLUMN synced_to_gas info on ${tableName}:`, alterErr.message);
      }
    }
    columnCache[tableName] = { cols: new Set(cols), ts: now };
  } catch (e) {
    console.error(`Gagal SHOW COLUMNS untuk ${tableName}:`, e.message);
    return null;
  }
  return columnCache[tableName].cols;
}

function cleanItem(item, validCols) {
  const cleaned = {};
  Object.keys(item || {}).forEach(key => {
    if (key === 'id' || key === 'original_id' || key === 'is_closing' || key === 'rowId' || key === 'draftId' || key === 'synced_to_gas') return;
    if (!validCols || validCols.has(key)) {
      let val = item[key];
      if (val === '' || val === undefined || val === null) {
        val = null;
      } else if (key === 'tanggal' && typeof val === 'string' && val.includes('T')) {
        val = val.split('T')[0];
      } else if (key === 'tanggal' && typeof val === 'object' && val.toISOString) {
        val = val.toISOString().split('T')[0];
      }
      cleaned[key] = val;
    }
  });
  return cleaned;
}

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
      console.error(`[Backup GAS Attempt ${attempt} Gagal - ${payload.action}]`, err.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { action, data, user } = req.body;
  const rawLine = user?.line || user?.plant || "4";
  const lineNum = rawLine.match(/\d+/) ? rawLine.match(/\d+/)[0] : "4";

  let tableName = action.includes('reject') ? `oee_line${lineNum}_zonec` : `downtime_line${lineNum}_zonec`;

  try {
    if (action.startsWith('delete_')) {
      const items = Array.isArray(data) ? data : [data];
      let deletedCount = 0;
      const deletedIds = [];
      for (const item of items) {
        let delId = item?.original_id !== undefined ? item.original_id : (item?.id !== undefined ? item.id : item);
        if (delId && delId !== 'saved' && !isNaN(Number(delId))) {
          await db.query(`DELETE FROM ${tableName} WHERE id = ?`, [Number(delId)]);
          deletedCount++;
          deletedIds.push(Number(delId));
        }
      }

      // [OPSI 1 SCHEDULED BACKUP]: sendToGAS dinonaktifkan pada saat Cell Blur operasional.
      // Pengiriman data ke GAS dilakukan saat Log Out (via endpoint /api/sync-on-logout).

      return res.status(200).json({ status: 'success', deleted: deletedCount, ids: deletedIds });
    } else if (
      action.startsWith('submit_') || action.startsWith('update_')
    ) {
      const items = Array.isArray(data) ? data : [data];
      const validCols = await getValidColumns(tableName);
      const insertedIds = [];

      for (const item of items) {
        let currentId = item?.original_id !== undefined ? item.original_id : item?.id;
        if (currentId === 'saved' || !currentId || isNaN(Number(currentId))) {
          currentId = null;
        }

        const dbPayload = cleanItem(item, validCols);

        if (!dbPayload.no_batch && !dbPayload.tanggal && !dbPayload.shift) {
          continue;
        }

        if (!currentId) {
          dbPayload.synced_to_gas = 0;
          const [result] = await db.query(`INSERT INTO ${tableName} SET ?`, [dbPayload]);
          insertedIds.push(result.insertId);
        } else {
          dbPayload.synced_to_gas = 0;
          await db.query(`UPDATE ${tableName} SET ? WHERE id = ?`, [dbPayload, Number(currentId)]);
          insertedIds.push(Number(currentId));
        }
      }

      const firstId = insertedIds.length > 0 ? insertedIds[0] : null;

      // [OPSI 1 SCHEDULED BACKUP]: sendToGAS dinonaktifkan pada saat Cell Blur operasional.
      // Pengiriman data ke GAS dilakukan saat Log Out (via endpoint /api/sync-on-logout).

      return res.status(200).json({ status: 'success', original_id: firstId, ids: insertedIds });
    }

    return res.status(400).json({ status: 'error', message: 'Action not mapped in autosave-c' });
  } catch (error) {
    console.error('Autosave C Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}