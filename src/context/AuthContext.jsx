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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("oee_user");
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