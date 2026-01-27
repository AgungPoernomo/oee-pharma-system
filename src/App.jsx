import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import Components
import Sidebar from "./components/layout/Sidebar";

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InputData from './pages/InputData';
import Kinerja from './pages/Kinerja';         // Kinerja Foreman
import KinerjaTim from './pages/KinerjaTim';   // Kinerja Manager
import Downtime from './pages/Downtime';
import RootCause from './pages/RootCause';
import Analisa from './pages/Analisa';
import Profil from './pages/Profil';

// --- LAYOUT UTAMA (Sidebar + Content) ---
const MainLayout = () => {
  const { user } = useAuth();

  // Jika belum login, tendang ke login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Statis */}
      <Sidebar />
      
      {/* Area Konten Dinamis (Sebelah Kanan Sidebar) */}
      <main className="flex-1 overflow-y-auto p-8 ml-64 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};

const App = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Route Login (Jika sudah login, redirect ke Home) */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

        {/* Route Aplikasi Utama (Harus Login) */}
        <Route element={<MainLayout />}>
          {/* Default Route: Redirect berdasarkan Role */}
          <Route path="/" element={
            user?.jabatan?.toLowerCase().includes('manager') 
              ? <Navigate to="/dashboard" replace /> 
              : <Navigate to="/input-data" replace />
          } />

          {/* Halaman Manager */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/downtime" element={<Downtime />} />
          <Route path="/root-cause" element={<RootCause />} />
          <Route path="/analisa" element={<Analisa />} />
          <Route path="/kinerja-tim" element={<KinerjaTim />} />

          {/* Halaman Foreman */}
          <Route path="/input-data" element={<InputData />} />
          <Route path="/kinerja" element={<Kinerja />} />

          {/* Halaman Umum */}
          <Route path="/profil" element={<Profil />} />
        </Route>

        {/* Catch All - Redirect ke Login jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;