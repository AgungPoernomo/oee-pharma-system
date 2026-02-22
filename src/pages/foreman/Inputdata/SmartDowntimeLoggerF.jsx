import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitOEEData, fetchValidationData, fetchTodayDowntimeF } from '../../../services/api'; 
import { Save, Database, Clock, AlertTriangle, RefreshCw, CheckCircle, Loader2, FileEdit, XCircle, ArrowLeft, Plus, Trash2, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTS ---
const SectionTitle = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-4 mt-6 pb-2 border-b border-white/10">
      {Icon && <Icon size={18} className="text-purple-400" />}
      <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
  </div>
);

const InputGroup = ({ label, name, type="number", value, onChange, placeholder, required=false, disabled=false }) => (
  <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
          type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
          className={`w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-purple-500 outline-none font-mono text-sm transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
  </div>
);

const DropdownGroup = ({ label, name, value, onChange, options=[], required=false, disabled=false }) => (
  <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select 
          name={name} value={value} onChange={onChange} disabled={disabled}
          className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-purple-500 outline-none font-bold text-sm appearance-none cursor-pointer disabled:opacity-50"
      >
          <option value="">-- Pilih --</option>
          {options && options.map(opt => (
              <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
          ))}
      </select>
  </div>
);

// --- TABEL MONITORING UTAMA (ZONE F) ---
const HistoryTableDT = ({ data, refresh, onEdit }) => {
    const val = (row, index) => (!row || row[index] === undefined || row[index] === null) ? "-" : row[index];
    const Th = ({ children, className="" }) => <th className={`px-3 py-3 border-b border-slate-700 bg-slate-900 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${className}`}>{children}</th>;
    const Td = ({ children, className="" }) => <td className={`px-3 py-3 border-b border-slate-800 text-xs text-slate-300 whitespace-nowrap ${className}`}>{children}</td>;

    return (
        <div className="mt-12 bg-[#1e293b] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-slate-900">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Database size={18} className="text-purple-400"/> LIVE MONITORING
                </h3>
                <button onClick={refresh} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300 transition-all cursor-pointer">
                    <RefreshCw size={16}/>
                </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full">
                    <thead>
                        <tr>
                            <Th>Tanggal</Th><Th>Shift</Th><Th>Group</Th><Th>No Batch</Th><Th>Lot</Th>
                            <Th>Waktu Kejadian</Th><Th>Durasi</Th>
                            <Th>Kategori</Th><Th>Root Cause</Th><Th>Proses</Th><Th>Unit</Th><Th>Kasus</Th>
                            <Th>Status</Th>
                            <Th className="text-center border-l border-slate-700">Aksi</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {(!data || !Array.isArray(data) || data.length === 0) ? (
                            <tr><td colSpan="14" className="px-4 py-8 text-center italic text-slate-600">Belum ada downtime hari ini</td></tr>
                        ) : (
                            data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <Td>{val(row, 2)}</Td> <Td>{val(row, 3)}</Td> <Td>{val(row, 4)}</Td> 
                                    <Td className="font-bold text-white">{val(row, 5)}</Td>
                                    <Td className="text-purple-300 font-bold">{val(row, 6)}</Td>
                                    
                                    <Td className="font-mono text-blue-300">{val(row, 7)}:{val(row, 8)} - {val(row, 9)}:{val(row, 10)}</Td>
                                    <Td className="text-red-400 font-bold">{val(row, 11)} m</Td>
                                    
                                    <Td><span className={`px-2 py-1 rounded text-[10px] border ${val(row, 12)==='Unplanned'?'bg-red-500/10 border-red-500/30 text-red-400':'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>{val(row, 12)}</span></Td>
                                    
                                    <Td>{val(row, 13)}</Td> <Td>{val(row, 14)}</Td> <Td>{val(row, 15)}</Td> 
                                    <Td className="italic text-slate-400 truncate max-w-[150px]">{val(row, 16)}</Td>
                                    
                                    <Td><CheckCircle size={14} className="text-emerald-500"/></Td>
                                    <Td className="text-center border-l border-slate-800">
                                        <button onClick={() => onEdit(row)} className="p-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors" title="Edit Downtime">
                                            <FileEdit size={14}/>
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
// MAIN COMPONENT
// ==========================================

const InputDowntimeF = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [masterData, setMasterData] = useState({});
    const [options, setOptions] = useState({ shift: [], group: [], rc: [], proses: [], unit: [] });

    // --- PEMISAHAN STATE (Konsep Keranjang) ---
    const initialHeader = { tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', no_batch: '', lot: '' };
    const initialDetail = { start_h: '', start_m: '', end_h: '', end_m: '', duration: 0, plan_unplan: 'Unplanned', root_cause: '', proses: '', unit: '', kasus: '' };

    const [headerData, setHeaderData] = useState(initialHeader);
    const [detailData, setDetailData] = useState(initialDetail);
    const [drafts, setDrafts] = useState([]); 

    // STATE EDIT MODE (Single Edit)
    const [isEditing, setIsEditing] = useState(false);
    const [editRowId, setEditRowId] = useState(null);

    // --- LOAD DATA ---
    const loadData = async () => {
        try {
            const res = await fetchValidationData();
            if(res.status === 'success') {
                setMasterData(res.data);
                setOptions(prev => ({
                    ...prev,
                    shift: res.data['Shift'] || [], group: res.data['Group'] || [],
                    rc: res.data['RC_F'] || [], proses: res.data['DT_Proses_F'] || [] // Data khusus Zone F
                }));
            }
        } catch(e) {}

        try {
            const hist = await fetchTodayDowntimeF(user); 
            if(hist.status === 'success') setHistoryData(hist.data);
        } catch(e) {}
    };

    useEffect(() => { if(user) loadData(); }, [user]);

    // Logic Cascading Dropdown
    useEffect(() => {
        if (detailData.proses && masterData) {
            const unitKey = `Unit_${detailData.proses}`;
            const currentUnit = detailData.unit; 
            const newUnits = masterData[unitKey] || [];
            setOptions(prev => ({ ...prev, unit: newUnits }));
            if (!newUnits.includes(currentUnit)) {
                setDetailData(prev => ({ ...prev, unit: '' }));
            }
        } else {
            setOptions(prev => ({ ...prev, unit: [] }));
        }
    }, [detailData.proses, masterData]);

    // Logic Auto Duration
    useEffect(() => {
        const val = (v) => Number(v) || 0;
        if(detailData.start_h && detailData.end_h) {
            let start = (val(detailData.start_h) * 60) + val(detailData.start_m);
            let end = (val(detailData.end_h) * 60) + val(detailData.end_m);
            let diff = end - start;
            if(diff < 0) diff += (24 * 60);
            setDetailData(prev => ({ ...prev, duration: diff }));
        }
    }, [detailData.start_h, detailData.start_m, detailData.end_h, detailData.end_m]);

    // Handlers Input
    const handleHeaderChange = (e) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        if(name.includes('_h') && value > 23) return;
        if(name.includes('_m') && value > 59) return;
        setDetailData({ ...detailData, [name]: value });
    };

    // --- FUNGSI TAMBAH KE DRAF (CART) ---
    const handleAddDraft = () => {
        // Validasi
        if(!headerData.no_batch || !headerData.lot || !headerData.shift || !headerData.group) {
            toast.error("Data Umum (Shift, Group, Batch, Lot) wajib diisi dahulu!"); return;
        }
        if(!detailData.start_h || !detailData.end_h || !detailData.root_cause || !detailData.proses || !detailData.kasus) {
            toast.error("Detail masalah bertanda * wajib diisi!"); return;
        }

        // Gabungkan Header & Detail
        const newDraft = { ...headerData, ...detailData, id: Date.now() };
        
        setDrafts([...drafts, newDraft]);
        toast.success("Ditambah ke Daftar Draf!", { icon: '🛒' });
        
        // Reset Form Detail sahaja, Header dikekalkan
        setDetailData(initialDetail);
    };

    const removeDraft = (idToRemove) => {
        setDrafts(drafts.filter(d => d.id !== idToRemove));
    };

    // --- FUNGSI SUBMIT (SINGLE UPDATE ATAU BULK INSERT) ---
    const handleSubmit = async () => {
        if (isEditing) {
            // LOGIK UPDATE (SINGLE)
            setLoading(true);
            try {
                const payload = { ...headerData, ...detailData, original_id: editRowId };
                const res = await submitOEEData({ action: 'update_downtime_f', data: payload }, user);
                setLoading(false);
                if(res.status === 'success') {
                    toast.success("Downtime Diupdate!");
                    handleCancelEdit();
                    loadData();
                } else { toast.error(res.message); }
            } catch(e) { setLoading(false); toast.error("Error koneksi"); }
        } else {
            // LOGIK BULK INSERT (MULTIPLE)
            if (drafts.length === 0) {
                toast.error("Senarai draf kosong. Sila tambah data ke daftar dahulu."); return;
            }
            setLoading(true);
            try {
                // Hantar array drafts ke backend (action baru)
                const res = await submitOEEData({ action: 'submit_bulk_downtime_f', data: drafts }, user);
                setLoading(false);
                if(res.status === 'success') {
                    toast.success(`${drafts.length} Downtime Berhasil Disimpan serentak!`);
                    setDrafts([]); // Kosongkan keranjang
                    setHeaderData(initialHeader); // Reset header
                    loadData();
                } else { toast.error(res.message); }
            } catch(e) { setLoading(false); toast.error("Error koneksi"); }
        }
    };

    // --- HANDLE EDIT (MAPPING DATA) ---
    const handleEditClick = (rowData) => {
        if (drafts.length > 0) {
            if (!window.confirm("Ada draf yang belum disimpan. Teruskan mengedit akan memadam draf anda. Teruskan?")) return;
            setDrafts([]);
        }

        let dateVal = new Date().toISOString().split('T')[0];
        try { if(rowData[2]) dateVal = new Date(rowData[2]).toISOString().split('T')[0]; } catch(e){}

        // Mapping disesuaikan dengan index Zone F (ada Lot di index 6)
        setHeaderData({ 
            tanggal: dateVal, shift: rowData[3], group: rowData[4], 
            no_batch: rowData[5], lot: rowData[6] 
        });
        
        setDetailData({
            start_h: rowData[7], start_m: rowData[8], end_h: rowData[9], end_m: rowData[10],
            duration: rowData[11], plan_unplan: rowData[12], root_cause: rowData[13],
            proses: rowData[14], unit: rowData[15], kasus: rowData[16]
        });

        setIsEditing(true);
        const exactRowIndex = rowData[rowData.length - 1]; 
        setEditRowId(exactRowIndex); 
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast("Mod Edit Aktif", { icon: '✏️' });        
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setHeaderData(initialHeader);
        setDetailData(initialDetail);
        setEditRowId(null);
        toast.dismiss();
    };

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 pb-32">
            <Toaster position="top-center" toastOptions={{style: {background: '#1e293b', color: '#fff'}}} />
            
            {/* HEADER */}
            <div className={`bg-[#131b2e] border-b border-white/5 px-6 py-5 sticky top-0 z-50 shadow-2xl transition-colors ${isEditing ? 'border-b-2 border-yellow-500' : ''}`}>
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => navigate('/foreman/tactical-input')} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 border border-white/5"><ArrowLeft size={20}/></button>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">INPUT DOWNTIME <span className="text-purple-500">ZONE F</span></h1>
                            {isEditing ? <span className="text-[10px] font-bold bg-yellow-500 text-black px-2 py-0.5 rounded animate-pulse">MOD EDITING (TUNGGAL)</span>
                            : <p className="text-[10px] text-slate-400">Operator: {user?.nama || 'Guest'} </p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-6">
                
                {/* 1. DATA UMUM (HEADER) */}
                <section>
                    <SectionTitle title="1. Data Umum (Statik)" icon={Database}/>
                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg grid grid-cols-2 md:grid-cols-5 gap-4">
                        <InputGroup label="Tanggal" name="tanggal" type="date" value={headerData.tanggal} onChange={handleHeaderChange} required disabled={isEditing && drafts.length===0}/>
                        <DropdownGroup label="Shift" name="shift" value={headerData.shift} options={options.shift} onChange={handleHeaderChange} required disabled={isEditing}/>
                        <DropdownGroup label="Group" name="group" value={headerData.group} options={options.group} onChange={handleHeaderChange} required disabled={isEditing}/>
                        <InputGroup label="No Batch" name="no_batch" type="text" value={headerData.no_batch} onChange={handleHeaderChange} placeholder="A123" required disabled={isEditing}/>
                        <InputGroup label="Lot No" name="lot" type="text" value={headerData.lot} onChange={handleHeaderChange} placeholder="A, B..." required disabled={isEditing}/>
                    </div>
                </section>

                {/* 2. WAKTU KEJADIAN (DETAIL) */}
                <section>
                    <SectionTitle title="2. Waktu Kejadian" icon={Clock}/>
                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                            <div className="col-span-2 grid grid-cols-2 gap-2">
                                <InputGroup label="Start Jam" name="start_h" value={detailData.start_h} onChange={handleDetailChange} placeholder="00" required/>
                                <InputGroup label="Start Menit" name="start_m" value={detailData.start_m} onChange={handleDetailChange} placeholder="00" required/>
                            </div>
                            <div className="col-span-2 grid grid-cols-2 gap-2">
                                <InputGroup label="End Jam" name="end_h" value={detailData.end_h} onChange={handleDetailChange} placeholder="00" required/>
                                <InputGroup label="End Menit" name="end_m" value={detailData.end_m} onChange={handleDetailChange} placeholder="00" required/>
                            </div>
                            <div className="bg-purple-900/20 p-3 rounded-xl border border-purple-500/30 text-center">
                                <label className="text-[10px] uppercase font-bold text-purple-400 block mb-1">Total (Min)</label>
                                <span className="text-2xl font-mono font-bold text-white">{detailData.duration}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. DETAIL MASALAH */}
                <section>
                    <SectionTitle title="3. Detail Masalah" icon={AlertTriangle}/>
                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg space-y-4">
                        <DropdownGroup label="Kategori" name="plan_unplan" value={detailData.plan_unplan} options={['Unplanned', 'Planned']} onChange={handleDetailChange} required/>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DropdownGroup label="Root Cause" name="root_cause" value={detailData.root_cause} options={options.rc} onChange={handleDetailChange} required/>
                            <DropdownGroup label="Proses" name="proses" value={detailData.proses} options={options.proses} onChange={handleDetailChange} required/>
                            <DropdownGroup label="Unit Mesin" name="unit" value={detailData.unit} options={options.unit} onChange={handleDetailChange} disabled={!detailData.proses} required/>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kasus / Keterangan *</label>
                            <textarea name="kasus" value={detailData.kasus} onChange={handleDetailChange} rows="2" placeholder="Jelaskan detail masalah..." className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-purple-500 outline-none text-sm"></textarea>
                        </div>
                    </div>
                </section>

                {/* ACTION BUTTON */}
                <div className="mt-6">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button type="button" onClick={handleCancelEdit} className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                <XCircle size={20}/> BATAL
                            </button>
                            <button type="button" onClick={handleSubmit} disabled={loading} className="flex-[2] py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-400 text-white">
                                {loading ? <Loader2 className="animate-spin"/> : <><FileEdit size={20}/> SIMPAN PEMBARUAN DATA</>}
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={handleAddDraft} className="w-full py-4 rounded-xl border-2 border-dashed border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10 text-purple-400 font-bold text-lg flex items-center justify-center gap-2 transition-all">
                            <Plus size={24}/> TAMBAH KE DAFTAR
                        </button>
                    )}
                </div>

                {/* KERANJANG DRAF */}
                {!isEditing && drafts.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ListChecks className="text-emerald-400" size={24}/>
                                <h3 className="text-xl font-black text-white">DAFTAR INPUTAN DATA</h3>
                            </div>
                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/50">
                                {drafts.length} Item Sedia
                            </span>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            {drafts.map((d) => (
                                <div key={d.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex justify-between items-center group">
                                    <div>
                                        <p className="text-white font-bold text-sm">{d.proses} - {d.unit}</p>
                                        <p className="text-slate-400 text-xs mt-0.5">{d.start_h}:{d.start_m} s/d {d.end_h}:{d.end_m} ({d.duration}m) | {d.root_cause}</p>
                                        <p className="text-slate-500 text-[10px] mt-1 italic">"{d.kasus}"</p>
                                    </div>
                                    <button type="button" onClick={() => removeDraft(d.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors opacity-80 group-hover:opacity-100">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button type="button" onClick={handleSubmit} disabled={loading} className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(5,150,105,0.4)] flex items-center justify-center gap-3 transition-all active:scale-95">
                            {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> SIMPAN SEMUA DOWNTIME ({drafts.length})</>}
                        </button>
                    </motion.div>
                )}

                {/* TABEL SEJARAH BAWAH */}
                <HistoryTableDT data={historyData} refresh={loadData} onEdit={handleEditClick} />
            </div>
        </div>
    );
};

export default InputDowntimeF;