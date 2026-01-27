import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ProductionChart = ({ data }) => {
  // 1. Kita rapikan data agar Tanggalnya enak dibaca (misal: "2024-01-24" jadi "24 Jan")
  // 2. Kita pastikan angka Target & Actual itu Number (bukan String)
  const chartData = data.map(item => ({
    name: new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    Target: Number(item.target),
    Actual: Number(item.actual),
  }));

  // Ambil 7 data terakhir saja agar grafik tidak kepenuhan
  const limitedData = chartData.slice(-7); 

  return (
    <div className="h-[300px] w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-bold text-slate-700 mb-4">Tren Produksi (7 Hari Terakhir)</h3>
      
      {/* Area Grafik Responsif */}
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={limitedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <Tooltip 
            cursor={{fill: '#f1f5f9'}}
            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
          />
          <Legend wrapperStyle={{paddingTop: '10px'}} />
          
          {/* Batang Target (Warna Abu-abu) */}
          <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={30} />
          
          {/* Batang Actual (Warna Biru Utama) */}
          <Bar dataKey="Actual" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionChart;