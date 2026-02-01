import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitOEEData, fetchValidationData } from '../services/api';
import { 
  Save, Clock, AlertTriangle, Calendar, Factory, 
  AlertOctagon, XCircle, Search, Activity, ChevronRight, 
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

const InputData = () => {
  const { user } = useAuth();
  
  // --- STATE ---
  const [inputType, setInputType] = useState('downtime'); 
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({});
  const [duration, setDuration] = useState(null); // Fitur tambahan: Kalkulasi durasi otomatis

  // State Dropdown (Sesuai Script Asli)
  const [dropdowns, setDropdowns] = useState({
    shift: [], group: [], type: ['Unplanned', 'Planned'],
    root_cause: [], proses: [], unit: [], kasus: [],
    proses_reject: [], detail_reject: []
  });

  const initialForm = {
    tanggal: new Date().toISOString().split('T')[0],
    shift: '', group: '', batch: '',
    start_time: '', end_time: '', type: 'Unplanned',
    root_cause: '', proses: '', unit: '', kasus: '',
    proses_reject: '', detail_reject: '', output_good: '', output_reject: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Hitung Progress Pengisian Form (Visual Feedback)
  const calculateProgress = () => {
    let filled = 0;
    let total = 0;
    const commonFields = ['tanggal', 'shift', 'group', 'batch'];
    commonFields.forEach(f => { if(formData[f]) filled++; });
    total += commonFields.length;

    if (inputType === 'downtime') {
        const dtFields = ['start_time', 'end_time', 'proses', 'unit', 'root_cause', 'kasus'];
        dtFields.forEach(f => { if(formData[f]) filled++; });
        total += dtFields.length;
    } else {
        const rjFields = ['proses_reject', 'detail_reject', 'output_good', 'output_reject'];
        rjFields.forEach(f => { if(formData[f]) filled++; });
        total += rjFields.length;
    }
    return Math.round((filled / total) * 100);
  };
  const progress = calculateProgress();

  // --- 1. LOAD DATA UTAMA ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchValidationData();
        if (res.status === 'success') {
          setMasterData(res.data);
          setDropdowns(prev => ({
            ...prev,
            shift: res.data['Shift'] || ['1', '2', '3'],
            group: res.data['Group'] || ['A', 'B', 'C', 'D'],
            kasus: res.data['List_Kasus'] || res.data['Kasus'] || [] 
          }));
        }
      } catch (e) { toast.error("Gagal memuat data validasi."); }
    };
    loadData();
  }, []);

  // --- 2. LOGIKA ZONE & MAPPING DROPDOWN (PENTING) ---
  useEffect(() => {
    if (Object.keys(masterData).length === 0) return;
    
    // Logika penentuan Zone dari user login
    const rawZone = (user?.zone || 'C').toUpperCase().replace('ZONE ', '').trim();
    const zone = (rawZone === '-' || rawZone === 'ALL') ? 'C' : rawZone; 

    // Mapping dropdown berdasarkan Zone (Sesuai Script Asli)
    setDropdowns(prev => ({
      ...prev,
      root_cause: masterData[`RC_${zone}`] || [],         // Dropdown Root Cause
      proses: masterData[`DT_Proses_${zone}`] || [],      // Dropdown Proses Downtime
      proses_reject: masterData[`RJ_Proses_${zone}`] || [] // Dropdown Proses Reject
    }));
  }, [masterData, user]);

  // --- 3. AUTO DURATION (Utility Tambahan) ---
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
        const start = new Date(`1970-01-01T${formData.start_time}:00`);
        const end = new Date(`1970-01-01T${formData.end_time}:00`);
        let diff = (end - start) / 1000 / 60; 
        if (diff < 0) diff += 24 * 60; 
        setDuration(diff);
    } else {
        setDuration(null);
    }
  }, [formData.start_time, formData.end_time]);

  // --- 4. HANDLE CHANGE (CASCADING LOGIC) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Logic: Jika Proses dipilih -> Update List Unit
    if (name === 'proses') {
        const headerTarget = `Unit_${value}`; 
        const unitList = masterData[headerTarget] || [];
        setDropdowns(prev => ({ ...prev, unit: unitList }));
        setFormData(prev => ({ ...prev, [name]: value, unit: '' })); // Reset unit saat proses berubah
    }

    // Logic: Jika Proses Reject dipilih -> Update Detail Reject
    if (name === 'proses_reject') {
        const headerTarget = `Detail_${value}`;
        const detailList = masterData[headerTarget] || [];
        setDropdowns(prev => ({ ...prev, detail_reject: detailList }));
        setFormData(prev => ({ ...prev, [name]: value, detail_reject: '' })); // Reset detail saat proses berubah
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validasi Kelengkapan (Opsional tapi disarankan)
    if (progress < 100) {
        toast.error("Mohon lengkapi semua data!");
        setLoading(false); return;
    }

    const payload = { ...formData, jenis_input: inputType };

    // Validasi Logic Asli
    if (inputType === 'downtime') {
        if (!formData.start_time || !formData.end_time) { toast.error("Jam wajib diisi!"); setLoading(false); return; }
        if (!formData.proses || !formData.unit) { toast.error("Proses & Unit wajib diisi!"); setLoading(false); return; }
    }
    if (inputType === 'reject') {
        if (!formData.proses_reject || !formData.detail_reject) { toast.error("Detail reject wajib diisi!"); setLoading(false); return; }
    }

    const res = await submitOEEData(payload);
    setLoading(false);

    if (res.status === 'success') {
      toast.success(`Laporan Tersimpan!`);
      // Reset form tapi pertahankan shift/group/tanggal
      setFormData(prev => ({
          ...initialForm,
          tanggal: prev.tanggal, shift: prev.shift, group: prev.group, batch: ''
      }));
      setDuration(null);
    } else {
      toast.error("Gagal: " + res.message);
    }
  };

  // Theme Config
  const theme = inputType === 'downtime' ? {
      bg: 'from-orange-900 via-slate-900 to-black',
      accent: 'text-orange-500',
      gradient: 'from-orange-600 to-red-600',
      border: 'border-orange-500/20'
  } : {
      bg: 'from-blue-900 via-slate-900 to-black',
      accent: 'text-blue-500',
      gradient: 'from-blue-600 to-cyan-500',
      border: 'border-blue-500/20'
  };

  return (
    <div className={`min-h-screen bg-[#0B1120] pb-24 font-sans relative overflow-x-hidden transition-all duration-700`}>
      <Toaster position="top-center" toastOptions={{style: {background: '#1e293b', color: '#fff', border: '1px solid #334155'}}} />

      {/* DYNAMIC BACKGROUND */}
      <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b ${theme.bg} opacity-50 transition-colors duration-700 z-0`}></div>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>

      <div className="max-w-3xl mx-auto px-4 relative z-10 pt-8">
        
        {/* HEADER: COCKPIT STYLE */}
        <div className="flex justify-between items-end mb-8">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <div className={`w-2 h-2 rounded-full ${inputType === 'downtime' ? 'bg-orange-500' : 'bg-blue-500'} animate-pulse`}></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{user?.zone || 'ZONE C'}</span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight">Operator <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">Logbook</span></h1>
           </div>
           
           {/* PROGRESS RING */}
           <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                 <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                 <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                    strokeDasharray="175" strokeDashoffset={175 - (175 * progress) / 100} 
                    className={`${inputType === 'downtime' ? 'text-orange-500' : 'text-blue-500'} transition-all duration-500 ease-out`} 
                    strokeLinecap="round"
                 />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Step</span>
                 <span className="text-sm font-black text-white">{progress}%</span>
              </div>
           </div>
        </div>

        {/* --- MODE SWITCHER (SLIDING) --- */}
        <div className="bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl flex relative mb-8 border border-white/10 shadow-2xl">
           <motion.div 
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-r ${theme.gradient} rounded-xl shadow-lg z-0 ${inputType === 'reject' ? 'left-[calc(50%+3px)]' : 'left-1.5'}`}
           />
           <button onClick={() => setInputType('downtime')} className="flex-1 py-3 relative z-10 flex items-center justify-center gap-2 text-sm font-bold text-white transition-opacity">
              <Clock size={18} className={inputType === 'downtime' ? 'animate-pulse' : 'opacity-50'}/> Downtime
           </button>
           <button onClick={() => setInputType('reject')} className="flex-1 py-3 relative z-10 flex items-center justify-center gap-2 text-sm font-bold text-white transition-opacity">
              <XCircle size={18} className={inputType === 'reject' ? 'animate-pulse' : 'opacity-50'}/> Reject
           </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. CONTEXT CARD (SHIFT & BATCH) */}
          <div className="bg-[#131b2e] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                 
                 {/* Quick Shift Selector */}
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-3 block tracking-wider">Select Shift</label>
                    <div className="flex gap-2">
                       {dropdowns.shift.map(s => (
                          <button 
                             key={s} type="button"
                             onClick={() => setFormData({...formData, shift: s})}
                             className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${formData.shift === s ? `bg-white text-slate-900 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]` : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'}`}
                          >
                             {s}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Group</label>
                        <select name="group" value={formData.group} onChange={handleChange} className="w-full bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 focus:border-white outline-none appearance-none font-bold text-center transition-colors">
                           <option value="">-</option>
                           {dropdowns.group.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Batch No.</label>
                        <input type="text" name="batch" value={formData.batch} onChange={handleChange} className="w-full bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 focus:border-white outline-none font-mono text-center uppercase placeholder:text-slate-700 transition-colors" placeholder="BATCH" />
                    </div>
                 </div>
              </div>
          </div>

          {/* 2. DYNAMIC INPUT AREA */}
          <AnimatePresence mode="wait">
              
              {/* === DOWNTIME MODE === */}
              {inputType === 'downtime' ? (
                <motion.div 
                   key="downtime" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
                   className="space-y-4"
                >
                   {/* TIME CALCULATOR */}
                   <div className="bg-[#131b2e] p-6 rounded-[2rem] border border-orange-500/20 relative overflow-hidden shadow-lg shadow-orange-900/10">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><Clock size={120} className="text-orange-500"/></div>
                      <div className="grid grid-cols-2 gap-6 relative z-10">
                         <div>
                            <label className="text-[10px] font-bold text-orange-500 uppercase mb-2 block tracking-wider">Jam Stop</label>
                            <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-white text-2xl p-4 rounded-xl font-mono focus:border-orange-500 outline-none text-center transition-colors shadow-inner"/>
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-orange-500 uppercase mb-2 block tracking-wider">Jam Start</label>
                            <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-white text-2xl p-4 rounded-xl font-mono focus:border-orange-500 outline-none text-center transition-colors shadow-inner"/>
                         </div>
                      </div>
                      
                      {/* Live Calculation Display */}
                      {duration !== null && (
                         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">Calculated Duration</span>
                            <span className="text-xl font-black text-white flex items-center gap-2">
                               {duration} <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">MINUTES</span>
                            </span>
                         </motion.div>
                      )}
                   </div>

                   <div className="bg-[#131b2e] p-6 rounded-[2rem] border border-white/5 space-y-5 shadow-xl">
                      {/* Kategori Toggle */}
                      <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block ml-1 tracking-wider">Kategori Masalah</label>
                         <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                            {['Unplanned', 'Planned'].map(t => (
                               <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${formData.type === t ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                  {t}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="relative">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-wider">Area Proses</label>
                            <select name="proses" value={formData.proses} onChange={handleChange} className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-orange-500 outline-none appearance-none font-medium transition-colors">
                               <option value="">-- Pilih Proses --</option>
                               {/* MAPPING DROPDOWN PROSES */}
                               {dropdowns.proses.map((o,i) => <option key={i} value={o}>{o}</option>)}
                            </select>
                            <div className="absolute right-4 top-[38px] text-slate-500 pointer-events-none"><ChevronRight size={16} className="rotate-90"/></div>
                         </div>
                         <div className="relative">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-wider">Unit Mesin</label>
                            <select name="unit" value={formData.unit} onChange={handleChange} className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-orange-500 outline-none appearance-none font-medium disabled:opacity-50 transition-colors" disabled={!formData.proses}>
                               <option value="">-- Pilih Unit --</option>
                               {/* MAPPING DROPDOWN UNIT (CASCADING) */}
                               {dropdowns.unit.map((o,i) => <option key={i} value={o}>{o}</option>)}
                            </select>
                         </div>
                      </div>

                      <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-wider">Root Cause (Analisa)</label>
                         <select name="root_cause" value={formData.root_cause} onChange={handleChange} className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-orange-500 outline-none appearance-none font-medium transition-colors">
                            <option value="">-- Pilih Root Cause --</option>
                            {/* MAPPING DROPDOWN ROOT CAUSE */}
                            {dropdowns.root_cause.map((o,i) => <option key={i} value={o}>{o}</option>)}
                         </select>
                      </div>
                      
                      <div className="relative">
                         <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-wider">Masalah (Kasus)</label>
                         <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                            <input list="kasus-list" type="text" name="kasus" value={formData.kasus} onChange={handleChange} className="w-full bg-slate-900 text-white p-4 pl-12 rounded-xl border border-slate-700 focus:border-orange-500 outline-none placeholder:text-slate-600 transition-colors" placeholder="Ketik atau cari masalah..."/>
                         </div>
                         <datalist id="kasus-list">
                             {/* MAPPING DROPDOWN KASUS */}
                             {dropdowns.kasus.map((item, idx) => <option key={idx} value={item} />)}
                         </datalist>
                      </div>
                   </div>
                </motion.div>
              ) : (
                
                /* === REJECT MODE === */
                <motion.div 
                   key="reject" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
                   className="space-y-4"
                >
                   <div className="bg-[#131b2e] p-6 rounded-[2rem] border border-blue-500/20 relative overflow-hidden shadow-lg shadow-blue-900/10">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><AlertOctagon size={120} className="text-blue-500"/></div>
                      
                      <div className="relative z-10 space-y-5">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                               <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 ml-1 tracking-wider">Area Reject</label>
                               <select name="proses_reject" value={formData.proses_reject} onChange={handleChange} className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none appearance-none font-medium transition-colors">
                                  <option value="">-- Pilih Proses --</option>
                                  {/* MAPPING PROSES REJECT */}
                                  {dropdowns.proses_reject.map((o,i) => <option key={i} value={o}>{o}</option>)}
                               </select>
                            </div>
                            <div>
                               <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 ml-1 tracking-wider">Jenis Defect</label>
                               <select name="detail_reject" value={formData.detail_reject} onChange={handleChange} className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none appearance-none font-medium disabled:opacity-50 transition-colors" disabled={!formData.proses_reject}>
                                  <option value="">-- Pilih Detail --</option>
                                  {/* MAPPING DETAIL REJECT */}
                                  {dropdowns.detail_reject.map((o,i) => <option key={i} value={o}>{o}</option>)}
                               </select>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="bg-emerald-900/10 p-4 rounded-2xl border border-emerald-500/30 text-center group focus-within:border-emerald-400 transition-colors">
                               <label className="text-[10px] font-bold text-emerald-500 uppercase mb-1 block tracking-wider">Output OK</label>
                               <input type="number" name="output_good" value={formData.output_good} onChange={handleChange} className="w-full bg-transparent text-emerald-400 text-3xl font-black outline-none text-center placeholder:text-emerald-500/20" placeholder="0"/>
                            </div>
                            <div className="bg-red-900/10 p-4 rounded-2xl border border-red-500/30 text-center group focus-within:border-red-400 transition-colors">
                               <label className="text-[10px] font-bold text-red-500 uppercase mb-1 block tracking-wider">Output NG</label>
                               <input type="number" name="output_reject" value={formData.output_reject} onChange={handleChange} className="w-full bg-transparent text-red-400 text-3xl font-black outline-none text-center placeholder:text-red-500/20" placeholder="0"/>
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}
          </AnimatePresence>

          {/* SUBMIT BUTTON */}
          <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || progress < 100} 
              type="submit" 
              className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${progress < 100 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : `bg-gradient-to-r ${theme.gradient} shadow-${theme.accent}/30`}`}
          >
              {loading ? <Loader2 className="animate-spin"/> : <><Save size={22}/> {progress < 100 ? 'Lengkapi Data Dulu' : 'Simpan Laporan'}</>}
          </motion.button>

        </form>
      </div>
    </div>
  );
};

export default InputData;