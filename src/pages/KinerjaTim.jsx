import React, { useState, useEffect } from 'react';
import { fetchTeamStats } from '../services/api';
import { 
  Users, Calendar, Loader2, Trophy, Medal, 
  Target, Zap, TrendingUp, Search, Crown, 
  BarChart3, Activity, ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- ANIMATED NUMBER ---
const CountUp = ({ value, prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) return;
    let timer = setInterval(() => {
      start += Math.ceil(end / 40); // Lebih cepat sedikit
      if (start >= end) { start = end; clearInterval(timer); }
      setDisplayValue(start);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{displayValue.toLocaleString('id-ID')}{suffix}</span>;
};

// --- ELITE AVATAR ---
const UserAvatar = ({ foto, name, size = "md", rank = null }) => {
  const defaultPhoto = `https://i.pravatar.cc/150?u=${name}`;
  const [imgSrc, setImgSrc] = useState((foto && foto.length > 100) ? foto : defaultPhoto);
  
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-24 h-24",
    xl: "w-32 h-32"
  };

  const ringColor = rank === 1 ? 'ring-yellow-400 shadow-yellow-500/50' 
                  : rank === 2 ? 'ring-slate-300 shadow-slate-400/50'
                  : rank === 3 ? 'ring-orange-400 shadow-orange-500/50'
                  : 'ring-slate-100';

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full p-1 ring-2 ${ringColor} shadow-lg transition-all duration-500 group-hover:scale-105 bg-white`}>
      <img 
        src={imgSrc} 
        alt={name} 
        className="w-full h-full rounded-full object-cover"
        onError={() => setImgSrc(defaultPhoto)} 
      />
      {rank === 1 && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-md animate-bounce"><Crown size={24} fill="currentColor"/></div>}
    </div>
  );
};

const KinerjaTim = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: new Date().toISOString().split('T')[0], 
    zone: 'All' 
  });

  // Derived Stats untuk Header
  const [teamSummary, setTeamSummary] = useState({ totalInput: 0, totalLost: 0, activePersonnel: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchTeamStats(filter);
      if (res.status === 'success') {
        const sorted = (res.data || []).sort((a, b) => b.input_count - a.input_count);
        setData(sorted);
        
        // Hitung Summary Tim
        const totalIn = sorted.reduce((acc, curr) => acc + curr.input_count, 0);
        const totalLo = sorted.reduce((acc, curr) => acc + curr.total_downtime, 0);
        setTeamSummary({ totalInput: totalIn, totalLost: totalLo, activePersonnel: sorted.length });
      }
      setLoading(false);
    };
    load();
  }, [filter]);

  const filteredData = data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const top3 = filteredData.slice(0, 3);
  const others = filteredData.slice(3);

  return (
    <div className="max-w-7xl mx-auto pb-24 font-sans px-4 md:px-6 space-y-8">
      
      {/* 1. HEADER & GLOBAL STATS (Berguna) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pt-6">
         <div>
            <div className="flex items-center gap-2 mb-2">
               <span className="px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs font-extrabold uppercase tracking-widest border border-blue-600/20">
                  Performance Intelligence
               </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Leaderboard</span></h1>
            <p className="text-slate-500 font-medium mt-2 max-w-xl">
               Pantau kontribusi setiap personil. Data diurutkan berdasarkan produktivitas batch tertinggi.
            </p>
         </div>

         {/* Team Summary Cards (New Useful Feature) */}
         <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full xl:w-auto">
            <SummaryCard label="Total Output" value={teamSummary.totalInput} icon={<Target className="text-emerald-500"/>} color="border-emerald-200 bg-emerald-50/50" />
            <SummaryCard label="Total Loss" value={teamSummary.totalLost} suffix="m" icon={<TrendingUp className="text-red-500 rotate-180"/>} color="border-red-200 bg-red-50/50" />
            <div className="hidden md:block">
               <SummaryCard label="Personil Aktif" value={teamSummary.activePersonnel} icon={<Users className="text-blue-500"/>} color="border-blue-200 bg-blue-50/50" />
            </div>
         </div>
      </div>

      {/* 2. FILTER BAR (Modern Glass) */}
      <div className="sticky top-4 z-30 bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 flex flex-col md:flex-row gap-3 items-center justify-between">
         <div className="flex items-center gap-2 px-4 w-full md:w-auto">
            <Calendar size={18} className="text-slate-400"/>
            <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} className="bg-transparent font-bold text-slate-700 text-sm outline-none uppercase w-full md:w-auto"/>
            <span className="text-slate-300">-</span>
            <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} className="bg-transparent font-bold text-slate-700 text-sm outline-none uppercase w-full md:w-auto"/>
         </div>
         <div className="flex items-center gap-3 bg-slate-100/50 px-4 py-2 rounded-xl w-full md:w-auto border border-slate-200/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Search size={18} className="text-slate-400"/>
            <input type="text" placeholder="Cari Nama Personil..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent font-medium text-sm text-slate-700 outline-none w-full placeholder:text-slate-400"/>
         </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-100 shadow-inner">
           <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
           <span className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Calculating Rankings...</span>
        </div>
      ) : (
        <>
          {/* 3. THE PODIUM (SPEKTAKULER) */}
          {top3.length > 0 && (
             <div className="relative pt-10 pb-4">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-6 relative z-10">
                   {/* Rank 2 */}
                   {top3[1] && <PodiumCard user={top3[1]} rank={2} delay={0.2} />}
                   {/* Rank 1 */}
                   <PodiumCard user={top3[0]} rank={1} delay={0} />
                   {/* Rank 3 */}
                   {top3[2] && <PodiumCard user={top3[2]} rank={3} delay={0.4} />}
                </div>
             </div>
          )}

          {/* 4. THE LIST (Informative & Visual) */}
          {others.length > 0 && (
             <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <BarChart3 className="text-slate-400"/> Challenger List
                   </h3>
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{others.length} Personil Lainnya</span>
                </div>
                
                <div className="divide-y divide-slate-50">
                   {others.map((item, idx) => (
                      <motion.div 
                         initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }}
                         key={idx} 
                         className="p-4 md:p-6 hover:bg-blue-50/30 transition-colors group flex flex-col md:flex-row items-center gap-6"
                      >
                         {/* Rank & Identity */}
                         <div className="flex items-center gap-4 w-full md:w-1/3">
                            <span className="text-xl font-black text-slate-300 w-8 text-center group-hover:text-blue-500 transition-colors">#{idx + 4}</span>
                            <UserAvatar foto={item.foto} name={item.name} size="sm" rank={0} />
                            <div>
                               <h4 className="font-bold text-slate-800 text-sm md:text-base">{item.name}</h4>
                               <p className="text-xs text-slate-400 font-medium">Zone {item.zone || '-'}</p>
                            </div>
                         </div>

                         {/* Efficiency Bar (Visual Context) */}
                         <div className="flex-1 w-full">
                            <div className="flex justify-between text-xs font-bold mb-1.5">
                               <span className="text-slate-500">Productivity Score</span>
                               <span className="text-blue-600">{item.input_count} Batch</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                               <motion.div 
                                  initial={{ width: 0 }} whileInView={{ width: `${Math.min((item.input_count / (top3[0]?.input_count || 1)) * 100, 100)}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                               />
                            </div>
                         </div>

                         {/* Stats Grid */}
                         <div className="flex gap-8 w-full md:w-auto justify-between md:justify-end min-w-[200px]">
                            <div className="text-right">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Downtime</p>
                               <p className="font-bold text-slate-800">{item.downtime_events}x</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loss Time</p>
                               <p className="font-bold text-red-500">{item.total_downtime}m</p>
                            </div>
                         </div>
                      </motion.div>
                   ))}
                </div>
             </div>
          )}
        </>
      )}
    </div>
  );
};

// --- COMPONENTS ---

const SummaryCard = ({ label, value, suffix='', icon, color }) => (
   <div className={`p-4 rounded-2xl border ${color} flex items-center gap-4`}>
      <div className="p-3 bg-white rounded-xl shadow-sm">{icon}</div>
      <div>
         <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
         <p className="text-2xl font-black text-slate-800 tracking-tight">
            <CountUp value={value} suffix={suffix}/>
         </p>
      </div>
   </div>
);

const PodiumCard = ({ user, rank, delay }) => {
   const isFirst = rank === 1;
   const heightClass = isFirst ? 'h-[420px] md:h-[450px]' : rank === 2 ? 'h-[360px] md:h-[380px]' : 'h-[340px] md:h-[350px]';
   
   // Styling Eksklusif
   const bgClass = isFirst 
      ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-yellow-500/30 shadow-yellow-500/20' 
      : 'bg-white border-slate-100 shadow-slate-200/50';
   
   const textClass = isFirst ? 'text-white' : 'text-slate-800';
   const statLabelClass = isFirst ? 'text-slate-400' : 'text-slate-400';
   const statValClass = isFirst ? 'text-white' : 'text-slate-900';

   return (
      <motion.div 
         initial={{ y: 100, opacity: 0 }} 
         animate={{ y: 0, opacity: 1 }} 
         transition={{ delay: delay, type: "spring", stiffness: 120, damping: 20 }}
         className={`relative w-full md:w-1/3 rounded-[2.5rem] p-6 flex flex-col items-center justify-end ${heightClass} ${bgClass} border-2 shadow-2xl group transition-transform hover:-translate-y-2`}
      >
         {/* Rank Badge */}
         <div className={`absolute top-6 font-black text-6xl opacity-10 ${isFirst ? 'text-white' : 'text-slate-900'}`}>#{rank}</div>
         
         {/* Avatar with Crown for #1 */}
         <div className="mb-6 relative z-10">
            <UserAvatar foto={user.foto} name={user.name} size={isFirst ? 'xl' : 'lg'} rank={rank} />
         </div>

         {/* Name & Title */}
         <h3 className={`font-black text-center leading-tight mb-1 truncate w-full px-2 ${isFirst ? 'text-2xl' : 'text-xl'} ${textClass}`}>
            {user.name}
         </h3>
         <p className={`text-xs font-bold uppercase tracking-widest mb-6 ${isFirst ? 'text-yellow-400' : 'text-blue-500'}`}>
            {isFirst ? 'Top Performer' : rank === 2 ? 'Runner Up' : '2nd Runner Up'}
         </p>

         {/* Stats Container */}
         <div className={`w-full grid grid-cols-2 gap-2 p-2 rounded-2xl ${isFirst ? 'bg-white/10 backdrop-blur-md' : 'bg-slate-50'}`}>
            <div className="text-center p-2">
               <p className={`text-[10px] font-bold uppercase ${statLabelClass}`}>Output</p>
               <p className={`text-lg font-black ${statValClass}`}><CountUp value={user.input_count}/></p>
            </div>
            <div className="text-center p-2 border-l border-white/10">
               <p className={`text-[10px] font-bold uppercase ${statLabelClass}`}>Loss Time</p>
               <p className={`text-lg font-black ${isFirst ? 'text-red-300' : 'text-red-500'}`}>{user.total_downtime}m</p>
            </div>
         </div>

         {/* Decorative Bottom Gradient */}
         <div className={`absolute bottom-0 left-0 w-full h-2 rounded-b-[2.5rem] ${isFirst ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400' : rank === 2 ? 'bg-slate-300' : 'bg-orange-300'}`}></div>
      </motion.div>
   )
};

export default KinerjaTim;