const db = require('./db');
const axios = require('axios');

// Pemetaan ID Google Spreadsheet per Line (Sebagai tujuan Backup)
const SPREADSHEET_MAP = {
  "1": "1KeEqD_Ve9BF6EvYCytlmHZhkNqL3kt972PxE-QorW5I",
  "2": "1xMvhAOaz3hzL04Dtw5Yzb-g_6tONUe8bBBUJczbRtyY",
  "3": "1UBgfQ61HI1deuonG_d_t5gsXlB9hEI2qpCPo266DKYE",
  "4": "11UwXe-3hIxWYY3FcZDmyPbSItsltlVT1hadyIzd4yZg"
};

export default async function handler(req, res) {
  // Hanya menerima metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { data, user, action } = req.body;
  
  // Deteksi nomor Line dari user untuk menentukan target tabel TiDB dan GAS
  const rawLine = user?.line || user?.plant || "4";
  const lineNum = rawLine.match(/\d+/) ? rawLine.match(/\d+/)[0] : "4";

  try {
    let insertId = data.original_id; // Jika null/kosong, berarti ini data baru

    // ==========================================
    // 1. LOGIKA OEE ZONE C
    // ==========================================
    if (action === 'submit_reject_c' || action === 'update_reject_c') {
      const tableName = `oee_line${lineNum}_zonec`;
      
      // Hapus properti original_id dan is_closing agar tidak ikut masuk ke SET query TiDB
      const dbPayload = { ...data };
      delete dbPayload.original_id;
      delete dbPayload.is_closing;

      if (!insertId) {
        // Eksekusi INSERT dinamis
        const [result] = await db.query(`INSERT INTO ${tableName} SET ?`, [dbPayload]);
        insertId = result.insertId;
      } else {
        // Eksekusi UPDATE dinamis
        await db.query(`UPDATE ${tableName} SET ? WHERE id = ?`, [dbPayload, insertId]);
      }
    } 
    // ==========================================
    // 2. LOGIKA DOWNTIME ZONE C
    // ==========================================
    else if (action === 'submit_downtime_c' || action === 'update_downtime_c') {
      const tableName = `downtime_line${lineNum}_zonec`;
      
      const dbPayload = { ...data };
      delete dbPayload.original_id;

      if (!insertId) {
        const [result] = await db.query(`INSERT INTO ${tableName} SET ?`, [dbPayload]);
        insertId = result.insertId;
      } else {
        await db.query(`UPDATE ${tableName} SET ? WHERE id = ?`, [dbPayload, insertId]);
      }
    }

    // ==========================================
    // 3. BACKUP KE GOOGLE APPS SCRIPT (ASYNC)
    // ==========================================
    // Sisipkan kembali original_id yang sudah diperbarui agar dicatat oleh GAS
    const backupData = { ...data, original_id: insertId };

    // Proses ini berjalan di belakang layar, frontend tidak perlu menunggu respons GAS yang lambat
    axios.post(process.env.GAS_URL, {
      action: action,
      data: backupData,
      user: user
    }).catch(err => console.error(`[Backup GAS Line ${lineNum} Gagal]`, err.message));

    // ==========================================
    // 4. RESPON KILAT KE FRONTEND
    // ==========================================
    return res.status(200).json({ 
      status: 'success', 
      message: 'Tersimpan otomatis ke TiDB',
      original_id: insertId 
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}