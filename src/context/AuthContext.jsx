import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Cek apakah user sudah login sebelumnya (disimpan di LocalStorage browser)
  useEffect(() => {
    const savedUser = localStorage.getItem("oee_user");
    if (savedUser) {
      try {
        // Gunakan try-catch agar jika data foto korup, aplikasi tidak blank
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Gagal memuat data user:", error);
        localStorage.removeItem("oee_user"); // Bersihkan data yang rusak
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("oee_user", JSON.stringify(userData));
  };

  // Kunci cache grid yang harus dibersihkan saat logout agar data tidak tercampur antar user
  const GRID_CACHE_KEYS = [
    'C_DATA_OEE', 'C_DATA_DT', 'C_IDS_OEE', 'C_IDS_DT',
    'F_DATA_OEE', 'F_DATA_DT', 'F_IDS_OEE', 'F_IDS_DT',
    'C_DATA_OEE_L1','C_DATA_DT_L1','C_IDS_OEE_L1','C_IDS_DT_L1',
    'F_DATA_OEE_L1','F_DATA_DT_L1','F_IDS_OEE_L1','F_IDS_DT_L1',
    'C_DATA_OEE_L2','C_DATA_DT_L2','C_IDS_OEE_L2','C_IDS_DT_L2',
    'F_DATA_OEE_L2','F_DATA_DT_L2','F_IDS_OEE_L2','F_IDS_DT_L2',
    'C_DATA_OEE_L3','C_DATA_DT_L3','C_IDS_OEE_L3','C_IDS_DT_L3',
    'F_DATA_OEE_L3','F_DATA_DT_L3','F_IDS_OEE_L3','F_IDS_DT_L3',
    'C_DATA_OEE_L4','C_DATA_DT_L4','C_IDS_OEE_L4','C_IDS_DT_L4',
    'F_DATA_OEE_L4','F_DATA_DT_L4','F_IDS_OEE_L4','F_IDS_DT_L4',
  ];

  const logout = async () => {
    // [OPSI 1 TRIGGER BACKUP LOG OUT]: Kirim data akhir shift dari TiDB ke Google Spreadsheet
    if (user) {
      try {
        await fetch('/api/sync-on-logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user }),
          keepalive: true
        });
      } catch (err) {
        console.error("Sync on logout error:", err);
      }
    }
    setUser(null);
    localStorage.removeItem("oee_user");
    // [BUG-01 FIX] Bersihkan semua cache data grid agar data tidak bocor ke user berikutnya
    GRID_CACHE_KEYS.forEach(k => localStorage.removeItem(k));
    // Gunakan window.location agar state benar-benar bersih
    window.location.href = '/login'; 
  };

  // --- FITUR BARU: Update Data Tanpa Logout (PENTING UNTUK FOTO) ---
  const updateUser = (newUserData) => {
    if (user) {
      // Gabungkan data lama dengan data baru
      const updatedUser = { ...user, ...newUserData };
      
      // Update State
      setUser(updatedUser);
      
      // Update LocalStorage agar foto tetap ada saat di-refresh
      localStorage.setItem("oee_user", JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);