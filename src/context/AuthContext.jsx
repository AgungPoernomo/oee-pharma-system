import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cek apakah user sudah login sebelumnya (disimpan di LocalStorage browser)
  useEffect(() => {
    const savedUser = localStorage.getItem("oee_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("oee_user", JSON.stringify(userData)); // Simpan agar tidak logout saat refresh
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("oee_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);