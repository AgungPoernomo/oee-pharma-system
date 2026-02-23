import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { 
  Activity, Database, Terminal, ShieldCheck, 
  Server, Lock, LogOut, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarAdmin = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    if (window.confirm("TERMINATE SESSION?")) { logout(); navigate('/login'); }
  };

  const menuGroups = [
    {
      title: "SYSTEM CORE",
      items: [
        { path: '/admin/system-health', name: 'System Health', icon: <Activity /> },
        { path: '/admin/master-data', name: 'Master Data Gene', icon: <Database /> },
      ]
    },
    {
      title: "SECURITY & LOGS",
      items: [
         { path: '/admin/server-logs', name: 'Server Logs', icon: <Terminal /> },
         { path: '/admin/access-control', name: 'Access Control', icon: <ShieldCheck /> },
      ]
    }
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
           <div onClick={onClose} className="fixed inset-0 bg-black/90 z-40 lg:hidden" />
        )}
      </AnimatePresence>

      <aside className="fixed top-0 left-0 z-50 h-screen w-[280px] flex flex-col font-mono lg:static bg-black border-r border-slate-800">
        {/* HEADER */}
        <div className="px-6 pt-8 pb-4 bg-slate-900 border-b border-slate-800">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-800 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                 <Terminal size={20}/>
              </div>
              <div>
                 <h1 className="text-lg font-bold text-white tracking-widest">ROOT_ACCESS</h1>
                 <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">System Architect</p>
              </div>
              <button onClick={onClose} className="lg:hidden ml-auto text-slate-500"><X size={24}/></button>
           </div>
           <div className="bg-black p-2 border border-slate-800 text-center">
              <p className="text-xl font-bold text-emerald-500">{currentTime.toLocaleTimeString('id-ID', {hour12: false})}</p>
              <p className="text-[9px] text-slate-500 uppercase">Server Time</p>
           </div>
        </div>

        {/* MENU */}
        <div className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <p className="px-2 text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">
                  [{group.title}]
              </p>
              <div className="space-y-1">
                {group.items.map((item, i) => (
                  <NavLink key={i} to={item.path} onClick={onClose} 
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 border border-transparent transition-none ${isActive ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/50' : 'text-slate-500 hover:text-emerald-500 hover:bg-slate-900'}`}
                  >
                    {React.cloneElement(item.icon, { size: 16, strokeWidth: 2 })}
                    <span className="text-xs font-bold">{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-black border-t border-slate-800">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] text-slate-500 uppercase">Connected: {user?.nama}</span>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 uppercase text-[10px] font-bold flex items-center gap-1">
                 <LogOut size={12}/> Exit
              </button>
           </div>
        </div>
      </aside>
    </>
  );
};

export default SidebarAdmin;