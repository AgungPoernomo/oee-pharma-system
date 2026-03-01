import { API_BASE_URL } from '../config';

// =================================================================
// 1. HELPER FUNCTIONS (Jantung Koneksi)
// =================================================================

// Helper: Ambil user dari parameter atau LocalStorage (Jaring Pengaman)
const getCurrentUser = (explicitUser) => {
  if (explicitUser) return explicitUser;
  
  const stored = localStorage.getItem("oee_user");
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { return null; }
  }
  return { nama: "Unknown", zone: "-", plant: "-", line: "2" }; // Default fallback
};

// Helper: Kirim Request ke Google Apps Script
const sendRequest = async (payload) => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      // --- ANTI CORS PREFLIGHT ---
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "Gagal terhubung ke server (Network Error)." };
  }
};

// =================================================================
// 2. AUTHENTICATION MODULE
// =================================================================

export const loginUser = async (data) => {
  return await sendRequest({ action: "login", data: data });
};

export const registerUser = async (formData) => {
  return await sendRequest({ action: "register", data: formData });
};

export const verifyUser = async (id_karyawan, code) => {
  return await sendRequest({ action: "verify", data: { id_karyawan, code } });
};

export const updatePassword = async (id, oldPassword, newPassword) => {
  return await sendRequest({ action: "update_password", data: { id, oldPassword, newPassword } });
};

// =================================================================
// 3. MASTER DATA MODULE
// =================================================================

export const fetchValidationData = async () => {
  return await sendRequest({ action: "get_validation_data" });
};

// =================================================================
// 4. SUBMIT DATA MODULE (TRANSACTIONAL & EDIT)
// =================================================================

export const submitOEEData = async (payload, explicitUser = null) => {
  const userData = getCurrentUser(explicitUser);

  // Payload action dinamis (bisa submit_baru atau update_data)
  const realAction = payload.action || "submit_oee";
  const realData = payload.data ? payload.data : payload;

  return await sendRequest({
    action: realAction,
    data: realData,
    user: userData // PENTING: Backend butuh ini untuk Routing Line 1-4
  });
};

// =================================================================
// 5. MONITORING MODULE (TABEL HARIAN)
// =================================================================

export const fetchTodayRejectC = async (user = null) => {
  return await sendRequest({ 
    action: "get_today_reject_c", 
    user: getCurrentUser(user) 
  });
};

export const fetchTodayRejectF = async (user = null) => {
  return await sendRequest({ 
    action: "get_today_reject_f",
    user: getCurrentUser(user) 
  });
};

export const fetchTodayDowntimeC = async (user = null) => {
  return await sendRequest({ 
    action: "get_today_downtime_c",
    user: getCurrentUser(user) 
  });
};

export const fetchTodayDowntimeF = async (user = null) => {
  return await sendRequest({ 
    action: "get_today_downtime_f",
    user: getCurrentUser(user) 
  });
};

export const getPendingApprovals = async () => {
  return await sendRequest({ action: 'get_pending_approvals' });
};

export const approveUserRequest = async (id_karyawan) => {
  return await sendRequest({ 
    action: 'approve_user', 
    data: { id_karyawan: id_karyawan } 
  });
};

export const checkApprovalStatus = async (id_karyawan) => {
  return await sendRequest({ 
    action: 'check_approval_status', 
    data: { id_karyawan: id_karyawan } 
  });
};

// =================================================================
// 7. ONESHEET DASHBOARD MODULE
// =================================================================

export const fetchOnesheetData = async (tanggal, explicitUser = null) => {
  const userData = getCurrentUser(explicitUser);
  return await sendRequest({ 
    action: "get_onesheet_data", 
    data: { tanggal: tanggal },
    user: userData // Penting agar Apps Script tahu harus buka Database Line 1,2,3 atau 4
  });
};