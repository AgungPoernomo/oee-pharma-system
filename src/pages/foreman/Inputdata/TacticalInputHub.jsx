import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, Clock, ArrowRight, Hexagon, ArrowLeft, Table
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TacticalInputHub = () => {
  const navigate = useNavigate();
  
  const [selectedType, setSelectedType] = useState(null); 

  const [isDark, setIsDark] = useState(() => (localStorage.getItem('appTheme') || 'dark') === 'dark');

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark((localStorage.getItem('appTheme') || 'dark') === 'dark');
    };
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const handleZoneSelect = (zone) => {
    if (selectedType === 'OEE') {
      navigate(zone === 'C' ? '/foreman/input/reject/c' : '/foreman/input/reject/f');
    } else if (selectedType === 'DT') {
      navigate(zone === 'C' ? '/foreman/input/downtime/c' : '/foreman/input/downtime/f');
    }
  };

  const handleSpreadsheetSelect = (zone) => {
    navigate(`/foreman/input-${zone.toLowerCase()}`); 
  };

  const resetSelection = () => setSelectedType(null);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemAnim = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  const bgMain = isDark ? 'bg-[#0B1120]' : 'bg-slate-50';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const badgeBg = isDark ? 'bg-white/5 border-white/10' : 'bg-slate-200 border-slate-300';
  const cardBg = isDark ? 'bg-[#131b2e]' : 'bg-white';
  const zoneCardBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const zoneCardHover = isDark ? 'hover:bg-opacity-80' : 'hover:bg-slate-50';

  return (
    <div className={`min-h-screen font-sans overflow-hidden relative transition-colors duration-500 ${bgMain} ${textMain}`}>
      {isDark && (
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10 flex flex-col items-center justify-center min-h-[80vh]">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
           <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4 backdrop-blur-md ${badgeBg}`}>
              <Hexagon size={14} className="text-blue-500 fill-blue-500/20"/>
              <span className={`text-[10px] font-bold tracking-[0.2em] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>SYSTEM READY</span>
           </div>
           
           <AnimatePresence mode='wait'>
             {!selectedType ? (
               <motion.h1 key="title-main" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className={`text-4xl md:text-5xl font-black tracking-tight mb-2 ${textMain}`}>
                 Pilih Jenis <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Laporan</span>
               </motion.h1>
             ) : (
               <motion.h1 key="title-zone" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className={`text-4xl md:text-5xl font-black tracking-tight mb-2 ${textMain}`}>
                 Pilih <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Lokasi / Zone</span>
               </motion.h1>
             )}
           </AnimatePresence>
           
           <p className={`text-lg font-light mt-2 ${textMuted}`}>
             {!selectedType ? "Apa yang ingin Anda input saat ini?" : `Anda akan menginput data ${selectedType === 'OEE' ? 'OEE (Reject & Yield)' : 'Downtime & Stop Mesin'}`}
           </p>
        </motion.div>

        {!selectedType && (
           <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

              {/* ✨ BUTTON BARU: INPUT C (SPREADSHEET REAL-TIME) ✨ */}
              <motion.button variants={itemAnim} onClick={() => handleSpreadsheetSelect('C')} 
                 whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                 className={`group relative rounded-[2rem] border-2 p-8 transition-all duration-300 shadow-xl text-left
                 ${cardBg} ${isDark ? 'border-emerald-500/40 hover:border-emerald-400' : 'border-emerald-400 hover:border-emerald-500'}`}
              >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors 
                 ${isDark ? 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                    <Table size={28} />
                 </div>
                 <h2 className={`text-2xl font-black mb-1 transition-colors ${isDark ? 'text-white group-hover:text-emerald-300' : 'text-slate-800 group-hover:text-emerald-700'}`}>INPUT C (LIVE)</h2>
                 <p className={`text-sm mb-4 ${textMuted}`}>Tabel Data OEE & Downtime</p>
                 <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Eksekusi <ArrowRight size={14}/>
                 </div>
              </motion.button>

              {/* ✨ BUTTON BARU: INPUT F (SPREADSHEET REAL-TIME) ✨ */}
              <motion.button variants={itemAnim} onClick={() => handleSpreadsheetSelect('F')} 
                 whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                 className={`group relative rounded-[2rem] border-2 p-8 transition-all duration-300 shadow-xl text-left
                 ${cardBg} ${isDark ? 'border-cyan-500/40 hover:border-cyan-400' : 'border-cyan-400 hover:border-cyan-500'}`}
              >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors 
                 ${isDark ? 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white' : 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white'}`}>
                    <Table size={28} />
                 </div>
                 <h2 className={`text-2xl font-black mb-1 transition-colors ${isDark ? 'text-white group-hover:text-cyan-300' : 'text-slate-800 group-hover:text-cyan-700'}`}>INPUT F (LIVE)</h2>
                 <p className={`text-sm mb-4 ${textMuted}`}>Tabel Data OEE & Downtime</p>
                 <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    Eksekusi <ArrowRight size={14}/>
                 </div>
              </motion.button>

           </motion.div>
        )}

        {/* STEP 2: PILIH ZONE UNTUK LEGACY (C vs F) */}
        {selectedType && (
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <button onClick={() => handleZoneSelect('C')} className={`${zoneCardBg} ${zoneCardHover} ${isDark ? 'border-emerald-500/20 hover:bg-emerald-900/20 hover:border-emerald-500/50' : 'border-slate-200 hover:border-emerald-400'} border p-8 rounded-3xl flex items-center gap-6 transition-all group shadow-xl`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black transition-all ${isDark ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white'}`}>C</div>
                    <div className="text-left">
                       <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>ZONE C</h3>
                       <p className={`text-sm ${textMuted}`}>Area Produksi C (Legacy)</p>
                    </div>
                    <ArrowRight className={`ml-auto transition-transform group-hover:translate-x-2 ${isDark ? 'text-slate-600 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-800'}`}/>
                 </button>

                 <button onClick={() => handleZoneSelect('F')} className={`${zoneCardBg} ${zoneCardHover} ${isDark ? 'border-cyan-500/20 hover:bg-cyan-900/20 hover:border-cyan-500/50' : 'border-slate-200 hover:border-cyan-400'} border p-8 rounded-3xl flex items-center gap-6 transition-all group shadow-xl`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black transition-all ${isDark ? 'bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white' : 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white'}`}>F</div>
                    <div className="text-left">
                       <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>ZONE F</h3>
                       <p className={`text-sm ${textMuted}`}>Area Produksi F (Legacy)</p>
                    </div>
                    <ArrowRight className={`ml-auto transition-transform group-hover:translate-x-2 ${isDark ? 'text-slate-600 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-800'}`}/>
                 </button>
              </div>

              <button onClick={resetSelection} className={`mt-8 mx-auto flex items-center gap-2 px-6 py-3 rounded-full transition-all ${isDark ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}>
                 <ArrowLeft size={16}/> Kembali ke Menu Utama
              </button>
           </motion.div>
        )}

      </div>
    </div>
  );
};

export default TacticalInputHub;