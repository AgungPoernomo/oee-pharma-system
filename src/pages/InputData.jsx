import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchValidationData, submitOEEData } from '../services/api';
import { Save, Loader2, Calendar, Clock, Layers, AlertTriangle, Activity, Settings, Package, XCircle } from 'lucide-react';

const InputData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validationData, setValidationData] = useState({});
  
  // State Form Lengkap (Termasuk Output)
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    shift: '',
    group: '',
    batch: '',
    start_time: '07:00', 
    end_time: '08:00',
    type: 'Planned',
    root_cause: '',
    proses: '',
    unit: '',
    kasus: '',
    output_good: 0,   // BARU
    output_reject: 0  // BARU
  });

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchValidationData();
      if (result.status === 'success') {
        setValidationData(result.data);
      }
    };
    loadData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const userZone = user?.plant_zone || 'C';
  const listRootCause = validationData[`List_RC_${userZone}`] || [];
  const listProses = validationData[`List_Proses_${userZone}`] || [];

  const getUnitList = () => {
    if (!formData.proses) return [];
    const key = `Unit_${formData.proses.replace(/\s/g, '_')}`;
    return validationData[key] || [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await submitOEEData(formData, user);
    setLoading(false);

    if (res.status === 'success') {
      alert("✅ Data Berhasil Disimpan!");
      // Reset form parsial
      setFormData(prev => ({ 
        ...prev, 
        batch: '', 
        root_cause: '', 
        kasus: '', 
        output_good: 0, 
        output_reject: 0 
      }));
    } else {
      alert("❌ Gagal menyimpan: " + res.message);
    }
  };

  // Class Helpers
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2";
  const inputClass = "w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all outline-none";
  const sectionTitle = "text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b border-slate-200";

  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Form Input OEE</h1>
          <p className="text-sm text-slate-500">Foreman: {user?.nama}</p>
        </div>
        <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase">
           Zone {userZone}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* KOLOM 1: WAKTU & INFO */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h2 className={sectionTitle}><Calendar size={20} className="text-blue-600"/> Data Shift</h2>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Tanggal & Shift</label>
                <input type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} className={inputClass} required />
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <select name="shift" value={formData.shift} onChange={handleChange} className={inputClass} required>
                        <option value="">Shift...</option>
                        {(validationData.List_Shift || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                    <select name="group" value={formData.group} onChange={handleChange} className={inputClass} required>
                        <option value="">Group...</option>
                        {(validationData.List_Group || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>No. Batch</label>
                <div className="relative">
                  <Layers size={16} className="absolute top-3 left-3 text-slate-400" />
                  <input type="text" name="batch" value={formData.batch} onChange={handleChange} className={`${inputClass} pl-10`} placeholder="B12345" required />
                </div>
              </div>

              {/* INPUT WAKTU */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                {/* Hapus kata 'block', cukup pakai 'flex' */}
                <label className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <Clock size={16}/> Durasi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-blue-600 block mb-1">Mulai</span>
                    <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} className="w-full text-center font-bold bg-white border border-blue-200 rounded p-2" required />
                  </div>
                  <div>
                    <span className="text-xs text-blue-600 block mb-1">Selesai</span>
                    <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} className="w-full text-center font-bold bg-white border border-blue-200 rounded p-2" required />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KOLOM 2: DETAIL MASALAH & OUTPUT */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CARD DETAIL MASALAH */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className={sectionTitle}><Activity size={20} className="text-red-600"/> Detail Kejadian</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex gap-4">
                        {['Planned', 'Unplanned'].map((type) => (
                            <label key={type} className={`flex-1 cursor-pointer border rounded-lg p-3 text-center transition ${formData.type === type ? (type === 'Planned' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800') : 'hover:bg-slate-50'} font-bold`}>
                                <input type="radio" name="type" value={type} checked={formData.type === type} onChange={handleChange} className="hidden"/>
                                {type}
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className={labelClass}>Proses & Unit</label>
                        <select name="proses" value={formData.proses} onChange={handleChange} className={inputClass} required>
                            <option value="">Pilih Proses...</option>
                            {listProses.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                        <select name="unit" value={formData.unit} onChange={handleChange} className={`${inputClass} mt-2`} disabled={!formData.proses} required>
                            <option value="">{formData.proses ? "Pilih Unit..." : "(Pilih Proses Dulu)"}</option>
                            {getUnitList().map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div>
                         <label className={labelClass}>Root Cause</label>
                         <div className="relative">
                            <AlertTriangle size={16} className="absolute top-3 left-3 text-slate-400"/>
                            <select name="root_cause" value={formData.root_cause} onChange={handleChange} className={`${inputClass} pl-10`} required>
                                <option value="">-- Pilih Penyebab --</option>
                                {listRootCause.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                            </select>
                         </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className={labelClass}>Keterangan</label>
                        <textarea name="kasus" value={formData.kasus} onChange={handleChange} rows="2" className={inputClass} placeholder="Detail masalah..." required></textarea>
                    </div>
                </div>
            </div>

            {/* CARD OUTPUT PRODUKSI (BARU) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className={sectionTitle}><Package size={20} className="text-green-600"/> Hasil Produksi (Output)</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-green-700 mb-1">Good Product (OK)</label>
                        <div className="relative">
                            <Package className="absolute top-3 left-3 text-green-500" size={18}/>
                            <input type="number" name="output_good" value={formData.output_good} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-green-50 border border-green-200 rounded-xl text-xl font-bold text-green-800 focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-red-700 mb-1">Reject (NG)</label>
                        <div className="relative">
                            <XCircle className="absolute top-3 left-3 text-red-500" size={18}/>
                            <input type="number" name="output_reject" value={formData.output_reject} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xl font-bold text-red-800 focus:ring-2 focus:ring-red-500 outline-none" placeholder="0" />
                        </div>
                    </div>
                </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg transition flex justify-center items-center gap-3">
               {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> SIMPAN DATA</>}
            </button>

          </div>
        </div>
      </form>
    </div>
  );
};

export default InputData;