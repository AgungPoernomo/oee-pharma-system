import React, { useState, useEffect } from 'react';
import { 
  Activity, Zap, CheckCircle, BarChart3, Loader2, 
  Calendar, Filter, Clock, Server, Cpu, Sparkles,
  RefreshCw, Sun, Moon, ArrowUp, ArrowDown, PieChart as PieIcon,
  TrendingUp, Target, AlertTriangle
} from 'lucide-react';
import { fetchManagerOEE, fetchManagerDowntime, fetchValidationData } from '../services/api';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, // [FIX] Legend ditambahkan di sini
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { motion } from 'framer-motion';

// --- SUB-COMPONENT: ANIMATED NUMBER ---
const CountUp = ({ value, decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (start === end) return;

    let duration = 1500;
    let startTime = null;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue((ease * (end - start)) + start);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue.toFixed(decimals)}</span>;
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chartMode, setChartMode] = useState('oee'); 
  
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedZone, setSelectedZone] = useState('All');
  const [zoneList, setZoneList] = useState([]);
  
  const [kpi, setKpi] = useState({ oee: 0, availability: 0, performance: 0, quality: 0 });
  const [downtimeSummary, setDowntimeSummary] = useState({ total_duration: 0, total_events: 0, pareto: [], history: [] });
  const [greeting, setGreeting] = useState('');

  // Dummy Data Grafik
  const trendData = [
    { day: 'Sen', oee: 65, output: 4500, target: 5000 }, 
    { day: 'Sel', oee: 72, output: 4800, target: 5000 },
    { day: 'Rab', oee: 68, output: 4600, target: 5000 }, 
    { day: 'Kam', oee: 85, output: 5200, target: 5000 },
    { day: 'Jum', oee: 78, output: 4900, target: 5000 }, 
    { day: 'Sab', oee: 92, output: 5600, target: 5000 },
    { day: 'Min', oee: 88, output: 5300, target: 5000 },
  ];

  const lossData = [
    { name: 'Failure', value: 400, color: '#ef4444' },
    { name: 'Setup', value: 300, color: '#f97316' },
    { name: 'Idle', value: 300, color: '#eab308' },
    { name: 'Speed', value: 200, color: '#3b82f6' },
  ];

  const radarData = [
    { subject: 'Availability', A: kpi.availability || 0, fullMark: 100 },
    { subject: 'Performance', A: kpi.performance || 0, fullMark: 100 },
    { subject: 'Quality', A: kpi.quality || 0, fullMark: 100 },
  ];

  // Dummy Mesin
  const machines = [
    { id: 'M-01', name: 'Mixer A', status: 'run', temp: 45 },
    { id: 'M-02', name: 'Mixer B', status: 'run', temp: 47 },
    { id: 'F-01', name: 'Filler X', status: 'stop', temp: 23 },
    { id: 'F-02', name: 'Filler Y', status: 'run', temp: 42 },
    { id: 'P-01', name: 'Packer 1', status: 'idle', temp: 30 },
    { id: 'P-02', name: 'Packer 2', status: 'run', temp: 44 },
  ];

  // --- EFFECT: REALTIME CLOCK ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- EFFECT: INIT DATA ---
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateRange({ start: today, end: today });
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Selamat Pagi');
    else if (hour < 15) setGreeting('Selamat Siang');
    else if (hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');

    fetchValidationData().then(res => {
      if (res && res.status === 'success') setZoneList(res.data.List_Plant_Zone || []);
    });
  }, []);

  // --- EFFECT: LOAD DASHBOARD DATA ---
  useEffect(() => {
    if (!dateRange.start) return;
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const filter = { startDate: dateRange.start, endDate: dateRange.end, zone: selectedZone };
        
        const [resOEE, resDT] = await Promise.all([
           fetchManagerOEE(filter),
           fetchManagerDowntime(filter)
        ]);

        if (resOEE && resOEE.status === 'success') setKpi(resOEE.data);
        if (resDT && resDT.status === 'success') setDowntimeSummary(resDT.data);

      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [dateRange, selectedZone]);

  const refreshData = () => {
      setLoading(true);
      setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="space-y-6 pb-24 font-sans animate-fade-in px-4 md:px-0">
      
      {/* 1. LIVE SYSTEM TICKER */}
      <div className="bg-slate-900 text-slate-400 text-xs py-2.5 px-4 rounded-xl flex items-center shadow-lg justify-between border border-slate-800">
         <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <span className="font-bold text-emerald-400 whitespace-nowrap flex items-center gap-2">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               SYSTEM LIVE
            </span>
            <span className="text-blue-400 whitespace-nowrap flex items-center gap-1.5 font-medium"><Server size={12}/> Online (32ms)</span>
            <span className="text-slate-500 whitespace-nowrap hidden md:inline border-l border-slate-700 pl-4">v2.0 Enterprise Build</span>
         </div>
         <div className="flex items-center gap-2 text-slate-300 font-mono font-bold pl-4 border-l border-slate-700">
            <Clock size={12} className="text-blue-500"/>
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
         </div>
      </div>

      {/* 2. HEADER & FILTER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            {greeting.includes('Pagi') || greeting.includes('Siang') ? <Sun className="text-orange-500 animate-spin-slow" size={24}/> : <Moon className="text-indigo-500" size={24}/>} 
            {greeting}, <span className="text-blue-600">Commander</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mt-1">
             Real-time Plant Production Monitoring
          </p>
        </div>
        
        {/* Filter Responsive */}
        <div className="flex flex-col md:flex-row bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 gap-2 md:gap-0">
           <div className="flex items-center gap-2 px-3 border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0">
              <Calendar size={16} className="text-blue-600 shrink-0"/>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-sm font-bold text-slate-700 w-full md:w-28 outline-none uppercase" />
              <span className="text-slate-300 font-light">|</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-sm font-bold text-slate-700 w-full md:w-28 outline-none uppercase" />
           </div>
           <div className="flex items-center gap-2 px-3">
              <Filter size={16} className="text-blue-600 shrink-0"/>
              <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-full md:w-auto hover:text-blue-600 transition">
                 <option value="All">All Zones</option>
                 {zoneList.map((z,i) => <option key={i} value={z}>{z}</option>)}
              </select>
           </div>
           <button onClick={refreshData} className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition active:scale-95">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""}/>
           </button>
        </div>
      </div>

      {loading ? (
         <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 shadow-xl">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <span className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Synchronizing Data...</span>
         </div>
      ) : (
        <>
          {/* 3. HERO SECTION (Interaktif) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* OEE CARD (Cyberpunk Style) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden flex flex-col justify-between group min-h-[350px]"
              >
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                 <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={250} /></div>
                 <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
                 
                 <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                             Global Efficiency
                          </span>
                          {kpi.oee >= 85 && <span className="text-emerald-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14}/> On Target</span>}
                       </div>
                       <div className="flex items-baseline gap-2">
                          <span className="text-7xl md:text-8xl font-black tracking-tighter text-white">
                             <CountUp value={kpi.oee} decimals={1}/>
                          </span>
                          <span className="text-4xl font-thin text-slate-500 mb-2">%</span>
                       </div>
                       <p className="text-slate-400 text-sm mt-2 max-w-md">
                          Skor efektivitas keseluruhan mesin saat ini. Angka di atas 85% menunjukkan performa kelas dunia.
                       </p>
                    </div>

                    {/* RADAR CHART (Faktor X) */}
                    <div className="w-full md:w-64 h-48 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 p-2 relative">
                        <p className="absolute top-3 left-3 text-[10px] font-bold text-slate-400 uppercase">OEE Factor Balance</p>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="55%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="KPI" dataKey="A" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.4} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4 pt-8 mt-4 border-t border-white/10 relative z-10">
                    <MetricCard label="A" value={kpi.availability} color="text-amber-600" bar="bg-amber-500" icon={<Clock size={16}/>} />
                    <MetricCard label="P" value={kpi.performance} color="text-indigo-600" bar="bg-indigo-500" icon={<Zap size={16}/>} />
                    <MetricCard label="Q" value={kpi.quality} color="text-emerald-600" bar="bg-emerald-500" icon={<CheckCircle size={16}/>} />
                 </div>
              </motion.div>

              {/* LIVE MACHINE STATUS */}
              <motion.div 
                 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                 className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col h-full"
              >
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Cpu size={20} className="text-blue-600"/> Floor Status</h3>
                    <div className="flex gap-2">
                       <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" title="Run"></span>
                       <span className="w-2.5 h-2.5 rounded-full bg-red-500" title="Stop"></span>
                       <span className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Idle"></span>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 flex-1">
                    {machines.map((m, i) => (
                       <div key={i} className={`group p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] cursor-default flex items-center justify-between ${m.status === 'run' ? 'bg-green-50/30 border-green-100 hover:border-green-200' : m.status === 'stop' ? 'bg-red-50/30 border-red-100 hover:border-red-200' : 'bg-amber-50/30 border-amber-100 hover:border-amber-200'}`}>
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${m.status === 'run' ? 'bg-green-100 text-green-700' : m.status === 'stop' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {m.id.split('-')[1]}
                             </div>
                             <div>
                                <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{m.status}</div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="font-mono font-bold text-slate-700 text-sm">{m.temp}°C</div>
                             <Activity size={12} className="text-slate-300 ml-auto"/>
                          </div>
                       </div>
                    ))}
                 </div>
              </motion.div>
          </div>

          {/* 3. ANALISA TREN & FAKTOR X */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ANALISA TREN (COMPOSED CHART - DUAL AXIS) */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                 className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100"
              >
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-blue-600"/> Analisa Tren Produksi</h3>
                       <p className="text-sm text-slate-400 mt-1">Korelasi Output vs Efisiensi (7 Hari Terakhir)</p>
                    </div>
                    <div className="flex gap-4 text-xs font-bold">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> OEE %</div>
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-400"></span> Output Unit</div>
                    </div>
                 </div>
                 
                 <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                       <ComposedChart data={trendData}>
                          <defs>
                             <linearGradient id="colorOeeLine" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                          
                          {/* Y-AXIS KIRI (OEE %) */}
                          <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" axisLine={false} tickLine={false} tick={{fill: '#3b82f6', fontSize: 11, fontWeight: 700}} domain={[0, 100]} />
                          
                          {/* Y-AXIS KANAN (OUTPUT) */}
                          <YAxis yAxisId="right" orientation="right" stroke="#c084fc" axisLine={false} tickLine={false} tick={{fill: '#c084fc', fontSize: 11, fontWeight: 700}} />
                          
                          <ChartTooltip 
                             contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                             cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }}
                          />
                          
                          {/* BAR CHART: OUTPUT */}
                          <Bar yAxisId="right" dataKey="output" barSize={20} radius={[6, 6, 0, 0]} fill="#e9d5ff">
                             {trendData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.output >= entry.target ? '#a855f7' : '#e9d5ff'} />
                             ))}
                          </Bar>
                          
                          {/* LINE CHART: OEE */}
                          <Line yAxisId="left" type="monotone" dataKey="oee" stroke="#2563eb" strokeWidth={4} dot={{r: 4, strokeWidth: 2, fill: 'white'}} activeDot={{r: 6}} />
                       </ComposedChart>
                    </ResponsiveContainer>
                 </div>
              </motion.div>

              {/* LOSS ANALYSIS (DONUT CHART) */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                 className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col"
              >
                 <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><PieIcon size={18} className="text-red-500"/> Loss Analysis</h3>
                 <p className="text-xs text-slate-400 mb-6">Distribusi penyebab hilangnya waktu produksi</p>
                 
                 <div className="flex-1 relative">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={lossData}
                             cx="50%" cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                             stroke="none"
                          >
                             {lossData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Pie>
                          <ChartTooltip />
                          {/* LEGEND ADDED HERE */}
                          <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} formatter={(value) => <span className="text-slate-600 text-xs font-bold ml-1">{value}</span>}/>
                       </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                       <span className="text-3xl font-black text-slate-800">1200</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Min Lost</span>
                    </div>
                 </div>
              </motion.div>
          </div>

          {/* 4. ROOT CAUSE (PARETO) */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
             className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100"
          >
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={20}/></div>
                <div>
                   <h3 className="text-lg font-bold text-slate-800">Top Root Causes (Pareto)</h3>
                   <p className="text-sm text-slate-400">Fokus perbaikan pada masalah dengan dampak terbesar</p>
                </div>
             </div>
             
             <div className="space-y-4">
                {downtimeSummary.pareto.length > 0 ? (
                   downtimeSummary.pareto.map((item, i) => (
                      <div key={i} className="group">
                         <div className="flex justify-between text-sm mb-1.5 font-bold">
                            <span className="text-slate-700 group-hover:text-blue-600 transition-colors">{i+1}. {item.name}</span>
                            <span className="text-slate-500">{item.duration} Min</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }} 
                               whileInView={{ width: `${Math.min((item.duration / (downtimeSummary.pareto[0]?.duration || 1)) * 100, 100)}%` }}
                               transition={{ duration: 1, delay: i * 0.1 }}
                               className={`h-full rounded-full ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-blue-500'}`}
                            />
                         </div>
                      </div>
                   ))
                ) : (
                   <div className="text-center py-10 text-slate-300 font-bold bg-slate-50 rounded-3xl">No Major Issues Detected</div>
                )}
             </div>
          </motion.div>

        </>
      )}
    </div>
  );
};

// --- HELPER COMPONENT (Compact Mode) ---
const MetricCard = ({ label, value, color, bar, icon }) => (
  <div className="bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
     <div className="flex items-center gap-2 mb-1">
        <span className={`text-white opacity-70`}>{icon}</span>
        <span className="text-[10px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
     </div>
     <div className="flex items-end justify-between mb-2">
        <span className={`text-lg md:text-xl font-black ${color}`}><CountUp value={value}/>%</span>
     </div>
     <div className="w-full bg-white/10 h-1 md:h-1.5 rounded-full overflow-hidden">
        <motion.div 
           initial={{ width: 0 }} animate={{ width: `${Math.min(value, 100)}%` }} 
           transition={{ duration: 1.5, ease: "easeOut" }}
           className={`h-full rounded-full ${bar}`} 
        />
     </div>
  </div>
);

export default Dashboard;