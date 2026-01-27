import React from 'react';
import { LayoutDashboard, FilePlus, Database } from 'lucide-react';

// Ini adalah komponen Navbar
// props 'activePage' = halaman apa yang sedang aktif
// props 'setPage' = fungsi untuk mengganti halaman
const Navbar = ({ activePage, setPage }) => {
  
  // Daftar menu navigasi
  const menus = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'input', label: 'Input Data', icon: <FilePlus size={20} /> },
  ];

  return (
    // Container utama yang membuatnya "Melayang" (fixed)
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      
      {/* Kotak putih navigasi (Kapsul) */}
      <nav className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-4">
        
        {/* Looping untuk membuat tombol menu otomatis */}
        {menus.map((menu) => (
          <button
            key={menu.id}
            onClick={() => setPage(menu.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm
              ${activePage === menu.id 
                ? 'bg-blue-600 text-white shadow-md' // Gaya jika tombol aktif
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' // Gaya jika tidak aktif
              }
            `}
          >
            {menu.icon}
            <span>{menu.label}</span>
          </button>
        ))}

      </nav>
    </div>
  );
};

export default Navbar;