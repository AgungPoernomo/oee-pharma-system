import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitOEEData, fetchValidationData, fetchTodayDowntimeF } from '../../../services/api'; 
import { Save, Database, Clock, AlertTriangle, RefreshCw, CheckCircle, Loader2, FileEdit, XCircle, ArrowLeft, Plus, Trash2, ListChecks, Sun, Moon, Maximize, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// --- HARDCODED CONSTANTS ---
const SHIFTS = ["1", "2", "3"];
const GROUPS = ["A", "B", "C", "D"];

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

// --- COMPONENTS ---
const SectionTitle = ({ title, icon: Icon, theme }) => (
  <div className={`flex items-center gap-2 mb-4 mt-6 pb-2 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-300'}`}>
      {Icon && <Icon size={18} className="text-purple-500" />}
      <h3 className={`text-lg font-bold tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
  </div>
);

const InputGroup = ({ label, name, type="text", value, onChange, placeholder, required=false, disabled=false, theme="dark" }) => {
    const isDark = theme === 'dark';
    return (
        <div className="flex flex-col gap-1.5">
            <label className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input 
                type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
                className={`w-full px-4 py-3 rounded-xl border outline-none font-mono text-sm transition-all 
                ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-purple-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-purple-500'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
        </div>
    );
};

const DropdownGroup = ({ label, name, value, onChange, options=[], required=false, disabled=false, theme="dark" }) => {
    const isDark = theme === 'dark';
    return (
        <div className="flex flex-col gap-1.5">
            <label className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select 
                name={name} value={value} onChange={onChange} disabled={disabled}
                className={`w-full px-4 py-3 rounded-xl border outline-none font-bold text-sm appearance-none cursor-pointer transition-all
                ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-purple-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-purple-500'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <option value="">-- Pilih --</option>
                {options && options.map(opt => (
                    <option key={opt} value={opt} className={isDark ? "bg-slate-900" : "bg-white"}>{opt}</option>
                ))}
            </select>
        </div>
    );
};

// --- TABEL MONITORING (ZONE F) ---
const HistoryTableDT = ({ data, refresh, onEdit, onDelete, isLoading, theme }) => {
    const isDark = theme === 'dark';
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [isFullView, setIsFullView] = useState(false);

    // Grid Inner Border
    const bColor = isDark ? 'border-white/30' : 'border-black/40';

    let processedData = data || [];
    if (filterStartDate) {
        if (filterEndDate) {
            processedData = processedData.filter(row => {
                const d = parseToYMD(row[2]); 
                return d >= filterStartDate && d <= filterEndDate;
            });
        } else {
            processedData = processedData.filter(row => parseToYMD(row[2]) === filterStartDate);
        }
    }
    
    // Batasi 25 Baris untuk tampilan Normal
    if (!isFullView) processedData = processedData.slice(0, 25);

    const val = (row, index) => (!row || row[index] === undefined || row[index] === null || String(row[index]).trim() === "") ? "-" : row[index];
    const formatTime = (h, m) => (h === "-" || h === "" || h == null) ? "-" : `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;

    const textMain = isDark ? 'text-slate-200' : 'text-slate-900';
    
    // EFEK BLUR KACA (GLASSMORPHISM) PADA HEADER
    const stBgTh = isDark ? 'bg-[#0f172a]/80 backdrop-blur-md' : 'bg-slate-200/80 backdrop-blur-md';
    const stBgTd = isDark ? 'bg-slate-800' : 'bg-slate-50'; // TD tetap solid agar text tidak tembus

    const stickyClasses = {
        tgl:   `sticky left-0 z-20 w-[90px] min-w-[90px] max-w-[90px] ${stBgTd}`,
        batch: `sticky left-[90px] z-20 w-[90px] min-w-[90px] max-w-[90px] ${stBgTd}`,
        lot:   `sticky left-[180px] z-20 w-[80px] min-w-[80px] max-w-[80px] ${stBgTd}`,
        shift: `sticky left-[260px] z-20 w-[60px] min-w-[60px] max-w-[60px] ${stBgTd}`,
        status:`sticky right-[70px] z-20 w-[75px] min-w-[75px] max-w-[75px] ${stBgTd}`,
        aksi:  `sticky right-0 z-20 w-[70px] min-w-[70px] max-w-[70px] ${stBgTd}`
    };

    // Implementasi efek Blur pada seluruh ThGroup dan Th
    const ThGroup = ({ children, className="", colSpan=1, rowSpan=1 }) => <th colSpan={colSpan} rowSpan={rowSpan} className={`px-2 py-3 border ${bColor} text-center font-black text-[10px] uppercase whitespace-nowrap tracking-wider backdrop-blur-md ${className}`}>{children}</th>;
    const Th = ({ children, className="" }) => <th className={`px-2 py-2 border ${bColor} text-center font-bold text-[9px] uppercase whitespace-nowrap backdrop-blur-md ${className}`}>{children}</th>;
    const Td = ({ children, className="" }) => <td className={`px-2 py-2 border ${bColor} text-center font-mono text-[11px] whitespace-normal sm:whitespace-nowrap ${className}`}>{children}</td>;

    const TableContent = (
        // PERUBAHAN: Menghapus border luar, hanya menyisakan bayangan (shadow)
        <div className={`flex flex-col w-full h-full relative ${isFullView ? `bg-[#0B1120] rounded-2xl shadow-2xl` : `rounded-2xl shadow-2xl overflow-hidden`}`}>
            <div className={`p-3 flex justify-between items-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-3">
                    <h3 className={`font-bold flex items-center gap-2 text-xs uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}><Database size={14} className="text-purple-500"/> Histori Downtime F</h3>
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isDark ? 'bg-[#0f172a] border-white/20' : 'bg-white border-black/20'}`}>
                        <Calendar size={12} className={isDark ? 'text-slate-400' : 'text-slate-500'}/>
                        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className={`text-[10px] font-mono outline-none bg-transparent ${isDark ? 'text-white' : 'text-slate-800'}`}/>
                        <span className="text-[10px] font-bold text-slate-500">-</span>
                        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} disabled={!filterStartDate} className={`text-[10px] font-mono outline-none bg-transparent ${isDark ? 'text-white' : 'text-slate-800'} ${!filterStartDate ? 'opacity-30' : ''}`}/>
                        {(filterStartDate || filterEndDate) && <button type="button" onClick={() => {setFilterStartDate(""); setFilterEndDate("");}} className="text-red-500"><XCircle size={12}/></button>}
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <button type="button" onClick={refresh} className={`p-1.5 px-3 rounded flex items-center gap-1 text-[10px] border transition-all active:scale-95 ${isDark ? 'bg-slate-700 text-white border-white/10 hover:bg-slate-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'}`}><RefreshCw size={12}/> REFRESH</button>
                    {isFullView ? (
                        <button type="button" onClick={() => setIsFullView(false)} className={`p-1.5 px-3 rounded flex items-center gap-1 text-[10px] font-bold border transition-all active:scale-95 ${isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 hover:bg-orange-500/40' : 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'}`}><ArrowLeft size={12}/> KEMBALI</button>
                    ) : (
                        <button type="button" onClick={() => setIsFullView(true)} className={`p-1.5 px-3 rounded flex items-center gap-1 text-[10px] border transition-all active:scale-95 ${isDark ? 'bg-blue-900/40 text-blue-300 border-blue-500/30 hover:bg-blue-900/60' : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'}`}><Maximize size={12}/> FULL VIEW</button>
                    )}
                </div>
            </div>
            
            <div className={`relative flex-1 w-full overflow-hidden ${!isFullView ? 'max-h-[450px]' : ''} ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
                <AnimatePresence>
                    {isLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md ${isDark ? 'bg-[#1e293b]/60' : 'bg-white/60'}`}>
                        <Loader2 className={`animate-spin mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} size={40}/>
                        <span className={`text-[11px] font-black tracking-widest animate-pulse ${isDark ? 'text-white' : 'text-slate-800'}`}>SINKRONISASI DATA...</span>
                      </motion.div>
                    )}
                </AnimatePresence>

                <div className="overflow-auto w-full h-full custom-scrollbar">
                    <table className="w-full border-collapse border-hidden">
                        <thead className="sticky top-0 z-40 shadow-xl">
                            <tr>
                                <ThGroup rowSpan={2} className={`sticky left-0 z-50 w-[90px] min-w-[90px] max-w-[90px] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Tanggal</ThGroup>
                                <ThGroup rowSpan={2} className={`sticky left-[90px] z-50 w-[90px] min-w-[90px] max-w-[90px] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Batch</ThGroup>
                                <ThGroup rowSpan={2} className={`sticky left-[180px] z-50 w-[80px] min-w-[80px] max-w-[80px] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Lot</ThGroup>
                                <ThGroup rowSpan={2} className={`sticky left-[260px] z-50 w-[60px] min-w-[60px] max-w-[60px] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Shift</ThGroup>
                                <ThGroup rowSpan={2} className={isDark?'bg-slate-800/90 text-white':'bg-slate-200/90 text-slate-800'}>Grup</ThGroup>
                                
                                <ThGroup colSpan={2} className={isDark?'bg-indigo-900/80 text-indigo-200':'bg-indigo-200/80 text-indigo-900'}>Waktu Kejadian</ThGroup>
                                <ThGroup rowSpan={2} className={isDark?'bg-red-900/80 text-red-200':'bg-red-200/80 text-red-900'}>Durasi</ThGroup>
                                <ThGroup colSpan={5} className={isDark?'bg-slate-700/90 text-white':'bg-slate-300/90 text-slate-800'}>Detail Masalah</ThGroup>
                                
                                <ThGroup rowSpan={2} className={`sticky right-[70px] z-50 w-[75px] min-w-[75px] max-w-[75px] ${stBgTh} ${isDark?'text-white':'text-slate-800'}`}>Status</ThGroup>
                                <ThGroup rowSpan={2} className={`sticky right-0 z-50 w-[70px] min-w-[70px] max-w-[70px] ${stBgTh} ${isDark?'text-yellow-500':'text-orange-600'}`}>Aksi</ThGroup>
                            </tr>
                            <tr>
                                <Th className={isDark?'bg-indigo-900/80':'bg-indigo-200/80'}>Mulai</Th>
                                <Th className={isDark?'bg-indigo-900/80':'bg-indigo-200/80'}>Selesai</Th>
                                <Th className={isDark?'bg-slate-800/90':'bg-slate-300/90'}>Kategori</Th>
                                <Th className={isDark?'bg-slate-800/90':'bg-slate-300/90'}>Root Cause</Th>
                                <Th className={isDark?'bg-slate-800/90':'bg-slate-300/90'}>Proses</Th>
                                <Th className={isDark?'bg-slate-800/90':'bg-slate-300/90'}>Unit</Th>
                                <Th className={isDark?'bg-slate-800/90':'bg-slate-300/90'}>Kasus</Th>
                            </tr>
                        </thead>
                        <tbody className={textMain}>
                            {(!processedData || processedData.length === 0) ? (<tr><td colSpan="16" className={`px-4 py-8 text-center italic text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Belum ada data downtime.</td></tr>) : (
                                processedData.map((row, idx) => {
                                    return (
                                    <tr key={idx} className={`transition-colors hover:bg-opacity-80 ${isDark ? 'bg-[#1e293b]/50 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'}`}>
                                        <Td className={stickyClasses.tgl}><span className={isDark?'text-slate-200':'text-slate-700'}>{val(row, 2)}</span></Td>
                                        <Td className={stickyClasses.batch}><span className={isDark?'text-white font-black':'text-slate-900 font-black'}>{val(row, 5)}</span></Td>
                                        <Td className={stickyClasses.lot}><span className="text-purple-500 font-bold">{val(row, 6)}</span></Td>
                                        <Td className={stickyClasses.shift}>{val(row, 3)}</Td>
                                        <Td>{val(row, 4)}</Td>
                                        
                                        <Td className={isDark?'bg-indigo-900/10 text-blue-300':'bg-indigo-50/40 text-blue-700'}>{formatTime(row[7], row[8])}</Td>
                                        <Td className={isDark?'bg-indigo-900/10 text-blue-300':'bg-indigo-50/40 text-blue-700'}>{formatTime(row[9], row[10])}</Td>
                                        <Td className={isDark?'bg-red-900/10 text-red-400 font-bold':'bg-red-50/40 text-red-600 font-bold'}>{val(row, 11)}m</Td>
                                        
                                        <Td>
                                            <span className={`px-2 py-0.5 rounded text-[9px] border ${val(row, 12)==='Unplanned' ? (isDark?'bg-red-500/10 border-red-500/30 text-red-400':'bg-red-100 border-red-300 text-red-700') : (isDark?'bg-blue-500/10 border-blue-500/30 text-blue-400':'bg-blue-100 border-blue-300 text-blue-700')}`}>
                                                {val(row, 12)}
                                            </span>
                                        </Td>
                                        <Td>{val(row, 13)}</Td>
                                        <Td>{val(row, 14)}</Td>
                                        <Td>{val(row, 15)}</Td>
                                        <Td className="whitespace-normal max-w-[200px] text-left leading-tight italic opacity-80">{val(row, 16)}</Td>
                                        
                                        <Td className={stickyClasses.status}>
                                            <span className={`px-2 py-1 rounded text-[9px] font-bold border ${isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-500'}`}>TERSIMPAN</span>
                                        </Td>
                                        <Td className={stickyClasses.aksi}>
                                            <div className="flex justify-center items-center gap-1">
                                                <button type="button" onClick={() => { onEdit(row); setIsFullView(false); }} className={`p-1.5 rounded transition-colors shadow-sm active:scale-95 ${isDark ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black' : 'bg-yellow-100 text-yellow-700 border hover:bg-yellow-400 hover:text-white'}`} title="Edit Data"><FileEdit size={14}/></button>
                                                <button type="button" onClick={() => onDelete(row)} className={`p-1.5 rounded transition-colors shadow-sm active:scale-95 ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-100 text-red-700 border hover:bg-red-500 hover:text-white'}`} title="Hapus Data"><Trash2 size={14}/></button>
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
            {!isFullView && data && data.length > 25 && !filterStartDate && (
                <div className={`p-2 text-center text-[10px] font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} border-t-0`}>
                    Menampilkan 25 data terbaru. Gunakan filter tanggal atau mode FULL VIEW untuk melihat semua.
                </div>
            )}
        </div>
    );

    if (isFullView) {
        return (
            <AnimatePresence>
                {/* Diberikan padding (p-6) agar tabel memiliki margin saat mode Full View */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 z-[9999] p-6 flex flex-col">
                    {TableContent}
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-[9998] backdrop-blur-sm"></motion.div>
            </AnimatePresence>
        );
    }
    return <div className="mt-8">{TableContent}</div>;
};

// ==========================================
// MAIN COMPONENT (ENGINEERED FOR BULK ENTRY)
// ==========================================

const InputDowntimeF = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [masterData, setMasterData] = useState({});
    const [options, setOptions] = useState({ rc: [], proses: [], unit: [] });
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('appTheme') || 'dark');

    useEffect(() => {
        const handleThemeChange = () => setTheme(localStorage.getItem('appTheme') || 'dark');
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // --- STATE KERANJANG BARU ---
    // No Batch dipindahkan dari header ke timeRows
    const initialHeader = { tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', plan_unplan: 'Planned', root_cause: 'Production', proses: '', unit: '', kasus: '' };
    
    const [headerData, setHeaderData] = useState(initialHeader);
    const [timeRows, setTimeRows] = useState([ { id: Date.now(), no_batch: '', lot: '', start_h: '', start_m: '', end_h: '', end_m: '', duration: 0 } ]);
    const [drafts, setDrafts] = useState([]); 

    // STATE EDIT MODE
    const [isEditing, setIsEditing] = useState(false);
    const [editRowId, setEditRowId] = useState(null);

    const loadData = async () => {
        try {
            const res = await fetchValidationData();
            if(res.status === 'success') {
                setMasterData(res.data);
                setOptions(prev => ({
                    ...prev,
                    rc: res.data['RC_F'] || [], proses: res.data['DT_Proses_F'] || [] 
                }));
            }
        } catch(e) {}
        try {
            const hist = await fetchTodayDowntimeF(user); 
            if(hist.status === 'success') setHistoryData(hist.data);
        } catch(e) {}
    };

    useEffect(() => { if(user) loadData(); }, [user]);

    const handleRefresh = async () => {
        setIsTableLoading(true);
        await loadData();
        setTimeout(() => setIsTableLoading(false), 800); 
    };

    // Logic Cascading Dropdown
    useEffect(() => {
        if (headerData.proses && masterData) {
            const unitKey = `Unit_${headerData.proses}`;
            const newUnits = masterData[unitKey] || [];
            setOptions(prev => ({ ...prev, unit: newUnits }));
            if (!newUnits.includes(headerData.unit)) {
                setHeaderData(prev => ({ ...prev, unit: '' }));
            }
        } else {
            setOptions(prev => ({ ...prev, unit: [] }));
        }
    }, [headerData.proses, masterData]);

    const handleHeaderChange = (e) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });

    // Handler Baris Waktu & Batch/Lot
    const handleTimeRowChange = (id, field, value) => {
        if((field === 'start_h' || field === 'end_h') && value > 23) return;
        if((field === 'start_m' || field === 'end_m') && value > 59) return;
        
        setTimeRows(prevRows => prevRows.map(row => {
            if(row.id === id) {
                const newRow = { ...row, [field]: value };
                if(newRow.start_h && newRow.start_m && newRow.end_h && newRow.end_m) {
                    let start = (Number(newRow.start_h) * 60) + Number(newRow.start_m);
                    let end = (Number(newRow.end_h) * 60) + Number(newRow.end_m);
                    let diff = end - start;
                    if(diff < 0) diff += (24 * 60);
                    newRow.duration = diff;
                }
                return newRow;
            }
            return row;
        }));
    };

    const addTimeRow = () => {
        setTimeRows([...timeRows, { id: Date.now(), no_batch: '', lot: '', start_h: '', start_m: '', end_h: '', end_m: '', duration: 0 }]);
    };

    const removeTimeRow = (id) => {
        if(timeRows.length > 1) {
            setTimeRows(timeRows.filter(row => row.id !== id));
        }
    };

    // --- FUNGSI TAMBAH KE KERANJANG ---
    const handleAddDraft = () => {
        if(!headerData.shift || !headerData.group || !headerData.proses || !headerData.kasus) {
            toast.error("Data Umum (Shift, Group) & Detail Masalah wajib diisi!"); return;
        }

        let newDrafts = [];
        let hasError = false;

        timeRows.forEach(row => {
            if(!row.no_batch || !row.lot || !row.start_h || !row.end_h) {
                hasError = true; return;
            }
            newDrafts.push({ ...headerData, ...row, draftId: Math.random().toString(36).substr(2, 9) });
        });

        if(hasError) {
            toast.error("Setiap baris waktu harus memiliki No Batch, Lot, Jam Mulai, dan Selesai yang lengkap!"); return;
        }

        setDrafts([...drafts, ...newDrafts]);
        toast.success(`${newDrafts.length} Data digandakan ke Daftar!`, { icon: '🛒' });
        
        setTimeRows([ { id: Date.now(), no_batch: '', lot: '', start_h: '', start_m: '', end_h: '', end_m: '', duration: 0 } ]);
    };

    const removeDraft = (draftIdToRemove) => setDrafts(drafts.filter(d => d.draftId !== draftIdToRemove));

    // --- FUNGSI HAPUS TABEL ---
    const handleDeleteClick = async (rowData) => {
        if (window.confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin menghapus permanen Downtime Batch ${rowData[5]}?`)) {
            setLoading(true);
            try {
                const finalData = { original_id: rowData[rowData.length - 1] };
                const res = await submitOEEData({ action: 'delete_downtime_f', data: finalData }, user);
                if(res.status === 'success') {
                    toast.success("Downtime berhasil dihapus!");
                    loadData(); 
                } else { toast.error(res.message); }
            } catch (err) { toast.error("Terjadi kesalahan koneksi."); }
            setLoading(false);
        }
    };

    // --- FUNGSI SUBMIT ---
    const handleSubmit = async () => {
        if (isEditing) {
            setLoading(true);
            try {
                const payload = { ...headerData, ...timeRows[0], original_id: editRowId };
                const res = await submitOEEData({ action: 'update_downtime_f', data: payload }, user);
                setLoading(false);
                if(res.status === 'success') {
                    toast.success("Downtime Diupdate!");
                    handleCancelEdit();
                    loadData();
                } else { toast.error(res.message); }
            } catch(e) { setLoading(false); toast.error("Error koneksi"); }
        } else {
            if (drafts.length === 0) { toast.error("Daftar draf kosong."); return; }
            setLoading(true);
            try {
                const res = await submitOEEData({ action: 'submit_bulk_downtime_f', data: drafts }, user);
                setLoading(false);
                if(res.status === 'success') {
                    toast.success(`${drafts.length} Downtime Berhasil Disimpan!`);
                    setDrafts([]); 
                    setHeaderData(initialHeader); 
                    setTimeRows([ { id: Date.now(), no_batch: '', lot: '', start_h: '', start_m: '', end_h: '', end_m: '', duration: 0 } ]);
                    loadData();
                } else { toast.error(res.message); }
            } catch(e) { setLoading(false); toast.error("Error koneksi"); }
        }
    };

    const handleEditClick = (rowData) => {
        if (drafts.length > 0) {
            if (!window.confirm("Ada draf belum disimpan. Mengedit akan menghapus draf. Lanjutkan?")) return;
            setDrafts([]);
        }

        const accurateDate = parseToYMD(rowData[2]); 
        setHeaderData({ 
            tanggal: accurateDate, shift: rowData[3], group: rowData[4],
            plan_unplan: rowData[12], root_cause: rowData[13], proses: rowData[14], unit: rowData[15], kasus: rowData[16]
        });
        
        setTimeRows([{
            id: Date.now(), no_batch: rowData[5], lot: rowData[6], start_h: rowData[7], start_m: rowData[8], end_h: rowData[9], end_m: rowData[10], duration: rowData[11]
        }]);

        setIsEditing(true);
        setEditRowId(rowData[rowData.length - 1]); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast("Mode Edit Aktif", { icon: '✏️' });        
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setHeaderData(initialHeader);
        setTimeRows([ { id: Date.now(), no_batch: '', lot: '', start_h: '', start_m: '', end_h: '', end_m: '', duration: 0 } ]);
        setEditRowId(null);
        toast.dismiss();
    };

    const bgContainer = theme === 'dark' ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-800';
    const bgHeader = theme === 'dark' ? 'bg-[#0f172a]/80 border-white/5' : 'bg-white/90 border-slate-300 shadow-sm text-slate-800';

    return (
        <div className={`min-h-screen font-sans pb-32 transition-colors duration-300 ${bgContainer}`}>
            <Toaster position="top-center" toastOptions={{style: {background: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#fff' : '#000'}}} />
            
            {/* NAVBAR */}
            <div className={`backdrop-blur-md border-b px-6 py-4 sticky top-0 z-50 transition-colors duration-300 ${bgHeader} ${isEditing ? 'border-b-2 border-yellow-500' : ''}`}>
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => navigate('/foreman/tactical-input')} className={`p-2.5 rounded-xl transition-all active:scale-95 border ${theme === 'dark' ? 'bg-slate-800 border-white/5 text-slate-300' : 'bg-white border-slate-300 text-slate-600 shadow-sm'}`}><ArrowLeft size={20}/></button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">INPUT DOWNTIME <span className="text-purple-500">ZONE F</span></h1>
                            <div className="flex items-center gap-2">
                                {isEditing ? <span className="text-[10px] font-bold bg-yellow-500 text-black px-2 py-0.5 rounded animate-pulse">MODE EDITING</span> : <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span className={`text-[10px] font-mono uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Operator: {user?.nama || 'Guest'}</span></>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* BAGIAN KIRI: Form Input Cepat */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        <div className={`p-6 rounded-2xl border shadow-xl transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1e293b]/80 border-white/5' : 'bg-white border-slate-200'}`}>
                            <SectionTitle title="1. Parameter Utama (Tetap)" icon={Database} theme={theme}/>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <InputGroup label="Tanggal" name="tanggal" type="date" value={headerData.tanggal} onChange={handleHeaderChange} required disabled={isEditing || drafts.length>0} theme={theme}/>
                                <DropdownGroup label="Shift" name="shift" value={headerData.shift} options={SHIFTS} onChange={handleHeaderChange} required disabled={isEditing || drafts.length>0} theme={theme}/>
                                <DropdownGroup label="Group" name="group" value={headerData.group} options={GROUPS} onChange={handleHeaderChange} required disabled={isEditing || drafts.length>0} theme={theme}/>
                            </div>

                            <SectionTitle title="2. Deskripsi Masalah" icon={AlertTriangle} theme={theme}/>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <DropdownGroup label="Kategori" name="plan_unplan" value={headerData.plan_unplan} options={['Unplanned', 'Planned']} onChange={handleHeaderChange} required theme={theme}/>
                                <DropdownGroup label="Root Cause" name="root_cause" value={headerData.root_cause} options={options.rc} onChange={handleHeaderChange} required theme={theme}/>
                                <DropdownGroup label="Proses" name="proses" value={headerData.proses} options={options.proses} onChange={handleHeaderChange} required theme={theme}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DropdownGroup label="Unit Mesin" name="unit" value={headerData.unit} options={options.unit} onChange={handleHeaderChange} disabled={!headerData.proses} required theme={theme}/>
                                <div className="flex flex-col gap-1.5">
                                    <label className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Kasus / Keterangan *</label>
                                    <input type="text" name="kasus" value={headerData.kasus} onChange={handleHeaderChange} placeholder="Jelaskan..." className={`w-full px-4 py-3 rounded-xl border outline-none font-mono text-sm transition-all ${theme === 'dark' ? 'bg-black/20 border-white/10 text-white focus:border-purple-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-purple-500'}`}/>
                                </div>
                            </div>
                        </div>

                        <div className={`p-6 rounded-2xl border shadow-xl transition-colors duration-300 ${theme === 'dark' ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                            <div className={`flex justify-between items-end mb-4 border-b ${theme === 'dark' ? 'border-indigo-500/30' : 'border-indigo-300'} pb-3`}>
                                <SectionTitle title="3. Input Multi-Batch & Waktu" icon={Clock} theme={theme}/>
                                {!isEditing && (
                                    <button type="button" onClick={addTimeRow} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${theme === 'dark' ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                                        <Plus size={14}/> TAMBAH BARIS
                                    </button>
                                )}
                            </div>
                            
                            {/* JUDUL KOLOM UNTUK MULTI INPUT */}
                            <div className={`hidden md:flex items-center gap-3 px-3 mb-2 text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                <div className="w-8 shrink-0 text-center">No</div>
                                <div className="flex-1 grid grid-cols-12 gap-3">
                                    <div className="col-span-2">No Batch</div>
                                    <div className="col-span-2">Lot</div>
                                    <div className="col-span-3 text-center">Mulai (Jam:Mnt)</div>
                                    <div className="col-span-3 text-center">Selesai (Jam:Mnt)</div>
                                    <div className="col-span-2 pl-2">Durasi</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {timeRows.map((row, index) => (
                                    <div key={row.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-[#0f172a] border-white/5 hover:border-indigo-500/50' : 'bg-white border-slate-300 hover:border-indigo-400'}`}>
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0">{index + 1}</div>
                                        
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                                            <div className="col-span-1 md:col-span-2">
                                                <input type="text" value={row.no_batch} onChange={(e) => handleTimeRowChange(row.id, 'no_batch', e.target.value)} placeholder="Batch" className={`w-full px-3 py-2 rounded-lg border outline-none font-bold text-xs uppercase ${theme === 'dark' ? 'bg-black/40 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'}`}/>
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <input type="text" value={row.lot} onChange={(e) => handleTimeRowChange(row.id, 'lot', e.target.value)} placeholder="Lot" className={`w-full px-3 py-2 rounded-lg border outline-none font-bold text-xs uppercase ${theme === 'dark' ? 'bg-black/40 border-slate-700 text-purple-400' : 'bg-slate-100 border-slate-300 text-purple-700'}`}/>
                                            </div>
                                            <div className="col-span-1 md:col-span-3 flex gap-1">
                                                <input type="number" value={row.start_h} onChange={(e) => handleTimeRowChange(row.id, 'start_h', e.target.value)} placeholder="HH" className={`w-full px-2 py-2 rounded-lg border outline-none text-center font-mono text-xs ${theme === 'dark' ? 'bg-black/40 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'}`}/>
                                                <span className={`flex items-center font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>:</span>
                                                <input type="number" value={row.start_m} onChange={(e) => handleTimeRowChange(row.id, 'start_m', e.target.value)} placeholder="MM" className={`w-full px-2 py-2 rounded-lg border outline-none text-center font-mono text-xs ${theme === 'dark' ? 'bg-black/40 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'}`}/>
                                            </div>
                                            <div className="col-span-1 md:col-span-3 flex gap-1">
                                                <input type="number" value={row.end_h} onChange={(e) => handleTimeRowChange(row.id, 'end_h', e.target.value)} placeholder="HH" className={`w-full px-2 py-2 rounded-lg border outline-none text-center font-mono text-xs ${theme === 'dark' ? 'bg-black/40 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'}`}/>
                                                <span className={`flex items-center font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>:</span>
                                                <input type="number" value={row.end_m} onChange={(e) => handleTimeRowChange(row.id, 'end_m', e.target.value)} placeholder="MM" className={`w-full px-2 py-2 rounded-lg border outline-none text-center font-mono text-xs ${theme === 'dark' ? 'bg-black/40 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'}`}/>
                                            </div>
                                            <div className="col-span-1 md:col-span-2 flex items-center justify-between pl-2">
                                                <span className={`text-sm font-black ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{row.duration} m</span>
                                                {!isEditing && timeRows.length > 1 && (
                                                    <button type="button" onClick={() => removeTimeRow(row.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* BAGIAN KANAN: Keranjang & Submit */}
                    <div className="lg:col-span-4 space-y-6">
                        {isEditing ? (
                            <div className={`p-6 rounded-2xl border shadow-xl flex flex-col gap-4 ${theme === 'dark' ? 'bg-slate-800 border-yellow-500/50' : 'bg-yellow-50 border-yellow-400'}`}>
                                <h3 className={`text-lg font-black ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>MODE UPDATE</h3>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Anda sedang mengedit 1 baris data Downtime.</p>
                                <button type="button" onClick={handleSubmit} disabled={loading} className="w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-400 text-white">
                                    {loading ? <Loader2 className="animate-spin"/> : <><FileEdit size={20}/> SIMPAN PEMBARUAN</>}
                                </button>
                                <button type="button" onClick={handleCancelEdit} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
                                    <XCircle size={18}/> BATAL
                                </button>
                            </div>
                        ) : (
                            <>
                                <button type="button" onClick={handleAddDraft} className={`w-full py-5 rounded-2xl border-2 border-dashed font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${theme === 'dark' ? 'border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/10 text-purple-400' : 'border-purple-400 hover:border-purple-600 hover:bg-purple-50 text-purple-600'}`}>
                                    <Plus size={24}/> TAMBAHKAN KE DAFTAR
                                </button>

                                <div className={`p-5 rounded-2xl border shadow-xl flex flex-col ${theme === 'dark' ? 'bg-[#1e293b]/80 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <div className="flex items-center justify-between mb-4 border-b border-emerald-500/20 pb-3">
                                        <div className="flex items-center gap-2">
                                            <ListChecks className={theme==='dark'?'text-emerald-400':'text-emerald-600'} size={20}/>
                                            <h3 className={`font-black ${theme==='dark'?'text-white':'text-slate-800'}`}>DAFTAR SIAP KIRIM</h3>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${theme==='dark'?'bg-emerald-500/20 text-emerald-400':'bg-emerald-200 text-emerald-800'}`}>
                                            {drafts.length} Item
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-2 max-h-[300px] overflow-auto custom-scrollbar pr-2 mb-4">
                                        {drafts.length === 0 ? (
                                            <p className={`text-center text-xs italic py-4 ${theme==='dark'?'text-slate-500':'text-slate-400'}`}>Daftar kosong. Tambahkan data.</p>
                                        ) : (
                                            drafts.map((d) => (
                                                <div key={d.draftId} className={`p-3 rounded-xl border flex justify-between items-center group ${theme==='dark'?'bg-slate-800 border-slate-700':'bg-white border-slate-300'}`}>
                                                    <div>
                                                        <p className={`font-bold text-xs ${theme==='dark'?'text-white':'text-slate-800'}`}>Batch <span className="text-purple-500">{d.no_batch}</span> | Lot <span className="text-purple-500">{d.lot}</span></p>
                                                        <p className={`text-[10px] mt-0.5 ${theme==='dark'?'text-slate-400':'text-slate-600'}`}>{d.start_h}:{d.start_m} - {d.end_h}:{d.end_m} <span className="font-bold text-emerald-500">({d.duration}m)</span></p>
                                                    </div>
                                                    <button type="button" onClick={() => removeDraft(d.draftId)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <button type="button" onClick={handleSubmit} disabled={loading || drafts.length === 0} className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${drafts.length > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95' : 'bg-slate-500 opacity-50 cursor-not-allowed text-white'}`}>
                                        {loading ? <Loader2 className="animate-spin"/> : <><Save size={18}/> SIMPAN KE SERVER</>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="max-w-full mx-auto px-4 pb-8">
                <HistoryTableDT data={historyData} refresh={handleRefresh} isLoading={isTableLoading} onEdit={handleEditClick} onDelete={handleDeleteClick} theme={theme} />
            </div>
        </div>
    );
};

export default InputDowntimeF;