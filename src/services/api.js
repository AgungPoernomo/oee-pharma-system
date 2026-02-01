import { API_BASE_URL } from '../config';

// Fungsi umum untuk mengirim data ke Apps Script
const sendRequest = async (payload) => {
  try {
    // CCTV: Melihat data apa yang dikirim ke Google
    console.log("📡 SENDING:", payload);

    const response = await fetch(API_BASE_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    // CCTV: Melihat balasan dari Google
    console.log("📥 RECEIVED:", result);

    return result;
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "Gagal terhubung ke server." };
  }
};

export const loginUser = async (data) => {
  return await sendRequest({
    action: "login",
    data: data 
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

// [PERBAIKAN PENTING DI SINI]
// Otomatis ambil user dari LocalStorage jika tidak dikirim dari halaman
export const submitOEEData = async (formData, explicitUser = null) => {
  let userData = explicitUser;

  // Jika user tidak dikirim manual, ambil dari memori browser
  if (!userData) {
    const stored = localStorage.getItem("oee_user");
    if (stored) {
      userData = JSON.parse(stored);
    } else {
      userData = { nama: "Unknown", zone: "-", plant: "-" };
    }
  }

  return await sendRequest({
    action: "submit_oee",
    data: formData,
    user: userData // Kirim data user (nama, zone, plant) ke backend
  });
};

// --- FUNGSI TAMBAHAN UNTUK MENCEGAH ERROR DASHBOARD ---
export const fetchProductionData = async () => {
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