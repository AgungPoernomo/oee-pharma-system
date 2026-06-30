import db from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { action, user } = req.body;
  const rawLine = user?.line || user?.plant || "4";
  const lineNum = rawLine.match(/\d+/) ? rawLine.match(/\d+/)[0] : "4";

  try {
    if (action === 'get_today_reject_c') {
      const [rows] = await db.query(`SELECT * FROM oee_line${lineNum}_zonec ORDER BY id DESC LIMIT 1000`);
      return res.status(200).json({ status: 'success', data: rows });
    }
    else if (action === 'get_today_downtime_c') {
      const [rows] = await db.query(`SELECT * FROM downtime_line${lineNum}_zonec ORDER BY id DESC LIMIT 1000`);
      return res.status(200).json({ status: 'success', data: rows });
    }
    else if (action === 'get_today_reject_f') {
      const [rows] = await db.query(`SELECT * FROM oee_line${lineNum}_zonef ORDER BY id DESC LIMIT 1000`);
      return res.status(200).json({ status: 'success', data: rows });
    }
    else if (action === 'get_today_downtime_f') {
      const [rows] = await db.query(`SELECT * FROM downtime_line${lineNum}_zonef ORDER BY id DESC LIMIT 1000`);
      return res.status(200).json({ status: 'success', data: rows });
    }
    
    return res.status(400).json({ status: 'error', message: 'Action not mapped' });
  } catch (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}