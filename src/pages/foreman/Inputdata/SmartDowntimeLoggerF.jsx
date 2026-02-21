import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitOEEData, fetchValidationData, fetchTodayDowntimeF } from '../../../services/api'; 
import { Save, Database, Clock, AlertTriangle, RefreshCw, CheckCircle, Loader2, FileEdit, XCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
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

// --- TABEL MONITORING (URUTAN ZONE F DENGAN LOT) ---
const HistoryTableDT = ({ data, refresh, onEdit }) => {
    const val = (row, index) => {
        if (!row) return "-";
        const v = row[index];
        return (v === undefined || v === null) ? "-" : v;
    };

    const Th = ({ children, className="" }) => <th className={`px-3 py-3 border-b border-slate-700 bg-slate-900 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${className}`}>{children}</th>;
    const Td = ({ children, className="" }) => <td className={`px-3 py-3 border-b border-slate-800 text-xs text-slate-300 whitespace-nowrap ${className}`}>{children}</td>;

    return (
        <div className="mt-12 bg-[#1e293b] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-slate-900">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Database size={18} className="text-purple-400"/> Log Downtime Zone F
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
                                    <Td>{row[2]}</Td> {/* C: Tanggal */}
                                    <Td>{row[3]}</Td> {/* D: Shift */}
                                    <Td>{row[4]}</Td> {/* E: Group */}
                                    <Td className="font-bold text-white">{row[5]}</Td> {/* F: Batch */}
                                    <Td className="text-purple-300 font-bold">{row[6]}</Td> {/* G: Lot (KHUSUS ZONE F) */}
                                    
                                    <Td className="font-mono text-blue-300">{row[7]}:{row[8]} - {row[9]}:{row[10]}</Td>
                                    
                                    <Td className="text-red-400 font-bold">{row[11]} m</Td> {/* L: Durasi */}
                                    
                                    <Td><span className={`px-2 py-1 rounded text-[10px] border ${row[12]==='Unplanned'?'bg-red-500/10 border-red-500/30 text-red-400':'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>{row[12]}</span></Td>
                                    
                                    <Td>{row[13]}</Td> {/* N: RC */}
                                    <Td>{row[14]}</Td> {/* O: Proses */}
                                    <Td>{row[15]}</Td> {/* P: Unit */}
                                    <Td className="italic text-slate-400 truncate max-w-[150px]">{row[16]}</Td> {/* Q: Kasus */}
                                    
                                    <Td><CheckCircle size={14} className="text-emerald-500"/></Td>
                                    <Td className="text-center border-l border-slate-800">
                                        <button 
                                            onClick={() => onEdit(row)} 
                                            className="p-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors"
                                            title="Edit Downtime"
                                        >
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

    // STATE EDIT MODE
    const [isEditing, setIsEditing] = useState(false);
    const [editRowId, setEditRowId] = useState(null);

    const initialForm = {
        tanggal: new Date().toISOString().split('T')[0],
        shift: '', group: '', no_batch: '', lot: '', 
        start_h: '', start_m: '', end_h: '', end_m: '', duration: 0,
        plan_unplan: 'Unplanned', root_cause: '', proses: '', unit: '', kasus: ''
    };

    const [formData, setFormData] = useState(initialForm);

    const loadData = async () => {
        try {
            const res = await fetchValidationData();
            if(res.status === 'success') {
                setMasterData(res.data);
                setOptions(prev => ({
                    ...prev,
                    shift: res.data['Shift'] || [],
                    group: res.data['Group'] || [],
                    rc: res.data['RC_F'] || [], 
                    proses: res.data['DT_Proses_F'] || [] 
                }));
            }
            const hist = await fetchTodayDowntimeF(user);
            if(hist.status === 'success') setHistoryData(hist.data);
        } catch(e) { toast.error("Gagal load data master"); }
    };

    useEffect(() => { if(user) loadData(); }, [user]);

    // Logic Cascading
    useEffect(() => {
        if (formData.proses && masterData) {
            const unitKey = `Unit_${formData.proses}`;
            const currentUnit = formData.unit; 
            const newUnits = masterData[unitKey] || [];
            setOptions(prev => ({ ...prev, unit: newUnits }));
            if (!newUnits.includes(currentUnit)) {
                setFormData(prev => ({ ...prev, unit: '' }));
            }
        } else {
            setOptions(prev => ({ ...prev, unit: [] }));
        }
    }, [formData.proses, masterData]);

    // Logic Duration
    useEffect(() => {
        const val = (v) => Number(v) || 0;
        if(formData.start_h && formData.end_h) {
            let start = (val(formData.start_h) * 60) + val(formData.start_m);
            let end = (val(formData.end_h) * 60) + val(formData.end_m);
            let diff = end - start;
            if(diff < 0) diff += (24 * 60);
            setFormData(prev => ({ ...prev, duration: diff }));
        }
    }, [formData.start_h, formData.start_m, formData.end_h, formData.end_m]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if(name.includes('_h') && value > 23) return;
        if(name.includes('_m') && value > 59) return;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- HANDLE EDIT (MAPPING DATA) ---
    const handleEditClick = (rowData) => {
        // [0]Time, [1]User, [2]Tgl, [3]Shift, [4]Grp, [5]Batch, [6]Lot, [7]StartH, [8]StartM, [9]EndH, [10]EndM, [11]Dur, [12]Type, [13]RC, [14]Pros, [15]Unit, [16]Kasus
        
        let dateVal = new Date().toISOString().split('T')[0];
        try { if(rowData[2]) dateVal = new Date(rowData[2]).toISOString().split('T')[0]; } catch(e){}

        const newData = {
            tanggal: dateVal,
            shift: rowData[3],
            group: rowData[4],
            no_batch: rowData[5],
            lot: rowData[6], // Zone F ada Lot
            start_h: rowData[7], start_m: rowData[8],
            end_h: rowData[9], end_m: rowData[10],
            duration: rowData[11],
            plan_unplan: rowData[12],
            root_cause: rowData[13],
            proses: rowData[14],
            unit: rowData[15],
            kasus: rowData[16]
        };

        setFormData(newData);
        setIsEditing(true);
        setEditRowId(rowData[0]); // Timestamp as ID
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast("Mode Edit: Silakan revisi data", { icon: '✏️' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData(initialForm);
        setEditRowId(null);
        toast.dismiss();
        toast("Edit Dibatalkan");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if(!formData.no_batch || !formData.lot || !formData.start_h || !formData.end_h || !formData.root_cause || !formData.proses || !formData.kasus) {
            toast.error("Mohon lengkapi semua data bertanda *");
            setLoading(false); return;
        }

        try {
            const actionType = isEditing ? 'update_downtime_f' : 'submit_downtime_f';
            const payload = { 
                ...formData,
                original_id: isEditing ? editRowId : null 
            };

            const res = await submitOEEData({ action: actionType, data: payload }, user);
            
            setLoading(false);
            if(res.status === 'success') {
                toast.success(isEditing ? "Downtime Diupdate!" : "Downtime Disimpan!");
                setFormData(prev => ({ ...initialForm, shift: prev.shift, group: prev.group, tanggal: prev.tanggal }));
                setIsEditing(false);
                setEditRowId(null);
                loadData();
            } else {
                toast.error(res.message);
            }
        } catch(e) {
            setLoading(false);
            toast.error("Error koneksi");
        }
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
                            {isEditing ? (
                                <span className="text-[10px] font-bold bg-yellow-500 text-black px-2 py-0.5 rounded animate-pulse">MODE EDITING</span>
                            ) : (
                                <p className="text-[10px] text-slate-400">Operator: {user?.nama || 'Guest'}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. DATA UMUM */}
                    <section>
                        <SectionTitle title="1. Data Umum" icon={Database}/>
                        <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg grid grid-cols-2 md:grid-cols-3 gap-4">
                            <InputGroup label="Tanggal" name="tanggal" type="date" value={formData.tanggal} onChange={handleChange} required/>
                            <DropdownGroup label="Shift" name="shift" value={formData.shift} options={options.shift} onChange={handleChange} required/>
                            <DropdownGroup label="Group" name="group" value={formData.group} options={options.group} onChange={handleChange} required/>
                            <InputGroup label="No Batch" name="no_batch" type="text" value={formData.no_batch} onChange={handleChange} placeholder="A123" required/>
                            <InputGroup label="Lot No" name="lot" type="text" value={formData.lot} onChange={handleChange} placeholder="A, B..." required/>
                        </div>
                    </section>

                    {/* 2. WAKTU */}
                    <section>
                        <SectionTitle title="2. Waktu Kejadian" icon={Clock}/>
                        <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                                <div className="col-span-2 grid grid-cols-2 gap-2">
                                    <InputGroup label="Start Jam" name="start_h" value={formData.start_h} onChange={handleChange} placeholder="00" required/>
                                    <InputGroup label="Start Menit" name="start_m" value={formData.start_m} onChange={handleChange} placeholder="00" required/>
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-2">
                                    <InputGroup label="End Jam" name="end_h" value={formData.end_h} onChange={handleChange} placeholder="00" required/>
                                    <InputGroup label="End Menit" name="end_m" value={formData.end_m} onChange={handleChange} placeholder="00" required/>
                                </div>
                                <div className="bg-purple-900/20 p-3 rounded-xl border border-purple-500/30 text-center">
                                    <label className="text-[10px] uppercase font-bold text-purple-400 block mb-1">Total (Min)</label>
                                    <span className="text-2xl font-mono font-bold text-white">{formData.duration}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3 & 4. MASALAH */}
                    <section>
                        <SectionTitle title="3. Detail Masalah" icon={AlertTriangle}/>
                        <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 shadow-lg space-y-4">
                            <DropdownGroup label="Kategori" name="plan_unplan" value={formData.plan_unplan} options={['Unplanned', 'Planned']} onChange={handleChange} required/>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <DropdownGroup label="Root Cause" name="root_cause" value={formData.root_cause} options={options.rc} onChange={handleChange} required/>
                                <DropdownGroup label="Proses" name="proses" value={formData.proses} options={options.proses} onChange={handleChange} required/>
                                <DropdownGroup label="Unit Mesin" name="unit" value={formData.unit} options={options.unit} onChange={handleChange} disabled={!formData.proses} required/>
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kasus / Keterangan *</label>
                                <textarea 
                                    name="kasus" value={formData.kasus} onChange={handleChange} rows="3" placeholder="Jelaskan detail masalah..."
                                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-purple-500 outline-none text-sm"
                                ></textarea>
                            </div>
                        </div>
                    </section>

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
                            className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${isEditing ? 'bg-orange-500 hover:bg-orange-400 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                        >
                            {loading ? <Loader2 className="animate-spin"/> : <>{isEditing ? <FileEdit size={20}/> : <Save size={20}/>} {isEditing ? "UPDATE DOWNTIME" : "SIMPAN DOWNTIME"}</>}
                        </motion.button>
                    </div>

                </form>

                <HistoryTableDT data={historyData} refresh={loadData} onEdit={handleEditClick} />
            </div>
        </div>
    );
};

export default InputDowntimeF;