import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchForemanStats } from '../services/api';
import { 
  Trophy, TrendingUp, AlertOctagon, Clock, 
  Zap, Activity, Loader2 
} from 'lucide-react';

const Kinerja = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mttr: 0,
    top_bad_actor: [],
    input_accuracy: 0,
    setup_efficiency: 100,
    uptime_streak: 0,
    trend_oee: []
  });

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const res = await fetchForemanStats(user);
      if (res.status === 'success') {
        setStats(res.data);
      }
      setLoading(false);
    };
    loadStats();
  }, [user]);

  if (loading) return <div className="p-10 text-center flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      
      {/* HEADER */}
      <div className="mb-8 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-bold text-slate-800">Rapor Kinerja</h1>
           <p className="text-slate-500">Pantau performa shift Anda secara real-time.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm">
           Shift Hari Ini
        </div>
      </div>

      {/* --- GRID 1: INDIKATOR UTAMA (SPEEDOMETER STYLE) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* 1. MTTR (Response Time) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition"><Clock size={100} /></div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kecepatan Respon (MTTR)</h3>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-extrabold ${stats.mttr > 15 ? 'text-red-500' : 'text-green-500'}`}>
              {stats.mttr}
            </span>
            <span className="text-slate-400 font-bold mb-2">Menit</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {stats.mttr > 15 ? "⚠️ Respon melambat! Target < 15 Menit." : "✅ Respon sangat bagus!"}
          </p>
        </div>

        {/* 2. Setup Efficiency */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:shadow-md transition">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Efisiensi Setup</h3>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  Skor
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {stats.setup_efficiency}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
              <div style={{ width: `${Math.min(stats.setup_efficiency, 100)}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
            </div>
            <p className="text-xs text-slate-500">Perbandingan waktu setup real vs standar.</p>
          </div>
        </div>

        {/* 3. Uptime Streak (Momentum) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg border border-slate-700 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 p-4 opacity-10"><Zap size={80} /></div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
             Momentum (Uptime)
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-extrabold text-white">{stats.uptime_streak}</span>
            <span className="text-slate-400 font-bold mb-2">Jam</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Rekor mesin jalan tanpa henti hari ini.</p>
        </div>
      </div>

      {/* --- GRID 2: ANALISA MENDALAM --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 4. Top Bad Actor (Pareto) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <AlertOctagon className="text-red-500"/> Musuh Terbesar Hari Ini (Pareto)
          </h3>
          <div className="space-y-5">
            {stats.top_bad_actor.length === 0 ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
                 🎉 Belum ada masalah hari ini. Pertahankan mesin tetap jalan!
              </div>
            ) : (
              stats.top_bad_actor.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-slate-700 font-bold flex items-center gap-2">
                       <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-xs">{idx + 1}</span>
                       {item.name}
                    </span>
                    <span className="text-red-600 font-bold">{item.count} Kali</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${(item.count / stats.top_bad_actor[0].count) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5. Input Accuracy */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
             Kontribusi Data
          </h3>
          <div className="relative mb-4">
             <Trophy size={60} className="text-yellow-400" />
             <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                Live
             </div>
          </div>
          <span className="text-4xl font-extrabold text-slate-800">{stats.input_accuracy}</span>
          <p className="text-slate-600 font-medium text-sm">Laporan Terkirim</p>
          <p className="text-xs text-slate-400 mt-2 px-4">Semakin lengkap data, semakin akurat analisa tim.</p>
        </div>
      </div>

      {/* 6. Trend OEE (Visual Sederhana) */}
      <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-green-600"/> Trend Performa (7 Hari Terakhir)
        </h3>
        <div className="h-40 flex items-end justify-between gap-2 px-2 md:px-10 border-b border-slate-100 pb-2">
           {stats.trend_oee.map((val, idx) => (
             <div key={idx} className="w-full flex flex-col items-center gap-2 group relative">
                <div className="absolute -top-8 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition">
                   {val}%
                </div>
                <div 
                  className={`w-full max-w-[40px] rounded-t-lg transition-all duration-1000 ease-out ${val >= 70 ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-gradient-to-t from-slate-400 to-slate-300'}`} 
                  style={{ height: `${val}%` }}
                ></div>
                <div className="text-xs text-slate-400 font-bold">H-{7 - idx}</div>
             </div>
           ))}
        </div>
      </div>

    </div>
  );
};

export default Kinerja;