import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchTeamStats } from '../services/api'; 
import { 
  Trophy, Target, TrendingUp, Calendar, 
  Loader2, Star, Zap, History, ChevronRight,
  Award, Crown, Medal
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- ANIMATED NUMBER ---
const CountUp = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) return;
    let duration = 1500;
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setDisplayValue(Math.floor(progress * (end - start) + start));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{displayValue}</span>;
};

// --- SMART AVATAR ---
const UserAvatar = ({ foto, name, className, border = true }) => {
  const isValidBase64 = foto && foto.length > 100;
  const defaultPhoto = `https://i.pravatar.cc/300?u=${name}`;
  const [imgSrc, setImgSrc] = useState(isValidBase64 ? foto : defaultPhoto);

  useEffect(() => { setImgSrc((foto && foto.length > 100) ? foto : defaultPhoto); }, [foto, name]);

  return (
    <div className={`relative shrink-0 ${className}`}>
        {/* Animated Glow Ring */}
        {border && <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 rounded-full blur opacity-75 animate-pulse"></div>}
        <div className={`relative w-full h-full rounded-full overflow-hidden ${border ? 'border-4 border-slate-900 bg-slate-800' : ''}`}>
            <img src={imgSrc} alt={name} className="w-full h-full object-cover" onError={() => setImgSrc(defaultPhoto)} />
        </div>
    </div>
  );
};

const Kinerja = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadMyStats = async () => {
      setLoading(true);
      const res = await fetchTeamStats({ ...dateRange, zone: 'All' });
      if (res.status === 'success') {
        const myData = res.data.find(item => item.name === user.nama);
        setStats(myData || { name: user.nama, input_count: 0, downtime_events: 0, total_downtime: 0 });
      }
      setLoading(false);
    };
    loadMyStats();
  }, [user.nama, dateRange]);

  // Gamification Levels
  const calculateLevel = (inputs) => {
     if (inputs > 100) return { name: 'Grand Master', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: <Crown size={18} className="fill-current"/> };
     if (inputs > 50) return { name: 'Elite Expert', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/50', icon: <Medal size={18} className="fill-current"/> };
     return { name: 'Rookie Agent', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: <Zap size={18} className="fill-current"/> };
  };

  const level = stats ? calculateLevel(stats.input_count) : { name: 'Loading...', color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700' };

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 md:px-0 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between py-6">
         <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kinerja <span className="text-blue-600">Saya</span></h1>
            <p className="text-slate-500 font-medium text-sm">Overview performa bulan ini</p>
         </div>
         <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-sm font-bold text-slate-600">
            <Calendar size={16} className="text-blue-500"/> {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
         </div>
      </div>

      {loading ? (
        <div className="h-80 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-xl">
           <Loader2 className="animate-spin text-blue-600 mb-3" size={40} />
           <span className="text-slate-400 font-bold animate-pulse">Menghitung Data...</span>
        </div>
      ) : (
        <div className="space-y-6">
           
           {/* 1. HERO CARD (Dark Theme) */}
           <motion.div 
             initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
             className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white p-8 md:p-10 shadow-2xl shadow-blue-900/20 group"
           >
              {/* Background FX */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900/40 z-0"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                 {/* Left: Avatar & Identity */}
                 <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0">
                    <UserAvatar foto={user?.foto} name={user?.nama} className="w-28 h-28 md:w-32 md:h-32 mb-4" />
                    
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border backdrop-blur-md mb-2 ${level.color} ${level.bg} ${level.border}`}>
                        {level.icon} {level.name}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight">{user?.nama}</h2>
                    <p className="text-slate-400 font-medium flex items-center gap-2 mt-1">
                        <Award size={16}/> {user?.jabatan || 'Operator'} • Zone {user?.plant_zone || 'A'}
                    </p>
                 </div>

                 {/* Divider (Desktop Only) */}
                 <div className="hidden md:block w-px h-32 bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>

                 {/* Right: Big Stats */}
                 <div className="flex-1 grid grid-cols-2 gap-8 w-full">
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5 backdrop-blur-sm hover:bg-white/10 transition">
                       <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Target size={14}/> Total Input
                       </p>
                       <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                          <CountUp value={stats?.input_count} />
                       </p>
                       <p className="text-xs text-blue-300/70 mt-1 font-medium">Batch terdata</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5 backdrop-blur-sm hover:bg-white/10 transition">
                       <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                          <TrendingUp size={14} className="text-red-400"/> Total Downtime
                       </p>
                       <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-white">
                          <CountUp value={stats?.total_downtime} />
                       </p>
                       <p className="text-xs text-red-300/70 mt-1 font-medium">Menit hilang</p>
                    </div>
                 </div>
              </div>
           </motion.div>

           {/* 2. STATS & ACTION GRID */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Productivity Circle */}
              <motion.div 
                 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                 className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex flex-col items-center justify-center md:col-span-1"
              >
                 <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                       <circle cx="50%" cy="50%" r="45%" className="stroke-slate-100" strokeWidth="12" fill="transparent"/>
                       <motion.circle 
                          initial={{ pathLength: 0 }} 
                          whileInView={{ pathLength: Math.min((stats?.input_count || 0) / 100, 1) }}
                          transition={{ duration: 2, ease: "easeOut" }}
                          cx="50%" cy="50%" r="45%" 
                          className="stroke-blue-500" 
                          strokeWidth="12" 
                          strokeLinecap="round" 
                          fill="transparent"
                          strokeDasharray="1 1"
                       />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-3xl font-black text-slate-800"><CountUp value={stats?.input_count} /></span>
                       <span className="text-[10px] uppercase font-bold text-slate-400">Target 100</span>
                    </div>
                 </div>
                 <h3 className="font-bold text-slate-800 mt-4">Produktivitas</h3>
                 <p className="text-xs text-slate-400 text-center px-4">Persentase pencapaian target batch bulanan.</p>
              </motion.div>

              {/* Downtime Frequency */}
              <motion.div 
                 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                 className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex flex-col justify-between md:col-span-2"
              >
                 <div>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-3 bg-red-50 rounded-2xl text-red-500"><TrendingUp size={24}/></div>
                       <div>
                          <h3 className="font-bold text-slate-800 text-lg">Frekuensi Masalah</h3>
                          <p className="text-xs text-slate-400">Kejadian downtime bulan ini</p>
                       </div>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                       <span className="text-6xl font-black text-slate-800"><CountUp value={stats?.downtime_events} /></span>
                       <span className="text-lg font-bold text-slate-400 mb-3">Kejadian</span>
                    </div>
                 </div>
                 
                 {/* Progress Bar Visual */}
                 <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mt-4">
                    <motion.div 
                       initial={{ width: 0 }} 
                       whileInView={{ width: `${Math.min((stats?.downtime_events || 0) * 10, 100)}%` }} // Asumsi max 10 kejadian = 100%
                       className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"
                    />
                 </div>
                 <p className="text-xs text-right mt-2 text-slate-400 font-medium">Batas Toleransi: 10 Kejadian</p>
              </motion.div>
           </div>

           {/* 3. QUICK ACTIONS (HISTORY) */}
           <motion.button 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.01, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white p-6 rounded-[2rem] shadow-md border border-slate-100 flex items-center justify-between group cursor-pointer"
           >
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <History size={24}/>
                 </div>
                 <div className="text-left">
                    <h3 className="font-bold text-lg text-slate-800">Lihat Riwayat Lengkap</h3>
                    <p className="text-sm text-slate-400">Cek detail log aktivitas harian Anda</p>
                 </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-full text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                 <ChevronRight size={20}/>
              </div>
           </motion.button>

        </div>
      )}
    </div>
  );
};

export default Kinerja;