import React from 'react';

// Komponen ini menerima props: title (Judul), value (Nilai), icon (Ikon), dan color (Warna tema)
const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between">
        
        {/* Bagian Kiri: Teks */}
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        </div>

        {/* Bagian Kanan: Ikon dengan Background Berwarna */}
        <div className={`p-3 rounded-lg ${color} text-white shadow-sm`}>
          {icon}
        </div>
        
      </div>
    </div>
  );
};

export default StatCard;