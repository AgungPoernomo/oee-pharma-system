import React, { useState, useEffect } from 'react';
import { fetchManagerDowntime } from '../services/api';
import { 
  Filter, Calendar, BarChart2, Clock, AlertOctagon, 
  ArrowRight, Loader2, Download 
} from 'lucide-react';

const Downtime = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    total_duration: 0,
    total_events: 0,
    pareto: [],
    history: []
  });

  // Default Filter: Hari ini s/d Hari ini (Bisa diubah user)
  const today = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState({
    startDate: today,
    endDate: today,
    zone: 'All'
  });

  // Fungsi Load Data
  const loadData = async () => {
    setLoading(true);
    const res = await fetchManagerDowntime(filter);
    if (res.status === 'success') {
      setData(res.data);
    }
    setLoading(false);
  };

  // Load otomatis saat filter berubah
  useEffect(() => {
    loadData();
  }, [filter]);

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* HEADER & FILTER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Analisa Downtime</h1>
          <p className="text-slate-500">Monitoring kerugian waktu produksi (Unplanned Stop).</p>
        </div>
        
        {/* Filter Control */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
             <Calendar size={16} className="text-slate-400"/>
             <input type="date" name="startDate" value={filter.startDate} onChange={handleFilterChange} className="bg-transparent text-sm font-bold text-slate-700 outline-none"/>
             <span className="text-slate-400">-</span>
             <input type="date" name="endDate" value={filter.endDate} onChange={handleFilterChange} className="bg-transparent text-sm font-bold text-slate-700 outline-none"/>
          </div>
          
          <select name="zone" value={filter.zone} onChange={handleFilterChange} className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-700 outline-none cursor-pointer">
            <option value="All">Semua Zone</option>
            <option value="C">Zone C</option>
            <option value="F">Zone F</option>
          </select>

          <button onClick={loadData} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200">
             {loading ? <Loader2 className="animate-spin" size={20}/> : <Filter size={20}/>}
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-full"><Clock size={32}/></div>
            <div>
               <p className="text-sm text-slate-500 font-bold uppercase">Total Lost Time</p>
               <h3 className="text-3xl font-bold text-slate-800">{data.total_duration} <span className="text-sm text-slate-400 font-medium">Menit</span></h3>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 bg-orange-50 text-orange-600 rounded-full"><AlertOctagon size={32}/></div>
            <div>
               <p className="text-sm text-slate-500 font-bold uppercase">Total Kejadian</p>
               <h3 className="text-3xl font-bold text-slate-800">{data.total_events} <span className="text-sm text-slate-400 font-medium">Kali</span></h3>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full"><BarChart2 size={32}/></div>
            <div>
               <p className="text-sm text-slate-500 font-bold uppercase">Masalah Utama</p>
               <h3 className="text-xl font-bold text-slate-800 truncate max-w-[200px]">
                 {data.pareto.length > 0 ? data.pareto[0].name : "-"}
               </h3>
               <p className="text-xs text-slate-400">Penyebab frekuensi tertinggi</p>
            </div>
         </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: PARETO CHART (Visual) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BarChart2 className="text-blue-600"/> Top 5 Penyebab Downtime (Pareto)
           </h3>
           
           <div className="space-y-6">
              {data.pareto.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">Tidak ada data downtime pada periode ini.</div>
              ) : (
                data.pareto.map((item, idx) => (
                  <div key={idx} className="relative">
                     <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                           <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-red-500' : 'bg-slate-400'}`}>
                             {idx + 1}
                           </span>
                           <span className="font-bold text-slate-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                           <span className="block font-bold text-slate-800">{item.count} Kali</span>
                           <span className="text-xs text-slate-400">{item.duration} Menit</span>
                        </div>
                     </div>
                     {/* Bar Visual */}
                     <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${idx === 0 ? 'bg-red-500' : 'bg-blue-500'}`} 
                          style={{ width: `${(item.count / data.pareto[0].count) * 100}%` }}
                        ></div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* RIGHT: HISTORY LIST (Detail) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
           <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="text-orange-500"/> Riwayat Terakhir
           </h3>
           <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {data.history.length === 0 ? (
                 <div className="text-center text-slate-400 text-sm">Belum ada riwayat.</div>
              ) : (
                 data.history.map((log, idx) => (
                    <div key={idx} className="p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition rounded-lg">
                       <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{log.date}</span>
                          <span className="text-xs font-bold text-red-500">{log.duration} m</span>
                       </div>
                       <p className="font-bold text-slate-800 text-sm">{log.problem}</p>
                       <p className="text-xs text-slate-500 mt-1">{log.machine}</p>
                       <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-400"></span> PIC: {log.pic}
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default Downtime;