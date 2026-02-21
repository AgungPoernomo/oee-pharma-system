import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { 
  ClipboardList, LogOut, X, Hexagon, CalendarDays 
} from 'lucide-react';
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
    if (window.confirm("Akhiri Sesi Kerja Tablet?")) {
      logout();
      navigate('/login');
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // --- MENU FOKUS: HANYA INPUT HUB ---
  const menus = [
    { 
      path: '/foreman/tactical-input', 
      name: 'INPUT HUB', 
      icon: <ClipboardList />, 
      desc: 'Pusat Input Data OEE & Downtime',
      highlight: 'text-blue-400'
    }
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/90 z-40 lg:hidden backdrop-blur-md" />
        )}
      </AnimatePresence>

      <aside className="fixed top-0 left-0 z-50 h-screen w-[280px] bg-[#0B1120] border-r border-white/5 shadow-2xl flex flex-col font-sans lg:static">
        {/* HEADER */}
        <div className="relative z-10 px-6 pt-8 pb-4">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                 <Hexagon className="text-white fill-white/10" size={24} strokeWidth={2.5}/>
              </div>
              <div>
                 <h1 className="text-xl font-black text-white tracking-tight leading-none">TACTICAL</h1>
                 <p className="text-[10px] font-bold text-blue-500 tracking-[0.2em] uppercase mt-1">Production Mode</p>
              </div>
              <button onClick={onClose} className="lg:hidden ml-auto text-slate-400 hover:text-white"><X size={28}/></button>
           </div>

           <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
              <div>
                 <p className="text-3xl font-black text-white tracking-tighter leading-none">{formattedTime}</p>
                 <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                    <CalendarDays size={12}/>
                    <p className="text-[10px] font-bold uppercase tracking-wider">Shift Active</p>
                 </div>
              </div>
           </div>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 px-4 py-6 space-y-3 overflow-y-auto relative z-10">
          <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Main Task</p>
          {menus.map((item, index) => (
            <NavLink key={index} to={item.path} onClick={() => onClose && onClose()} 
              className={({ isActive }) => `group relative flex items-center gap-4 px-4 py-6 rounded-2xl transition-all duration-200 border-2 ${isActive ? 'bg-slate-800 border-blue-500 shadow-lg' : 'bg-[#131b2e] border-transparent hover:bg-slate-800 hover:border-slate-700'}`}
            >
              <div className={`p-3 rounded-xl bg-slate-900 ${item.highlight} group-hover:text-white transition-colors`}>
                {React.cloneElement(item.icon, { size: 28, strokeWidth: 2.5 })}
              </div>
              <div>
                  <span className="block text-lg font-black tracking-wide text-white">{item.name}</span>
                  <span className="text-[10px] font-medium text-slate-500">{item.desc}</span>
              </div>
            </NavLink>
          ))}
        </div>

        {/* FOOTER */}
        <div className="p-4 relative z-10 border-t border-white/5 bg-[#0B1120]">
           <button onClick={handleLogout} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
              <LogOut size={20}/> LOGOUT
           </button>
           <div className="mt-4 flex justify-center flex-col items-center">
              <span className="text-[10px] text-slate-600 font-mono">Logged in as:</span>
              <span className="text-xs text-slate-400 font-bold">{user?.nama}</span>
           </div>
        </div>
      </aside>
    </>
  );
};

export default SidebarForeman;