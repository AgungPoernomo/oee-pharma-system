import React, { useState, useEffect } from 'react';
import { fetchManagerDowntime } from '../services/api';
import { 
  Filter, Calendar, BarChart2, Clock, AlertTriangle, 
  Loader2, Zap, Search, Activity, ArrowUpRight, 
  PackageX, AlertOctagon, TrendingUp
} from 'lucide-react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { motion } from 'framer-motion';

// --- ANIMATED NUMBER ---
const CountUp = ({ value, decimals = 0, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (start === end) return;
    let timer = setInterval(() => {
      start += (end - start) / 10;
      if (Math.abs(end - start) < 0.1) { start = end; clearInterval(timer); }
      setDisplayValue(start);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{displayValue.toLocaleString('id-ID', { maximumFractionDigits: decimals })}{suffix}</span>;
};

const Downtime = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    total_duration: 0,
    total_events: 0,
    pareto: [],
    history: []
  });

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [filter, setFilter] = useState({
    startDate: firstDay.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    zone: 'All'
  });

  // State untuk Data Pareto yang sudah diproses (Kumulatif)
  const [processedPareto, setProcessedPareto] = useState([]);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchManagerDowntime(filter);
    if (res.status === 'success') {
      setData(res.data);
      
      // PROCESSED PARETO LOGIC (Menghitung Kumulatif %)
      let cumulative = 0;
      const totalDur = res.data.total_duration || 1;
      const processed = res.data.pareto.map(item => {
        cumulative += item.duration;
        return {
          ...item,
          cumulativePercentage: Math.round((cumulative / totalDur) * 100)
        };
      });
      setProcessedPareto(processed);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter]);

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  // ESTIMASI LOSS (Asumsi: Speed mesin rata-rata 100 unit/menit)
  // Di aplikasi real, angka ini bisa diambil dari database master mesin
  const ESTIMATED_SPEED = 120; 
  const potentialLossUnits = data.total_duration * ESTIMATED_SPEED;

  // Custom Tooltip Pareto (Hybrid Chart)
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur text-white p-4 rounded-xl shadow-2xl border border-slate-700/50 min-w-[200px]">
          <p className="font-bold text-lg mb-2 border-b border-slate-700 pb-2">{label}</p>
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Durasi</span>
                <span className="text-base font-bold text-red-400">{payload[0].value} m</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Impact</span>
                <span className="text-base font-bold text-blue-400">{payload[1]?.value}%</span>
             </div>
             <p className="text-[10px] text-slate-500 mt-2 italic">Menyumbang {payload[1]?.value}% dari total masalah.</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-24 font-sans animate-fade-in px-4 md:px-8">
      
      {/* 1. INTELLIGENCE HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pt-8 mb-10">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Operational Intelligence</span>
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
              Loss <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">Analysis</span>
           </h1>
           <p className="text-slate-500 font-medium mt-2 max-w-xl text-sm md:text-base">
              Identifikasi kerugian produksi dan analisa pareto (80/20) untuk prioritas perbaikan.
           </p>
        </div>

        {/* Floating Glass Filter */}
        <div className="w-full xl:w-auto flex flex-col md:flex-row items-center gap-3 bg-white/60 backdrop-blur-xl p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60">
           <div className="flex items-center gap-3 px-4 w-full md:w-auto border-b md:border-b-0 md:border-r border-slate-200/50 pb-2 md:pb-0">
              <Calendar size={18} className="text-red-500"/>
              <input type="date" name="startDate" value={filter.startDate} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none uppercase w-full md:w-auto"/>
              <span className="text-slate-300">-</span>
              <input type="date" name="endDate" value={filter.endDate} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none uppercase w-full md:w-auto"/>
           </div>
           
           <div className="px-2 w-full md:w-auto">
              <select name="zone" value={filter.zone} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none cursor-pointer w-full md:w-auto hover:text-red-600 transition">
                 <option value="All">All Zones</option>
                 <option value="C">Zone C</option>
                 <option value="F">Zone F</option>
              </select>
           </div>

           <button onClick={loadData} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg w-full md:w-auto flex justify-center">
              {loading ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>}
           </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-100 shadow-inner">
           <Loader2 className="animate-spin text-red-600 mb-6" size={64} />
           <span className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-[0.3em]">Processing Data...</span>
        </div>
      ) : (
        <div className="space-y-8">
           
           {/* 2. EXECUTIVE SUMMARY (Dark Cards for High Contrast) */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              
              {/* CARD 1: BUSINESS IMPACT (Estimasi Unit Hilang) - PALING BERGUNA */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                 className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[280px]"
              >
                 <div className="absolute top-0 right-0 p-10 opacity-5"><PackageX size={200}/></div>
                 <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-red-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
                 
                 <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                             Business Impact
                          </span>
                       </div>
                       <p className="text-slate-400 font-medium text-sm mb-4">Estimasi kehilangan produksi akibat downtime.</p>
                       <div className="flex items-baseline gap-2">
                          <h3 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                             <CountUp value={potentialLossUnits} />
                          </h3>
                          <span className="text-2xl font-bold text-red-500">Units</span>
                       </div>
                       <p className="text-xs text-slate-500 mt-2 font-mono">Based on avg speed {ESTIMATED_SPEED} unit/min</p>
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Duration</p>
                           <p className="text-2xl font-black text-white"><CountUp value={data.total_duration}/> <span className="text-sm font-medium text-slate-500">Min</span></p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Events</p>
                           <p className="text-2xl font-black text-white"><CountUp value={data.total_events}/> <span className="text-sm font-medium text-slate-500">Kali</span></p>
                        </div>
                    </div>
                 </div>
              </motion.div>

              {/* CARD 2: THE BAD ACTOR (Most Frequent) */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                 className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden group hover:shadow-2xl transition-all flex flex-col justify-between"
              >
                 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><AlertOctagon size={120}/></div>
                 
                 <div>
                    <div className="flex items-center gap-2 mb-4">
                       <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><AlertTriangle size={24}/></div>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Primary Bottleneck</span>
                    </div>
                    
                    <h3 className="text-3xl font-black text-slate-800 line-clamp-3 leading-tight mb-2">
                       {data.pareto.length > 0 ? data.pareto[0].name : "System Healthy"}
                    </h3>
                    
                    {data.pareto.length > 0 && (
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold mt-2">
                          High Severity Alert
                       </div>
                    )}
                 </div>

                 <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Contribution</p>
                       <p className="text-xl font-black text-slate-800">
                          {data.pareto.length > 0 ? ((data.pareto[0].duration / data.total_duration) * 100).toFixed(1) : 0}%
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Lost Time</p>
                       <p className="text-xl font-black text-red-500">
                          {data.pareto.length > 0 ? data.pareto[0].duration : 0}m
                       </p>
                    </div>
                 </div>
              </motion.div>
           </div>

           {/* 3. ADVANCED ANALYTICS (Pareto & Timeline) */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT: HYBRID PARETO CHART (The Gold Standard) */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                 className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100"
              >
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                       <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          <BarChart2 className="text-red-600"/> Pareto Analysis
                       </h3>
                       <p className="text-sm text-slate-500 mt-1 font-medium">80% masalah disebabkan oleh 20% penyebab utama (Garis Biru = Kumulatif %).</p>
                    </div>
                    <div className="flex gap-4 text-xs font-bold bg-slate-50 px-4 py-2 rounded-xl">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span> Durasi (Menit)</div>
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Kumulatif (%)</div>
                    </div>
                 </div>

                 <div className="h-[400px] w-full">
                    {processedPareto.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={processedPareto} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                             <XAxis dataKey="name" tick={false} axisLine={false} height={0} /> {/* Nama disembunyikan agar rapi */}
                             <YAxis yAxisId="left" orientation="left" stroke="#94a3b8" tick={{fontSize: 11, fontWeight: 700}} axisLine={false} tickLine={false}/>
                             <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" domain={[0, 100]} tick={{fontSize: 11, fontWeight: 700}} axisLine={false} tickLine={false}/>
                             <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc', radius: 12}} />
                             
                             {/* Bar: Durasi */}
                             <Bar yAxisId="left" dataKey="duration" barSize={32} radius={[8, 8, 0, 0]}>
                                {processedPareto.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#f87171'} />
                                ))}
                             </Bar>
                             
                             {/* Line: Kumulatif % */}
                             <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: 'white'}} />
                          </ComposedChart>
                       </ResponsiveContainer>
                    ) : (
                       <div className="h-full flex flex-col items-center justify-center text-slate-300">
                          <Activity size={48} className="mb-4 opacity-50"/>
                          <p className="font-bold">No Data Available</p>
                       </div>
                    )}
                 </div>
                 
                 {/* Legend Text Bawah */}
                 <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {processedPareto.slice(0, 5).map((item, i) => (
                        <span key={i} className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                           {i+1}. {item.name}
                        </span>
                    ))}
                 </div>
              </motion.div>

              {/* RIGHT: THE BLACK BOX LOG (Futuristic Timeline) */}
              <motion.div 
                 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                 className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col h-[550px]"
              >
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                 
                 <div className="relative z-10 flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                       <Activity className="text-red-500"/> Incident Log
                    </h3>
                    <span className="flex h-2 w-2 relative">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 relative z-10">
                    {data.history.length === 0 ? (
                       <div className="text-center text-slate-500 mt-20 text-sm font-mono">System Idle. Zero Incidents.</div>
                    ) : (
                       data.history.map((log, idx) => (
                          <div key={idx} className="group relative pl-4 border-l border-slate-700 pb-2">
                             <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${log.duration > 30 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                             
                             <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-mono text-slate-400">{log.date.split(' ')[1] || log.date}</span>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${log.duration > 30 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                   {log.duration}m
                                </span>
                             </div>
                             
                             <h4 className="font-bold text-slate-200 text-sm leading-tight mb-1 group-hover:text-blue-400 transition-colors">{log.problem}</h4>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{log.machine}</span>
                                <span className="text-[10px] text-slate-500 italic">#{log.pic}</span>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </motion.div>

           </div>
        </div>
      )}
    </div>
  );
};

export default Downtime;