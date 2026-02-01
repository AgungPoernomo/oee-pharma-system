import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { Menu, Hexagon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Judul Header Mobile Otomatis berdasarkan URL
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Executive Dashboard';
    if (path.includes('input')) return 'Input Data';
    if (path.includes('kinerja')) return 'Leaderboard';
    if (path.includes('profil')) return 'Akun Saya';
    if (path.includes('analisa')) return 'Analisa OEE';
    if (path.includes('downtime')) return 'Downtime Lab';
    if (path.includes('root')) return 'Root Cause';
    return 'OEE System';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative selection:bg-blue-100 selection:text-blue-900">
      
      {/* 0. BACKGROUND DECORATION (Subtle Mesh Gradient) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[100px] opacity-50 mix-blend-multiply animate-pulse-slow"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[100px] opacity-50 mix-blend-multiply"></div>
      </div>

      {/* 1. SIDEBAR */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* 2. AREA KONTEN */}
      <div className="flex-1 flex flex-col h-screen w-full relative z-10 transition-all duration-300">
        
        {/* --- MOBILE HEADER (Glassmorphism) --- */}
        <header className="lg:hidden bg-slate-900/85 backdrop-blur-xl text-white p-4 flex items-center justify-between shadow-xl shadow-slate-200/50 border-b border-white/5 z-30 sticky top-0 shrink-0">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2.5 -ml-2 text-slate-300 hover:text-white active:bg-white/10 rounded-xl transition-all active:scale-95"
              >
                 <Menu size={24} strokeWidth={2.5} />
              </button>
              <div className="flex flex-col">
                 <span className="font-bold text-lg leading-none tracking-tight flex items-center gap-2">
                    {getPageTitle()}
                 </span>
                 <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                 </span>
              </div>
           </div>
           
           {/* Logo Kecil di Kanan */}
           <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Hexagon size={20} className="text-white fill-white/20"/>
           </div>
        </header>

        {/* --- MAIN CONTENT (With Page Transition) --- */}
        {/* PENTING: Padding di HP (p-4) vs Desktop (p-8) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar w-full max-w-[100vw]">
           
           {/* Wrapper Konten */}
           <div className="mx-auto max-w-7xl h-full flex flex-col">
              
              {/* Animasi Transisi Halaman */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex-1"
                >
                   <Outlet />
                </motion.div>
              </AnimatePresence>

           </div>
           
           {/* Spacer Bawah */}
           <div className="h-24 lg:h-10"></div>
        </main>

      </div>
    </div>
  );
};

export default Layout;