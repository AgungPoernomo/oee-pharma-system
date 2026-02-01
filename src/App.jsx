import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Menu, Hexagon } from 'lucide-react'; // Tambah Ikon Menu

// Import Components
import Sidebar from "./components/layout/Sidebar";

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InputData from './pages/InputData';
import Kinerja from './pages/Kinerja';         
import KinerjaTim from './pages/KinerjaTim';   
import Downtime from './pages/Downtime';
import RootCause from './pages/RootCause';
import Analisa from './pages/Analisa';
import Profil from './pages/Profil';

// --- LAYOUT TERPROTEKSI (SATPAM + RESPONSIVE) ---
const ProtectedLayout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false); // State untuk Mobile Menu

  // 1. CEK SECURITY
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. RENDER LAYOUT RESPONSIVE
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* A. SIDEBAR (Dinamis via Props) */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      {/* B. AREA KONTEN UTAMA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        
        {/* HEADER MOBILE (Hanya Muncul di HP) */}
        <header className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-30 shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                 <Hexagon size={20} className="text-white"/>
              </div>
              <span className="font-bold text-lg tracking-tight">OEE System</span>
           </div>
           {/* Tombol Buka Sidebar */}
           <button 
             onClick={() => setSidebarOpen(true)} 
             className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
           >
              <Menu size={28} />
           </button>
        </header>

        {/* MAIN CONTENT SCROLLABLE */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

const App = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* --- ROUTE PUBLIC (LOGIN) --- */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <Login />} 
        />

        {/* --- ROUTE RAHASIA (HARUS LOGIN) --- */}
        <Route element={<ProtectedLayout />}>
          
          {/* SMART ROUTING */}
          <Route path="/" element={
            user?.jabatan?.toLowerCase().includes('manager') || user?.jabatan?.toLowerCase().includes('admin')
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

        {/* --- CATCH ALL (404) --- */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;