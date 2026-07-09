import db from './db.js';

async function sendToGAS(url, payload, tableName, rowId) {
  if (!url) return;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        if (rowId && tableName) {
          await db.query(`UPDATE ${tableName} SET synced_to_gas = 1 WHERE id = ?`, [rowId]).catch(() => {});
        }
        break;
      }
    } catch (err) {
      console.warn(`[Background GAS Sync Attempt ${attempt} Error]:`, err.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { action, data, user } = body;
  const rawLine = user?.line || user?.plant || "4";
  const lineNum = rawLine.match(/\d+/) ? rawLine.match(/\d+/)[0] : "4";

  let tableName = action.includes('reject') ? `oee_line${lineNum}_zonef` : `downtime_line${lineNum}_zonef`;

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
          sendToGAS(process.env.GAS_URL, { action, data: { ...dbPayload, id: result.insertId }, user: { ...user, line: lineNum }, tableName }, tableName, result.insertId).catch(err => void err);
        } else {
          dbPayload.synced_to_gas = 0;
          await db.query(`UPDATE ${tableName} SET ? WHERE id = ?`, [dbPayload, Number(currentId)]);
          insertedIds.push(Number(currentId));
          sendToGAS(process.env.GAS_URL, { action, data: { ...dbPayload, id: Number(currentId) }, user: { ...user, line: lineNum }, tableName }, tableName, Number(currentId)).catch(err => void err);
        }
      }

      const firstId = insertedIds.length > 0 ? insertedIds[0] : null;

      return res.status(200).json({ status: 'success', original_id: firstId, ids: insertedIds });
    }

    return res.status(400).json({ status: 'error', message: 'Action not mapped in autosave-f' });
  } catch (error) {
    console.error('API Error Zone F:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}