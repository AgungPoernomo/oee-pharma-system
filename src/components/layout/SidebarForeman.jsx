import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { ClipboardList, LogOut, X, Hexagon, CalendarDays, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarForeman = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Akhiri Sesi Kerja?")) {
      logout();
      // Navigasi langsung ke access portal (menghindari redirect ganda)
      navigate('/access-portal', { replace: true }); 
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // --- MENU NAVIGATION ---
  const menus = [
    { 
        path: '/foreman/tactical-input', 
        name: 'INPUT HUB', 
        icon: <ClipboardList />, 
        desc: 'Pusat Laporan OEE & DT', 
        highlight: 'text-blue-400' 
    },
    { 
        path: '/foreman/onesheet', 
        name: 'DAILY ONESHEET', 
        icon: <LayoutDashboard />, 
        desc: 'Executive Summary Report', 
        highlight: 'text-purple-400' 
    }
  ];

  return (
    <>
      {/* Overlay Hitam saat Sidebar Terbuka di HP */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm" 
          />
        )}
      </AnimatePresence>

      {/* Sidebar Utama */}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-[280px] bg-[#0f172a] border-r border-white/5 shadow-2xl flex flex-col font-sans transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         
         {/* HEADER SIDEBAR */}
         <div className="relative z-10 px-6 pt-8 pb-4">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                      <Hexagon className="text-white fill-white/10" size={20} strokeWidth={2.5}/>
                   </div>
                   <div>
                      <h1 className="text-lg font-black text-white tracking-tight leading-none">OEE PRO</h1>
                      <p className="text-[9px] font-bold text-blue-400 tracking-[0.2em] uppercase mt-1">Foreman Mode</p>
                   </div>
               </div>
               {/* Tombol Silang (X) hanya muncul di HP */}
               <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white bg-white/5 p-1.5 rounded-lg active:scale-95 transition-all">
                   <X size={20}/>
               </button>
            </div>

            <div className="bg-[#1e293b]/80 border border-white/5 rounded-2xl p-4 flex flex-col shadow-inner">
               <p className="text-2xl font-black text-white tracking-tighter leading-none">{formattedTime}</p>
               <div className="flex items-center gap-1.5 mt-2 text-slate-400">
                  <CalendarDays size={12}/>
                  <p className="text-[9px] font-bold uppercase tracking-wider">Shift Active</p>
               </div>
            </div>
         </div>

         {/* NAVIGATION SIDEBAR */}
         <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
           <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Main Task</p>
           {menus.map((item, index) => (
             <NavLink key={index} to={item.path} onClick={() => onClose && onClose()} 
               className={({ isActive }) => `group relative flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-200 border ${isActive ? 'bg-slate-800/80 border-blue-500/50 shadow-lg' : 'bg-transparent border-transparent hover:bg-slate-800/50'}`}
             >
               <div className={`p-2.5 rounded-xl bg-slate-900/80 ${item.highlight} group-hover:text-white transition-colors border border-white/5`}>
                 {React.cloneElement(item.icon, { size: 22, strokeWidth: 2 })}
               </div>
               <div>
                   <span className="block text-sm font-bold tracking-wide text-white">{item.name}</span>
                   <span className="text-[9px] font-medium text-slate-500">{item.desc}</span>
               </div>
             </NavLink>
           ))}
         </div>

         {/* FOOTER SIDEBAR */}
         <div className="p-5 border-t border-white/5 bg-[#0B1120]">
            <div className="mb-4 flex flex-col items-center p-3 bg-[#1e293b]/50 rounded-xl border border-white/5">
               <span className="text-[9px] text-slate-500 font-mono mb-1 uppercase tracking-wider">Logged in as</span>
               <span className="text-xs text-white font-bold text-center">{user?.nama || 'Foreman'}</span>
            </div>
            <button onClick={handleLogout} className="w-full py-3.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-95 transition-all border border-red-500/50">
               <LogOut size={16}/> LOGOUT APLIKASI
            </button>
         </div>
      </aside>
    </>
  );
};

export default SidebarForeman;