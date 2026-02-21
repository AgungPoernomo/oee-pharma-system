import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { submitOEEData, fetchValidationData, fetchTodayRejectC } from '../../../services/api'; 
import { Save, Database, Activity, Clock, Info, ChevronDown, CheckCircle, RefreshCw, Flag, ArrowLeft, BarChart2, Layers, AlertOctagon, Loader2, FileEdit, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

const TEORI_BATCH = { "500 ML": 23076, "100 ML": 56880, "1000 ML": 6019 };

// --- UI COMPONENTS ---
const Card = ({ children, title, icon: Icon, color = "blue" }) => (
    <div className={`relative overflow-hidden rounded-2xl bg-[#1e293b]/80 border border-white/5 shadow-xl backdrop-blur-sm mb-6`}>
        <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500/50`}></div>
        <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
            <div className={`p-1.5 rounded-lg bg-${color}-500/20 text-${color}-400`}>{Icon && <Icon size={18} />}</div>
            <h3 className="text-md font-bold text-white tracking-wide">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const ModernInput = ({ label, name, type="number", value, onChange, disabled, placeholder, required }) => (
    <div className="group relative">
        <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${required ? 'text-blue-400' : 'text-slate-500'}`}>{label}</label>
        <input 
            type={type} name={name} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder}
            className={`w-full bg-[#0f172a] text-white px-3 py-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none font-mono text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
    </div>
);

const ModernSelect = ({ label, name, value, onChange, options }) => (
    <div className="group relative">
        <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block text-blue-400">{label}</label>
        <select name={name} value={value} onChange={onChange} className="w-full bg-[#0f172a] text-white px-3 py-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none font-bold text-sm appearance-none cursor-pointer">
            <option value="">-- PILIH --</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-[34px] text-slate-500 pointer-events-none"/>
    </div>
);

const StatBox = ({ label, value, subLabel, color = "blue" }) => (
    <div className={`flex flex-col justify-center items-center p-3 rounded-lg bg-[#0f172a] border border-${color}-500/30`}>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">{label}</span>
        <span className={`text-xl font-black text-white font-mono my-1`}>{value}</span>
        {subLabel && <span className={`text-[9px] text-${color}-400`}>{subLabel}</span>}
    </div>
);

const TimeInputBlock = ({ title, prefix, formData, handleChange, subtotal }) => (
    <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700/50">
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase">{title}</span>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">{subtotal || 0}m</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 items-center">
                <input type="number" name={`${prefix}_sh`} value={formData[`${prefix}_sh`]} onChange={handleChange} placeholder="HH" className="w-full bg-transparent text-center text-white text-xs outline-none font-mono"/>
                <span className="text-slate-500 text-xs">:</span>
                <input type="number" name={`${prefix}_sm`} value={formData[`${prefix}_sm`]} onChange={handleChange} placeholder="MM" className="w-full bg-transparent text-center text-white text-xs outline-none font-mono"/>
            </div>
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 items-center">
                <input type="number" name={`${prefix}_eh`} value={formData[`${prefix}_eh`]} onChange={handleChange} placeholder="HH" className="w-full bg-transparent text-center text-white text-xs outline-none font-mono"/>
                <span className="text-slate-500 text-xs">:</span>
                <input type="number" name={`${prefix}_em`} value={formData[`${prefix}_em`]} onChange={handleChange} placeholder="MM" className="w-full bg-transparent text-center text-white text-xs outline-none font-mono"/>
            </div>
        </div>
    </div>
);

// --- TABEL MONITORING (FINAL VERSION WITH EDIT BUTTON) ---
const HistoryTable = ({ data, refresh, onEdit }) => {
    const val = (row, index) => (!row || row[index] === undefined || row[index] === null) ? "-" : row[index];
    
    const Th = ({ children, rowSpan=1, colSpan=1, className="" }) => <th rowSpan={rowSpan} colSpan={colSpan} className={`px-3 py-3 border-b border-r border-slate-600 bg-slate-900 text-center font-bold text-[10px] text-slate-300 uppercase tracking-wide ${className}`}>{children}</th>;
    
    const Td = ({ children, className="" }) => <td className={`px-3 py-2 border-b border-r border-white/5 text-center font-mono text-[11px] text-slate-200 whitespace-nowrap ${className}`}>{children}</td>;

    const getShiftColor = (shift) => {
        const s = String(shift).trim();
        if (s === '1') return 'bg-blue-900/20 hover:bg-blue-900/40'; 
        if (s === '2') return 'bg-emerald-900/20 hover:bg-emerald-900/40'; 
        if (s === '3') return 'bg-purple-900/20 hover:bg-purple-900/40';
        return 'bg-[#1e293b]/50 hover:bg-white/5'; 
    };

    return (
        <div className="mt-8 bg-[#1e293b]/50 rounded-2xl border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm flex flex-col">
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase"><Database size={14} className="text-blue-400"/> Data Hari Ini (Realtime)</h3>
                <button type="button" onClick={refresh} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 text-white transition-all flex items-center gap-1 text-[10px] active:scale-95 cursor-pointer border border-white/10">
                    <RefreshCw size={12}/> Refresh
                </button>
            </div>
            <div className="overflow-auto max-h-[600px] w-full relative custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20 shadow-xl">
                        <tr>
                            <Th rowSpan={2} className="sticky left-0 z-30 bg-slate-900 border-r-2 border-blue-500">No Batch</Th>
                            <Th colSpan={3}>Info</Th>
                            <Th colSpan={3}>Counter Filling</Th>
                            <Th colSpan={2}>Reject & Sample</Th>
                            <Th colSpan={3}>Hasil & Yield</Th>
                            <Th colSpan={2}>Before Steril</Th>
                            <Th colSpan={4}>Waktu & Jeda</Th>
                            <Th rowSpan={2}>Status</Th>
                            <Th rowSpan={2} className="sticky right-0 z-30 bg-slate-900 border-l-2 border-yellow-500/50 text-yellow-500">Aksi</Th> 
                        </tr>
                        <tr>
                            <Th>Tgl</Th><Th>Shift</Th><Th>R.Blow</Th>
                            <Th>Sub Cnt</Th><Th>Jml Batch</Th><Th>Tot Shift</Th>
                            <Th>Sub F-Seal</Th><Th>Sub Smpl</Th>
                            <Th>Tot Baik Sh</Th><Th>% Yield</Th><Th>Avg Sh</Th>
                            <Th>Tot Rej</Th>
                            <Th>Tot Avail</Th><Th>Run</Th><Th>LC</Th><Th>Tot P+C</Th><Th>Jeda</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {(!data || data.length === 0) ? (<tr><td colSpan="20" className="px-4 py-8 text-center italic text-slate-500 text-xs">Belum ada data input hari ini</td></tr>) : (
                            data.map((row, idx) => (
                                <tr key={idx} className={`transition-colors border-b border-white/5 ${getShiftColor(val(row, 4))}`}>
                                    <Td className="sticky left-0 bg-slate-800 z-10 font-bold text-white border-r-2 border-blue-500">{val(row, 2)}</Td>
                                    <Td>{val(row, 3)}</Td> 
                                    <Td className="font-bold">{val(row, 4)}</Td> 
                                    <Td>{val(row, 6)}</Td> 
                                    <Td className="text-white">{val(row, 10)}</Td> 
                                    <Td>{val(row, 12)}</Td> 
                                    <Td className="text-blue-300 font-bold bg-blue-900/30">{val(row, 13)}</Td> 
                                    <Td className="text-red-300">{val(row, 20)}</Td> 
                                    <Td className="text-yellow-300">{val(row, 23)}</Td> 
                                    <Td className="text-emerald-300 font-bold bg-emerald-900/30">{val(row, 25)}</Td> 
                                    <Td className="text-purple-300">{val(row, 26)}</Td> 
                                    <Td className="text-purple-200 font-bold bg-purple-900/30">{val(row, 27)}</Td> 
                                    <Td className="text-red-400">{val(row, 34)}</Td> 
                                    <Td className="text-blue-200">{val(row, 41)}</Td> 
                                    <Td>{val(row, 61)}</Td> 
                                    <Td>{val(row, 66)}</Td> 
                                    <Td className="font-bold text-white bg-slate-700/50">{val(row, 67)}</Td> 
                                    <Td className="text-orange-400 font-bold">{val(row, 68)}</Td> 
                                    <Td><div className="flex justify-center"><CheckCircle size={14} className="text-emerald-500"/></div></Td>
                                    <Td className="sticky right-0 bg-slate-800 border-l-2 border-yellow-500/20 z-10">
                                        <button type="button" onClick={() => onEdit(row)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors shadow-lg active:scale-95" title="Edit Data">
                                            <FileEdit size={16}/> 
                                        </button>
                                    </Td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ==========================================
// MAIN COMPONENT (LOGIC V5.0 - EDIT READY)
// ==========================================

const InputRejectC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isClosingShift, setIsClosingShift] = useState(false);
    const [dropdowns, setDropdowns] = useState({ shift: [], group: [] });
    const [historyData, setHistoryData] = useState([]);
    
    // STATE UNTUK EDITING
    const [isEditing, setIsEditing] = useState(false);
    const [editRowId, setEditRowId] = useState(null); // Menyimpan ID asli (misal No Batch atau ID unik)
    
    // INITIAL FORM
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

    // LOAD DATA
    const loadData = async () => {
        try { const res = await fetchValidationData(); if(res.status==='success') setDropdowns({ shift: res.data['Shift'], group: res.data['Group'] }); } catch(e) {}
        if (user) {
            try {
                const hist = await fetchTodayRejectC(user); 
                if(hist.status === 'success') {
                    setHistoryData(hist.data);
                    if(formData.shift) calculateHistoryTotals(hist.data, formData.shift);
                }
            } catch(e) {}
        }
    };

    const calculateHistoryTotals = (data, currentShift) => {
        if (!data || data.length === 0 || !currentShift) {
            setShiftTotals({ cnt: 0, good: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "" });
            return;
        }
        const p = (val) => {
            if (!val) return 0;
            let str = String(val).replace('%', '').trim().replace(',', '.');
            return parseFloat(str) || 0;
        };
        const relevantData = [...data].reverse().filter(row => String(row[4]) === String(currentShift));
        let t = { cnt: 0, good: 0, avail: 0, prep: 0, jeda: 0, yield_sum: 0, yield_count: 0, lastBatchNo: "" };
        if(relevantData.length > 0) t.lastBatchNo = String(relevantData[0][2]); 
        relevantData.forEach(row => {
            t.cnt += p(row[10]); t.good += p(row[24]); t.avail += p(row[40]); t.prep += p(row[57]); t.jeda += p(row[70]); 
            let yieldVal = p(row[26]); if (yieldVal < 1.1 && yieldVal > 0) yieldVal = yieldVal * 100;
            t.yield_sum += yieldVal; t.yield_count += 1;
        });
        setShiftTotals(t);
    };

    useEffect(() => { calculateHistoryTotals(historyData, formData.shift); }, [formData.shift, historyData]);
    useEffect(() => { if (user) loadData(); }, [user]);

    // CALCULATOR (SAMA SEPERTI SEBELUMNYA)
    useEffect(() => {
        const val = (k) => { const v = formData[k]; return (v === "" || v === null || v === undefined) ? 0 : parseFloat(v); };
        const cnt_sub = val('cnt_end') - val('cnt_start');
        const teori = TEORI_BATCH[formData.volume_botol] || 1;
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
            let s = (parseInt(sh) * 60) + parseInt(sm); let e = (parseInt(eh) * 60) + parseInt(em);
            let d = e - s; return d < 0 ? d + (24 * 60) : d; 
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

    // --- HANDLE EDIT CLICK (MAPPING DATA) ---
    const handleEditClick = (rowData) => {
        // Asumsi urutan index sesuai dengan Sheet. Sesuaikan jika perlu.
        // [0]Timestamp, [1]User, [2]Batch, [3]Tgl, [4]Shift, [5]Group, [6]RejBlow, [7]Vol
        // [8]CntStart, [9]CntEnd, ... dst
        
        // Helper date format
        let dateVal = new Date().toISOString().split('T')[0];
        try { if(rowData[3]) dateVal = new Date(rowData[3]).toISOString().split('T')[0]; } catch(e){}

        const newData = {
            ...initialForm,
            no_batch: rowData[2], 
            tanggal: dateVal,
            shift: rowData[4],
            group: rowData[5],
            reject_blow: rowData[6],
            volume_botol: rowData[7],
            cnt_start: rowData[8],
            cnt_end: rowData[9],
            utuh: rowData[11],
            // Mapping Reject Detail
            r_washing: rowData[14], r_vk: rowData[15], r_vl: rowData[16], 
            r_nocap: rowData[17], r_sealnok: rowData[18], r_others: rowData[19],
            s_ipc: rowData[21], s_others: rowData[22],
            pre_bocor: rowData[28], pre_nocap: rowData[29], pre_vol: rowData[30], 
            pre_thermo: rowData[31], pre_lain: rowData[32],
            // Mapping Waktu (Perlu logic parsing jika di sheet sudah berupa total, 
            // TAPI idealnya sheet menyimpan raw start/end time. Jika tidak, form waktu akan kosong/harus isi ulang)
            // UNTUK SAAT INI KITA KOSONGKAN WAKTU AGAR USER INPUT ULANG UNTUK VALIDASI
            // ATAU Jika Anda menyimpan SH/SM di kolom tersembunyi, ambil dari sana.
            av_sh: rowData[36], av_sm: rowData[37], av_eh: rowData[38], av_em: rowData[39],
            // ... (Mapping waktu lainnya sesuai kolom sheet Anda)
        };
        
        setFormData(newData);
        setIsEditing(true);
        setEditRowId(rowData[2]); // Gunakan No Batch sebagai ID sementara
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast("Mode Edit Aktif: Silakan perbaiki data lalu klik Update", { icon: '✏️', duration: 4000 });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData(initialForm);
        setEditRowId(null);
        toast.dismiss();
        toast("Mode Edit Dibatalkan");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if(!formData.no_batch || !formData.cnt_end || !formData.shift) {
            toast.error("Data Wajib: No Batch, Counter End, Shift!");
            setLoading(false); return;
        }

        let final_total_cnt = "", final_total_good = "", final_total_avail = "", final_total_prep = "", final_total_jeda = "", final_avg_yield = "";

        if (isClosingShift) {
            // Recalculate totals logic
            final_total_cnt = shiftTotals.cnt + calc.cnt_sub;
            final_total_good = shiftTotals.good + calc.trf_st;
            final_total_avail = shiftTotals.avail + calc.av_sub;
            final_total_prep = shiftTotals.prep + calc.p_total;
            final_total_jeda = shiftTotals.jeda + calc.jeda_batch;
            const tot_yield_sum = shiftTotals.yield_sum + Number(calc.yield_batch);
            const tot_yield_count = shiftTotals.yield_count + 1;
            final_avg_yield = tot_yield_count > 0 ? (tot_yield_sum / tot_yield_count).toFixed(2) : 0;
        }

        const finalData = {
            ...formData, ...calc,
            total_cnt_shift: final_total_cnt, total_good_shift: final_total_good, total_avail_shift: final_total_avail, total_prep_shift: final_total_prep, total_jeda_shift: final_total_jeda, total_yield_shift: final_avg_yield,
            is_closing: isClosingShift, zone: 'C',
            original_id: isEditing ? editRowId : null, // ID untuk backend mencari baris yg mau diedit
            
            // Explicitly map all fields again to be safe
            r_washing: formData.r_washing, r_vk: formData.r_vk, r_vl: formData.r_vl, r_nocap: formData.r_nocap, r_sealnok: formData.r_sealnok, r_others: formData.r_others,
            s_ipc: formData.s_ipc, s_others: formData.s_others,
            pre_bocor: formData.pre_bocor, pre_nocap: formData.pre_nocap, pre_vol: formData.pre_vol, pre_thermo: formData.pre_thermo, pre_lain: formData.pre_lain,
            prep_mat_sh: formData.prep_mat_sh, prep_mat_sm: formData.prep_mat_sm, prep_mat_eh: formData.prep_mat_eh, prep_mat_em: formData.prep_mat_em, prep_mat_sub: calc.p_mat,
            prep_setup_sh: formData.prep_setup_sh, prep_setup_sm: formData.prep_setup_sm, prep_setup_eh: formData.prep_setup_eh, prep_setup_em: formData.prep_setup_em, prep_setup_sub: calc.p_set,
            prep_flush_sh: formData.prep_flush_sh, prep_flush_sm: formData.prep_flush_sm, prep_flush_eh: formData.prep_flush_eh, prep_flush_em: formData.prep_flush_em, prep_flush_sub: calc.p_flu,
        };

        // ACTION SWITCHING
        const actionType = isEditing ? 'update_reject_c' : 'submit_reject_c';

        const res = await submitOEEData({ action: actionType, data: finalData }, user);
        
        setLoading(false);
        if(res.status === 'success') {
            toast.success(isEditing ? "Data Berhasil Diupdate!" : (isClosingShift ? "Shift Ditutup!" : "Batch Tersimpan."));
            setFormData(prev => ({ 
                ...initialForm, 
                shift: prev.shift, group: prev.group, tanggal: prev.tanggal,
                cnt_start: 0, cnt_end: '', r_washing: '', av_sh: '', 
            }));
            setIsClosingShift(false);
            setIsEditing(false); // Reset mode edit
            setEditRowId(null);
            loadData(); 
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-32">
            <Toaster position="top-center" toastOptions={{style: {background: '#1e293b', color: '#fff'}}} />
            
            {/* HEADER */}
            <div className={`bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 sticky top-0 z-50 shadow-2xl transition-colors ${isEditing ? 'border-b-2 border-yellow-500' : ''}`}>
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => navigate('/foreman/tactical-input')} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 border border-white/5">
                            <ArrowLeft size={20}/>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">REJECT ZONE <span className="text-blue-500">C</span></h1>
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <span className="text-[10px] font-bold bg-yellow-500 text-black px-2 py-0.5 rounded animate-pulse">MODE EDITING: {editRowId}</span>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">System Online</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operator</p><p className="font-bold text-white text-sm">{user?.nama || 'Guest'}</p></div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 mt-8">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* KIRI */}
                        <div className="lg:col-span-8 space-y-6">
                            <Card title="Data Batch & Produksi" icon={Layers} color="blue">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <ModernInput label="No Batch (1.1)" name="no_batch" type="text" placeholder="A123" value={formData.no_batch} onChange={handleChange} required disabled={isEditing} /> 
                                    {/* No Batch Disabled saat Edit agar konsistensi data terjaga */}
                                    <ModernInput label="Tanggal (1.2)" name="tanggal" type="date" value={formData.tanggal} onChange={handleChange} required/>
                                    <ModernSelect label="Shift (1.3)" name="shift" value={formData.shift} options={dropdowns.shift} onChange={handleChange} required/>
                                    <ModernSelect label="Group (1.4)" name="group" value={formData.group} options={dropdowns.group} onChange={handleChange} required/>
                                    <ModernInput label="Reject Blow (1.5)" name="reject_blow" value={formData.reject_blow} onChange={handleChange} required/>
                                    <ModernSelect label="Volume (1.6)" name="volume_botol" value={formData.volume_botol} options={["100 ML", "500 ML", "1000 ML"]} onChange={handleChange} required/>
                                </div>
                            </Card>

                            <Card title="Counter Filling (Bagian 2)" icon={Activity} color="emerald">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <ModernInput label="Start (2.1.1)" name="cnt_start" value={formData.cnt_start} onChange={handleChange} />
                                    <ModernInput label="End (2.1.2)" name="cnt_end" value={formData.cnt_end} onChange={handleChange} required/>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-center">
                                    <StatBox label="Subtotal (2.1.3)" value={calc.cnt_sub} unit="Pcs" />
                                    <ModernSelect label="Utuh? (2.2)" name="utuh" value={formData.utuh} options={["Y", "N"]} onChange={handleChange} required/>
                                    <StatBox label="Jml Batch (2.3)" value={calc.jml_batch} />
                                </div>
                                <div className="mt-4 p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl flex justify-between items-center">
                                    <span className="text-xs text-blue-300 font-bold uppercase">Run Total Counter Shift (2.4)</span>
                                    <span className="text-xl font-black text-white">{(shiftTotals.cnt + calc.cnt_sub)}</span>
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card title="Reject Filling (Bagian 3)" icon={AlertOctagon} color="red">
                                    <div className="space-y-3">
                                        <ModernInput label="Washing (3.1)" name="r_washing" value={formData.r_washing} onChange={handleChange}/>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ModernInput label="VK (3.2.1)" name="r_vk" value={formData.r_vk} onChange={handleChange}/>
                                            <ModernInput label="VL (3.2.2)" name="r_vl" value={formData.r_vl} onChange={handleChange}/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ModernInput label="No Cap (3.3.1)" name="r_nocap" value={formData.r_nocap} onChange={handleChange}/>
                                            <ModernInput label="Seal N/OK (3.3.2)" name="r_sealnok" value={formData.r_sealnok} onChange={handleChange}/>
                                        </div>
                                        <ModernInput label="Others (3.4)" name="r_others" value={formData.r_others} onChange={handleChange}/>
                                        <div className="pt-2 border-t border-white/5 flex justify-between text-red-400 font-bold text-sm">
                                            <span>Sub Total (3.5)</span><span>{calc.r_sub}</span>
                                        </div>
                                    </div>
                                </Card>

                                <div className="space-y-6">
                                    <Card title="Samples (Bagian 4)" icon={Info} color="yellow">
                                        <div className="space-y-3">
                                            <ModernInput label="IPC (4.1.1)" name="s_ipc" value={formData.s_ipc} onChange={handleChange}/>
                                            <ModernInput label="Others (4.1.2)" name="s_others" value={formData.s_others} onChange={handleChange}/>
                                            <div className="pt-2 border-t border-white/5 text-right text-xs text-yellow-500 font-bold">Sub Total (4.2): {calc.s_sub}</div>
                                        </div>
                                    </Card>
                                    <Card title="Pre-Steril (Bagian 7)" icon={Layers} color="slate">
                                        <div className="grid grid-cols-2 gap-3">
                                            <ModernInput label="Bocor" name="pre_bocor" value={formData.pre_bocor} onChange={handleChange}/>
                                            <ModernInput label="No Cap" name="pre_nocap" value={formData.pre_nocap} onChange={handleChange}/>
                                            <ModernInput label="Vol" name="pre_vol" value={formData.pre_vol} onChange={handleChange}/>
                                            <ModernInput label="Thermo" name="pre_thermo" value={formData.pre_thermo} onChange={handleChange}/>
                                            <ModernInput label="Lain" name="pre_lain" value={formData.pre_lain} onChange={handleChange}/>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs font-bold text-slate-300">
                                            <span>Total Rej (7.2.6): {calc.pre_rej_total}</span><span className="text-emerald-400">Out (7.3): {calc.pre_out}</span>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>

                        {/* KANAN */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 shadow-2xl shadow-blue-900/40 text-white">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-4">Hasil Produksi (Bagian 5 & 6)</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end pb-2 border-b border-white/20">
                                        <span className="text-sm opacity-80">Trf to ST (5.1.1)</span><span className="text-2xl font-black">{calc.trf_st}</span>
                                    </div>
                                    <div className="flex justify-between items-end pb-2 border-b border-white/20">
                                        <span className="text-xs font-bold text-emerald-300">TOTAL HASIL (5.2)</span>
                                        <span className="text-xl font-black text-emerald-100">{(shiftTotals.good + calc.trf_st)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="text-xs opacity-70 block">% Batch (6.1)</span><span className="text-xl font-bold">{calc.yield_batch}%</span></div>
                                        <div className="text-right">
                                            <span className="text-xs opacity-70 block">AVG Shift (6.2)</span>
                                            <span className="text-xl font-bold text-yellow-300">
                                                {((shiftTotals.yield_sum + Number(calc.yield_batch)) / (shiftTotals.yield_count + 1)).toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Card title="Waktu Proses (8-12)" icon={Clock} color="slate">
                                <div className="space-y-3">
                                    <TimeInputBlock title="Available (8.3)" prefix="av" formData={formData} handleChange={handleChange} subtotal={calc.av_sub} />
                                    <div className="text-right text-[10px] text-slate-400">Total Avail Shift: {shiftTotals.avail + calc.av_sub}m</div>
                                    <div className="h-px bg-white/5 my-2"></div>
                                    <TimeInputBlock title="Mat Prep" prefix="prep_mat" formData={formData} handleChange={handleChange} subtotal={calc.p_mat} />
                                    <TimeInputBlock title="Setup" prefix="prep_setup" formData={formData} handleChange={handleChange} subtotal={calc.p_set} />
                                    <TimeInputBlock title="Flushing" prefix="prep_flush" formData={formData} handleChange={handleChange} subtotal={calc.p_flu} />
                                    <div className="flex justify-between text-xs font-bold text-slate-300"><span>Total Prep: {calc.p_total}m</span><span className="text-blue-400">Total Shift: {shiftTotals.prep + calc.p_total}m</span></div>
                                    <div className="h-px bg-white/5 my-2"></div>
                                    <TimeInputBlock title="Run Time" prefix="run" formData={formData} handleChange={handleChange} subtotal={calc.run_sub} />
                                    <TimeInputBlock title="Clearance" prefix="lc" formData={formData} handleChange={handleChange} subtotal={calc.lc_sub} />
                                </div>
                                <div className="mt-4 p-3 bg-slate-900 rounded-xl flex justify-between items-center text-xs font-bold text-slate-400">
                                    <span>Prep+Clear (12.1)</span><span className="text-white text-lg">{calc.total_prep_clear}m</span>
                                </div>
                            </Card>

                            <Card title="Jeda Antar Batch (13)" icon={Clock} color="orange">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <span className="text-xs text-slate-400">Jeda (13.1)</span><span className="text-xl font-mono font-bold text-white">{calc.jeda_batch} m</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400">Total Jeda Shift (13.2)</span><span className="text-lg font-mono font-bold text-orange-400">{shiftTotals.jeda + calc.jeda_batch} m</span>
                                    </div>
                                </div>
                            </Card>

                            {!isEditing && (
                                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Flag className={`text-yellow-500 ${isClosingShift ? 'fill-yellow-500' : ''}`} size={20}/>
                                        <div><h4 className="text-white font-bold text-sm">Akhir Shift?</h4><p className="text-[9px] text-slate-400">Centang jika ini batch terakhir.</p></div>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 accent-yellow-500 cursor-pointer" checked={isClosingShift} onChange={(e) => setIsClosingShift(e.target.checked)}/>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {isEditing && (
                                    <button 
                                        type="button" 
                                        onClick={handleCancelEdit} 
                                        className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <XCircle size={20}/> BATAL
                                    </button>
                                )}
                                <motion.button 
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} type="submit"
                                    className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${isEditing ? 'bg-orange-500 hover:bg-orange-400 text-white' : (isClosingShift ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-blue-600 hover:bg-blue-500 text-white')}`}
                                >
                                    {loading ? <Loader2 className="animate-spin"/> : <>{isEditing ? <FileEdit size={20}/> : <Save size={20}/>} {isEditing ? "UPDATE DATA" : (isClosingShift ? "TUTUP SHIFT" : "SIMPAN DATA")}</>}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                    
                    <HistoryTable data={historyData} refresh={loadData} onEdit={handleEditClick} />
                </form>
            </div>
        </div>
    );
};

export default InputRejectC;