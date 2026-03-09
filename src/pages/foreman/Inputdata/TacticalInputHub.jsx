import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, Clock, ArrowRight, Hexagon, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TacticalInputHub = () => {
  const navigate = useNavigate();
  
  // STATE: Menyimpan pilihan tahap pertama (OEE atau Downtime)
  const [selectedType, setSelectedType] = useState(null); 

  // STATE TEMA (Mendengarkan ForemanSettings)
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('appTheme') || 'dark') === 'dark');

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark((localStorage.getItem('appTheme') || 'dark') === 'dark');
    };
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // --- NAVIGATION LOGIC ---
  const handleZoneSelect = (zone) => {
    if (selectedType === 'OEE') {
      navigate(zone === 'C' ? '/foreman/input/reject/c' : '/foreman/input/reject/f');
    } else if (selectedType === 'DT') {
      navigate(zone === 'C' ? '/foreman/input/downtime/c' : '/foreman/input/downtime/f');
    }
  };

  const resetSelection = () => setSelectedType(null);

  // --- ANIMATION ---
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemAnim = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  // --- THEME CLASSES ---
  const bgMain = isDark ? 'bg-[#0B1120]' : 'bg-slate-50';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const badgeBg = isDark ? 'bg-white/5 border-white/10' : 'bg-slate-200 border-slate-300';
  const cardBg = isDark ? 'bg-[#131b2e]' : 'bg-white';
  const zoneCardBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const zoneCardHover = isDark ? 'hover:bg-opacity-80' : 'hover:bg-slate-50';

  return (
    <div className={`min-h-screen font-sans overflow-hidden relative transition-colors duration-500 ${bgMain} ${textMain}`}>
      {/* BACKGROUND FX (Hanya tampil di Dark Mode untuk estetika) */}
      {isDark && (
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10 flex flex-col items-center justify-center min-h-[80vh]">
        
        {/* HEADER DINAMIS */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
           <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4 backdrop-blur-md ${badgeBg}`}>
              <Hexagon size={14} className="text-blue-500 fill-blue-500/20"/>
              <span className={`text-[10px] font-bold tracking-[0.2em] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>SYSTEM READY</span>
           </div>
           
           <AnimatePresence mode='wait'>
             {!selectedType ? (
               <motion.h1 key="title-main" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className={`text-4xl md:text-6xl font-black tracking-tight mb-2 ${textMain}`}>
                 Pilih Jenis <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Laporan</span>
               </motion.h1>
             ) : (
               <motion.h1 key="title-zone" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className={`text-4xl md:text-6xl font-black tracking-tight mb-2 ${textMain}`}>
                 Pilih <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Lokasi / Zone</span>
               </motion.h1>
             )}
           </AnimatePresence>
           
           <p className={`text-lg font-light ${textMuted}`}>
             {!selectedType ? "Apa yang ingin Anda input saat ini?" : `Anda akan menginput data ${selectedType === 'OEE' ? 'OEE (Reject & Yield)' : 'Downtime & Stop Mesin'}`}
           </p>
        </motion.div>

        {/* STEP 1: PILIH TIPE (OEE vs DOWNTIME) */}
        {!selectedType && (
           <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              {/* BUTTON INPUT OEE */}
              <motion.button variants={itemAnim} onClick={() => setSelectedType('OEE')} 
                 whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                 className={`group relative rounded-[2.5rem] border p-10 transition-all duration-300 shadow-2xl text-left
                 ${cardBg} ${isDark ? 'border-blue-500/20 hover:border-blue-500/50' : 'border-slate-200 hover:border-blue-400'}`}
              >
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors 
                 ${isDark ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    <AlertOctagon size={32} />
                 </div>
                 <h2 className={`text-3xl font-black mb-2 transition-colors ${isDark ? 'text-white group-hover:text-blue-200' : 'text-slate-800 group-hover:text-blue-700'}`}>INPUT OEE</h2>
                 <p className={`text-sm mb-6 ${textMuted}`}>Data Produksi, Reject, Yield, & Counter.</p>
                 <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    Lanjut <ArrowRight size={14}/>
                 </div>
              </motion.button>

              {/* BUTTON INPUT DOWNTIME */}
              <motion.button variants={itemAnim} onClick={() => setSelectedType('DT')} 
                 whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                 className={`group relative rounded-[2.5rem] border p-10 transition-all duration-300 shadow-2xl text-left
                 ${cardBg} ${isDark ? 'border-orange-500/20 hover:border-orange-500/50' : 'border-slate-200 hover:border-orange-400'}`}
              >
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors 
                 ${isDark ? 'bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white' : 'bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'}`}>
                    <Clock size={32} />
                 </div>
                 <h2 className={`text-3xl font-black mb-2 transition-colors ${isDark ? 'text-white group-hover:text-orange-200' : 'text-slate-800 group-hover:text-orange-700'}`}>INPUT DOWNTIME</h2>
                 <p className={`text-sm mb-6 ${textMuted}`}>Stop Mesin, Kerusakan, & Maintenance Log.</p>
                 <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                    Lanjut <ArrowRight size={14}/>
                 </div>
              </motion.button>
           </motion.div>
        )}

        {/* STEP 2: PILIH ZONE (C vs F) */}
        {selectedType && (
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <button onClick={() => handleZoneSelect('C')} className={`${zoneCardBg} ${zoneCardHover} ${isDark ? 'border-emerald-500/20 hover:bg-emerald-900/20 hover:border-emerald-500/50' : 'border-slate-200 hover:border-emerald-400'} border p-8 rounded-3xl flex items-center gap-6 transition-all group shadow-xl`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black transition-all ${isDark ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white'}`}>C</div>
                    <div className="text-left">
                       <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>ZONE C</h3>
                       <p className={`text-sm ${textMuted}`}>Area Produksi C</p>
                    </div>
                    <ArrowRight className={`ml-auto transition-transform group-hover:translate-x-2 ${isDark ? 'text-slate-600 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-800'}`}/>
                 </button>

                 <button onClick={() => handleZoneSelect('F')} className={`${zoneCardBg} ${zoneCardHover} ${isDark ? 'border-cyan-500/20 hover:bg-cyan-900/20 hover:border-cyan-500/50' : 'border-slate-200 hover:border-cyan-400'} border p-8 rounded-3xl flex items-center gap-6 transition-all group shadow-xl`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black transition-all ${isDark ? 'bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white' : 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white'}`}>F</div>
                    <div className="text-left">
                       <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>ZONE F</h3>
                       <p className={`text-sm ${textMuted}`}>Area Produksi F</p>
                    </div>
                    <ArrowRight className={`ml-auto transition-transform group-hover:translate-x-2 ${isDark ? 'text-slate-600 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-800'}`}/>
                 </button>
              </div>

              <button onClick={resetSelection} className={`mt-8 mx-auto flex items-center gap-2 px-6 py-3 rounded-full transition-all ${isDark ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}>
                 <ArrowLeft size={16}/> Kembali ke Pilihan Laporan
              </button>
           </motion.div>
        )}

      </div>
    </div>
  );
};

export default TacticalInputHub;