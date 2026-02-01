import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { 
  LayoutDashboard, TrendingUp, Layers, 
  BarChart2, Users, User, LogOut, 
  Clock, PlusCircle, Hexagon, X, 
  CalendarDays, Zap, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // --- UTILITY STATE ---
  const [currentTime, setCurrentTime] = useState(new Date());
  // [FIX] State untuk mendeteksi apakah layar Desktop
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // URL Foto Dummy
  const defaultPhoto = `https://i.pravatar.cc/150?u=${user?.nama || 'default'}`;
  const [imgSrc, setImgSrc] = useState(user?.foto || defaultPhoto);

  useEffect(() => {
    const foto = (user?.foto && user.foto.length > 50) ? user.foto : defaultPhoto;
    setImgSrc(foto);
  }, [user]);

  // Update Jam setiap detik
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // [FIX] Event Listener untuk resize layar (Agar responsif saat window dikecilkan/besarkan)
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    if (window.confirm("Disconnect from System?")) {
      logout();
      navigate('/login');
    }
  };

  const userJabatan = (user.jabatan || "").toLowerCase();
  const isManager = userJabatan.includes('manager') || userJabatan.includes('asisten') || userJabatan.includes('supervisor') || userJabatan.includes('admin');

  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

  const foremanMenus = [
    { path: '/input-data', name: 'Input Data', icon: <PlusCircle /> },
    { path: '/kinerja', name: 'My Performance', icon: <TrendingUp /> },
    { path: '/profil', name: 'My Profile', icon: <User /> },
  ];

  const managerMenus = [
    { path: '/dashboard', name: 'Command Center', icon: <LayoutDashboard /> },
    { path: '/downtime', name: 'Downtime Forensic', icon: <Clock /> },
    { path: '/root-cause', name: 'Root Cause Matrix', icon: <Layers /> },
    { path: '/analisa', name: 'OEE Analytics', icon: <BarChart2 /> },
    { path: '/kinerja-tim', name: 'Team Leaderboard', icon: <Users /> },
    { path: '/profil', name: 'User Profile', icon: <User /> },
  ];

  const menus = isManager ? managerMenus : foremanMenus;

  // Animation Variants
  const sidebarVariants = {
    open: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: "-100%", opacity: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        // [FIX] LOGIKA ANIMASI: Jika Desktop, PAKSA "open". Jika HP, ikuti state "isOpen"
        animate={isDesktop ? "open" : (isOpen ? "open" : "closed")}
        variants={sidebarVariants}
        className={`
          fixed top-0 left-0 z-50 h-screen w-[280px] 
          bg-[#0B1120] border-r border-white/5 shadow-2xl 
          flex flex-col font-sans lg:static
        `}
      >
        {/* --- BACKGROUND FX --- */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute top-1/2 -right-20 w-40 h-40 bg-purple-600/10 rounded-full blur-[80px]"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
        </div>

        {/* 1. HEADER: BRAND & TIME WIDGET */}
        <div className="relative z-10 px-6 pt-8 pb-4">
           {/* Logo */}
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
                 <Hexagon className="text-white fill-white/10" size={20} strokeWidth={2}/>
              </div>
              <div>
                 <h1 className="text-xl font-black text-white tracking-tight leading-none">OEE <span className="text-blue-500">PRO</span></h1>
                 <p className="text-[9px] font-bold text-slate-500 tracking-[0.3em] uppercase mt-0.5">Enterprise</p>
              </div>
              <button onClick={onClose} className="lg:hidden ml-auto text-slate-400 hover:text-white"><X size={24}/></button>
           </div>

           {/* Time Widget Card */}
           <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div>
                 <p className="text-3xl font-black text-white tracking-tighter leading-none">{formattedTime}</p>
                 <div className="flex items-center gap-1.5 mt-1.5 text-slate-400">
                    <CalendarDays size={12}/>
                    <p className="text-[10px] font-bold uppercase tracking-wider">{formattedDate}</p>
                 </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 animate-pulse">
                 <Zap size={16} className="text-green-400 fill-green-400"/>
              </div>
           </div>
        </div>

        {/* 2. NAVIGATION */}
        <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
          <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 mt-2">Module Access</p>
          
          {menus.map((item, index) => (
            <NavLink 
              key={index}
              to={item.path}
              onClick={() => onClose && onClose()} 
              className={({ isActive }) => `
                group relative flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 outline-none
                ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              {({ isActive }) => (
                <>
                  {/* Active Background */}
                  {isActive && (
                    <motion.div 
                      layoutId="sidebarActive"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent border-l-4 border-blue-500 rounded-r-xl z-0"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  {/* Icon */}
                  <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-blue-400' : 'group-hover:scale-110 group-hover:text-slate-100'}`}>
                    {React.cloneElement(item.icon, { size: 20, strokeWidth: isActive ? 2.5 : 2 })}
                  </span>
                  
                  {/* Text */}
                  <span className={`relative z-10 flex-1 text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                  
                  {/* Active Dot */}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] relative z-10"></div>}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* 3. PROFILE BADGE */}
        <div className="p-4 relative z-10">
          <div className="relative p-4 rounded-2xl bg-[#131b2e] border border-white/5 flex items-center gap-3 group transition-all duration-300 hover:border-blue-500/30">
              
              {/* Avatar Ring */}
              <div className="relative shrink-0">
                 <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-slate-800">
                    <img 
                        src={imgSrc} 
                        alt="User" 
                        className="w-full h-full rounded-full object-cover border-2 border-[#131b2e] bg-slate-900" 
                        onError={() => setImgSrc(defaultPhoto)}
                    />
                 </div>
                 <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#131b2e] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                 </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                 <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                    {user?.nama?.split(' ')[0] || 'Operator'}
                 </h4>
                 <div className="flex items-center gap-1">
                    <ShieldCheck size={10} className="text-blue-500"/>
                    <span className="text-[10px] font-medium text-slate-400 truncate uppercase tracking-wide">
                        {user?.jabatan || 'Staff'}
                    </span>
                 </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
                className="p-2.5 bg-white/5 text-slate-400 rounded-xl hover:bg-red-500/20 hover:text-red-400 hover:border hover:border-red-500/30 transition-all active:scale-95" 
                title="Disconnect"
              >
                 <LogOut size={16} strokeWidth={2.5} />
              </button>
          </div>
          
          {/* Footer Version */}
          <div className="text-center mt-3">
             <p className="text-[9px] text-slate-700 font-mono">v2.4.0 • Secured</p>
          </div>
        </div>

      </motion.aside>
    </>
  );
};

export default Sidebar;