import db from './db.js';
import { queueGasBackup } from './gas-backup-queue.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { data, user, action } = req.body;
  
  const rawLine = user?.line || user?.plant || "4";
  const lineNum = rawLine.match(/\d+/) ? rawLine.match(/\d+/)[0] : "4";

  try {
    let insertId = data?.original_id; 
    let tableName = action.includes('reject') ? `oee_line${lineNum}_zonec` : `downtime_line${lineNum}_zonec`;

    if (action === 'delete_reject_c' || action === 'delete_downtime_c') {
      if (insertId) {
        await db.query(`DELETE FROM ${tableName} WHERE id = ?`, [insertId]);
      }
    } else if (action === 'submit_reject_c' || action === 'update_reject_c' || action === 'submit_downtime_c' || action === 'update_downtime_c') {
      const dbPayload = { ...data };
      delete dbPayload.original_id;
      delete dbPayload.is_closing;

      Object.keys(dbPayload).forEach(key => {
        if (dbPayload[key] === '' || dbPayload[key] === undefined || dbPayload[key] === null) {
          dbPayload[key] = null; 
        }
      });

      if (!dbPayload.no_batch && !dbPayload.tanggal && !dbPayload.shift) {
        return res.status(200).json({ status: 'ignored', message: 'Row is empty' });
      }

      if (!insertId) {
        const [result] = await db.query(`INSERT INTO ${tableName} SET ?`, [dbPayload]);
        insertId = result.insertId;
      } else {
        await db.query(`UPDATE ${tableName} SET ? WHERE id = ?`, [dbPayload, insertId]);
      }
    } 

    const gasUser = { ...(user || {}), line: lineNum };
    const backupData = { ...data, original_id: insertId };
    queueGasBackup({ action: action, data: backupData, user: gasUser, tableName: tableName });

    return res.status(200).json({ status: 'success', original_id: insertId });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}