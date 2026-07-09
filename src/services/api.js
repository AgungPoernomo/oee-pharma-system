import { API_BASE_URL } from '../config';
const getCurrentUser = (explicitUser) => {
  if (explicitUser) return explicitUser;
  
  const stored = localStorage.getItem("oee_user");
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { return null; }
  }
  return { nama: "Unknown", zone: "-", plant: "-", line: "2" }; 
};

const sendRequest = async (payload) => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
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

export const fetchValidationData = async () => {
  return await sendRequest({ action: "get_validation_data" });
};

export const submitOEEData = async (payload, explicitUser = null) => {
  const userData = getCurrentUser(explicitUser);

  const realAction = payload.action || "submit_oee";
  const realData = payload.data ? payload.data : payload;

  if (realAction.endsWith('_c') || realAction.includes('_c') || realAction.includes('reject_c') || realAction.includes('downtime_c')) {
    try {
      const res = await fetch('/api/autosave-c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: realAction, data: realData, user: userData })
      });
      return await res.json();
    } catch (err) {
      console.error("Autosave C Error:", err);
      return { status: "error", message: err.message };
    }
  }

  if (realAction.endsWith('_f') || realAction.includes('_f') || realAction.includes('reject_f') || realAction.includes('downtime_f')) {
    try {
      const res = await fetch('/api/autosave-f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: realAction, data: realData, user: userData })
      });
      return await res.json();
    } catch (err) {
      console.error("Autosave F Error:", err);
      return { status: "error", message: err.message };
    }
  }

  return await sendRequest({
    action: realAction,
    data: realData,
    user: userData 
  });
};

// Buka src/services/api.js, ganti bagian ini saja:

async function fetchHelper(actionName, user) {
  try {
    const response = await fetch('/api/fetch-data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionName, user: getCurrentUser(user) })
    });
    const result = await response.json();
    if (!response.ok || result.status === 'error') {
      console.error(`[Fetch API Error (${actionName})]:`, result.message || response.statusText, result);
    }
    return result;
  } catch (err) {
    console.error(`[Fetch Network Error (${actionName})]:`, err.message);
    return { status: "error", message: err.message, data: [] };
  }
}

export const fetchTodayRejectC = async (user = null) => await fetchHelper("get_today_reject_c", user);
export const fetchTodayDowntimeC = async (user = null) => await fetchHelper("get_today_downtime_c", user);
export const fetchTodayRejectF = async (user = null) => await fetchHelper("get_today_reject_f", user);
export const fetchTodayDowntimeF = async (user = null) => await fetchHelper("get_today_downtime_f", user);

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


export const fetchOnesheetData = async (tanggal, explicitUser = null) => {
  const userData = getCurrentUser(explicitUser);
  try {
    const response = await fetch('/api/fetch-data', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: "get_onesheet_data", 
        data: { tanggal: tanggal }, 
        user: userData 
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Fetch Onesheet Error:", error);
    return { status: "error", message: "Gagal terhubung ke server (Network Error)." };
  }
};