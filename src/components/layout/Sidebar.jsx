import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  FileInput, 
  TrendingUp, 
  AlertOctagon, 
  Layers, 
  BarChart2, 
  Users, 
  User, 
  LogOut,
  UserCircle,
  Clock,
  PlusCircle
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirm = window.confirm("Yakin ingin keluar?");
    if (confirm) {
      logout();
      navigate('/login');
    }
  };

  // Cek Jabatan
  const isManager = user?.jabatan?.toLowerCase().includes('manager') || 
                    user?.jabatan?.toLowerCase().includes('asisten') ||
                    user?.jabatan?.toLowerCase().includes('supervisor') ||
                    user?.jabatan?.toLowerCase().includes('admin');

  // --- DEFINISI MENU ---
  
  // Menu untuk FOREMAN / OPERATOR
  const foremanMenus = [
    { path: '/input-data', name: 'Input Data', icon: <PlusCircle size={20} /> },
    { path: '/kinerja', name: 'Kinerja Saya', icon: <TrendingUp size={20} /> },
    { path: '/profil', name: 'Profil Saya', icon: <User size={20} /> },
  ];

  // Menu untuk MANAGER / SUPERVISOR
  const managerMenus = [
    { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/downtime', name: 'Analisa Downtime', icon: <Clock size={20} /> },
    { path: '/root-cause', name: 'Root Cause', icon: <Layers size={20} /> },
    { path: '/analisa', name: 'Executive OEE', icon: <BarChart2 size={20} /> },
    { path: '/kinerja-tim', name: 'Kinerja Tim', icon: <Users size={20} /> },
    { path: '/profil', name: 'Profil Saya', icon: <User size={20} /> },
  ];

  // Pilih menu berdasarkan role
  // Catatan: Dashboard foreman diarahkan ke Input Data atau Kinerja, 
  // tapi jika ingin dashboard umum, bisa disesuaikan.
  const menus = isManager ? managerMenus : foremanMenus;

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 shadow-2xl z-50 transition-all duration-300">
      
      {/* 1. Header Logo */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          OEE System
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {user?.plant_zone ? `Zone ${user.plant_zone}` : 'Pharma Manufacturing'}
        </p>
      </div>

      {/* 2. Menu Navigasi */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menus.map((item, index) => (
          <NavLink 
            key={index}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
              ${isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }
            `}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* 3. Profil User Bawah & Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          {user?.foto && user.foto.length > 20 ? (
            <img src={user.foto} alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-blue-500" />
          ) : (
            <UserCircle size={40} className="text-slate-400" />
          )}
          
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-white">{user?.nama || 'User'}</p>
            <p className="text-xs text-blue-400 truncate font-medium uppercase">{user?.jabatan || 'Staff'}</p>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors" 
            title="Keluar Aplikasi"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;