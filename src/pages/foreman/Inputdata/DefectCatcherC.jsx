import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { submitOEEData, fetchTodayRejectC } from '../../../services/api'; 
import { Save, Database, Activity, Clock, Info, ChevronDown, RefreshCw, Flag, ArrowLeft, Layers, AlertOctagon, Loader2, FileEdit, Trash2, XCircle, Sun, Moon, Maximize, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

const SHIFTS = ["1", "2", "3"];
const GROUPS = ["A", "B", "C", "D"];
const VOLUMES = ["25 ML", "100 ML", "250 ML", "500 ML", "1000 ML"];
const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };

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

// --- UI COMPONENTS ---
const Card = ({ children, title, icon: Icon, color = "blue", theme = "dark" }) => {
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
            <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${required ? 'text-blue-500' : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>{label}</label>
            <input type={type} name={name} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} 
                className={`w-full px-3 py-3 rounded-lg border outline-none font-mono text-sm transition-colors duration-300 
                ${isDark ? 'bg-[#0f172a] text-white border-slate-700 focus:border-blue-500' : 'bg-slate-50 text-slate-800 border-slate-300 focus:border-blue-500'} 
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}/>
        </div>
    );
};

const ModernSelect = ({ label, name, value, onChange, options, theme="dark" }) => {
    const isDark = theme === 'dark';
    return (
        <div className="group relative">
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block text-blue-500">{label}</label>
            <select name={name} value={value} onChange={onChange} 
                className={`w-full px-3 py-3 rounded-lg border outline-none font-bold text-sm appearance-none cursor-pointer transition-colors duration-300
                ${isDark ? 'bg-[#0f172a] text-white border-slate-700 focus:border-blue-500' : 'bg-slate-50 text-slate-800 border-slate-300 focus:border-blue-500'}`}>
                <option value="">-- PILIH --</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-[34px] text-slate-400 pointer-events-none"/>
        </div>
    );
};

const StatBox = ({ label, value, subLabel, color = "blue", theme="dark" }) => {
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
                <span className="text-[10px] font-mono text-blue-600 bg-blue-100 dark:bg-blue-900/20 px-2 py-0.5 rounded">{subtotal || 0}m</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className={`flex rounded-lg p-1 border items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}><input type="number" name={`${prefix}_sh`} value={formData[`${prefix}_sh`]} onChange={handleChange} placeholder="HH" className={`w-full bg-transparent text-center text-xs outline-none font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}/><span className="text-slate-500 text-xs">:</span><input type="number" name={`${prefix}_sm`} value={formData[`${prefix}_sm`]} onChange={handleChange} placeholder="MM" className={`w-full bg-transparent text-center text-xs outline-none font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}/></div>
                <div className={`flex rounded-lg p-1 border items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}><input type="number" name={`${prefix}_eh`} value={formData[`${prefix}_eh`]} onChange={handleChange} placeholder="HH" className={`w-full bg-transparent text-center text-xs outline-none font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}/><span className="text-slate-500 text-xs">:</span><input type="number" name={`${prefix}_em`} value={formData[`${prefix}_em`]} onChange={handleChange} placeholder="MM" className={`w-full bg-transparent text-center text-xs outline-none font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}/></div>
            </div>
        </div>
    );
};

// --- KOMPONEN UI TABEL ZONE C (FREEZE TANGGAL, BATCH, STATUS, AKSI) ---
const HistoryTableC = ({ data, refresh, onEdit, onDelete, isLoading, theme }) => {
    const isDark = theme === 'dark';
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [isFullView, setIsFullView] = useState(false);

    const bColor = isDark ? 'border-white/30' : 'border-black/40';

    let processedData = data || [];
    if (filterStartDate) {
        if (filterEndDate) {
            processedData = processedData.filter(row => {
                const d = parseToYMD(row[3]); 
                return d >= filterStartDate && d <= filterEndDate;
            });
        } else {
            processedData = processedData.filter(row => parseToYMD(row[3]) === filterStartDate);
        }
    }
    if (!isFullView) processedData = processedData.slice(0, 50);

    const val = (row, index) => (!row || row[index] === undefined || row[index] === null || String(row[index]).trim() === "") ? "-" : row[index];
    const formatTime = (h, m) => (h === "-" || h === "" || h == null) ? "-" : `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;

    const textMain = isDark ? 'text-slate-200' : 'text-slate-900';
    const stBgTh = isDark ? 'bg-slate-900' : 'bg-slate-200';
    const stBgTd = isDark ? 'bg-slate-800' : 'bg-slate-50';

    // PENYESUAIAN STICKY (Tanggal di 0, Batch di 90px. Sisa Data Umum dilepas)
    const stickyClasses = {
        tgl:   `sticky left-0 z-20 w-[90px] min-w-[90px] max-w-[90px] ${stBgTd}`,
        batch: `sticky left-[90px] z-20 w-[90px] min-w-[90px] max-w-[90px] shadow-[2px_0_5px_rgba(0,0,0,0.15)] ${stBgTd}`,
        shift: `w-[60px] min-w-[60px] max-w-[60px] ${stBgTd}`,
        grup:  `w-[60px] min-w-[60px] max-w-[60px] ${stBgTd}`,
        blow:  `w-[80px] min-w-[80px] max-w-[80px] ${stBgTd}`,
        vol:   `w-[80px] min-w-[80px] max-w-[80px] ${stBgTd}`,
        status:`sticky right-[80px] z-20 w-[85px] min-w-[85px] max-w-[85px] shadow-[-2px_0_5px_rgba(0,0,0,0.15)] ${stBgTd}`,
        aksi:  `sticky right-0 z-20 w-[80px] min-w-[80px] max-w-[80px] ${stBgTd}`
    };

    const ThGroup = ({ children, className="", colSpan=1, rowSpan=1 }) => <th colSpan={colSpan} rowSpan={rowSpan} className={`px-2 py-2 border ${bColor} text-center font-black text-[10px] uppercase whitespace-nowrap tracking-wider ${className}`}>{children}</th>;
    const Th = ({ children, className="" }) => <th className={`px-2 py-2 border ${bColor} text-center font-bold text-[9px] uppercase whitespace-nowrap ${className}`}>{children}</th>;
    const Td = ({ children, className="" }) => <td className={`px-2 py-2 border ${bColor} text-center font-mono text-[11px] whitespace-normal sm:whitespace-nowrap ${className}`}>{children}</td>;

    const TableContent = (
        <div className={`flex flex-col w-full h-full relative ${isFullView ? 'bg-[#0B1120]' : `rounded-2xl shadow-2xl overflow-hidden border ${bColor}`}`}>
            
            {/* Header Kontrol */}
            <div className={`p-3 border-b flex justify-between items-center ${bColor} ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-3">
                    <h3 className={`font-bold flex items-center gap-2 text-xs uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}><Database size={14} className="text-blue-500"/> Monitoring C</h3>
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isDark ? 'bg-[#0f172a] border-white/20' : 'bg-white border-black/20'}`}>
                        <Calendar size={12} className={isDark ? 'text-slate-400' : 'text-slate-500'}/>
                        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className={`text-[10px] font-mono outline-none bg-transparent ${isDark ? 'text-white' : 'text-slate-800'}`}/>
                        <span className="text-[10px] font-bold text-slate-500">-</span>
                        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} disabled={!filterStartDate} className={`text-[10px] font-mono outline-none bg-transparent ${isDark ? 'text-white' : 'text-slate-800'} ${!filterStartDate ? 'opacity-30' : ''}`}/>
                        {(filterStartDate || filterEndDate) && <button type="button" onClick={() => {setFilterStartDate(""); setFilterEndDate("");}} className="text-red-500"><XCircle size={12}/></button>}
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <button type="button" onClick={refresh} className={`p-1.5 px-3 rounded flex items-center gap-1 text-[10px] border ${isDark ? 'bg-slate-700 text-white border-white/10' : 'bg-white text-slate-700 border-slate-300'}`}><RefreshCw size={12}/> REFRESH</button>
                    {isFullView ? (
                        <button type="button" onClick={() => setIsFullView(false)} className={`p-1.5 px-3 rounded flex items-center gap-1 text-[10px] font-bold border ${isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-orange-100 text-orange-700 border-orange-300'}`}><ArrowLeft size={12}/> KEMBALI</button>
                    ) : (
                        <button type="button" onClick={() => setIsFullView(true)} className={`p-1.5 px-3 rounded flex items-center gap-1 text-[10px] border ${isDark ? 'bg-blue-900/40 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-300'}`}><Maximize size={12}/> FULL VIEW</button>
                    )}
                </div>
            </div>
            
            <div className={`relative flex-1 w-full overflow-hidden ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
                <AnimatePresence>
                    {isLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md ${isDark ? 'bg-[#1e293b]/60' : 'bg-white/60'}`}>
                        <Loader2 className={`animate-spin mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} size={40}/>
                        <span className={`text-[11px] font-black tracking-widest animate-pulse ${isDark ? 'text-white' : 'text-slate-800'}`}>SINKRONISASI DATA...</span>
                      </motion.div>
                    )}
                </AnimatePresence>

                <div className="overflow-auto w-full h-full custom-scrollbar">
                    <table className="w-full border-collapse border-hidden">
                        <thead className="sticky top-0 z-40 shadow-xl">
                            {/* Baris 1: Header */}
                            <tr>
                                <ThGroup rowSpan={2} className={`sticky left-0 z-50 w-[90px] min-w-[90px] max-w-[90px] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Tanggal</ThGroup>
                                <ThGroup rowSpan={2} className={`sticky left-[90px] z-50 w-[90px] min-w-[90px] max-w-[90px] shadow-[2px_0_5px_rgba(0,0,0,0.15)] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Batch</ThGroup>
                                <ThGroup colSpan={4} className={`w-[280px] min-w-[280px] max-w-[280px] ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'}`}>Data Umum</ThGroup>
                                
                                <ThGroup colSpan={6} className={isDark ? 'bg-emerald-900/60 text-emerald-200' : 'bg-emerald-200 text-emerald-900'}>Counter Filling</ThGroup>
                                <ThGroup colSpan={7} className={isDark ? 'bg-red-900/60 text-red-200' : 'bg-red-200 text-red-900'}>Reject Filling</ThGroup>
                                <ThGroup colSpan={5} className={isDark ? 'bg-blue-900/60 text-blue-200' : 'bg-blue-200 text-blue-900'}>Output Transfer</ThGroup>
                                <ThGroup colSpan={2} className={isDark ? 'bg-yellow-900/60 text-yellow-200' : 'bg-yellow-200 text-yellow-900'}>% Yield</ThGroup>
                                <ThGroup colSpan={8} className={isDark ? 'bg-slate-700 text-white' : 'bg-slate-300 text-slate-800'}>Pre-Steril</ThGroup>
                                <ThGroup colSpan={4} className={isDark ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-200 text-purple-900'}>Available Time</ThGroup>
                                <ThGroup colSpan={11} className={isDark ? 'bg-indigo-900/60 text-indigo-200' : 'bg-indigo-200 text-indigo-900'}>Preparation Process</ThGroup>
                                <ThGroup colSpan={3} className={isDark ? 'bg-cyan-900/60 text-cyan-200' : 'bg-cyan-200 text-cyan-900'}>Run Time</ThGroup>
                                <ThGroup colSpan={3} className={isDark ? 'bg-sky-900/60 text-sky-200' : 'bg-sky-200 text-sky-900'}>Line Clearance</ThGroup>
                                <ThGroup colSpan={1} className={isDark ? 'bg-fuchsia-900/60 text-fuchsia-200' : 'bg-fuchsia-200 text-fuchsia-900'}>Total Prep + Clearance Time</ThGroup>
                                <ThGroup colSpan={2} className={isDark ? 'bg-orange-900/60 text-orange-200' : 'bg-orange-200 text-orange-900'}>Jeda Antar Batch</ThGroup>
                                
                                <ThGroup rowSpan={2} className={`sticky right-[80px] z-50 w-[85px] min-w-[85px] max-w-[85px] shadow-[-2px_0_5px_rgba(0,0,0,0.15)] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Status</ThGroup>
                                <ThGroup rowSpan={2} className={`sticky right-0 z-50 w-[80px] min-w-[80px] max-w-[80px] ${stBgTh} ${isDark ? 'text-yellow-500' : 'text-orange-600'}`}>Aksi</ThGroup>
                            </tr>
                            {/* Baris 2: Sub Headers */}
                            <tr>
                                <Th className={`w-[60px] min-w-[60px] max-w-[60px] ${stBgTh}`}>Shift</Th>
                                <Th className={`w-[60px] min-w-[60px] max-w-[60px] ${stBgTh}`}>Grup</Th>
                                <Th className={`w-[80px] min-w-[80px] max-w-[80px] ${stBgTh}`}>Rej Blow</Th>
                                <Th className={`w-[80px] min-w-[80px] max-w-[80px] ${stBgTh}`}>Volume</Th>
                                
                                <Th className={isDark?'bg-emerald-900/30':'bg-emerald-100'}>Start</Th><Th className={isDark?'bg-emerald-900/30':'bg-emerald-100'}>End</Th><Th className={`${isDark?'bg-emerald-900/30':'bg-emerald-100'} font-bold`}>Sub Cnt</Th><Th className={isDark?'bg-emerald-900/30':'bg-emerald-100'}>Utuh?</Th><Th className={isDark?'bg-emerald-900/30':'bg-emerald-100'}>Jml Btc</Th><Th className={`${isDark?'bg-emerald-900/30':'bg-emerald-100'} font-bold`}>Tot Cnt</Th>
                                <Th className={isDark?'bg-red-900/30':'bg-red-100'}>Wash</Th><Th className={isDark?'bg-red-900/30':'bg-red-100'}>VK</Th><Th className={isDark?'bg-red-900/30':'bg-red-100'}>VL</Th><Th className={isDark?'bg-red-900/30':'bg-red-100'}>No Cap</Th><Th className={isDark?'bg-red-900/30':'bg-red-100'}>Seal</Th><Th className={isDark?'bg-red-900/30':'bg-red-100'}>Oth</Th><Th className={`${isDark?'bg-red-900/30':'bg-red-100'} font-bold`}>Sub Rej</Th>
                                <Th className={isDark?'bg-blue-900/30':'bg-blue-100'}>S. IPC</Th><Th className={isDark?'bg-blue-900/30':'bg-blue-100'}>S. Oth</Th><Th className={`${isDark?'bg-blue-900/30':'bg-blue-100'} font-bold`}>S. Sub</Th><Th className={`${isDark?'bg-blue-900/30':'bg-blue-100'} font-bold`}>Trf ST</Th><Th className={`${isDark?'bg-blue-900/30':'bg-blue-100'} font-bold`}>Tot Baik</Th>
                                <Th className={isDark?'bg-yellow-900/30':'bg-yellow-100'}>% Btc</Th><Th className={`${isDark?'bg-yellow-900/30':'bg-yellow-100'} font-bold`}>Avg Shf</Th>
                                <Th className={isDark?'bg-slate-800':'bg-slate-200'}>Pre In</Th><Th className={isDark?'bg-slate-800':'bg-slate-200'}>Bocor</Th><Th className={isDark?'bg-slate-800':'bg-slate-200'}>No Cap</Th><Th className={isDark?'bg-slate-800':'bg-slate-200'}>Vol</Th><Th className={isDark?'bg-slate-800':'bg-slate-200'}>Thermo</Th><Th className={isDark?'bg-slate-800':'bg-slate-200'}>Lain</Th><Th className={`${isDark?'bg-slate-800':'bg-slate-200'} font-bold`}>Tot Rej</Th><Th className={`${isDark?'bg-slate-800':'bg-slate-200'} font-bold`}>Pre Out</Th>
                                <Th className={isDark?'bg-purple-900/20':'bg-purple-100'}>Av St</Th><Th className={isDark?'bg-purple-900/20':'bg-purple-100'}>Av End</Th><Th className={isDark?'bg-purple-900/20':'bg-purple-100'}>Av Sub</Th><Th className={`${isDark?'bg-purple-900/20':'bg-purple-100'} font-bold`}>Tot Avl</Th>
                                <Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Mat St</Th><Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Mat End</Th><Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Mat Sub</Th><Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Set St</Th><Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Set End</Th><Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Set Sub</Th><Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Flu St</Th><Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Flu End</Th><Th className={isDark?'bg-indigo-900/30':'bg-indigo-100'}>Flu Sub</Th><Th className={`${isDark?'bg-indigo-900/30':'bg-indigo-100'} font-bold`}>Tot Prep</Th><Th className={`${isDark?'bg-indigo-900/30':'bg-indigo-100'} font-bold`}>Shf Prep</Th>
                                <Th className={isDark?'bg-cyan-900/30':'bg-cyan-100'}>Run St</Th><Th className={isDark?'bg-cyan-900/30':'bg-cyan-100'}>Run End</Th><Th className={isDark?'bg-cyan-900/30':'bg-cyan-100'}>Run Sub</Th>
                                <Th className={isDark?'bg-sky-900/30':'bg-sky-100'}>LC St</Th><Th className={isDark?'bg-sky-900/30':'bg-sky-100'}>LC End</Th><Th className={isDark?'bg-sky-900/30':'bg-sky-100'}>LC Sub</Th>
                                <Th className={`${isDark?'bg-fuchsia-900/30':'bg-fuchsia-100'} font-bold`}>Tot P+C</Th>
                                <Th className={isDark?'bg-orange-900/30':'bg-orange-100'}>Jeda</Th><Th className={`${isDark?'bg-orange-900/30':'bg-orange-100'} font-bold`}>Tot Jeda</Th>
                            </tr>
                        </thead>
                        <tbody className={textMain}>
                            {(!processedData || processedData.length === 0) ? (<tr><td colSpan="60" className={`px-4 py-8 text-center italic text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Data tidak ditemukan.</td></tr>) : (
                                processedData.map((row, idx) => {
                                    const isAkhirShift = row[13] && String(row[13]).trim() !== "" && String(row[13]).trim() !== "-";
                                    return (
                                    <tr key={idx} className={`transition-colors hover:bg-opacity-80 ${isDark ? 'bg-[#1e293b]/50 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'}`}>
                                        <Td className={stickyClasses.tgl}><span className={isDark?'text-slate-200':'text-slate-700'}>{val(row, 3)}</span></Td>
                                        <Td className={stickyClasses.batch}><span className={isDark?'text-white font-black':'text-slate-900 font-black'}>{val(row, 2)}</span></Td>
                                        <Td className={stickyClasses.shift}>{val(row, 4)}</Td>
                                        <Td className={stickyClasses.grup}>{val(row, 5)}</Td>
                                        <Td className={stickyClasses.blow}>{val(row, 6)}</Td>
                                        <Td className={stickyClasses.vol}>{val(row, 7)}</Td>
                                        
                                        <Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 8)}</Td><Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 9)}</Td><Td className={`${isDark?'bg-emerald-900/20':'bg-emerald-100/60'} font-bold`}>{val(row, 10)}</Td><Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 11)}</Td><Td className={isDark?'bg-emerald-900/10':'bg-emerald-50/40'}>{val(row, 12)}</Td><Td className={`${isDark?'bg-emerald-900/20':'bg-emerald-100/60'} font-bold`}>{val(row, 13)}</Td>
                                        <Td className={isDark?'bg-red-900/10':'bg-red-50/40'}>{val(row, 14)}</Td><Td className={isDark?'bg-red-900/10':'bg-red-50/40'}>{val(row, 15)}</Td><Td className={isDark?'bg-red-900/10':'bg-red-50/40'}>{val(row, 16)}</Td><Td className={isDark?'bg-red-900/10':'bg-red-50/40'}>{val(row, 17)}</Td><Td className={isDark?'bg-red-900/10':'bg-red-50/40'}>{val(row, 18)}</Td><Td className={isDark?'bg-red-900/10':'bg-red-50/40'}>{val(row, 19)}</Td><Td className={`${isDark?'bg-red-900/20':'bg-red-100/60'} font-bold`}>{val(row, 20)}</Td>
                                        <Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 21)}</Td><Td className={isDark?'bg-blue-900/10':'bg-blue-50/40'}>{val(row, 22)}</Td><Td className={`${isDark?'bg-blue-900/20':'bg-blue-100/60'} font-bold`}>{val(row, 23)}</Td><Td className={`${isDark?'bg-blue-900/20':'bg-blue-100/60'} font-bold`}>{val(row, 24)}</Td><Td className={`${isDark?'bg-blue-900/20':'bg-blue-100/60'} font-bold`}>{val(row, 25)}</Td>
                                        <Td className={`${isDark?'bg-yellow-900/10':'bg-yellow-50/40'} font-bold`}>{val(row, 26)}</Td><Td className={`${isDark?'bg-yellow-900/20':'bg-yellow-100/60'} font-black`}>{val(row, 27)}</Td>
                                        <Td className={isDark?'bg-slate-800':'bg-slate-50'}>{val(row, 28)}</Td><Td className={isDark?'bg-slate-800':'bg-slate-50'}>{val(row, 29)}</Td><Td className={isDark?'bg-slate-800':'bg-slate-50'}>{val(row, 30)}</Td><Td className={isDark?'bg-slate-800':'bg-slate-50'}>{val(row, 31)}</Td><Td className={isDark?'bg-slate-800':'bg-slate-50'}>{val(row, 32)}</Td><Td className={isDark?'bg-slate-800':'bg-slate-50'}>{val(row, 33)}</Td><Td className={`${isDark?'bg-slate-700':'bg-slate-200'} font-bold`}>{val(row, 34)}</Td><Td className={`${isDark?'bg-slate-700':'bg-slate-200'} font-bold`}>{val(row, 35)}</Td>
                                        <Td className={isDark?'bg-purple-900/10':'bg-purple-50/40'}>{formatTime(row[36], row[37])}</Td><Td className={isDark?'bg-purple-900/10':'bg-purple-50/40'}>{formatTime(row[38], row[39])}</Td><Td className={`${isDark?'bg-purple-900/20':'bg-purple-100/60'}`}>{val(row, 40)}</Td><Td className={`${isDark?'bg-purple-900/20':'bg-purple-100/60'} font-bold`}>{val(row, 41)}</Td>
                                        <Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[42], row[43])}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[44], row[45])}</Td><Td className={`${isDark?'bg-indigo-900/20':'bg-indigo-100/60'}`}>{val(row, 46)}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[47], row[48])}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[49], row[50])}</Td><Td className={`${isDark?'bg-indigo-900/20':'bg-indigo-100/60'}`}>{val(row, 51)}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[52], row[53])}</Td><Td className={isDark?'bg-indigo-900/10':'bg-indigo-50/40'}>{formatTime(row[54], row[55])}</Td><Td className={`${isDark?'bg-indigo-900/20':'bg-indigo-100/60'}`}>{val(row, 56)}</Td><Td className={`${isDark?'bg-indigo-900/30':'bg-indigo-200/50'} font-bold`}>{val(row, 57)}</Td><Td className={`${isDark?'bg-indigo-900/30':'bg-indigo-200/50'} font-bold`}>{val(row, 58)}</Td>
                                        <Td className={isDark?'bg-cyan-900/10':'bg-cyan-50/40'}>{formatTime(row[59], row[60])}</Td><Td className={isDark?'bg-cyan-900/10':'bg-cyan-50/40'}>{formatTime(row[61], row[62])}</Td><Td className={`${isDark?'bg-cyan-900/20':'bg-cyan-100/60'} font-bold`}>{val(row, 63)}</Td>
                                        <Td className={isDark?'bg-sky-900/10':'bg-sky-50/40'}>{formatTime(row[64], row[65])}</Td><Td className={isDark?'bg-sky-900/10':'bg-sky-50/40'}>{formatTime(row[66], row[67])}</Td><Td className={`${isDark?'bg-sky-900/20':'bg-sky-100/60'} font-bold`}>{val(row, 68)}</Td>
                                        <Td className={`${isDark?'bg-fuchsia-900/20':'bg-fuchsia-100/60'} font-bold`}>{val(row, 69)}</Td>
                                        <Td className={isDark?'bg-orange-900/10':'bg-orange-50/40'}>{val(row, 70)}</Td><Td className={`${isDark?'bg-orange-900/20':'bg-orange-100/60'} font-bold`}>{val(row, 71)}</Td>
                                        
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
const InputRejectC = () => {
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
        no_batch: '', tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', reject_blow: '', volume_botol: '500 ML',
        cnt_start: 0, cnt_end: '', utuh: 'Y', 
        r_washing: '', r_vk: '', r_vl: '', r_nocap: '', r_sealnok: '', r_others: '',
        s_ipc: '', s_others: '',
        pre_bocor: '', pre_nocap: '', pre_vol: '', pre_thermo: '', pre_lain: '',
        av_sh: '', av_sm: '', av_eh: '', av_em: '',
        prep_mat_sh: '', prep_mat_sm: '', prep_mat_eh: '', prep_mat_em: '',
        prep_setup_sh: '', prep_setup_sm: '', prep_setup_eh: '', prep_setup_em: '',
        prep_flush_sh: '', prep_flush_sm: '', prep_flush_eh: '', prep_flush_em: '',
        run_sh: '', run_sm: '', run_eh: '', run_em: '',
        lc_sh: '', lc_sm: '', lc_eh: '', lc_em: '',
    };

    const [formData, setFormData] = useState(initialForm);
    const [calc, setCalc] = useState({}); 
    const [shiftTotals, setShiftTotals] = useState({ cnt: 0, good: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "" });

    const loadData = async () => {
        if (user) {
            try {
                const hist = await fetchTodayRejectC(user); 
                if(hist.status === 'success') { setHistoryData(hist.data); }
            } catch(e) {}
        }
    };

    const calculateHistoryTotals = (data, currentShift, currentDate, editingState, currentEditId) => {
        if (!data || data.length === 0 || !currentShift || !currentDate) {
            setShiftTotals({ cnt: 0, good: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "" });
            return;
        }
        const p = (val) => { if (!val) return 0; let str = String(val).replace('%', '').trim().replace(',', '.'); return parseFloat(str) || 0; };
        const formDateFmt = normalizeDateForSum(currentDate);

        const relevantData = [...data].reverse().filter(row => {
            const rowDateFmt = normalizeDateForSum(row[3]); 
            const isSameShift = String(row[4]).trim() === String(currentShift).trim() && rowDateFmt === formDateFmt;
            const isNotBeingEdited = editingState ? row[row.length - 1] !== currentEditId : true;
            return isSameShift && isNotBeingEdited;
        });

        let t = { cnt: 0, good: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "" };
        if(relevantData.length > 0) t.lastBatchNo = String(relevantData[0][2]); 

        relevantData.forEach(row => {
            t.cnt += p(row[10]); t.good += p(row[24]); t.avail += p(row[40]); t.prep += p(row[57]); t.jeda += p(row[70]); 
            let yieldVal = p(row[26]); 
            if (yieldVal < 1.1 && yieldVal > 0) yieldVal *= 100;
            t.yield_sum += yieldVal; t.yield_count += 1;
        });
        setShiftTotals(t);
    };

    useEffect(() => { calculateHistoryTotals(historyData, formData.shift, formData.tanggal, isEditing, editRowId); }, [formData.shift, formData.tanggal, historyData, isEditing, editRowId]);
    useEffect(() => { if (user) loadData(); }, [user]);

    useEffect(() => {
        const val = (k) => { const v = formData[k]; return (v === "" || v === null || v === undefined) ? 0 : parseFloat(v); };
        const cnt_sub = val('cnt_end') - val('cnt_start');
        const volKey = formData.volume_botol || "500 ML";
        const teori = TEORI_BATCH[volKey] || 23076;
        const jml_batch = (cnt_sub / teori).toFixed(2);
        
        const r_sub = val('r_washing') + val('r_vk') + val('r_vl') + val('r_nocap') + val('r_sealnok') + val('r_others');
        const s_sub = val('s_ipc') + val('s_others');
        const trf_st = cnt_sub - (r_sub + s_sub);
        const yield_batch = cnt_sub > 0 ? ((trf_st / cnt_sub) * 100).toFixed(2) : 0;
        const pre_in = trf_st;
        const pre_rej_total = val('pre_bocor') + val('pre_nocap') + val('pre_vol') + val('pre_thermo') + val('pre_lain');
        const pre_out = pre_in - pre_rej_total;
        
        const diff = (shKey, smKey, ehKey, emKey) => {
            const sh = formData[shKey]; const sm = formData[smKey]; const eh = formData[ehKey]; const em = formData[emKey];
            if (sh === "" || sm === "" || eh === "" || em === "") return 0;
            let d = ((parseInt(eh) * 60) + parseInt(em)) - ((parseInt(sh) * 60) + parseInt(sm));
            return d < 0 ? d + (24 * 60) : d; 
        };
        const av_sub = diff('av_sh', 'av_sm', 'av_eh', 'av_em');
        const p_mat = diff('prep_mat_sh', 'prep_mat_sm', 'prep_mat_eh', 'prep_mat_em');
        const p_set = diff('prep_setup_sh', 'prep_setup_sm', 'prep_setup_eh', 'prep_setup_em');
        const p_flu = diff('prep_flush_sh', 'prep_flush_sm', 'prep_flush_eh', 'prep_flush_em');
        const p_total = p_mat + p_set + p_flu;
        const run_sub = diff('run_sh', 'run_sm', 'run_eh', 'run_em');
        const lc_sub = diff('lc_sh', 'lc_sm', 'lc_eh', 'lc_em');
        const total_prep_clear = p_total + lc_sub;
        
        let prep_for_jeda = p_total;
        if (formData.no_batch && shiftTotals.lastBatchNo && String(formData.no_batch).trim().toUpperCase() === String(shiftTotals.lastBatchNo).trim().toUpperCase() && !isEditing) {
            prep_for_jeda = 0; 
        }
        const jeda_batch = lc_sub + prep_for_jeda;
        
        setCalc({ cnt_sub, jml_batch, r_sub, s_sub, trf_st, yield_batch, pre_in, pre_rej_total, pre_out, av_sub, p_mat, p_set, p_flu, p_total, run_sub, lc_sub, total_prep_clear, jeda_batch });
    }, [formData, shiftTotals.lastBatchNo, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('_h') || name.includes('sh') || name.includes('eh')) { if(value > 23) return; }
        if (name.includes('_m') || name.includes('sm') || name.includes('em')) { if(value > 59) return; }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditClick = (rowData) => {
        const accurateDate = parseToYMD(rowData[3]); 
        const newData = {
            ...initialForm,
            no_batch: rowData[2], tanggal: accurateDate, shift: rowData[4], group: rowData[5], reject_blow: rowData[6], volume_botol: rowData[7],
            cnt_start: rowData[8], cnt_end: rowData[9], utuh: rowData[11],
            r_washing: rowData[14], r_vk: rowData[15], r_vl: rowData[16], r_nocap: rowData[17], r_sealnok: rowData[18], r_others: rowData[19],
            s_ipc: rowData[21], s_others: rowData[22],
            pre_bocor: rowData[29], pre_nocap: rowData[30], pre_vol: rowData[31], pre_thermo: rowData[32], pre_lain: rowData[33],
            av_sh: rowData[36], av_sm: rowData[37], av_eh: rowData[38], av_em: rowData[39],
            prep_mat_sh: rowData[42], prep_mat_sm: rowData[43], prep_mat_eh: rowData[44], prep_mat_em: rowData[45],
            prep_setup_sh: rowData[47], prep_setup_sm: rowData[48], prep_setup_eh: rowData[49], prep_setup_em: rowData[50],
            prep_flush_sh: rowData[52], prep_flush_sm: rowData[53], prep_flush_eh: rowData[54], prep_flush_em: rowData[55],
            run_sh: rowData[59], run_sm: rowData[60], run_eh: rowData[61], run_em: rowData[62],
            lc_sh: rowData[64], lc_sm: rowData[65], lc_eh: rowData[66], lc_em: rowData[67],
        };
        setFormData(newData);
        setIsEditing(true);
        setEditRowId(rowData[rowData.length - 1]); 
        setIsClosingShift(rowData[13] && String(rowData[13]).trim() !== "" && String(rowData[13]).trim() !== "-");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast("Mode Edit Aktif: Data asli dipertahankan", { icon: '✏️', duration: 3000 });
    };

    const handleDeleteClick = async (rowData) => {
        if (window.confirm(`⚠️ PERINGATAN: Yakin ingin menghapus Batch ${rowData[2]} secara permanen?`)) {
            setLoading(true);
            try {
                const finalData = { original_id: rowData[rowData.length - 1], tanggal: parseToYMD(rowData[3]), shift: rowData[4] };
                const res = await submitOEEData({ action: 'delete_reject_c', data: finalData }, user);
                if(res.status === 'success') { toast.success("Data dihapus!"); loadData(); } 
                else { toast.error(res.message); }
            } catch (err) { toast.error("Terjadi kesalahan."); }
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false); setFormData(initialForm); setEditRowId(null); setIsClosingShift(false); toast.dismiss();
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        if(!formData.no_batch || !formData.cnt_end || !formData.shift) { toast.error("Data Wajib: No Batch, Counter End, Shift!"); setLoading(false); return; }

        const finalData = { 
            ...formData, ...calc, zone: 'C', is_closing: isClosingShift, original_id: isEditing ? editRowId : null,
            prep_mat_sub: calc.p_mat, prep_setup_sub: calc.p_set, prep_flush_sub: calc.p_flu 
        };

        try {
            const actionType = isEditing ? 'update_reject_c' : 'submit_reject_c';
            const res = await submitOEEData({ action: actionType, data: finalData }, user);
            setLoading(false);
            if(res.status === 'success') {
                toast.success(isEditing ? "Data Diupdate!" : (isClosingShift ? "Shift Ditutup!" : "Batch Tersimpan."));
                setFormData(prev => ({ ...initialForm, shift: prev.shift, group: prev.group, tanggal: prev.tanggal, cnt_start: 0, cnt_end: '' }));
                setIsClosingShift(false); setIsEditing(false); setEditRowId(null); loadData(); 
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
                            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">INPUT DATA KELAS <span className="text-blue-500">C</span></h1>
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
                            <Card title="Data Batch & Produksi" icon={Layers} color="blue" theme={theme}>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <ModernInput label="No Batch" name="no_batch" type="text" placeholder="A123" value={formData.no_batch} onChange={handleChange} required theme={theme}/>
                                    <ModernInput label="Tanggal" name="tanggal" type="date" value={formData.tanggal} onChange={handleChange} required theme={theme}/>
                                    <ModernSelect label="Shift" name="shift" value={formData.shift} options={SHIFTS} onChange={handleChange} required theme={theme}/>
                                    <ModernSelect label="Group" name="group" value={formData.group} options={GROUPS} onChange={handleChange} required theme={theme}/>
                                    <ModernInput label="Reject Blow" name="reject_blow" value={formData.reject_blow} onChange={handleChange} required theme={theme}/>
                                    <ModernSelect label="Volume" name="volume_botol" value={formData.volume_botol} options={VOLUMES} onChange={handleChange} required theme={theme}/>
                                </div>
                            </Card>

                            <Card title="Counter Filling" icon={Activity} color="emerald" theme={theme}>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <ModernInput label="Start" name="cnt_start" value={formData.cnt_start} onChange={handleChange} theme={theme} />
                                    <ModernInput label="End" name="cnt_end" value={formData.cnt_end} onChange={handleChange} required theme={theme}/>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-center">
                                    <StatBox label="Subtotal" value={calc.cnt_sub} unit="Pcs" theme={theme} />
                                    <ModernSelect label="Utuh?" name="utuh" value={formData.utuh} options={["Y", "N"]} onChange={handleChange} required theme={theme}/>
                                    <StatBox label="Jml Batch" value={calc.jml_batch} theme={theme} />
                                </div>
                                <div className={`mt-4 p-3 rounded-xl flex justify-between items-center transition-colors ${theme === 'dark' ? 'bg-blue-900/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                                    <span className={`text-xs font-bold uppercase ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Run Total Counter Shift</span>
                                    <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{(shiftTotals.cnt + calc.cnt_sub)}</span>
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card title="Reject Filling" icon={AlertOctagon} color="red" theme={theme}>
                                    <div className="space-y-3">
                                        <ModernInput label="Washing " name="r_washing" value={formData.r_washing} onChange={handleChange} theme={theme}/>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ModernInput label="VK" name="r_vk" value={formData.r_vk} onChange={handleChange} theme={theme}/>
                                            <ModernInput label="VL" name="r_vl" value={formData.r_vl} onChange={handleChange} theme={theme}/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ModernInput label="No Cap" name="r_nocap" value={formData.r_nocap} onChange={handleChange} theme={theme}/>
                                            <ModernInput label="Seal N/OK" name="r_sealnok" value={formData.r_sealnok} onChange={handleChange} theme={theme}/>
                                        </div>
                                        <ModernInput label="Others" name="r_others" value={formData.r_others} onChange={handleChange} theme={theme}/>
                                        <div className={`pt-2 border-t flex justify-between font-bold text-sm ${theme === 'dark' ? 'border-white/5 text-red-400' : 'border-slate-200 text-red-600'}`}>
                                            <span>Sub Total</span><span>{calc.r_sub}</span>
                                        </div>
                                    </div>
                                </Card>

                                <div className="space-y-6">
                                    <Card title="Samples" icon={Info} color="yellow" theme={theme}>
                                        <div className="space-y-3">
                                            <ModernInput label="IPC" name="s_ipc" value={formData.s_ipc} onChange={handleChange} theme={theme}/>
                                            <ModernInput label="Others" name="s_others" value={formData.s_others} onChange={handleChange} theme={theme}/>
                                            <div className={`pt-2 border-t text-right text-xs font-bold ${theme === 'dark' ? 'border-white/5 text-yellow-500' : 'border-slate-200 text-yellow-600'}`}>Sub Total (4.2): {calc.s_sub}</div>
                                        </div>
                                    </Card>
                                    <Card title="Pre-Steril" icon={Layers} color="slate" theme={theme}>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ModernInput label="Bocor" name="pre_bocor" value={formData.pre_bocor} onChange={handleChange} theme={theme}/>
                                            <ModernInput label="No Cap" name="pre_nocap" value={formData.pre_nocap} onChange={handleChange} theme={theme}/>
                                            <ModernInput label="Vol" name="pre_vol" value={formData.pre_vol} onChange={handleChange} theme={theme}/>
                                            <ModernInput label="Thermo" name="pre_thermo" value={formData.pre_thermo} onChange={handleChange} theme={theme}/>
                                            <ModernInput label="Lain" name="pre_lain" value={formData.pre_lain} onChange={handleChange} theme={theme}/>
                                        </div>
                                        <div className={`mt-3 pt-3 border-t flex justify-between text-xs font-bold ${theme === 'dark' ? 'border-white/5 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                                            <span>Total Rej: {calc.pre_rej_total}</span><span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>Out : {calc.pre_out}</span>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <div className={`rounded-2xl p-5 shadow-2xl transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-indigo-600 to-blue-700 shadow-blue-900/40 text-white' : 'bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 text-slate-800'}`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Hasil Produksi</h3>
                                <div className="space-y-4">
                                    <div className={`flex justify-between items-end pb-2 border-b ${theme === 'dark' ? 'border-white/20' : 'border-black/10'}`}>
                                        <span className="text-sm opacity-80">Trf to ST</span><span className="text-2xl font-black">{calc.trf_st}</span>
                                    </div>
                                    <div className={`flex justify-between items-end pb-2 border-b ${theme === 'dark' ? 'border-white/20' : 'border-black/10'}`}>
                                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>TOTAL HASIL SHIFT</span>
                                        <span className={`text-xl font-black ${theme === 'dark' ? 'text-emerald-100' : 'text-emerald-900'}`}>{(shiftTotals.good + calc.trf_st)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="text-xs opacity-70 block">% Yield Per Batch</span><span className="text-xl font-bold">{calc.yield_batch}%</span></div>
                                        <div className="text-right">
                                            <span className="text-xs opacity-70 block">AVG % Yield Shift</span>
                                            <span className={`text-xl font-bold ${theme === 'dark' ? 'text-yellow-300' : 'text-orange-600'}`}>{((shiftTotals.yield_sum + Number(calc.yield_batch)) / (shiftTotals.yield_count + 1)).toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Card title="Waktu Proses" icon={Clock} color="slate" theme={theme}>
                                <div className="space-y-3">
                                    <TimeInputBlock title="Available" prefix="av" formData={formData} handleChange={handleChange} subtotal={calc.av_sub} theme={theme}/>
                                    <div className={`text-right text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Avail Shift: {shiftTotals.avail + calc.av_sub}m</div>
                                    <div className={`h-px my-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}></div>
                                    <TimeInputBlock title="Mat Prep" prefix="prep_mat" formData={formData} handleChange={handleChange} subtotal={calc.p_mat} theme={theme}/>
                                    <TimeInputBlock title="Setup" prefix="prep_setup" formData={formData} handleChange={handleChange} subtotal={calc.p_set} theme={theme}/>
                                    <TimeInputBlock title="Flushing" prefix="prep_flush" formData={formData} handleChange={handleChange} subtotal={calc.p_flu} theme={theme}/>
                                    <div className={`flex justify-between text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}><span>Total Prep: {calc.p_total}m</span><span className={theme==='dark'?'text-blue-400':'text-blue-600'}>Total Shift: {shiftTotals.prep + calc.p_total}m</span></div>
                                    <div className={`h-px my-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}></div>
                                    <TimeInputBlock title="Run Time" prefix="run" formData={formData} handleChange={handleChange} subtotal={calc.run_sub} theme={theme}/>
                                    <TimeInputBlock title="Clearance" prefix="lc" formData={formData} handleChange={handleChange} subtotal={calc.lc_sub} theme={theme}/>
                                </div>
                                <div className={`mt-4 p-3 rounded-xl flex justify-between items-center text-xs font-bold ${theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                    <span>Prep+Clear</span><span className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{calc.total_prep_clear}m</span>
                                </div>
                            </Card>

                            <Card title="Jeda Antar Batch" icon={Clock} color="orange" theme={theme}>
                                <div className="space-y-2">
                                    <div className={`flex justify-between items-center pb-2 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Jeda</span><span className={`text-xl font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{calc.jeda_batch} m</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Jeda Shift</span><span className={`text-lg font-mono font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>{shiftTotals.jeda + calc.jeda_batch} m</span>
                                    </div>
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
                                    className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${isEditing ? 'bg-orange-500 hover:bg-orange-400 text-white' : (isClosingShift ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-blue-600 hover:bg-blue-500 text-white')}`}>
                                    {loading ? <Loader2 className="animate-spin"/> : <>{isEditing ? <FileEdit size={20}/> : <Save size={20}/>} {isEditing ? "UPDATE DATA" : (isClosingShift ? "TUTUP SHIFT" : "SIMPAN DATA")}</>}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div className="max-w-full mx-auto px-4 pb-8">
                <HistoryTableC data={historyData} refresh={handleRefresh} isLoading={isTableLoading} onEdit={handleEditClick} onDelete={handleDeleteClick} theme={theme} />
            </div>
        </div>
    );
};

export default InputRejectC;