import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { submitOEEData, fetchTodayRejectF } from '../../../services/api'; 
import { Save, Database, Activity, Clock, Info, ChevronDown, RefreshCw, Flag, ArrowLeft, Layers, AlertOctagon, Loader2, Package, FileEdit, Trash2, XCircle, Sun, Moon, Maximize, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// --- HARDCODED CONSTANTS ---
const SHIFTS = ["1", "2", "3"];
const GROUPS = ["A", "B", "C", "D"];
const VOLUMES = ["25 ML", "100 ML", "250 ML", "500 ML", "1000 ML"];
const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };
const TEORI_YIELD = 21923;

const parseToYMD = (val) => {
    if (!val) return new Date().toISOString().split('T')[0];
    let str = String(val).replace(/'/g, '').trim(); 
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return new Date().toISOString().split('T')[0];
};

const normalizeDateForSum = (d) => parseToYMD(d);

// --- KOMPONEN UI INPUT ---
const Card = ({ children, title, icon: Icon, color = "purple", theme = "dark" }) => {
    const isDark = theme === 'dark';
    return (
        <div className={`relative overflow-hidden rounded-2xl border shadow-xl mb-6 transition-colors duration-300 ${isDark ? 'bg-[#1e293b]/80 border-white/5 backdrop-blur-sm' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500/50`}></div>
            <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                <div className={`p-1.5 rounded-lg ${isDark ? `bg-${color}-500/20 text-${color}-400` : `bg-${color}-100 text-${color}-600`}`}>{Icon && <Icon size={18} />}</div>
                <h3 className={`text-md font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
};

const ModernInput = ({ label, name, type="number", value, onChange, disabled, placeholder, required, theme="dark" }) => {
    const isDark = theme === 'dark';
    return (
        <div className="group relative">
            <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${required ? 'text-purple-500' : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>{label}</label>
            <input type={type} name={name} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} 
                className={`w-full px-3 py-3 rounded-lg border outline-none font-mono text-sm transition-colors duration-300 
                ${isDark ? 'bg-[#0f172a] text-white border-slate-700 focus:border-purple-500' : 'bg-slate-50 text-slate-800 border-slate-300 focus:border-purple-500'} 
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}/>
        </div>
    );
};

const ModernSelect = ({ label, name, value, onChange, options, theme="dark" }) => {
    const isDark = theme === 'dark';
    return (
        <div className="group relative">
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block text-purple-500">{label}</label>
            <select name={name} value={value} onChange={onChange} 
                className={`w-full px-3 py-3 rounded-lg border outline-none font-bold text-sm appearance-none cursor-pointer transition-colors duration-300
                ${isDark ? 'bg-[#0f172a] text-white border-slate-700 focus:border-purple-500' : 'bg-slate-50 text-slate-800 border-slate-300 focus:border-purple-500'}`}>
                <option value="">-- PILIH --</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-[34px] text-slate-400 pointer-events-none"/>
        </div>
    );
};

const StatBox = ({ label, value, subLabel, color = "purple", theme="dark" }) => {
    const isDark = theme === 'dark';
    return (
        <div className={`flex flex-col justify-center items-center p-3 rounded-lg border transition-colors duration-300 ${isDark ? `bg-[#0f172a] border-${color}-500/30` : `bg-${color}-50 border-${color}-200`}`}>
            <span className={`text-[9px] font-bold uppercase tracking-wider text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
            <span className={`text-xl font-black font-mono my-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</span>
            {subLabel && <span className={`text-[9px] text-${color}-500`}>{subLabel}</span>}
        </div>
    );
};

const TimeInputBlock = ({ title, prefix, formData, handleChange, subtotal, theme="dark" }) => {
    const isDark = theme === 'dark';
    return (
        <div className={`p-3 rounded-xl border transition-colors duration-300 ${isDark ? 'bg-[#0f172a] border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-bold uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{title}</span>
                <span className="text-[10px] font-mono text-purple-600 bg-purple-100 dark:bg-purple-900/20 px-2 py-0.5 rounded">{subtotal || 0}m</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className={`flex rounded-lg p-1 border items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}><input type="number" name={`${prefix}_sh`} value={formData[`${prefix}_sh`]} onChange={handleChange} placeholder="HH" className={`w-full bg-transparent text-center text-xs outline-none font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}/><span className="text-slate-500 text-xs">:</span><input type="number" name={`${prefix}_sm`} value={formData[`${prefix}_sm`]} onChange={handleChange} placeholder="MM" className={`w-full bg-transparent text-center text-xs outline-none font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}/></div>
                <div className={`flex rounded-lg p-1 border items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}><input type="number" name={`${prefix}_eh`} value={formData[`${prefix}_eh`]} onChange={handleChange} placeholder="HH" className={`w-full bg-transparent text-center text-xs outline-none font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}/><span className="text-slate-500 text-xs">:</span><input type="number" name={`${prefix}_em`} value={formData[`${prefix}_em`]} onChange={handleChange} placeholder="MM" className={`w-full bg-transparent text-center text-xs outline-none font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}/></div>
            </div>
        </div>
    );
};

// --- KOMPONEN UI TABEL ZONE F ---
// --- KOMPONEN UI TABEL ZONE F (FREEZE TANGGAL, BATCH, STATUS, AKSI) ---
const HistoryTableF = ({ data, refresh, onEdit, onDelete, isLoading, theme }) => {
    const isDark = theme === 'dark';
    
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [isFullView, setIsFullView] = useState(false);

    // BORDER RULES (PUTIH UNTUK DARK, HITAM UNTUK BRIGHT) - GRID SEMPURNA 1PX
    const bColor = isDark ? 'border-white/30' : 'border-black/40';

    let processedData = data || [];
    if (filterStartDate) {
        if (filterEndDate) {
            processedData = processedData.filter(row => {
                const d = parseToYMD(row[4]);
                return d >= filterStartDate && d <= filterEndDate;
            });
        } else {
            processedData = processedData.filter(row => parseToYMD(row[4]) === filterStartDate);
        }
    }
    
    if (!isFullView) processedData = processedData.slice(0, 50);

    const val = (row, index) => (!row || row[index] === undefined || row[index] === null || String(row[index]).trim() === "") ? "-" : row[index];
    const formatTime = (h, m) => (h === "-" || h === "" || h == null) ? "-" : `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;

    const textMain = isDark ? 'text-slate-200' : 'text-slate-900';
    const stBgTh = isDark ? 'bg-slate-900' : 'bg-slate-200';
    const stBgTd = isDark ? 'bg-slate-800' : 'bg-slate-50';

    // PENYESUAIAN STICKY (Tanggal di 0, Batch di 85px. Sisa Data Umum dilepas)
    const stickyClasses = {
        tgl:   `sticky left-0 z-20 min-w-[85px] max-w-[85px] ${stBgTd}`,
        batch: `sticky left-[85px] z-20 min-w-[85px] max-w-[85px] shadow-[2px_0_5px_rgba(0,0,0,0.15)] ${stBgTd}`,
        lot:   `min-w-[85px] max-w-[85px] ${stBgTd}`,
        shift: `min-w-[50px] max-w-[50px] ${stBgTd}`,
        grup:  `min-w-[50px] max-w-[50px] ${stBgTd}`,
        vol:   `min-w-[70px] max-w-[70px] ${stBgTd}`,
        status:`sticky right-[70px] z-20 min-w-[75px] max-w-[75px] shadow-[-2px_0_5px_rgba(0,0,0,0.15)] ${stBgTd}`,
        aksi:  `sticky right-0 z-20 min-w-[70px] max-w-[70px] ${stBgTd}`
    };

    // Sub-Komponen Grid Border (Seragam 1px)
    const ThGroup = ({ children, className="", colSpan=1, rowSpan=1 }) => <th colSpan={colSpan} rowSpan={rowSpan} className={`px-2 py-2 border ${bColor} text-center font-black text-[10px] uppercase whitespace-nowrap tracking-wider ${className}`}>{children}</th>;
    const Th = ({ children, className="" }) => <th className={`px-2 py-2 border ${bColor} text-center font-bold text-[9px] uppercase whitespace-nowrap ${className}`}>{children}</th>;
    const Td = ({ children, className="" }) => <td className={`px-2 py-2 border ${bColor} text-center font-mono text-[11px] whitespace-normal sm:whitespace-nowrap ${className}`}>{children}</td>;

    const TableContent = (
        <div className={`flex flex-col w-full h-full relative ${isFullView ? 'bg-[#0B1120]' : `rounded-2xl shadow-2xl overflow-hidden`}`}>
            
            {/* Header Kontrol (Filter & Tombol) */}
            <div className={`p-3 border-b flex justify-between items-center ${bColor} ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-3">
                    <h3 className={`font-bold flex items-center gap-2 text-xs uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}><Database size={14} className="text-purple-500"/> Monitoring F</h3>
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isDark ? 'bg-[#0f172a] border-white/20' : 'bg-white border-black/20'}`}>
                        <Calendar size={12} className={isDark ? 'text-slate-400' : 'text-slate-500'}/>
                        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className={`text-[10px] font-mono outline-none bg-transparent ${isDark ? 'text-white' : 'text-slate-800'}`} title="Pilih Tanggal Tunggal / Mulai Rentang"/>
                        <span className="text-[10px] font-bold text-slate-500">-</span>
                        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} disabled={!filterStartDate} className={`text-[10px] font-mono outline-none bg-transparent ${isDark ? 'text-white' : 'text-slate-800'} ${!filterStartDate ? 'opacity-30 cursor-not-allowed' : ''}`} title="Pilih Tanggal Akhir Rentang (Opsional)"/>
                        {(filterStartDate || filterEndDate) && <button type="button" onClick={() => {setFilterStartDate(""); setFilterEndDate("");}} className="text-red-500 hover:text-red-400"><XCircle size={12}/></button>}
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <button type="button" onClick={refresh} className={`p-1.5 px-3 rounded transition-all flex items-center gap-1 text-[10px] active:scale-95 cursor-pointer border ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white border-white/10' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-sm'}`}><RefreshCw size={12}/> REFRESH</button>
                    {isFullView ? (
                        <button type="button" onClick={() => setIsFullView(false)} className={`p-1.5 px-3 rounded transition-all flex items-center gap-1 text-[10px] active:scale-95 font-bold border ${isDark ? 'bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border-orange-500/50' : 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300'}`}><ArrowLeft size={12}/> KEMBALI</button>
                    ) : (
                        <button type="button" onClick={() => setIsFullView(true)} className={`p-1.5 px-3 rounded transition-all flex items-center gap-1 text-[10px] active:scale-95 cursor-pointer border ${isDark ? 'bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border-blue-500/30' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'}`}><Maximize size={12}/> FULL VIEW</button>
                    )}
                </div>
            </div>
            
            <div className={`relative flex-1 w-full overflow-hidden ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
                <AnimatePresence>
                    {isLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                         className={`absolute inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md ${isDark ? 'bg-[#1e293b]/60' : 'bg-white/60'}`}>
                        <Loader2 className={`animate-spin mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} size={40}/>
                        <span className={`text-[11px] font-black tracking-widest animate-pulse ${isDark ? 'text-white' : 'text-slate-800'}`}>SINKRONISASI DATA...</span>
                      </motion.div>
                    )}
                </AnimatePresence>

                <div className="overflow-auto w-full h-full custom-scrollbar">
                    <table className="w-full border-collapse border-hidden">
                        <thead className="sticky top-0 z-40 shadow-xl">
                            <tr>
                                {/* TANGGAL & BATCH SAJA YANG STICKY */}
                                <ThGroup rowSpan={2} className={`sticky left-0 z-40 w-[85px] min-w-[85px] max-w-[85px] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Tanggal</ThGroup>
                                <ThGroup rowSpan={2} className={`sticky left-[85px] z-40 w-[85px] min-w-[85px] max-w-[85px] shadow-[2px_0_5px_rgba(0,0,0,0.15)] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Batch</ThGroup>
                                
                                {/* SISA DATA UMUM DILEPAS (Lot, Shift, Grup, Vol) */}
                                <ThGroup colSpan={4} className={`w-[255px] min-w-[255px] max-w-[255px] ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'}`}>Data Umum</ThGroup>
                                
                                <ThGroup colSpan={9} className={isDark ? 'bg-blue-900/60 text-blue-200' : 'bg-blue-200 text-blue-900'}>Output After Steril</ThGroup>
                                <ThGroup colSpan={10} className={isDark ? 'bg-emerald-900/60 text-emerald-200' : 'bg-emerald-200 text-emerald-900'}>Output Visual Inspeksi</ThGroup>
                                <ThGroup colSpan={8} className={isDark ? 'bg-teal-900/60 text-teal-200' : 'bg-teal-200 text-teal-900'}>Output Packaging</ThGroup>
                                <ThGroup colSpan={2} className={isDark ? 'bg-yellow-900/60 text-yellow-200' : 'bg-yellow-200 text-yellow-900'}>% Yield</ThGroup>
                                <ThGroup colSpan={4} className={isDark ? 'bg-slate-700 text-white' : 'bg-slate-300 text-slate-800'}>Available Time</ThGroup>
                                <ThGroup colSpan={13} className={isDark ? 'bg-indigo-900/60 text-indigo-200' : 'bg-indigo-200 text-indigo-900'}>Process Details</ThGroup>
                                <ThGroup rowSpan={2} className={`${isDark ? 'bg-orange-900/60 text-orange-200' : 'bg-orange-200 text-orange-900'}`}>Total Prep+Clear</ThGroup>
                                <ThGroup colSpan={2} className={isDark ? 'bg-red-900/60 text-red-200' : 'bg-red-200 text-red-900'}>Jeda Antar Batch</ThGroup>
                                
                                <ThGroup rowSpan={2} className={`sticky right-[70px] z-40 w-[75px] min-w-[75px] max-w-[75px] shadow-[-2px_0_5px_rgba(0,0,0,0.15)] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Status</ThGroup>
                                <ThGroup rowSpan={2} className={`sticky right-0 z-40 w-[70px] min-w-[70px] max-w-[70px] ${stBgTh} ${isDark ? 'text-yellow-500' : 'text-orange-600'}`}>Aksi</ThGroup>
                            </tr>
                            <tr>
                                {/* Dilepas kelas sticky-nya */}
                                <Th className={`w-[85px] min-w-[85px] max-w-[85px] ${stBgTh}`}>Lot No</Th>
                                <Th className={`w-[50px] min-w-[50px] max-w-[50px] ${stBgTh}`}>Shift</Th>
                                <Th className={`w-[50px] min-w-[50px] max-w-[50px] ${stBgTh}`}>Grup</Th>
                                <Th className={`w-[70px] min-w-[70px] max-w-[70px] ${stBgTh}`}>Volume</Th>
                                
                                <Th className={isDark ? 'bg-blue-900/30' : 'bg-blue-100'}>In</Th><Th className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} text-red-500`}>Bocor</Th><Th className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} text-red-500`}>Pt Ring</Th><Th className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} text-red-500`}>Pt Ldh</Th><Th className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} text-red-500`}>Pt Llh</Th><Th className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} text-red-500`}>No Hng</Th><Th className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} text-red-500 font-bold`}>Rej Tot</Th><Th className={isDark ? 'bg-blue-900/30' : 'bg-blue-100'}>Samp</Th><Th className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} font-bold`}>Out</Th>
                                <Th className={isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}>Start</Th><Th className={isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}>End</Th><Th className={`${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'} font-bold`}>Sub In</Th><Th className={`${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'} font-bold`}>Tot In</Th><Th className={`${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'} text-red-500`}>Prtkl</Th><Th className={`${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'} text-red-500`}>Kotik</Th><Th className={`${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'} text-red-500 font-bold`}>Tot Rej</Th><Th className={isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}>Baik</Th><Th className={isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}>Samp</Th><Th className={`${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'} font-bold`}>TF Pack</Th>
                                <Th className={`${isDark ? 'bg-teal-900/30' : 'bg-teal-100'} text-red-500`}>Rej</Th><Th className={isDark ? 'bg-teal-900/30' : 'bg-teal-100'}>Baik</Th><Th className={isDark ? 'bg-teal-900/30' : 'bg-teal-100'}>S QC</Th><Th className={isDark ? 'bg-teal-900/30' : 'bg-teal-100'}>S Oth</Th><Th className={`${isDark ? 'bg-teal-900/30' : 'bg-teal-100'} font-bold`}>FG</Th><Th className={isDark ? 'bg-teal-900/30' : 'bg-teal-100'}>Utuh?</Th><Th className={isDark ? 'bg-teal-900/30' : 'bg-teal-100'}>Jml Btc</Th><Th className={`${isDark ? 'bg-teal-900/30' : 'bg-teal-100'} font-bold`}>Tot FG</Th>
                                <Th className={isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'}>% Btc</Th><Th className={`${isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'} font-bold`}>AVG Shf</Th>
                                <Th className={isDark ? 'bg-slate-800' : 'bg-slate-200'}>Start</Th><Th className={isDark ? 'bg-slate-800' : 'bg-slate-200'}>End</Th><Th className={isDark ? 'bg-slate-800' : 'bg-slate-200'}>Sub</Th><Th className={`${isDark ? 'bg-slate-800' : 'bg-slate-200'} font-bold`}>Tot Avl</Th>
                                <Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>P Start</Th><Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>P End</Th><Th className={`${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>P Sub</Th><Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>R Start</Th><Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>R End</Th><Th className={`${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>R Sub</Th><Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>W Start</Th><Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>W End</Th><Th className={`${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>W Sub</Th><Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>C Start</Th><Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>C End</Th><Th className={isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}>C Sub</Th><Th className={`${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} font-bold`}>Tot Pro</Th>
                                <Th className={isDark ? 'bg-red-900/30' : 'bg-red-100'}>Per Btc</Th><Th className={`${isDark ? 'bg-red-900/30' : 'bg-red-100'} font-bold`}>Tot Shf</Th>
                            </tr>
                        </thead>
                        <tbody className={textMain}>
                            {(!processedData || processedData.length === 0) ? (<tr><td colSpan="58" className={`px-4 py-8 text-center italic text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Data tidak ditemukan.</td></tr>) : (
                                processedData.map((row, idx) => {
                                    const isAkhirShift = row[34] && String(row[34]).trim() !== "" && String(row[34]).trim() !== "-";
                                    return (
                                    <tr key={idx} className={`transition-colors hover:bg-opacity-80 ${isDark ? 'bg-[#1e293b]/50 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'}`}>
                                        <Td className={stickyClasses.tgl}><span className={isDark?'text-slate-200':'text-slate-700'}>{val(row, 4)}</span></Td>
                                        <Td className={stickyClasses.batch}><span className={isDark?'text-white font-black':'text-slate-900 font-black'}>{val(row, 2)}</span></Td>
                                        <Td className={stickyClasses.lot}>{val(row, 3)}</Td>
                                        <Td className={stickyClasses.shift}>{val(row, 5)}</Td>
                                        <Td className={stickyClasses.grup}>{val(row, 6)}</Td>
                                        <Td className={stickyClasses.vol}>{val(row, 7)}</Td>
                                        
                                        <Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 8)}</Td><Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 9)}</Td><Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 10)}</Td><Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 11)}</Td><Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 12)}</Td><Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 13)}</Td><Td className={`${isDark?'bg-blue-900/20':'bg-blue-100/60'} font-bold`}>{val(row, 14)}</Td><Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 15)}</Td><Td className={`${isDark?'bg-blue-900/20':'bg-blue-100/60'} font-bold`}>{val(row, 16)}</Td>
                                        <Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 17)}</Td><Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 18)}</Td><Td className={`${isDark?'bg-emerald-900/20':'bg-emerald-100/60'} font-bold`}>{val(row, 19)}</Td><Td className={`${isDark?'bg-emerald-900/20':'bg-emerald-100/60'} font-black`}>{val(row, 20)}</Td><Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 21)}</Td><Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 22)}</Td><Td className={`${isDark?'bg-emerald-900/20':'bg-emerald-100/60'} font-bold`}>{val(row, 23)}</Td><Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 24)}</Td><Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 25)}</Td><Td className={`${isDark?'bg-emerald-900/20':'bg-emerald-100/60'} font-bold`}>{val(row, 26)}</Td>
                                        <Td className={isDark?'bg-teal-900/10':'bg-teal-50/40'}>{val(row, 27)}</Td><Td className={isDark?'bg-teal-900/10':'bg-teal-50/40'}>{val(row, 28)}</Td><Td className={isDark?'bg-teal-900/10':'bg-teal-50/40'}>{val(row, 29)}</Td><Td className={isDark?'bg-teal-900/10':'bg-teal-50/40'}>{val(row, 30)}</Td><Td className={`${isDark?'bg-teal-900/20':'bg-teal-100/60'} font-black`}>{val(row, 31)}</Td><Td className={isDark?'bg-teal-900/10':'bg-teal-50/40'}>{val(row, 32)}</Td><Td className={isDark?'bg-teal-900/10':'bg-teal-50/40'}>{val(row, 33)}</Td><Td className={`${isDark?'bg-teal-900/30':'bg-teal-200/50'} font-black`}>{val(row, 34)}</Td>
                                        <Td className={`${isDark?'bg-yellow-900/10':'bg-yellow-50/40'} font-bold`}>{val(row, 35)}</Td><Td className={`${isDark?'bg-yellow-900/20':'bg-yellow-100/60'} font-black`}>{val(row, 36)}</Td>
                                        <Td>{formatTime(row[37], row[38])}</Td><Td>{formatTime(row[39], row[40])}</Td><Td>{val(row, 41)}</Td><Td className={`font-bold`}>{val(row, 42)}</Td>
                                        <Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[43], row[44])}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[45], row[46])}</Td><Td className={`${isDark?'bg-indigo-900/20':'bg-indigo-100/60'}`}>{val(row, 47)}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[48], row[49])}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[50], row[51])}</Td><Td className={`${isDark?'bg-indigo-900/20':'bg-indigo-100/60'}`}>{val(row, 52)}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[53], row[54])}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[55], row[56])}</Td><Td className={`${isDark?'bg-indigo-900/20':'bg-indigo-100/60'}`}>{val(row, 57)}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[58], row[59])}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[60], row[61])}</Td><Td className={isDark?'bg-indigo-900/20':'bg-indigo-100/60'}>{val(row, 62)}</Td><Td className={`${isDark?'bg-indigo-900/30':'bg-indigo-200/50'} font-black`}>{val(row, 63)}</Td>
                                        <Td className={`${isDark?'bg-orange-900/20':'bg-orange-100/60'} font-bold`}>{val(row, 64)}</Td>
                                        <Td className={isDark?'bg-red-900/10':'bg-red-50/40'}>{val(row, 65)}</Td><Td className={`${isDark?'bg-red-900/20':'bg-red-100/60'} font-bold`}>{val(row, 66)}</Td>
                                        
                                        <Td className={stickyClasses.status}><span className={`px-2 py-1 rounded text-[9px] font-bold border ${isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-500'}`}>TERSIMPAN</span></Td>
                                        <Td className={stickyClasses.aksi}>
                                            <div className="flex justify-center items-center gap-1">
                                                <button type="button" onClick={() => { onEdit(row); setIsFullView(false); }} className={`p-1.5 rounded transition-colors shadow-sm active:scale-95 ${isDark ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black' : 'bg-yellow-100 text-yellow-700 border hover:bg-yellow-400 hover:text-white'}`} title="Edit Data"><FileEdit size={14}/></button>
                                                {isAkhirShift ? (
                                                    <button type="button" onClick={() => toast.error("Data Akhir Shift tidak dapat dihapus!")} className={`p-1.5 rounded shadow-sm opacity-30 cursor-not-allowed ${isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'}`} title="Data Akhir Shift Tidak Dapat Dihapus"><Trash2 size={14}/></button>
                                                ) : (
                                                    <button type="button" onClick={() => onDelete(row)} className={`p-1.5 rounded transition-colors shadow-sm active:scale-95 ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-100 text-red-700 border hover:bg-red-500 hover:text-white'}`} title="Hapus Data"><Trash2 size={14}/></button>
                                                )}
                                            </div>
                                        </Td>
                                    </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {!isFullView && data && data.length > 50 && !filterStartDate && (
                <div className={`p-2 text-center text-[10px] font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} border-t ${bColor}`}>
                    Menampilkan 50 data terbaru. Gunakan filter tanggal atau mode FULL VIEW untuk melihat semua.
                </div>
            )}
        </div>
    );
    
    if (isFullView) {
        return (
            <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-4 z-[9999] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col rounded-2xl overflow-hidden">{TableContent}</motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[9998] backdrop-blur-sm"></motion.div>
            </AnimatePresence>
        );
    }
    return <div className="mt-8">{TableContent}</div>;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const InputRejectF = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isClosingShift, setIsClosingShift] = useState(false);
    const [historyData, setHistoryData] = useState([]); 
    const [isEditing, setIsEditing] = useState(false);
    const [editRowId, setEditRowId] = useState(null);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('appTheme') || 'dark');

    useEffect(() => {
        const handleThemeChange = () => setTheme(localStorage.getItem('appTheme') || 'dark');
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const handleRefresh = async () => {
        setIsTableLoading(true);
        await loadData();
        setTimeout(() => setIsTableLoading(false), 800); 
    };

    const bgContainer = theme === 'dark' ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-800';
    const bgHeader = theme === 'dark' ? 'bg-[#0f172a]/80 border-white/5' : 'bg-white/90 border-slate-300 shadow-sm text-slate-800';

    const initialForm = {
        no_batch: '', lot_no: '', tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', volume_botol: '500 ML',
        steril_in: '', steril_bocor: '', steril_h_patah_ring: '', steril_h_patah_lidah: '', steril_h_patah_leleh: '', steril_no_hanger: '', steril_sample: '',
        vi_start: 0, vi_end: '', vi_partikel: '', vi_kotik: '', vi_sample_qc: '',
        pack_reject: '', pack_s_qc: '', pack_s_others: '', pack_utuh: 'Y',
        av_sh: '', av_sm: '', av_eh: '', av_em: '',
        p_mat_sh: '', p_mat_sm: '', p_mat_eh: '', p_mat_em: '',
        run_sh: '', run_sm: '', run_eh: '', run_em: '',
        rework_sh: '', rework_sm: '', rework_eh: '', rework_em: '',
        clear_sh: '', clear_sm: '', clear_eh: '', clear_em: '',
    };

    const [formData, setFormData] = useState(initialForm);
    const [calc, setCalc] = useState({});
    const [shiftTotals, setShiftTotals] = useState({ vi_in: 0, fg: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "", lastLC: 0 });

    const loadData = async () => {
        if (user) {
            try {
                const hist = await fetchTodayRejectF(user);
                if(hist.status === 'success') { setHistoryData(hist.data); }
            } catch(e) {}
        }
    };

    const calculateHistoryTotals = (data, currentShift, currentDate, editingState, currentEditId) => {
        if (!data || data.length === 0 || !currentShift || !currentDate) {
            setShiftTotals({ vi_in: 0, fg: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "", lastLC: 0 });
            return;
        }
        const p = (val) => { if (!val) return 0; let str = String(val).replace('%', '').trim().replace(',', '.'); return parseFloat(str) || 0; };
        const formDateFmt = normalizeDateForSum(currentDate);

        const relevantData = [...data].reverse().filter(row => {
            const rowDateFmt = normalizeDateForSum(row[4]); 
            const isSameShift = String(row[5]).trim() === String(currentShift).trim() && rowDateFmt === formDateFmt;
            const isNotBeingEdited = editingState ? row[row.length - 1] !== currentEditId : true;
            return isSameShift && isNotBeingEdited;
        });

        let t = { vi_in: 0, fg: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "", lastLC: 0 };
        if(relevantData.length > 0) {
            t.lastBatchNo = String(relevantData[0][2]); 
            t.lastLC = p(relevantData[0][62]); 
        }
        relevantData.forEach(row => {
            t.vi_in += p(row[19]); t.fg += p(row[31]); t.avail += p(row[41]); t.prep += p(row[47]); t.jeda += p(row[65]);      
            let yieldVal = p(row[35]); 
            if (yieldVal < 1.1 && yieldVal > 0) yieldVal = yieldVal * 100;
            t.yield_sum += yieldVal; t.yield_count += 1;
        });
        setShiftTotals(t);
    };

    useEffect(() => { calculateHistoryTotals(historyData, formData.shift, formData.tanggal, isEditing, editRowId); }, [formData.shift, formData.tanggal, historyData, isEditing, editRowId]);
    useEffect(() => { if (user) loadData(); }, [user]);

    useEffect(() => {
        const val = (k) => { const v = formData[k]; if(v===""||v===null) return 0; return parseFloat(v); };

        const steril_rej_total = val('steril_bocor') + val('steril_h_patah_ring') + val('steril_h_patah_lidah') + val('steril_h_patah_leleh') + val('steril_no_hanger');
        const steril_out = val('steril_in') - steril_rej_total - val('steril_sample');
        const vi_sub = val('vi_end') - val('vi_start');
        const vi_rej_total = val('vi_partikel') + val('vi_kotik');
        const vi_hasil_baik = vi_sub - vi_rej_total;
        const vi_tf_packing = vi_hasil_baik - val('vi_sample_qc');
        const pack_hasil_baik = vi_tf_packing - val('pack_reject');
        const pack_fg = pack_hasil_baik - (val('pack_s_qc') + val('pack_s_others'));
        const volKey = formData.volume_botol || "500 ML";
        const pack_jml_batch = (pack_fg / (TEORI_BATCH[volKey] || 23076)).toFixed(2);
        const yield_batch = (pack_fg > 0) ? ((pack_fg / TEORI_YIELD) * 100).toFixed(2) : 0;

        const diff = (shKey, smKey, ehKey, emKey) => {
            const sh=formData[shKey], sm=formData[smKey], eh=formData[ehKey], em=formData[emKey];
            if(sh===""||sm===""||eh===""||em==="") return 0;
            let d = ((parseInt(eh)*60) + parseInt(em)) - ((parseInt(sh)*60) + parseInt(sm));
            return d < 0 ? d + (24*60) : d;
        };

        const av_sub = diff('av_sh', 'av_sm', 'av_eh', 'av_em');
        const prep_sub = diff('p_mat_sh', 'p_mat_sm', 'p_mat_eh', 'p_mat_em');
        const run_sub = diff('run_sh', 'run_sm', 'run_eh', 'run_em');
        const rework_sub = diff('rework_sh', 'rework_sm', 'rework_eh', 'rework_em');
        const clear_sub = diff('clear_sh', 'clear_sm', 'clear_eh', 'clear_em');
        const process_total = prep_sub + run_sub + rework_sub + clear_sub; 
        const total_prep_clear = prep_sub + clear_sub; 
        
        let prevLC = shiftTotals.lastLC || 0;
        if (formData.no_batch && shiftTotals.lastBatchNo && String(formData.no_batch).trim().toUpperCase() === String(shiftTotals.lastBatchNo).trim().toUpperCase() && !isEditing) {
            prevLC = 0; 
        }
        setCalc({ steril_rej_total, steril_out, vi_sub, vi_rej_total, vi_hasil_baik, vi_tf_packing, pack_hasil_baik, pack_fg, pack_jml_batch, yield_batch, av_sub, prep_sub, run_sub, rework_sub, clear_sub, process_total, total_prep_clear, jeda_batch: prevLC + prep_sub });
    }, [formData, shiftTotals.lastLC, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('_h') || name.includes('sh') || name.includes('eh')) { if(value > 23) return; }
        if (name.includes('_m') || name.includes('sm') || name.includes('em')) { if(value > 59) return; }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditClick = (rowData) => {
        const accurateDate = parseToYMD(rowData[4]); 
        const newData = {
            ...initialForm,
            no_batch: rowData[2], lot_no: rowData[3], tanggal: accurateDate, shift: rowData[5], group: rowData[6], volume_botol: rowData[7],
            steril_in: rowData[8], steril_bocor: rowData[9], steril_h_patah_ring: rowData[10], steril_h_patah_lidah: rowData[11], steril_h_patah_leleh: rowData[12], steril_no_hanger: rowData[13], steril_sample: rowData[15],
            vi_start: rowData[17], vi_end: rowData[18], vi_partikel: rowData[21], vi_kotik: rowData[22], vi_sample_qc: rowData[25],
            pack_reject: rowData[27], pack_s_qc: rowData[29], pack_s_others: rowData[30], pack_utuh: rowData[32] || 'Y',
            av_sh: rowData[37], av_sm: rowData[38], av_eh: rowData[39], av_em: rowData[40],
            p_mat_sh: rowData[43], p_mat_sm: rowData[44], p_mat_eh: rowData[45], p_mat_em: rowData[46],
            run_sh: rowData[48], run_sm: rowData[49], run_eh: rowData[50], run_em: rowData[51],
            rework_sh: rowData[53], rework_sm: rowData[54], rework_eh: rowData[55], rework_em: rowData[56],
            clear_sh: rowData[58], clear_sm: rowData[59], clear_eh: rowData[60], clear_em: rowData[61],
        };

        setFormData(newData);
        setIsEditing(true);
        setEditRowId(rowData[rowData.length - 1]);
        setIsClosingShift(rowData[34] && String(rowData[34]).trim() !== "" && String(rowData[34]).trim() !== "-");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast("Mode Edit Aktif: Semua data asli dipertahankan", { icon: '✏️', duration: 3000 });
    };

    const handleDeleteClick = async (rowData) => {
        if (window.confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin menghapus permanen Batch ${rowData[2]}?`)) {
            setLoading(true);
            try {
                const finalData = { original_id: rowData[rowData.length - 1], tanggal: parseToYMD(rowData[4]), shift: rowData[5] };
                const res = await submitOEEData({ action: 'delete_reject_f', data: finalData }, user);
                if(res.status === 'success') {
                    toast.success("Data berhasil dihapus!");
                    loadData(); 
                } else { toast.error(res.message); }
            } catch (err) { toast.error("Terjadi kesalahan koneksi."); }
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false); setFormData(initialForm); setEditRowId(null); setIsClosingShift(false); toast.dismiss();
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        if(!formData.no_batch || !formData.lot_no || !formData.shift) { toast.error("Data Wajib: No Batch, Lot No, Shift!"); setLoading(false); return; }

        const finalData = { ...formData, ...calc, zone: 'F', is_closing: isClosingShift, original_id: isEditing ? editRowId : null };

        try {
            const actionType = isEditing ? 'update_reject_f' : 'submit_reject_f';
            const res = await submitOEEData({ action: actionType, data: finalData }, user);
            setLoading(false);
            if(res.status === 'success') {
                toast.success(isEditing ? "Data Diupdate!" : (isClosingShift ? "Shift Ditutup!" : "Data Tersimpan."));
                setFormData(prev => ({ ...initialForm, shift: prev.shift, group: prev.group, tanggal: prev.tanggal, vi_start: 0, vi_end: '' }));
                setIsClosingShift(false); setIsEditing(false); setEditRowId(null);
                loadData(); 
            } else { toast.error(res.message); }
        } catch (err) { setLoading(false); toast.error("Terjadi kesalahan koneksi."); }
    };

    return (
        <div className={`min-h-screen pb-32 font-sans transition-colors duration-300 ${bgContainer}`}>
            <Toaster position="top-center" toastOptions={{style: {background: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#fff' : '#000'}}} />
            
            <div className={`backdrop-blur-md border-b px-6 py-4 sticky top-0 z-50 transition-colors duration-300 ${bgHeader} ${isEditing ? 'border-b-2 border-yellow-500' : ''}`}>
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => navigate('/foreman/tactical-input')} className={`p-2.5 rounded-xl transition-all active:scale-95 border ${theme === 'dark' ? 'bg-slate-800 border-white/5 text-slate-300' : 'bg-white border-slate-300 text-slate-600 shadow-sm'}`}><ArrowLeft size={20}/></button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">INPUT DATA KELAS <span className="text-purple-500">F</span></h1>
                            <div className="flex items-center gap-2">
                                {isEditing ? <span className="text-[10px] font-bold bg-yellow-500 text-black px-2 py-0.5 rounded animate-pulse">MODE EDITING</span> : <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span className={`text-[10px] font-mono uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>System Online</span></>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 mt-8">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-6">
                            <Card title="Data Batch & Umum" icon={Layers} color="purple" theme={theme}>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <ModernInput label="No Batch" name="no_batch" type="text" placeholder="A123" value={formData.no_batch} onChange={handleChange} required theme={theme}/>
                                    <ModernInput label="Lot No" name="lot_no" type="text" value={formData.lot_no} onChange={handleChange} required theme={theme}/>
                                    <ModernInput label="Tanggal" name="tanggal" type="date" value={formData.tanggal} onChange={handleChange} required theme={theme}/>
                                    <ModernSelect label="Shift" name="shift" value={formData.shift} options={SHIFTS} onChange={handleChange} required theme={theme} />
                                    <ModernSelect label="Group" name="group" value={formData.group} options={GROUPS} onChange={handleChange} required theme={theme} />
                                    <ModernSelect label="Volume" name="volume_botol" value={formData.volume_botol} options={VOLUMES} onChange={handleChange} required theme={theme} />
                                </div>
                            </Card>
                            
                            <Card title="Output After Steril" icon={Info} color="blue" theme={theme}>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <ModernInput label="In Chamber" name="steril_in" value={formData.steril_in} onChange={handleChange} theme={theme}/>
                                    <ModernInput label="Bocor" name="steril_bocor" value={formData.steril_bocor} onChange={handleChange} theme={theme}/>
                                    <ModernInput label="Patah Ring" name="steril_h_patah_ring" value={formData.steril_h_patah_ring} onChange={handleChange} theme={theme}/>
                                    <ModernInput label="Patah Lidah" name="steril_h_patah_lidah" value={formData.steril_h_patah_lidah} onChange={handleChange} theme={theme}/>
                                    <ModernInput label="Patah Leleh" name="steril_h_patah_leleh" value={formData.steril_h_patah_leleh} onChange={handleChange} theme={theme}/>
                                    <ModernInput label="No Hanger" name="steril_no_hanger" value={formData.steril_no_hanger} onChange={handleChange} theme={theme}/>
                                    <ModernInput label="Sample QC" name="steril_sample" value={formData.steril_sample} onChange={handleChange} theme={theme}/>
                                    <div className={`col-span-2 md:col-span-1 p-2 rounded-lg border flex flex-col justify-center items-center transition-colors ${theme === 'dark' ? 'bg-[#0f172a] border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                                        <span className={`text-[9px] font-bold uppercase ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>OUT TF to VI</span>
                                        <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{calc.steril_out}</span>
                                    </div>
                                </div>
                            </Card>

                            <Card title="Visual Inspeksi (Counter)" icon={Activity} color="emerald" theme={theme}>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <ModernInput label="Start (Auto)" name="vi_start" value={formData.vi_start} onChange={handleChange} theme={theme} />
                                    <ModernInput label="End" name="vi_end" value={formData.vi_end} onChange={handleChange} theme={theme}/>
                                </div>
                                <div className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <div><span className={`text-xs font-bold ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'}`}>Subtotal Input VI</span><div className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{calc.vi_sub}</div></div>
                                    <div className="text-right"><span className={`text-xs font-bold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>Total Shift (VI)</span><div className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{shiftTotals.vi_in + calc.vi_sub}</div></div>
                                </div>
                                <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                                    <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}><AlertOctagon size={12}/> Reject VI</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <ModernInput label="Partikel" name="vi_partikel" value={formData.vi_partikel} onChange={handleChange} theme={theme} />
                                        <ModernInput label="Kosmetik" name="vi_kotik" value={formData.vi_kotik} onChange={handleChange} theme={theme} />
                                        <StatBox label="Total Reject VI" value={calc.vi_rej_total} color="red" theme={theme} />
                                    </div>
                                </div>
                            </Card>

                            <Card title="Output Packing" icon={Package} color="emerald" theme={theme}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatBox label="Hasil Baik VI" value={calc.vi_hasil_baik} color="emerald" theme={theme}/>
                                        <ModernInput label="Sample QC (VI)" name="vi_sample_qc" value={formData.vi_sample_qc} onChange={handleChange} theme={theme}/>
                                        <StatBox label="TF Packing" value={calc.vi_tf_packing} color="blue" theme={theme}/>
                                        <ModernInput label="Reject Pack" name="pack_reject" value={formData.pack_reject} onChange={handleChange} theme={theme}/>
                                    </div>
                                    <div className={`h-px ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}></div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <ModernInput label="Sample Pack QC" name="pack_s_qc" value={formData.pack_s_qc} onChange={handleChange} theme={theme}/>
                                        <ModernInput label="Sample Pack Oth" name="pack_s_others" value={formData.pack_s_others} onChange={handleChange} theme={theme}/>
                                        <ModernSelect label="Utuh?" name="pack_utuh" value={formData.pack_utuh} options={['Y','N']} onChange={handleChange} theme={theme}/>
                                    </div>
                                </div>
                            </Card>
                        </div>
                        
                        <div className="lg:col-span-4 space-y-6">
                            <div className={`rounded-2xl p-5 shadow-2xl transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-purple-700 to-indigo-900 text-white' : 'bg-gradient-to-br from-purple-100 to-indigo-100 text-indigo-900 border border-indigo-200'}`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-200' : 'text-purple-700'}`}>Final Result & Yield</h3>
                                <div className="space-y-4">
                                    <div className={`flex justify-between items-end pb-2 border-b ${theme === 'dark' ? 'border-white/20' : 'border-indigo-200'}`}>
                                        <span className="text-sm opacity-80">Finished Goods</span><span className="text-3xl font-black">{calc.pack_fg}</span>
                                    </div>
                                    <div className="pt-2 flex justify-between items-end">
                                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'}`}>TOTAL HASIL SHIFT</span>
                                        <span className={`text-2xl font-black ${theme === 'dark' ? 'text-emerald-100' : 'text-emerald-800'}`}>{shiftTotals.fg + calc.pack_fg}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div><span className="text-xs opacity-70 block">% Batch</span><span className="text-xl font-bold">{calc.yield_batch}%</span></div>
                                        <div className="text-right">
                                            <span className="text-xs opacity-70 block">AVG Yield Shift</span>
                                            <span className={`text-xl font-bold ${theme === 'dark' ? 'text-yellow-300' : 'text-orange-600'}`}>{((shiftTotals.yield_sum + Number(calc.yield_batch)) / (shiftTotals.yield_count + 1)).toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <Card title="Available Time" icon={Clock} color="slate" theme={theme}>
                                <div className="space-y-3">
                                    <TimeInputBlock title="Available" prefix="av" formData={formData} handleChange={handleChange} subtotal={calc.av_sub} theme={theme}/>
                                    <div className={`text-right text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Shift (Avail): {shiftTotals.avail + calc.av_sub}m</div>
                                </div>
                            </Card>
                            
                            <Card title="Process Details" icon={Activity} color="slate" theme={theme}>
                                <div className="space-y-3">
                                    <TimeInputBlock title="Preparation" prefix="p_mat" formData={formData} handleChange={handleChange} subtotal={calc.prep_sub} theme={theme}/>
                                    <TimeInputBlock title="Machine Run" prefix="run" formData={formData} handleChange={handleChange} subtotal={calc.run_sub} theme={theme}/>
                                    <TimeInputBlock title="Rework" prefix="rework" formData={formData} handleChange={handleChange} subtotal={calc.rework_sub} theme={theme}/>
                                    <div className={`h-px my-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}></div>
                                    <TimeInputBlock title="Line Clearance" prefix="clear" formData={formData} handleChange={handleChange} subtotal={calc.clear_sub} theme={theme}/>
                                </div>
                                <div className={`mt-4 p-3 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100 border border-slate-200'}`}>
                                    <div className={`flex justify-between items-center text-xs font-bold mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}><span>Total Prep+Clear (8)</span><span className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{calc.total_prep_clear}m</span></div>
                                    <div className={`h-px my-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                                    <div className={`flex justify-between items-center text-xs font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}><span>Jeda Antar Batch (9)</span><span className="text-lg">{calc.jeda_batch}m</span></div>
                                </div>
                            </Card>
                            
                            {!isEditing && (
                                <div className={`mt-4 p-4 rounded-xl flex items-center justify-between border transition-colors ${theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <Flag className={`text-yellow-500 ${isClosingShift ? 'fill-yellow-500' : ''}`} size={20}/>
                                        <div><h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Akhir Shift?</h4><p className={`text-[9px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Centang untuk memproses Data TOTAL.</p></div>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 accent-yellow-500 cursor-pointer" checked={isClosingShift} onChange={(e) => setIsClosingShift(e.target.checked)}/>
                                </div>
                            )}

                            <div className="flex gap-2 mt-4">
                                {isEditing && (
                                    <button type="button" onClick={handleCancelEdit} className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                        <XCircle size={20}/> BATAL
                                    </button>
                                )}
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} type="submit" 
                                    className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${isEditing ? 'bg-orange-500 hover:bg-orange-400 text-white' : (isClosingShift ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-purple-600 hover:bg-purple-500 text-white')}`}
                                >
                                    {loading ? <Loader2 className="animate-spin"/> : <>{isEditing ? <FileEdit size={20}/> : <Save size={20}/>} {isEditing ? "UPDATE DATA" : (isClosingShift ? "TUTUP SHIFT" : "SIMPAN DATA")}</>}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div className="max-w-full mx-auto px-4 pb-8">
                <HistoryTableF data={historyData} refresh={handleRefresh} isLoading={isTableLoading} onEdit={handleEditClick} onDelete={handleDeleteClick} theme={theme} />
            </div>
        </div>
    );
};

export default InputRejectF;