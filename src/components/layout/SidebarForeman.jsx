import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { ClipboardList, LogOut, X, Hexagon, LayoutDashboard, Settings, User, MapPin, Radio, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarForeman = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // STATE TEMA (Mendengarkan dari ForemanSettings)
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('appTheme') || 'dark') === 'dark');

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark((localStorage.getItem('appTheme') || 'dark') === 'dark');
    };
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Akhiri Sesi Kerja?")) {
      logout();
      navigate('/access-portal', { replace: true });
    }
  };

  // DEFINISI MENU UTAMA
  const menus = [
    { path: '/foreman/tactical-input', name: 'INPUT HUB', icon: <ClipboardList />, desc: 'Pusat Laporan OEE & DT', highlight: 'text-blue-500' },
    { path: '/foreman/onesheet', name: 'DAILY ONESHEET', icon: <LayoutDashboard />, desc: 'Executive Summary Report', highlight: 'text-purple-500' },
    { path: '/foreman/batch-achievement', name: 'BATCH ACHIEVEMENT', icon: <Database />, desc: 'Rekapitulasi OEE & Downtime', highlight: 'text-emerald-500' }
  ];

  // --- THEME CLASSES ---
  const bgSidebar = isDark ? 'bg-[#0B1120] border-white/5' : 'bg-slate-50 border-slate-300';
  const bgHeader = isDark ? 'from-[#0f172a] to-[#0B1120] border-white/5' : 'from-slate-200 to-slate-100 border-slate-300';
  const textMain = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const bgProfileCard = isDark ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-300 shadow-sm';
  const bgAvatar = isDark ? 'bg-slate-900 border-slate-600' : 'bg-slate-100 border-slate-300';
  const bgWidget = isDark ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-300 shadow-sm';

  const menuHover = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-200/60';
  const menuActiveBg = isDark ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-300';
  const iconBg = isDark ? 'bg-slate-900/80 border-white/5' : 'bg-white border-slate-300 shadow-sm';

  const footerBg = isDark ? 'bg-[#0B1120] border-white/5' : 'bg-slate-100 border-slate-300';

  return (
    <>
      <AnimatePresence>
        {/* 1. UBAH z-40 MENJADI z-[90] */}
        {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className={`fixed inset-0 z-[90] lg:hidden backdrop-blur-sm ${isDark ? 'bg-black/80' : 'bg-slate-900/40'}`} />}
      </AnimatePresence>

      {/* 2. UBAH z-50 MENJADI z-[100] */}
      <aside className={`fixed top-0 left-0 z-[100] h-screen w-[280px] shadow-2xl flex flex-col font-sans transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${bgSidebar}`}>

        {/* HEADER SIDEBAR (BRANDING, PROFILE, & WORKSTATION INFO) */}
        <div className={`relative z-10 px-5 pt-8 pb-5 border-b bg-gradient-to-b ${bgHeader}`}>

          {/* 1. BRANDING LOGO */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/20 bg-white">
                {/* Panggil logo dari folder public */}
                <img src="/logo-perusahaan.png" alt="Logo Perusahaan" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <h1 className={`text-lg font-black tracking-tight leading-none ${textMain}`}>OEE PRO</h1>
                <p className="text-[9px] font-bold text-blue-500 tracking-[0.2em] uppercase mt-1">Foreman Mode</p>
              </div>
            </div>
            <button onClick={onClose} className={`lg:hidden p-1.5 rounded-lg active:scale-95 transition-all shrink-0 ${isDark ? 'text-slate-400 hover:text-white bg-white/5' : 'text-slate-500 hover:text-slate-800 bg-slate-200'}`}>
              <X size={18} />
            </button>
          </div>

          {/* 2. USER PROFILE CARD */}
          <div className={`flex items-center gap-3 rounded-xl p-3 mb-3 border ${bgProfileCard}`}>
            <div className={`w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0 ${bgAvatar}`}>
              {user?.foto ? (
                <img src={user.foto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className={isDark ? "text-slate-400" : "text-slate-500"} />
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <h2 className={`text-sm font-black tracking-wide truncate ${textMain}`}>{user?.nama || 'Foreman'}</h2>
              <p className={`text-[10px] font-mono font-bold uppercase mt-0.5 truncate ${textMuted}`}>{user?.id || 'ID: 000000'}</p>
            </div>
          </div>

          {/* 3. WIDGET FUNGIONAL: WORKSTATION & STATUS */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg p-2 flex flex-col justify-center items-center text-center border ${bgWidget}`}>
              <div className="flex items-center gap-1 mb-1">
                <MapPin size={10} className={isDark ? "text-slate-500" : "text-slate-400"} />
                <span className={`text-[8px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-500"}`}>Area Kerja</span>
              </div>
              <span className="text-xs font-black text-blue-500 truncate w-full">{user?.line || 'Line 2'}</span>
            </div>
            <div className={`rounded-lg p-2 flex flex-col justify-center items-center text-center border ${bgWidget}`}>
              <div className="flex items-center gap-1 mb-1">
                <Radio size={10} className={isDark ? "text-slate-500" : "text-slate-400"} />
                <span className={`text-[8px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-500"}`}>Server</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span className="text-xs font-black text-emerald-500">TERHUBUNG</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION SIDEBAR */}
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <p className={`px-2 text-[10px] font-black uppercase tracking-widest mb-3 ${textMuted}`}>Menu Utama</p>

          {/* RENDER MENU UTAMA */}
          {menus.map((item, index) => (
            <NavLink key={index} to={item.path} onClick={() => onClose && onClose()}
              className={({ isActive }) => `group relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 border ${isActive ? menuActiveBg : `bg-transparent border-transparent ${menuHover}`}`}>
              {/* SOLUSI BUG isActive: Menggunakan render props function */}
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-lg transition-colors border ${iconBg} ${isActive ? item.highlight : (isDark ? 'text-slate-400' : 'text-slate-500')} group-hover:${item.highlight}`}>
                    {React.cloneElement(item.icon, { size: 20, strokeWidth: 2.5 })}
                  </div>
                  <div className="flex flex-col">
                    <span className={`block text-xs font-black tracking-widest uppercase transition-colors ${isActive ? item.highlight : (isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900')}`}>{item.name}</span>
                    <span className={`text-[9px] font-medium mt-0.5 ${textMuted}`}>{item.desc}</span>
                  </div>
                </>
              )}
            </NavLink>
          ))}

          {/* TOMBOL MENU PENGATURAN */}
          <div className={`pt-5 mt-5 border-t ${isDark ? 'border-white/5' : 'border-slate-300'}`}>
            <p className={`px-2 text-[10px] font-black uppercase tracking-widest mb-3 ${textMuted}`}>Preferensi</p>
            <NavLink to="/foreman/settings" onClick={() => onClose && onClose()}
              className={({ isActive }) => `group relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 border ${isActive ? (isDark ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300') : `bg-transparent border-transparent ${menuHover}`}`}>
              {/* SOLUSI BUG isActive */}
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-lg transition-colors border ${iconBg} ${isActive ? 'text-emerald-500' : (isDark ? 'text-slate-400' : 'text-slate-500')} group-hover:text-emerald-500`}>
                    <Settings size={20} strokeWidth={2.5} />
                  </div>
                  <div className="text-left flex flex-col">
                    <span className={`block text-xs font-black tracking-widest uppercase transition-colors ${isActive ? 'text-emerald-500' : (isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900')}`}>SETTINGS</span>
                    <span className={`text-[9px] font-medium mt-0.5 ${textMuted}`}>Akun & Bantuan</span>
                  </div>
                </>
              )}
            </NavLink>
          </div>
        </div>

        {/* FOOTER SIDEBAR (LOGOUT ONLY) */}
        <div className={`p-5 border-t ${footerBg}`}>
          <button onClick={handleLogout} className={`w-full py-3.5 rounded-xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 transition-all border shadow-sm ${isDark ? 'bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white border-red-500/30 hover:border-red-500' : 'bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border-red-200 hover:border-red-500'}`}>
            <LogOut size={16} strokeWidth={2.5} /> KELUAR
          </button>
        </div>
      </aside>
    </>
  );
};

export default SidebarForeman;