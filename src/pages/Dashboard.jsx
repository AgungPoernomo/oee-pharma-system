import React, { useState, useEffect } from 'react';
import StatCard from '../components/dashboard/StatCard';
import ProductionChart from '../components/dashboard/ProductionChart'; // <--- 1. Import Grafik
import { Activity, Zap, CheckCircle, BarChart3, Loader2 } from 'lucide-react';
import { fetchProductionData } from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState([]); // <--- Simpan data mentah untuk grafik
  
  const [kpi, setKpi] = useState({
    availability: 0,
    performance: 0,
    quality: 0,
    oee: 0
  });

  useEffect(() => {
    const calculateOEE = async () => {
      try {
        const data = await fetchProductionData();
        setRawData(data); // Simpan data untuk dikirim ke grafik
        
        if (data.length === 0) {
          setLoading(false);
          return;
        }

        let totalTarget = 0;
        let totalActual = 0;
        let totalReject = 0;

        data.forEach(row => {
          totalTarget += Number(row.target) || 0;
          totalActual += Number(row.actual) || 0;
          totalReject += Number(row.reject) || 0;
        });

        const perfScore = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
        const qualityScore = totalActual > 0 ? ((totalActual - totalReject) / totalActual) * 100 : 0;
        const availScore = 95; 
        const oeeScore = (availScore * perfScore * qualityScore) / 10000;

        setKpi({
          availability: availScore.toFixed(1),
          performance: perfScore.toFixed(1),
          quality: qualityScore.toFixed(1),
          oee: oeeScore.toFixed(1)
        });

      } catch (error) {
        console.error("Gagal menghitung OEE:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateOEE();
  }, []);

  const stats = [
    { id: 1, title: 'Availability', value: `${kpi.availability}%`, icon: <Activity size={24} />, color: 'bg-blue-500' },
    { id: 2, title: 'Performance', value: `${kpi.performance}%`, icon: <Zap size={24} />, color: 'bg-orange-400' },
    { id: 3, title: 'Quality', value: `${kpi.quality}%`, icon: <CheckCircle size={24} />, color: 'bg-emerald-500' },
    { id: 4, title: 'OEE Score', value: `${kpi.oee}%`, icon: <BarChart3 size={24} />, color: 'bg-violet-600' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500 pb-10">
      
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Produksi</h2>
        <p className="text-slate-500">Overview performa mesin hari ini.</p>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="animate-spin" /> Menghitung Statistik...
          </div>
        </div>
      ) : (
        <>
          {/* Bagian 1: Kartu KPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <StatCard key={stat.id} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
            ))}
          </div>

          {/* Bagian 2: Grafik & Info Lain */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            
            {/* GRAFIK (Mengambil 2 kolom lebar) */}
            <div className="lg:col-span-2">
               <ProductionChart data={rawData} /> 
            </div>

            {/* STATUS MESIN (Mengambil 1 kolom sisa) */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm h-[300px]">
              <h3 className="font-bold text-slate-700 mb-4">Status Mesin</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-green-700">Line A-01</span>
                  </div>
                  <span className="text-sm text-green-600">Running</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-green-700">Line B-02</span>
                  </div>
                  <span className="text-sm text-green-600">Running</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium text-red-700">Line C-03</span>
                  </div>
                  <span className="text-sm text-red-600">Maintenance</span>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;