import React, { useState, useEffect } from 'react';
import { fetchManagerOEE } from '../services/api';
import { 
  Filter, Calendar, Activity, Zap, CheckCircle, 
  Loader2, TrendingUp, AlertTriangle, Cpu, 
  ArrowUpRight, ArrowDownRight, Target, BarChart2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Tooltip, XAxis
} from 'recharts';
import { motion } from 'framer-motion';

// --- ANIMATED NUMBER ---
const CountUp = ({ value, decimals = 0, suffix = '', prefix = '' }) => {
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
  return <span>{prefix}{displayValue.toLocaleString('id-ID', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}</span>;
};

const Analisa = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    oee: 0, availability: 0, performance: 0, quality: 0,
    details: { total_output: 0, total_downtime: 0 }
  });

  const today = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState({
    startDate: today, endDate: today, zone: 'All'
  });

  const loadData = async () => {
    setLoading(true);
    const res = await fetchManagerOEE(filter);
    if (res.status === 'success') setStats(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter]);

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  // Visual Logic
  const oeeValue = stats.oee || 0;
  const isExcellent = oeeValue >= 85;
  const isGood = oeeValue >= 70 && oeeValue < 85;
  
  const gaugeData = [
    { value: oeeValue },
    { value: 100 - oeeValue }
  ];
  
  const gaugeColor = isExcellent ? '#10b981' : isGood ? '#f59e0b' : '#ef4444';

  // Mockup Trend Data (Untuk Visualisasi Sparkline)
  const sparkData = [
     { v: 60 }, { v: 75 }, { v: 65 }, { v: 80 }, { v: 70 }, { v: 85 }, { v: oeeValue }
  ];

  // Utility Calculation: Potential Loss (Estimasi)
  // Jika OEE < 85%, berapa potensi unit yang hilang?
  const idealOutput = stats.details?.total_output / (oeeValue / 100 || 1);
  const lossUnit = Math.floor(idealOutput - stats.details?.total_output);

  return (
    <div className="max-w-7xl mx-auto pb-24 font-sans px-4 md:px-6">
      
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pt-6 mb-8">
         <div>
            <div className="flex items-center gap-2 mb-2">
               <span className="px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-600/20">
                  Strategic Command
               </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
               Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Analytics</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2 max-w-xl text-sm md:text-base">
               Analisis komprehensif efektivitas mesin dan dampak finansial produksi.
            </p>
         </div>

         {/* Modern Filter Glass */}
         <div className="flex flex-col md:flex-row items-center gap-3 bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60 w-full xl:w-auto">
            <div className="flex items-center gap-3 px-4 w-full md:w-auto border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0">
               <Calendar size={20} className="text-slate-400"/>
               <input type="date" name="startDate" value={filter.startDate} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none uppercase w-full md:w-auto"/>
               <span className="text-slate-300">-</span>
               <input type="date" name="endDate" value={filter.endDate} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none uppercase w-full md:w-auto"/>
            </div>
            <div className="px-2 w-full md:w-auto">
               <select name="zone" value={filter.zone} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none cursor-pointer w-full md:w-auto hover:text-blue-600 transition">
                  <option value="All">All Plants</option>
                  <option value="C">Zone C</option>
                  <option value="F">Zone F</option>
               </select>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={loadData} className="p-3 bg-slate-900 text-white rounded-xl shadow-lg flex items-center justify-center w-full md:w-auto">
               {loading ? <Loader2 className="animate-spin" size={20}/> : <Filter size={20}/>}
            </motion.button>
         </div>
      </div>

      {loading ? (
         <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-100 shadow-inner">
            <Loader2 className="animate-spin text-blue-600 mb-6" size={64} />
            <span className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-[0.3em]">Processing Metrics...</span>
         </div>
      ) : (
         <div className="space-y-8">
            
            {/* 2. THE OEE REACTOR (Hero Section) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
               
               {/* MAIN REACTOR (8 Cols) */}
               <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="xl:col-span-8 bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between min-h-[450px]"
               >
                  {/* Background FX */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 animate-pulse ${isExcellent ? 'bg-emerald-500' : isGood ? 'bg-amber-500' : 'bg-red-600'}`}></div>

                  {/* Left: Text Info */}
                  <div className="relative z-10 flex-1 text-center md:text-left mb-8 md:mb-0">
                     <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-bold uppercase tracking-widest mb-6">
                        <Activity size={14} className={isExcellent ? "text-emerald-400" : "text-red-400"}/>
                        System Health: {isExcellent ? "Optimal" : "Attention Needed"}
                     </div>
                     
                     <h2 className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mb-2">Overall Equipment Effectiveness</h2>
                     <div className="flex items-baseline justify-center md:justify-start gap-1">
                        <span className={`text-8xl md:text-9xl font-black tracking-tighter ${isExcellent ? 'text-emerald-400' : isGood ? 'text-amber-400' : 'text-red-500'} drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]`}>
                           <CountUp value={oeeValue} decimals={1}/>
                        </span>
                        <span className="text-4xl md:text-5xl font-thin text-slate-500">%</span>
                     </div>

                     <div className="mt-8 flex flex-col md:flex-row gap-6">
                        <div>
                           <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Output</p>
                           <p className="text-2xl font-bold"><CountUp value={stats.details?.total_output}/> <span className="text-sm font-medium opacity-60">Unit</span></p>
                        </div>
                        <div className="w-px bg-white/10 hidden md:block"></div>
                        <div>
                           <p className="text-xs text-slate-500 font-bold uppercase mb-1">Opportunity Loss</p>
                           <p className="text-2xl font-bold text-red-400"><CountUp value={lossUnit}/> <span className="text-sm font-medium opacity-60">Unit</span></p>
                        </div>
                     </div>
                  </div>

                  {/* Right: The Gauge */}
                  <div className="relative z-10 w-[300px] h-[300px] flex items-center justify-center">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={gaugeData} cx="50%" cy="50%"
                              innerRadius={110} outerRadius={140}
                              startAngle={90} endAngle={-270}
                              paddingAngle={0} dataKey="value" stroke="none"
                           >
                              <Cell fill={gaugeColor} />
                              <Cell fill="#1e293b" /> 
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     {/* Center Core */}
                     <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full border border-white/5 bg-white/5 backdrop-blur-sm m-10">
                        <Cpu size={40} className="text-white opacity-80 animate-pulse"/>
                        <span className="text-xs font-bold mt-2 text-slate-400 uppercase tracking-widest">Core Analysis</span>
                     </div>
                  </div>
               </motion.div>

               {/* SIDE PANEL: ACTIONABLE INSIGHT (4 Cols) */}
               <motion.div 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                  className="xl:col-span-4 flex flex-col gap-6"
               >
                  {/* AI Card */}
                  <div className="flex-1 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden group">
                     <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                     <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Zap size={24}/></div>
                           <h3 className="font-bold text-slate-800 text-lg">AI Recommendation</h3>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium text-sm md:text-base">
                           {isExcellent 
                              ? "Performa optimal. Disarankan untuk menaikkan target produksi sebesar 5% pada shift berikutnya untuk menguji kapasitas maksimal."
                              : isGood
                              ? "Availability menjadi isu minor. Cek log downtime pada jam istirahat. Potensi kenaikan +3% OEE jika setup time dikurangi."
                              : "KRITIS: Quality rate rendah. Segera inspeksi mesin Filler X. Reject rate di atas ambang batas toleransi."}
                        </p>
                        <button className="mt-8 w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-200 hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                           Generate Full Report <ArrowUpRight size={16}/>
                        </button>
                     </div>
                  </div>

                  {/* Financial Impact Card (Utility) */}
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex items-center justify-between">
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimasi Loss Time</p>
                        <h3 className="text-3xl font-black text-slate-800"><CountUp value={stats.details?.total_downtime} suffix="m"/></h3>
                     </div>
                     <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                        <TrendingUp className="text-red-500 rotate-180" size={24}/>
                     </div>
                  </div>
               </motion.div>
            </div>

            {/* 3. THE PILLARS (A-P-Q) - VISUAL CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <PillarCard 
                  title="Availability" 
                  value={stats.availability} 
                  data={sparkData} 
                  color="emerald" 
                  icon={<Activity size={20}/>}
                  desc="Rasio Waktu Operasi"
               />
               <PillarCard 
                  title="Performance" 
                  value={stats.performance} 
                  data={sparkData} // Idealnya data berbeda
                  color="amber" 
                  icon={<Zap size={20}/>}
                  desc="Kecepatan vs Ideal Cycle"
               />
               <PillarCard 
                  title="Quality" 
                  value={stats.quality} 
                  data={sparkData} 
                  color="indigo" 
                  icon={<CheckCircle size={20}/>}
                  desc="Good vs Total Product"
               />
            </div>

         </div>
      )}
    </div>
  );
};

// --- ELITE COMPONENT: PILLAR CARD WITH SPARKLINE ---
const PillarCard = ({ title, value, data, color, icon, desc }) => {
   const colors = {
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', stroke: '#10b981', fill: '#d1fae5' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', stroke: '#f59e0b', fill: '#fef3c7' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', stroke: '#6366f1', fill: '#e0e7ff' },
   }[color];

   return (
      <motion.div 
         initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
         whileHover={{ y: -10 }}
         className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 relative overflow-hidden group cursor-default"
      >
         <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
               <div className={`w-12 h-12 rounded-2xl ${colors.bg} ${colors.text} flex items-center justify-center mb-4`}>
                  {icon}
               </div>
               <h3 className="text-lg font-bold text-slate-800">{title}</h3>
               <p className="text-xs text-slate-400 font-medium">{desc}</p>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${value >= 90 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
               {value >= 90 ? 'Healthy' : 'Check'}
            </div>
         </div>

         <div className="flex items-end gap-2 mb-4 relative z-10">
            <span className="text-5xl font-black text-slate-900 tracking-tighter"><CountUp value={value}/></span>
            <span className="text-2xl text-slate-400 font-light mb-1">%</span>
         </div>

         {/* Mini Sparkline Chart */}
         <div className="h-16 w-full relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={data}>
                  <defs>
                     <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors.stroke} stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <Area 
                     type="monotone" 
                     dataKey="v" 
                     stroke={colors.stroke} 
                     strokeWidth={3} 
                     fill={`url(#grad-${color})`} 
                     animationDuration={2000}
                  />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </motion.div>
   )
}

export default Analisa;