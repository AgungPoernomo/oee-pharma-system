import React, { useState, useEffect } from 'react';
import { fetchRootCauseStats } from '../services/api';
import { 
  Layers, AlertTriangle, Loader2, Calendar, 
  Search, PieChart, Activity, Microscope, CheckCircle,
  ArrowRight, Flame, Target, BarChart2, ShieldAlert
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- ANIMATED NUMBER ---
const CountUp = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (start === end) return;
    let timer = setInterval(() => {
      start += Math.ceil(end / 40);
      if (start >= end) { start = end; clearInterval(timer); }
      setDisplayValue(start);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{displayValue.toLocaleString('id-ID')}{suffix}</span>;
};

// --- CUSTOM ACTIVE SHAPE FOR PIE CHART ---
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#fff" className="text-lg font-bold uppercase tracking-widest">
        {payload.name}
      </text>
      <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill={fill} className="text-2xl font-black">
        {value}m
      </text>
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 10}
        startAngle={startAngle} endAngle={endAngle} fill={fill}
      />
      <Sector
        cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle}
        innerRadius={outerRadius + 14} outerRadius={outerRadius + 16} fill={fill}
      />
    </g>
  );
};

const RootCause = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); // For Pie Chart Hover
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [filter, setFilter] = useState({ 
    startDate: firstDay.toISOString().split('T')[0], 
    endDate: today.toISOString().split('T')[0],
    zone: 'All'
  });

  const [chartData, setChartData] = useState([]);
  const [globalStats, setGlobalStats] = useState({ totalLost: 0, topKiller: null });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchRootCauseStats(filter);
      
      if (res.status === 'success') {
        setData(res.data);
        
        // 1. Transform untuk Chart
        const pie = Object.entries(res.data).map(([process, problems]) => {
           const totalDur = Object.values(problems).reduce((acc, curr) => acc + curr.duration, 0);
           return { name: process, value: totalDur };
        }).sort((a, b) => b.value - a.value);
        setChartData(pie);

        // 2. Hitung Global Stats (Sangat Berguna untuk Manager)
        const totalLost = pie.reduce((acc, curr) => acc + curr.value, 0);
        
        // Cari Masalah Tunggal Terbesar dari SEMUA proses
        let maxProblem = { name: '', duration: 0, process: '' };
        Object.entries(res.data).forEach(([process, problems]) => {
            Object.entries(problems).forEach(([probName, stats]) => {
                if (stats.duration > maxProblem.duration) {
                    maxProblem = { name: probName, duration: stats.duration, process: process };
                }
            });
        });

        setGlobalStats({ totalLost, topKiller: maxProblem });
      }
      setLoading(false);
    };
    load();
  }, [filter]);

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const onPieEnter = (_, index) => { setActiveIndex(index); };

  // Palet Warna Eksklusif (Neon Cyberpunk)
  const COLORS = ['#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];

  return (
    <div className="max-w-[1400px] mx-auto pb-24 font-sans animate-fade-in px-4 md:px-8">
      
      {/* 1. STRATEGIC HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-10 gap-6 pt-8">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Diagnostic Intelligence</span>
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
              Root Cause <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Matrix</span>
           </h1>
           <p className="text-slate-500 font-medium mt-2 max-w-xl text-sm md:text-base">
              Analisa kausalitas mendalam untuk mengidentifikasi hambatan efisiensi terbesar.
           </p>
        </div>

        {/* Filter Glass */}
        <div className="w-full xl:w-auto flex flex-col md:flex-row items-center gap-3 bg-white/60 backdrop-blur-xl p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60">
           <div className="flex items-center gap-3 px-4 w-full md:w-auto border-b md:border-b-0 md:border-r border-slate-200/50 pb-2 md:pb-0">
              <Calendar size={18} className="text-purple-600"/>
              <input type="date" name="startDate" value={filter.startDate} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none uppercase w-full md:w-auto"/>
              <span className="text-slate-300">-</span>
              <input type="date" name="endDate" value={filter.endDate} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none uppercase w-full md:w-auto"/>
           </div>
           
           <div className="px-2 w-full md:w-auto">
              <select name="zone" value={filter.zone} onChange={handleFilterChange} className="bg-transparent font-bold text-slate-700 text-sm outline-none cursor-pointer w-full md:w-auto hover:text-purple-600 transition">
                 <option value="All">All Zones</option>
                 <option value="C">Zone C</option>
                 <option value="F">Zone F</option>
              </select>
           </div>

           <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-purple-600 transition-colors shadow-lg w-full md:w-auto flex justify-center">
              {loading ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>}
           </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-100 shadow-inner">
           <Loader2 className="animate-spin text-purple-600 mb-6" size={64} />
           <span className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-[0.3em]">Processing Diagnostics...</span>
        </div>
      ) : Object.keys(data).length === 0 ? (
        <div className="p-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center min-h-[500px]">
           <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 animate-bounce shadow-green-200 shadow-lg">
              <CheckCircle className="text-green-600" size={48}/>
           </div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight">Perfect Run!</h2>
           <p className="text-slate-500 mt-2 text-lg">Tidak ada downtime yang tercatat pada periode ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           
           {/* 2. LEFT PANEL: MACRO INTELLIGENCE (4 Cols) */}
           <div className="xl:col-span-4 flex flex-col gap-6">
              
              {/* Global Stats Card */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                 className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 p-6 opacity-5"><Activity size={150}/></div>
                 
                 <div className="relative z-10">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Total Opportunity Loss</p>
                    <div className="flex items-baseline gap-2 mb-8">
                       <h3 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                          <CountUp value={globalStats.totalLost}/>
                       </h3>
                       <span className="text-xl font-bold text-slate-500">Min</span>
                    </div>

                    <div className="p-5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                       <div className="flex items-start gap-4">
                          <div className="p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 shrink-0">
                             <Flame size={24} className="animate-pulse"/>
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Top Critical Issue</p>
                             <h4 className="font-bold text-white text-lg leading-tight mb-1">{globalStats.topKiller?.name || '-'}</h4>
                             <p className="text-xs text-slate-400">Found in: <span className="text-white font-bold">{globalStats.topKiller?.process}</span></p>
                          </div>
                       </div>
                    </div>
                 </div>
              </motion.div>

              {/* Holographic Donut Chart */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                 className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex-1 flex flex-col justify-center relative overflow-hidden"
              >  
                 <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4 relative z-10">
                    <PieChart className="text-purple-500"/> Distribution Map
                 </h3>
                 <div className="h-[300px] w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                       <RePieChart>
                          <Pie
                             activeIndex={activeIndex}
                             activeShape={renderActiveShape}
                             data={chartData}
                             cx="50%" cy="50%"
                             innerRadius={70} outerRadius={90}
                             paddingAngle={4}
                             dataKey="value"
                             onMouseEnter={onPieEnter}
                             stroke="none"
                          >
                             {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Pie>
                       </RePieChart>
                    </ResponsiveContainer>
                 </div>
                 {/* Decorative Grid */}
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-[0.03]"></div>
              </motion.div>
           </div>

           {/* 3. RIGHT PANEL: MICRO DIAGNOSTICS (8 Cols) */}
           <div className="xl:col-span-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {Object.entries(data)
                    .sort((a, b) => {
                       // Urutkan berdasarkan total durasi, process paling bermasalah di atas
                       const durA = Object.values(a[1]).reduce((acc, c) => acc + c.duration, 0);
                       const durB = Object.values(b[1]).reduce((acc, c) => acc + c.duration, 0);
                       return durB - durA;
                    })
                    .map(([processName, problems], idx) => {
                       const totalProcessDuration = Object.values(problems).reduce((acc, c) => acc + c.duration, 0);
                       const sortedProblems = Object.entries(problems).sort((a, b) => b[1].duration - a[1].duration);
                       const topProblem = sortedProblems[0];
                       
                       // Kategori Keparahan
                       const severity = idx === 0 ? 'Critical' : idx === 1 ? 'High' : 'Moderate';
                       const cardColor = idx === 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-100';
                       const headerColor = idx === 0 ? 'text-red-600' : 'text-slate-800';

                       return (
                          <motion.div 
                             initial={{ opacity: 0, scale: 0.9 }} 
                             animate={{ opacity: 1, scale: 1 }} 
                             transition={{ delay: idx * 0.1 }}
                             whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
                             key={idx} 
                             className={`rounded-[2.5rem] p-6 md:p-8 border shadow-lg transition-all relative overflow-hidden group ${cardColor}`}
                          >
                             {/* Priority Badge */}
                             <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${idx === 0 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {severity} Priority
                             </div>

                             {/* Card Header */}
                             <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${idx === 0 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                   <Layers size={24}/>
                                </div>
                                <div>
                                   <h3 className={`font-black text-xl ${headerColor}`}>{processName}</h3>
                                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                      Total Impact: <span className="text-slate-700"><CountUp value={totalProcessDuration} suffix="m"/></span>
                                   </p>
                                </div>
                             </div>

                             {/* Top Killer (The Main Culprit) */}
                             <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/60 mb-6 backdrop-blur-sm relative">
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-red-500 to-orange-500 rounded-r-full"></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-3">Main Bottleneck</p>
                                <div className="flex justify-between items-end pl-3">
                                   <span className="font-bold text-slate-800 leading-tight text-sm max-w-[70%]">{topProblem[0]}</span>
                                   <div className="text-right">
                                      <span className="block text-xl font-black text-red-500">{topProblem[1].count}x</span>
                                      <span className="text-[10px] text-slate-400 font-bold">Frequency</span>
                                   </div>
                                </div>
                             </div>

                             {/* Breakdown List (Strategic View) */}
                             <div className="space-y-3">
                                {sortedProblems.slice(1, 4).map(([prob, stat], i) => (
                                   <div key={i} className="group/item">
                                      <div className="flex justify-between items-center text-xs mb-1.5">
                                         <span className="font-bold text-slate-600 truncate max-w-[60%] group-hover/item:text-blue-600 transition-colors">{prob}</span>
                                         <span className="font-bold text-slate-400">{stat.duration}m <span className="opacity-50">/ {stat.count}x</span></span>
                                      </div>
                                      <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                         <motion.div 
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${Math.min((stat.duration / (topProblem[1].duration || 1)) * 100, 100)}%` }}
                                            transition={{ duration: 1, delay: 0.2 }}
                                            className={`h-full rounded-full ${idx === 0 ? 'bg-red-400' : 'bg-blue-400'}`}
                                         />
                                      </div>
                                   </div>
                                ))}
                             </div>

                             {/* Action Footer */}
                             <div className="mt-6 pt-4 border-t border-slate-200/50 flex justify-end">
                                <button className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-blue-600 transition-colors group/btn">
                                   Deep Dive Analysis <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform"/>
                                </button>
                             </div>
                          </motion.div>
                       );
                    })}
              </div>
           </div>

        </div>
      )}
    </div>
  );
};

export default RootCause;