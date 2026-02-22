import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { submitOEEData, fetchValidationData, fetchTodayRejectF } from '../../../services/api'; 
import { Save, Database, Activity, Clock, Info, ChevronDown, ChevronUp, CheckCircle, RefreshCw, Flag, ArrowLeft, BarChart2, Layers, AlertOctagon, Loader2, Package, FileEdit, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Kapasitas Teori
const TEORI_BATCH = { "500 ML": 21923, "100 ML": 56880, "1000 ML": 6019 };

const normalizeDate = (d) => {
    if (!d) return "";
    const strD = String(d).trim();
    
    // Jika formatnya sudah YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(strD)) {
        return strD.substring(0, 10);
    }

    // Jika formatnya DD/MM/YYYY dari Spreadsheet
    if (strD.includes('/')) {
        const parts = strD.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    // Ekstraksi amam menggunakan Local Time (mencegah mundur 1 hari karena UTC)
    try {
        const dateObj = new Date(strD);
        if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch(e) {}
    
    return strD;
};

// --- UI COMPONENTS ---
const Card = ({ children, title, icon: Icon, color = "purple" }) => (
    <div className={`relative overflow-hidden rounded-2xl bg-[#1e293b]/80 border border-white/5 shadow-xl backdrop-blur-sm mb-6`}>
        <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500/50`}></div>
        <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
            <div className={`p-1.5 rounded-lg bg-${color}-500/20 text-${color}-400`}>{Icon && <Icon size={18} />}</div>
            <h3 className="text-md font-bold text-white tracking-wide">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const CollapsibleCard = ({ children, title, icon: Icon, color = "red", defaultOpen = false, summary }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className={`relative overflow-hidden rounded-2xl bg-[#1e293b]/80 border border-white/5 shadow-xl backdrop-blur-sm mb-6 transition-all`}>
            <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500/50`}></div>
            <div onClick={() => setIsOpen(!isOpen)} className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg bg-${color}-500/20 text-${color}-400`}>{Icon && <Icon size={18} />}</div>
                    <div><h3 className="text-md font-bold text-white tracking-wide">{title}</h3>{summary && <p className="text-[10px] text-slate-400 mt-0.5">{summary}</p>}</div>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
            </div>
            <AnimatePresence>
                {isOpen && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="p-5 border-t border-white/5">{children}</div></motion.div>)}
            </AnimatePresence>
        </div>
    );
};

const ModernInput = ({ label, name, type="number", value, onChange, disabled, placeholder, required }) => (
    <div className="group relative">
        <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${required ? 'text-purple-400' : 'text-slate-500'}`}>{label}</label>
        <input type={type} name={name} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} className={`w-full bg-[#0f172a] text-white px-3 py-3 rounded-lg border border-slate-700 focus:border-purple-500 outline-none font-mono text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}/>
    </div>
);

const ModernSelect = ({ label, name, value, onChange, options }) => (
    <div className="group relative">
        <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block text-purple-400">{label}</label>
        <select name={name} value={value} onChange={onChange} className="w-full bg-[#0f172a] text-white px-3 py-3 rounded-lg border border-slate-700 focus:border-purple-500 outline-none font-bold text-sm appearance-none cursor-pointer">
            <option value="">-- PILIH --</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-[34px] text-slate-500 pointer-events-none"/>
    </div>
);

const StatBox = ({ label, value, subLabel, color = "purple" }) => (
    <div className={`flex flex-col justify-center items-center p-3 rounded-lg bg-[#0f172a] border border-${color}-500/30`}>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">{label}</span>
        <span className={`text-xl font-black text-white font-mono my-1`}>{value}</span>
        {subLabel && <span className={`text-[9px] text-${color}-400`}>{subLabel}</span>}
    </div>
);

const TimeInputBlock = ({ title, prefix, formData, handleChange, subtotal }) => (
    <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700/50">
        <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-300 uppercase">{title}</span><span className="text-[10px] font-mono text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded">{subtotal || 0}m</span></div>
        <div className="grid grid-cols-2 gap-2">
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 items-center"><input type="number" name={`${prefix}_sh`} value={formData[`${prefix}_sh`]} onChange={handleChange} placeholder="HH" className="w-full bg-transparent text-center text-white text-xs outline-none font-mono"/><span className="text-slate-500 text-xs">:</span><input type="number" name={`${prefix}_sm`} value={formData[`${prefix}_sm`]} onChange={handleChange} placeholder="MM" className="w-full bg-transparent text-center text-white text-xs outline-none font-mono"/></div>
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 items-center"><input type="number" name={`${prefix}_eh`} value={formData[`${prefix}_eh`]} onChange={handleChange} placeholder="HH" className="w-full bg-transparent text-center text-white text-xs outline-none font-mono"/><span className="text-slate-500 text-xs">:</span><input type="number" name={`${prefix}_em`} value={formData[`${prefix}_em`]} onChange={handleChange} placeholder="MM" className="w-full bg-transparent text-center text-white text-xs outline-none font-mono"/></div>
        </div>
    </div>
);

// --- KOMPONEN UI TABEL ZONE F (SIMPEL & BERSIH) ---
const HistoryTableF = ({ data, refresh, onEdit, currentFilterDate }) => {
    const val = (row, index) => (!row || row[index] === undefined || row[index] === null || String(row[index]).trim() === "") ? "-" : row[index];
    
    const Th = ({ children, className="" }) => <th className={`px-3 py-3 border-b border-r border-slate-600 bg-slate-900 text-center font-bold text-[10px] text-slate-300 uppercase whitespace-nowrap ${className}`}>{children}</th>;
    const Td = ({ children, className="" }) => <td className={`px-3 py-2 border-b border-r border-white/5 text-center font-mono text-[11px] whitespace-nowrap ${className}`}>{children}</td>;

    // DETEKTOR SHIFT DITUTUP (Membaca Kolom CB / Index 79)
    const closedShifts = new Set();
    if (data && Array.isArray(data)) {
        data.forEach(row => {
            if (row[79] && String(row[79]).trim() !== "" && String(row[79]).trim() !== "-") {
                const rowDate = normalizeDate(row[4]); 
                const shift = String(row[5]).trim();   
                closedShifts.add(`${rowDate}_${shift}`);
            }
        });
    }

    return (
        <div className="mt-8 bg-[#1e293b]/50 rounded-2xl border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm flex flex-col">
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase"><Database size={14} className="text-purple-400"/> Histori Data OEE Zone F</h3>
                <button type="button" onClick={refresh} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 text-white transition-all flex items-center gap-1 text-[10px] active:scale-95 cursor-pointer border border-white/10"><RefreshCw size={12}/> Refresh</button>
            </div>
            <div className="overflow-auto max-h-[600px] w-full relative custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20 shadow-xl">
                        <tr>
                            <Th className="sticky left-0 bg-slate-900 z-30 border-r-2 border-slate-600 text-slate-300">Tanggal</Th>
                            <Th className="text-slate-300">Batch & Lot</Th>
                            <Th className="text-slate-300">Shift</Th>
                            <Th className="text-slate-300">Sub In VI</Th>
                            <Th className="text-slate-300">Sub FG Pack</Th>
                            <Th className="text-slate-300">TOTAL In VI (Shift)</Th>
                            <Th className="text-slate-300">TOTAL FG (Shift)</Th>
                            <Th className="text-slate-300">% Yield (AVG Shift)</Th>
                            <Th className="text-slate-300">STATUS</Th>
                            <Th className="sticky right-0 bg-slate-900 z-30 border-l-2 border-slate-600 text-yellow-500">AKSI</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {(!data || data.length === 0) ? (<tr><td colSpan="10" className="px-4 py-8 text-center italic text-slate-500 text-xs">Belum ada data input hari ini</td></tr>) : (
                            data.map((row, idx) => {
                                const rowDate = normalizeDate(val(row, 4));
                                const s = String(val(row, 5)).trim();
                                const isClosed = closedShifts.has(`${rowDate}_${s}`);

                                return (
                                <tr key={idx} className="transition-colors border-b border-white/5 bg-[#1e293b]/50 hover:bg-white/5 text-slate-200">
                                    <Td className="sticky left-0 bg-slate-800 z-10 font-bold border-r-2 border-slate-700">{val(row, 4)}</Td>
                                    <Td className="font-bold text-white">{val(row, 2)} - {val(row, 3)}</Td>
                                    <Td className="font-bold">{val(row, 5)}</Td>
                                    
                                    <Td>{val(row, 18)}</Td> {/* Sub In VI */}
                                    <Td>{val(row, 76)}</Td> {/* Sub FG Pack */}
                                    
                                    <Td className="font-bold">{val(row, 19)}</Td> {/* TOTAL IN VI */}
                                    <Td className="font-bold">{val(row, 79)}</Td> {/* TOTAL FG SHIFT */}
                                    <Td className="font-bold">{val(row, 81)}</Td> {/* AVG YIELD SHIFT */}
                                    
                                    <Td>
                                        {isClosed ? (
                                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold border border-emerald-500/30">LENGKAP</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-[9px] font-bold border border-slate-500/30">BERJALAN</span>
                                        )}
                                    </Td>
                                    <Td className="sticky right-0 bg-slate-800 border-l-2 border-slate-700 z-10">
                                        <button type="button" onClick={() => onEdit(row)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors shadow-lg active:scale-95" title="Edit Data">
                                            <FileEdit size={16}/> 
                                        </button>
                                    </Td>
                                </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const InputRejectF = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isClosingShift, setIsClosingShift] = useState(false);
    const [dropdowns, setDropdowns] = useState({ shift: [], group: [] });
    const [historyData, setHistoryData] = useState([]); 
    
    // STATE EDIT
    const [isEditing, setIsEditing] = useState(false);
    const [editRowId, setEditRowId] = useState(null);

    // Initial Form (TIDAK ADA YANG DIHAPUS)
    const initialForm = {
        no_batch: '', lot_no: '', tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', volume_botol: '500 ML',
        teori_jml_batch: '56880', teori_yield: '21923', 
        steril_in: '', steril_bocor: '', steril_h_patah_ring: '', steril_h_patah_lidah: '', steril_h_patah_leleh: '', steril_no_hanger: '', steril_sample: '',
        vi_start: 0, vi_end: '', 
        ...Object.fromEntries(Array.from({length:48}, (_, i) => [`vi_r_${i+1}`, ''])),
        vi_sample_qc: '',
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
        try { const res = await fetchValidationData(); if(res.status==='success') setDropdowns({ shift: res.data['Shift'], group: res.data['Group'] }); } catch(e) {}
        if (user) {
            try {
                const hist = await fetchTodayRejectF(user);
                if(hist.status === 'success') {
                    setHistoryData(hist.data);
                    if(formData.shift) calculateHistoryTotals(hist.data, formData.shift, formData.tanggal);
                }
            } catch(e) {}
        }
    };

    // --- LOGIC SHIFT ACCUMULATION (TANGGAL & SHIFT SAMA) ---
    const calculateHistoryTotals = (data, currentShift, currentDate) => {
        if (!data || data.length === 0 || !currentShift || !currentDate) {
            setShiftTotals({ vi_in: 0, fg: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "", lastLC: 0 });
            return;
        }
        
        const parseIndoNumber = (val) => { if (!val) return 0; let str = String(val).replace('%', '').trim().replace(',', '.'); return parseFloat(str) || 0; };
        const p = (val) => parseIndoNumber(val);

        const formDateFmt = normalizeDate(currentDate);

        const relevantData = [...data].reverse().filter(row => {
            const rowDateFmt = normalizeDate(row[4]); 
            return String(row[5]).trim() === String(currentShift).trim() && rowDateFmt === formDateFmt;
        });

        let t = { vi_in: 0, fg: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "", lastLC: 0 };

        if(relevantData.length > 0) {
            t.lastBatchNo = String(relevantData[0][2]);
            t.lastLC = p(relevantData[0][107]); // Index DD Corrected
        }

        relevantData.forEach(row => {
            t.vi_in += p(row[19]); 
            t.fg += p(row[76]);    
            t.avail += p(row[87]); 
            t.prep += p(row[97]); 
            t.jeda += p(row[109]); 
            let yieldVal = parseIndoNumber(row[80]); 
            if (yieldVal < 1.1 && yieldVal > 0) yieldVal = yieldVal * 100;
            t.yield_sum += yieldVal;
            t.yield_count += 1;
        });
        setShiftTotals(t);
    };

    useEffect(() => { calculateHistoryTotals(historyData, formData.shift, formData.tanggal); }, [formData.shift, formData.tanggal, historyData]);
    useEffect(() => { if (user) loadData(); }, [user]);

    // --- CALCULATOR ENGINE ---
    useEffect(() => {
        const val = (k) => { const v = formData[k]; if(v===""||v===null) return 0; return parseFloat(v); };

        const steril_rej_total = val('steril_bocor') + val('steril_h_patah_ring') + val('steril_h_patah_lidah') + val('steril_h_patah_leleh') + val('steril_no_hanger');
        const steril_out = val('steril_in') - steril_rej_total - val('steril_sample');

        const vi_sub = val('vi_end') - val('vi_start');
        let vi_rej_total = 0; for(let i=1; i<=48; i++) vi_rej_total += val(`vi_r_${i}`);
        const vi_hasil_baik = vi_sub - vi_rej_total;
        const vi_tf_packing = vi_hasil_baik - val('vi_sample_qc');

        const pack_hasil_baik = vi_tf_packing - val('pack_reject');
        const pack_fg = pack_hasil_baik - (val('pack_s_qc') + val('pack_s_others'));
        
        const teori_jml = parseFloat(formData.teori_jml_batch) || 56880;
        const teori_yld = parseFloat(formData.teori_yield) || 21923;

        const pack_jml_batch = (pack_fg / teori_jml).toFixed(2);
        const yield_batch = (pack_fg > 0) ? ((pack_fg / teori_yld) * 100).toFixed(2) : 0;

        const diff = (shKey, smKey, ehKey, emKey) => {
            const sh=formData[shKey], sm=formData[smKey], eh=formData[ehKey], em=formData[emKey];
            if(sh===""||sm===""||eh===""||em==="") return 0;
            let s = (parseInt(sh)*60) + parseInt(sm);
            let e = (parseInt(eh)*60) + parseInt(em);
            let d = e - s;
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
            // prevLC = 0; 
        }
        const jeda_batch = prevLC + prep_sub;

        setCalc({ steril_rej_total, steril_out, vi_sub, vi_rej_total, vi_hasil_baik, vi_tf_packing, pack_hasil_baik, pack_fg, pack_jml_batch, yield_batch, av_sub, prep_sub, run_sub, rework_sub, clear_sub, process_total, total_prep_clear, jeda_batch });
    }, [formData, shiftTotals.lastLC, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('_h') || name.includes('sh') || name.includes('eh')) { if(value > 23) return; }
        if (name.includes('_m') || name.includes('sm') || name.includes('em')) { if(value > 59) return; }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- HANDLE EDIT CLICK ---
    const handleEditClick = (rowData) => {
        let dateVal = new Date().toISOString().split('T')[0];
        try { if(rowData[4]) dateVal = new Date(rowData[4]).toISOString().split('T')[0]; } catch(e){}

        const newData = {
            ...initialForm,
            no_batch: rowData[2],
            lot_no: rowData[3],
            tanggal: dateVal,
            shift: rowData[5],
            group: rowData[6],
            volume_botol: rowData[7],
            
            steril_in: rowData[8],
            steril_bocor: rowData[9], steril_h_patah_ring: rowData[10], steril_h_patah_lidah: rowData[11], steril_h_patah_leleh: rowData[12], steril_no_hanger: rowData[13], 
            steril_sample: rowData[15],
            
            vi_start: rowData[17], vi_end: rowData[18],
            ...Object.fromEntries(Array.from({length:48}, (_, i) => [`vi_r_${i+1}`, rowData[22+i] || ''])),
            
            vi_sample_qc: rowData[71],
            pack_reject: rowData[73], 
            pack_s_qc: rowData[74], pack_s_others: rowData[75],
            pack_utuh: rowData[77] || 'Y',
            
            av_sh: rowData[83], av_sm: rowData[84], av_eh: rowData[85], av_em: rowData[86],
            p_mat_sh: rowData[88], p_mat_sm: rowData[89], p_mat_eh: rowData[90], p_mat_em: rowData[91],
            run_sh: rowData[93], run_sm: rowData[94], run_eh: rowData[95], run_em: rowData[96],
            rework_sh: rowData[98], rework_sm: rowData[99], rework_eh: rowData[100], rework_em: rowData[101],
            clear_sh: rowData[103], clear_sm: rowData[104], clear_eh: rowData[105], clear_em: rowData[106],
        };

        setFormData(newData);
        setIsEditing(true);
        
        // PENTING: Tangkap Row Index dari Index Terakhir Array untuk hindari duplikasi baris
        const exactRowIndex = rowData[rowData.length - 1]; 
        setEditRowId(exactRowIndex);

        // Cek status akhir shift
        if(rowData[78] && String(rowData[78]).trim() !== "" && String(rowData[78]).trim() !== "-") {
            setIsClosingShift(true);
        } else {
            setIsClosingShift(false);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast("Mode Edit Aktif", { icon: '✏️', duration: 3000 });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData(initialForm);
        setEditRowId(null);
        setIsClosingShift(false);
        toast.dismiss();
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        if(!formData.no_batch || !formData.lot_no || !formData.shift) { toast.error("Data Wajib: No Batch, Lot No, Shift!"); setLoading(false); return; }

        // --- SKENARIO B: KOSONGKAN TOTAL JIKA BUKAN AKHIR SHIFT ---
        let calc_vi_in = "", calc_fg = "", calc_avail = "", calc_prep = "", calc_jeda = "", calc_avg_yield = "";

        if (isClosingShift) {
            calc_vi_in = shiftTotals.vi_in + calc.vi_sub;
            calc_fg = shiftTotals.fg + calc.pack_fg;
            calc_avail = shiftTotals.avail + calc.av_sub;
            calc_prep = shiftTotals.prep + calc.prep_sub;
            calc_jeda = shiftTotals.jeda + calc.jeda_batch;
            
            const tot_yield_sum = shiftTotals.yield_sum + Number(calc.yield_batch);
            const tot_yield_count = shiftTotals.yield_count + 1;
            calc_avg_yield = tot_yield_count > 0 ? (tot_yield_sum / tot_yield_count).toFixed(2) : 0;
        }

        const finalData = { 
            ...formData, ...calc, zone: 'F',
            total_vi_in_shift: calc_vi_in,
            total_fg_shift: calc_fg,
            total_avail_shift: calc_avail,
            total_prep_shift: calc_prep,
            total_jeda_shift: calc_jeda,
            total_yield_shift: calc_avg_yield,
            is_closing: isClosingShift,
            original_id: isEditing ? editRowId : null,
            ...Object.fromEntries(Array.from({length:48}, (_, i) => [`vi_r_${i+1}`, formData[`vi_r_${i+1}`]]))
        };

        try {
            const actionType = isEditing ? 'update_reject_f' : 'submit_reject_f';
            const res = await submitOEEData({ action: actionType, data: finalData }, user);
            setLoading(false);
            if(res.status === 'success') {
                toast.success(isEditing ? "Data Diupdate!" : (isClosingShift ? "Shift Ditutup!" : "Data Tersimpan."));
                setFormData(prev => ({ ...initialForm, shift: prev.shift, group: prev.group, tanggal: prev.tanggal, vi_start: 0, vi_end: '' }));
                setIsClosingShift(false); 
                setIsEditing(false);
                setEditRowId(null);
                loadData(); 
            } else { toast.error(res.message); }
        } catch (err) { setLoading(false); toast.error("Terjadi kesalahan koneksi."); }
    };

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 pb-32 font-sans">
            <Toaster position="top-center" toastOptions={{style: {background: '#1e293b', color: '#fff'}}} />
            
            {/* HEADER */}
            <div className={`bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 sticky top-0 z-50 shadow-2xl transition-colors ${isEditing ? 'border-b-2 border-yellow-500' : ''}`}>
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => navigate('/foreman/tactical-input')} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 border border-white/5"><ArrowLeft size={20}/></button>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">REJECT ZONE <span className="text-purple-500">F</span></h1>
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <span className="text-[10px] font-bold bg-yellow-500 text-black px-2 py-0.5 rounded animate-pulse">MODE EDITING</span>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">System Online</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 mt-8">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-6">
                            {/* BLOCK FORM TIDAK DIUBAH SAMA SEKALI DARI VERSI ASLI ANDA */}
                            <Card title="1. Data Batch & Umum" icon={Layers} color="purple">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <ModernInput label="No Batch" name="no_batch" type="text" placeholder="A123" value={formData.no_batch} onChange={handleChange} required disabled={isEditing}/>
                                    <ModernInput label="Lot No" name="lot_no" type="text" value={formData.lot_no} onChange={handleChange} required/>
                                    <ModernInput label="Tanggal" name="tanggal" type="date" value={formData.tanggal} onChange={handleChange} required/>
                                    <ModernSelect label="Shift" name="shift" value={formData.shift} options={dropdowns.shift} onChange={handleChange} />
                                    <ModernSelect label="Group" name="group" value={formData.group} options={dropdowns.group} onChange={handleChange} />
                                    <ModernSelect label="Volume" name="volume_botol" value={formData.volume_botol} options={["500 ML", "100 ML"]} onChange={handleChange} />
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                    <ModernInput label="Teori utk Jml Batch" name="teori_jml_batch" value={formData.teori_jml_batch} onChange={handleChange} placeholder="56880" />
                                    <ModernInput label="Teori utk Yield" name="teori_yield" value={formData.teori_yield} onChange={handleChange} placeholder="21923" />
                                </div>
                            </Card>
                            <Card title="2. Output After Steril" icon={Info} color="blue"><div className="grid grid-cols-2 md:grid-cols-3 gap-4"><ModernInput label="In Chamber" name="steril_in" value={formData.steril_in} onChange={handleChange}/><ModernInput label="Bocor" name="steril_bocor" value={formData.steril_bocor} onChange={handleChange}/><ModernInput label="Patah Ring" name="steril_h_patah_ring" value={formData.steril_h_patah_ring} onChange={handleChange}/><ModernInput label="Patah Lidah" name="steril_h_patah_lidah" value={formData.steril_h_patah_lidah} onChange={handleChange}/><ModernInput label="Patah Leleh" name="steril_h_patah_leleh" value={formData.steril_h_patah_leleh} onChange={handleChange}/><ModernInput label="No Hanger" name="steril_no_hanger" value={formData.steril_no_hanger} onChange={handleChange}/><ModernInput label="Sample QC" name="steril_sample" value={formData.steril_sample} onChange={handleChange}/><div className="col-span-2 md:col-span-1 bg-[#0f172a] p-2 rounded-lg border border-blue-500/20 flex flex-col justify-center items-center"><span className="text-[9px] text-blue-400 font-bold uppercase">OUT TF to VI</span><span className="text-xl font-black text-white">{calc.steril_out}</span></div></div></Card>
                            <Card title="3. Visual Inspeksi (Counter)" icon={Activity} color="emerald"><div className="grid grid-cols-2 gap-4 mb-4"><ModernInput label="Start (Auto)" name="vi_start" value={formData.vi_start} onChange={handleChange} /><ModernInput label="End" name="vi_end" value={formData.vi_end} onChange={handleChange}/></div><div className="flex justify-between items-center bg-emerald-900/10 p-3 rounded-lg border border-emerald-500/20"><div><span className="text-xs font-bold text-emerald-300">Subtotal Input VI</span><div className="text-xl font-black text-white">{calc.vi_sub}</div></div><div className="text-right"><span className="text-xs font-bold text-blue-300">Total Shift (T)</span><div className="text-xl font-black text-white">{shiftTotals.vi_in + calc.vi_sub}</div></div></div></Card>
                            <CollapsibleCard title="Detail Reject VI (48 Item)" icon={AlertOctagon} color="red" summary={`Total: ${calc.vi_rej_total} Pcs`}><div className="grid grid-cols-4 md:grid-cols-6 gap-2">{Array.from({length:48}, (_, i) => (<div key={i} className="flex flex-col"><label className="text-[8px] text-slate-500 uppercase text-center mb-0.5">R-{i+1}</label><input type="number" name={`vi_r_${i+1}`} value={formData[`vi_r_${i+1}`]} onChange={handleChange} className="bg-black/40 text-white text-center text-xs p-1.5 rounded border border-white/10 focus:border-red-500 outline-none"/></div>))}</div></CollapsibleCard>
                            <Card title="4. Output Packing" icon={Package} color="emerald"><div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><StatBox label="Hasil Baik VI" value={calc.vi_hasil_baik} color="emerald"/><ModernInput label="Sample QC (VI)" name="vi_sample_qc" value={formData.vi_sample_qc} onChange={handleChange}/><StatBox label="TF Packing" value={calc.vi_tf_packing} color="blue"/><ModernInput label="Reject Pack" name="pack_reject" value={formData.pack_reject} onChange={handleChange}/></div><div className="h-px bg-white/5"></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4"><ModernInput label="Sample Pack QC" name="pack_s_qc" value={formData.pack_s_qc} onChange={handleChange}/><ModernInput label="Sample Pack Oth" name="pack_s_others" value={formData.pack_s_others} onChange={handleChange}/><ModernSelect label="Utuh?" name="pack_utuh" value={formData.pack_utuh} options={['Y','N']} onChange={handleChange}/></div></div></Card>
                        </div>
                        
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-gradient-to-br from-purple-700 to-indigo-900 rounded-2xl p-5 shadow-2xl text-white">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-purple-200 mb-4">5. Final Result & Yield</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end pb-2 border-b border-white/20">
                                        <span className="text-sm opacity-80">Finished Goods</span><span className="text-3xl font-black">{calc.pack_fg}</span>
                                    </div>
                                    <div className="pt-2 flex justify-between items-end">
                                        <span className="text-xs font-bold text-emerald-300">TOTAL HASIL SHIFT</span>
                                        <span className="text-2xl font-black text-emerald-100">{shiftTotals.fg + calc.pack_fg}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div><span className="text-xs opacity-70 block">% Batch</span><span className="text-xl font-bold">{calc.yield_batch}%</span></div>
                                        <div className="text-right">
                                            <span className="text-xs opacity-70 block">AVG Yield Shift</span>
                                            <span className="text-xl font-bold text-yellow-300">{((shiftTotals.yield_sum + Number(calc.yield_batch)) / (shiftTotals.yield_count + 1)).toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <Card title="6. Available Time" icon={Clock} color="slate"><div className="space-y-3"><TimeInputBlock title="Available" prefix="av" formData={formData} handleChange={handleChange} subtotal={calc.av_sub} /><div className="text-right text-[10px] text-slate-400">Total Shift (CJ): {shiftTotals.avail + calc.av_sub}m</div></div></Card>
                            <Card title="7. Process Details" icon={Activity} color="slate"><div className="space-y-3"><TimeInputBlock title="Preparation" prefix="p_mat" formData={formData} handleChange={handleChange} subtotal={calc.prep_sub} /><TimeInputBlock title="Machine Run" prefix="run" formData={formData} handleChange={handleChange} subtotal={calc.run_sub} /><TimeInputBlock title="Rework" prefix="rework" formData={formData} handleChange={handleChange} subtotal={calc.rework_sub} /><div className="h-px bg-white/5 my-2"></div><TimeInputBlock title="Line Clearance" prefix="clear" formData={formData} handleChange={handleChange} subtotal={calc.clear_sub} /></div><div className="mt-4 p-3 bg-slate-900 rounded-xl"><div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-1"><span>Total Prep+Clear (8)</span><span className="text-white text-lg">{calc.total_prep_clear}m</span></div><div className="h-px bg-white/10 my-2"></div><div className="flex justify-between items-center text-xs font-bold text-orange-400"><span>Jeda Antar Batch (9)</span><span className="text-lg">{calc.jeda_batch}m</span></div></div></Card>
                            
                            {!isEditing && (
                                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Flag className={`text-yellow-500 ${isClosingShift ? 'fill-yellow-500' : ''}`} size={20}/>
                                        <div><h4 className="text-white font-bold text-sm">Akhir Shift?</h4><p className="text-[9px] text-slate-400">Centang untuk memproses Data TOTAL.</p></div>
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
                    
                    {/* TABLE ZONE F DIPANGGIL DI SINI */}
                    <HistoryTableF data={historyData} refresh={loadData} onEdit={handleEditClick} currentFilterDate={formData.tanggal} />
                </form>
            </div>
        </div>
    );
};

export default InputRejectF;