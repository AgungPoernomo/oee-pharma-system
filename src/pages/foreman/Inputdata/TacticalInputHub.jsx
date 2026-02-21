import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, Clock, ArrowRight, Hexagon, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TacticalInputHub = () => {
  const navigate = useNavigate();
  
  // STATE: Menyimpan pilihan tahap pertama (OEE atau Downtime)
  // null = belum pilih, 'OEE' = input OEE, 'DT' = input Downtime
  const [selectedType, setSelectedType] = useState(null); 

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

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans overflow-hidden relative">
      {/* BACKGROUND FX */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10 flex flex-col items-center justify-center min-h-[80vh]">
        
        {/* HEADER DINAMIS */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
           <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 mb-4 backdrop-blur-md">
              <Hexagon size={14} className="text-blue-400 fill-blue-400/20"/>
              <span className="text-[10px] font-bold tracking-[0.2em] text-slate-300">SYSTEM READY</span>
           </div>
           
           <AnimatePresence mode='wait'>
             {!selectedType ? (
               <motion.h1 key="title-main" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="text-4xl md:text-6xl font-black tracking-tight mb-2">
                 Pilih Jenis <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Laporan</span>
               </motion.h1>
             ) : (
               <motion.h1 key="title-zone" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="text-4xl md:text-6xl font-black tracking-tight mb-2">
                 Pilih <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Lokasi / Zone</span>
               </motion.h1>
             )}
           </AnimatePresence>
           
           <p className="text-slate-400 text-lg font-light">
             {!selectedType ? "Apa yang ingin Anda input saat ini?" : `Anda akan menginput data ${selectedType === 'OEE' ? 'OEE (Reject & Yield)' : 'Downtime & Stop Mesin'}`}
           </p>
        </motion.div>

        {/* STEP 1: PILIH TIPE (OEE vs DOWNTIME) */}
        {!selectedType && (
           <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              {/* BUTTON INPUT OEE */}
              <motion.button variants={itemAnim} onClick={() => setSelectedType('OEE')} 
                 whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                 className="group relative bg-[#131b2e] rounded-[2.5rem] border border-blue-500/20 p-10 hover:border-blue-500/50 transition-all duration-300 shadow-2xl text-left"
              >
                 <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-400">
                    <AlertOctagon size={32} />
                 </div>
                 <h2 className="text-3xl font-black text-white mb-2 group-hover:text-blue-200">INPUT OEE</h2>
                 <p className="text-slate-400 text-sm mb-6">Data Produksi, Reject, Yield, & Counter.</p>
                 <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    Lanjut <ArrowRight size={14}/>
                 </div>
              </motion.button>

              {/* BUTTON INPUT DOWNTIME */}
              <motion.button variants={itemAnim} onClick={() => setSelectedType('DT')} 
                 whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                 className="group relative bg-[#131b2e] rounded-[2.5rem] border border-orange-500/20 p-10 hover:border-orange-500/50 transition-all duration-300 shadow-2xl text-left"
              >
                 <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500 group-hover:text-white transition-colors text-orange-400">
                    <Clock size={32} />
                 </div>
                 <h2 className="text-3xl font-black text-white mb-2 group-hover:text-orange-200">INPUT DOWNTIME</h2>
                 <p className="text-slate-400 text-sm mb-6">Stop Mesin, Kerusakan, & Maintenance Log.</p>
                 <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    Lanjut <ArrowRight size={14}/>
                 </div>
              </motion.button>
           </motion.div>
        )}

        {/* STEP 2: PILIH ZONE (C vs F) */}
        {selectedType && (
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <button onClick={() => handleZoneSelect('C')} className="bg-[#1e293b] hover:bg-emerald-900/20 border border-emerald-500/20 hover:border-emerald-500/50 p-8 rounded-3xl flex items-center gap-6 transition-all group">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl font-black text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">C</div>
                    <div className="text-left">
                       <h3 className="text-2xl font-black text-white">ZONE C</h3>
                       <p className="text-slate-400 text-sm">Area Produksi C</p>
                    </div>
                    <ArrowRight className="ml-auto text-slate-600 group-hover:text-white group-hover:translate-x-2 transition-transform"/>
                 </button>

                 <button onClick={() => handleZoneSelect('F')} className="bg-[#1e293b] hover:bg-cyan-900/20 border border-cyan-500/20 hover:border-cyan-500/50 p-8 rounded-3xl flex items-center gap-6 transition-all group">
                    <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center text-4xl font-black text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all">F</div>
                    <div className="text-left">
                       <h3 className="text-2xl font-black text-white">ZONE F</h3>
                       <p className="text-slate-400 text-sm">Area Produksi F</p>
                    </div>
                    <ArrowRight className="ml-auto text-slate-600 group-hover:text-white group-hover:translate-x-2 transition-transform"/>
                 </button>
              </div>

              <button onClick={resetSelection} className="mt-8 mx-auto flex items-center gap-2 text-slate-500 hover:text-white px-6 py-3 rounded-full hover:bg-white/5 transition-all">
                 <ArrowLeft size={16}/> Kembali ke Pilihan Laporan
              </button>
           </motion.div>
        )}

      </div>
    </div>
  );
};

export default TacticalInputHub;