import db from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { action, user } = req.body;
  const rawLine = user?.line || user?.plant || "4";
  const lineNum = rawLine.match(/\d+/) ? rawLine.match(/\d+/)[0] : "4";

  try {
    // [BUG-04 FIX] Batasi query 90 hari terakhir untuk mencegah OOM dan lambat saat database makin besar
    if (action === 'get_today_reject_c') {
      const [rows] = await db.query(`SELECT * FROM oee_line${lineNum}_zonec WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) ORDER BY id DESC`);
      return res.status(200).json({ status: 'success', data: rows });
    }
    else if (action === 'get_today_downtime_c') {
      const [rows] = await db.query(`SELECT * FROM downtime_line${lineNum}_zonec WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) ORDER BY id DESC`);
      return res.status(200).json({ status: 'success', data: rows });
    }
    else if (action === 'get_today_reject_f') {
      const [rows] = await db.query(`SELECT * FROM oee_line${lineNum}_zonef WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) ORDER BY id DESC`);
      return res.status(200).json({ status: 'success', data: rows });
    }
    else if (action === 'get_today_downtime_f') {
      const [rows] = await db.query(`SELECT * FROM downtime_line${lineNum}_zonef WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) ORDER BY id DESC`);
      return res.status(200).json({ status: 'success', data: rows });
    }
    else if (action === 'get_onesheet_data') {
      const tanggal = req.body.data?.tanggal;
      if (!tanggal) return res.status(400).json({ status: 'error', message: 'Tanggal is required' });

      const q1 = db.query(`SELECT * FROM oee_line${lineNum}_zonec WHERE tanggal = ? ORDER BY id ASC`, [tanggal]);
      const q2 = db.query(`SELECT * FROM downtime_line${lineNum}_zonec WHERE tanggal = ? ORDER BY id ASC`, [tanggal]);
      const q3 = db.query(`SELECT * FROM oee_line${lineNum}_zonef WHERE tanggal = ? ORDER BY id ASC`, [tanggal]);
      const q4 = db.query(`SELECT * FROM downtime_line${lineNum}_zonef WHERE tanggal = ? ORDER BY id ASC`, [tanggal]);

      const [resC, resDC, resF, resDF] = await Promise.all([q1, q2, q3, q4]);

      return res.status(200).json({ 
        status: 'success', 
        data: {
          reject_c: resC[0],
          downtime_c: resDC[0],
          reject_f: resF[0],
          downtime_f: resDF[0]
        }
      });
    }
    
    return res.status(400).json({ status: 'error', message: 'Action not mapped' });
  } catch (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}