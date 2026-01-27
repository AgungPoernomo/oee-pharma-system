import { API_BASE_URL } from '../config';

// Fungsi umum untuk mengirim data ke Apps Script
const sendRequest = async (payload) => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "Gagal terhubung ke server." };
  }
};

export const loginUser = async (id_karyawan, password) => {
  return await sendRequest({
    action: "login",
    data: { id_karyawan, password }
  });
};

export const registerUser = async (formData) => {
  return await sendRequest({
    action: "register",
    data: formData
  });
};

export const verifyUser = async (id_karyawan, code) => {
  return await sendRequest({
    action: "verify",
    data: { id_karyawan, code }
  });
};

export const fetchValidationData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}?action=get_validation_data`);
    return await response.json();
  } catch (error) {
    console.error("Gagal ambil data validasi", error);
    return { status: "error", data: {} };
  }
};

export const submitOEEData = async (formData, userData) => {
  return await sendRequest({
    action: "submit_oee",
    data: formData,
    user: userData
  });
};

// --- FUNGSI TAMBAHAN UNTUK MENCEGAH ERROR DASHBOARD ---
export const fetchProductionData = async () => {
  // Kita buat placeholder dulu agar aplikasi tidak blank
  // Nanti kita update ini untuk menarik data real dari DB_OEE
  return []; 
};

// Ambil Statistik Kinerja Foreman (Trader Mode)
export const fetchForemanStats = async (userData) => {
  return await sendRequest({
    action: "get_foreman_stats",
    user: userData
  });
};

// Ambil Data Downtime Manager
export const fetchManagerDowntime = async (filterData) => {
  return await sendRequest({
    action: "get_manager_downtime",
    data: filterData
  });
};

export const fetchManagerOEE = async (filterData) => {
  return await sendRequest({
    action: "get_manager_oee",
    data: filterData
  });
};

export const fetchTeamStats = async (filterData) => {
  return await sendRequest({ action: "get_team_stats", data: filterData });
};

export const fetchRootCauseStats = async (filterData) => {
  return await sendRequest({ action: "get_root_cause_stats", data: filterData });
};

export const updatePassword = async (id, oldPassword, newPassword) => {
  return await sendRequest({ 
    action: "update_password", 
    data: { id, oldPassword, newPassword } 
  });
};