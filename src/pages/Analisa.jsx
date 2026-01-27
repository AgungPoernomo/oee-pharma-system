import React, { useState, useEffect } from 'react';
import { fetchManagerOEE } from '../services/api';
import { 
  Filter, Calendar, Activity, Zap, CheckCircle, 
  Settings, Loader2, PieChart 
} from 'lucide-react';

const Analisa = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    oee: 0,
    availability: 0,
    performance: 0,
    quality: 0,
    details: { total_output: 0, total_downtime: 0 }
  });

  const today = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState({
    startDate: today,
    endDate: today,
    zone: 'All'
  });

  const loadData = async () => {
    setLoading(true);
    const res = await fetchManagerOEE(filter);
    if (res.status === 'success') {
      setStats(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  // Helper Warna OEE (Standard World Class: 85%)
  const getScoreColor = (val) => {
    if (val >= 85) return "text-green-600";
    if (val >= 70) return "text-yellow-600";
    return "text-red-600";
  };
  
  const getBarColor = (val) => {
     if (val >= 85) return "bg-green-500";
     if (val >= 70) return "bg-yellow-500";
     return "bg-red-500";
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Executive OEE</h1>
          <p className="text-slate-500">Overall Equipment Effectiveness Dashboard.</p>
        </div>
        
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
           <button onClick={loadData} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition">
             {loading ? <Loader2 className="animate-spin" size={20}/> : <Filter size={20}/>}
           </button>
        </div>
      </div>

      {/* --- OEE BIG SCORE CARD --- */}
      <div className="mb-10 bg-white rounded-3xl p-8 shadow-lg border border-slate-200 text-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
         
         <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4">OEE SCORE</h2>
         <div className={`text-8xl font-black ${getScoreColor(stats.oee)} mb-4 transition-all duration-700`}>
            {stats.oee}%
         </div>
         <p className="text-slate-500 max-w-lg mx-auto">
            {stats.oee >= 85 ? "Luar Biasa! Performa World Class Manufacturing." : 
             stats.oee >= 70 ? "Cukup Baik. Ada ruang untuk perbaikan di Downtime." : 
             "Performa Rendah. Perlu investigasi mendalam pada Downtime & Speed."}
         </p>
      </div>

      {/* --- APQ FACTORS (GRID) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         
         {/* 1. Availability */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:shadow-md transition">
            <div className="flex justify-between items-center mb-4">
               <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Activity size={24}/></div>
               <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">AVAILABILITY</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
               <span className="text-4xl font-bold text-slate-800">{stats.availability}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
               <div className={`h-full rounded-full ${getBarColor(stats.availability)}`} style={{width: `${stats.availability}%`}}></div>
            </div>
            <div className="text-xs text-slate-500 flex justify-between border-t pt-3">
               <span>Operating Time</span>
               <span className="font-bold">{stats.details.operating_time} m</span>
            </div>
            <div className="text-xs text-red-500 flex justify-between mt-1">
               <span>Downtime</span>
               <span className="font-bold">{stats.details.total_downtime} m</span>
            </div>
         </div>

         {/* 2. Performance */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:shadow-md transition">
            <div className="flex justify-between items-center mb-4">
               <div className="bg-orange-50 p-3 rounded-xl text-orange-600"><Zap size={24}/></div>
               <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">PERFORMANCE</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
               <span className="text-4xl font-bold text-slate-800">{stats.performance}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
               <div className={`h-full rounded-full ${getBarColor(stats.performance)}`} style={{width: `${stats.performance}%`}}></div>
            </div>
            <p className="text-xs text-slate-400">Efisiensi kecepatan mesin dibanding Cycle Time ideal.</p>
            <div className="text-xs text-slate-500 flex justify-between border-t pt-3 mt-3">
               <span>Total Output</span>
               <span className="font-bold">{stats.details.total_output} Unit</span>
            </div>
         </div>

         {/* 3. Quality */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:shadow-md transition">
            <div className="flex justify-between items-center mb-4">
               <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><CheckCircle size={24}/></div>
               <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">QUALITY</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
               <span className="text-4xl font-bold text-slate-800">{stats.quality}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
               <div className={`h-full rounded-full ${getBarColor(stats.quality)}`} style={{width: `${stats.quality}%`}}></div>
            </div>
            <p className="text-xs text-slate-400">Persentase produk bagus vs total produksi.</p>
         </div>

      </div>
    </div>
  );
};

export default Analisa;