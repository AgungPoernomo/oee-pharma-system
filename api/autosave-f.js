import db from './db.js';

const columnCache = {};
async function getValidColumns(tableName) {
  if (!columnCache[tableName]) {
    try {
      const [colRows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
      columnCache[tableName] = new Set(colRows.map(c => c.Field));
    } catch (e) {
      console.error(`Gagal SHOW COLUMNS untuk ${tableName}:`, e.message);
      return null;
    }
  }
  return columnCache[tableName];
}

function cleanItem(item, validCols) {
  const cleaned = {};
  Object.keys(item || {}).forEach(key => {
    if (key === 'id' || key === 'original_id' || key === 'is_closing' || key === 'rowId' || key === 'draftId') return;
    if (!validCols || validCols.has(key)) {
      let val = item[key];
      if (val === '' || val === undefined || val === null) {
        val = null;
      }
      cleaned[key] = val;
    }
  });
  return cleaned;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { action, data, user } = req.body;
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

      // Backup async ke Google Apps Script untuk Hapus Data
      if (deletedIds.length > 0 && process.env.GAS_URL) {
        const gasUser = { ...(user || {}), line: lineNum };
        for (const delId of deletedIds) {
          fetch(process.env.GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: action,
              data: { original_id: delId, id: delId },
              user: gasUser,
              tableName: tableName
            })
          }).catch(err => console.error(`[Backup GAS Gagal - ${action}]`, err.message));
        }
      }

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
          const [result] = await db.query(`INSERT INTO ${tableName} SET ?`, [dbPayload]);
          insertedIds.push(result.insertId);
        } else {
          await db.query(`UPDATE ${tableName} SET ? WHERE id = ?`, [dbPayload, Number(currentId)]);
          insertedIds.push(Number(currentId));
        }
      }

      const firstId = insertedIds.length > 0 ? insertedIds[0] : null;

      // Backup async ke Google Apps Script
      const gasUser = { ...(user || {}), line: lineNum };
      const backupData = { ...data, original_id: firstId };
      if (process.env.GAS_URL) {
        fetch(process.env.GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: action, data: backupData, user: gasUser, tableName: tableName })
        }).catch(err => console.error(`[Backup GAS Gagal - ${action}]`, err.message));
      }

      return res.status(200).json({ status: 'success', original_id: firstId, ids: insertedIds });
    }

    return res.status(400).json({ status: 'error', message: 'Action not mapped in autosave-f' });
  } catch (error) {
    console.error('API Error Zone F:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}