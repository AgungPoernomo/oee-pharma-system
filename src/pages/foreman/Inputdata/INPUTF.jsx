import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitOEEData, fetchTodayRejectF, fetchTodayDowntimeF } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

// ==========================================
// HELPER: GENERATOR BARIS KOSONG
// ==========================================
const generateId = () => Math.random().toString(36).substr(2, 9);

const getEmptyOEE = () => ({
  rowId: generateId(), original_id: null,
  no_batch: '', lot_no: '', tanggal: '', shift: '', group: '', volume_botol: '',
  steril_in: '', steril_bocor: '', steril_h_patah_ring: '', steril_h_patah_lidah: '', steril_h_patah_leleh: '', steril_no_hanger: '', steril_rej_total: '', steril_sample: '', steril_out: '',
  vi_start: '', vi_end: '', vi_sub: '', tot_vi_shift: '',
  vi_partikel: '', vi_kotik: '', vi_rej_total: '', vi_hasil_baik: '', vi_sample_qc: '', vi_tf_packing: '',
  pack_reject: '', pack_hasil_baik: '', pack_s_qc: '', pack_s_others: '', pack_fg: '', pack_utuh: '', pack_jml_batch: '', tot_fg_shift: '',
  yield_batch: '', avg_yield_shift: '',
  av_sh: '', av_sm: '', av_eh: '', av_em: '', av_sub: '',
  run_sh: '', run_sm: '', run_eh: '', run_em: '', run_sub: '',
  clear_sh: '', clear_sm: '', clear_eh: '', clear_em: '', clear_sub: '',
  total_prep_clear: '', jeda_batch: '', jeda_shift: ''
});

const getEmptyDT = () => ({
  rowId: generateId(), original_id: null,
  tanggal: '', shift: '', group: '', no_batch: '',
  start_h: '', start_m: '', end_h: '', end_m: '', duration: '',
  plan_unplan: '', root_cause: '', proses: '', unit: '', kasus: ''
});

// ==========================================
// KOMPONEN CELL INPUT
// ==========================================
const Cell = ({ value, onChange, className = "" }) => (
  <td className={`border border-black p-0 min-w-[80px] bg-white ${className}`}>
    <input 
      type="text" 
      value={value || ''} 
      onChange={onChange} 
      className="w-full h-full p-2 text-center text-xs font-mono outline-none focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 transition-colors bg-transparent"
    />
  </td>
);

export default function InputF() {
  const { user } = useAuth();
  
  // State dengan inisiasi 5 baris kosong
  const [oeeRows, setOeeRows] = useState(Array.from({ length: 5 }, getEmptyOEE));
  const [dtRows, setDtRows] = useState(Array.from({ length: 5 }, getEmptyDT));

  // ==========================================
  // FETCH DATA DARI SPREADSHEET (BACKGROUND)
  // ==========================================
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [resOEE, resDT] = await Promise.all([
          fetchTodayRejectF(user),
          fetchTodayDowntimeF(user)
        ]);

        if (resOEE.status === 'success' && resOEE.data) {
          const mappedOEE = resOEE.data.map(row => ({
            rowId: generateId(), original_id: row[row.length - 1],
            no_batch: row[2], lot_no: row[3], tanggal: row[4], shift: row[5], group: row[6], volume_botol: row[7],
            steril_in: row[8], steril_bocor: row[9], steril_h_patah_ring: row[10], steril_h_patah_lidah: row[11], steril_h_patah_leleh: row[12], steril_no_hanger: row[13], steril_rej_total: row[14], steril_sample: row[15], steril_out: row[16],
            vi_start: row[17], vi_end: row[18], vi_sub: row[19], tot_vi_shift: row[20],
            vi_partikel: row[21], vi_kotik: row[22], vi_rej_total: row[23], vi_hasil_baik: row[24], vi_sample_qc: row[25], vi_tf_packing: row[26],
            pack_reject: row[27], pack_hasil_baik: row[28], pack_s_qc: row[29], pack_s_others: row[30], pack_fg: row[31], pack_utuh: row[32], pack_jml_batch: row[33], tot_fg_shift: row[34],
            yield_batch: row[35], avg_yield_shift: row[36],
            av_sh: row[37], av_sm: row[38], av_eh: row[39], av_em: row[40], av_sub: row[41],
            run_sh: row[48], run_sm: row[49], run_eh: row[50], run_em: row[51], run_sub: row[52],
            clear_sh: row[58], clear_sm: row[59], clear_eh: row[60], clear_em: row[61], clear_sub: row[62],
            total_prep_clear: row[64], jeda_batch: row[65], jeda_shift: row[66]
          }));
          setOeeRows(prev => [...mappedOEE, ...prev]);
        }

        if (resDT.status === 'success' && resDT.data) {
          const mappedDT = resDT.data.map(row => ({
            rowId: generateId(), original_id: row[row.length - 1],
            tanggal: row[2], shift: row[3], group: row[4], no_batch: row[5], // Zone F downtime uses index 5 for batch, we skip lot locally
            start_h: row[7], start_m: row[8], end_h: row[9], end_m: row[10], duration: row[11],
            plan_unplan: row[12], root_cause: row[13], proses: row[14], unit: row[15], kasus: row[16]
          }));
          setDtRows(prev => [...mappedDT, ...prev]);
        }
      } catch (error) {
        toast.error("Gagal menarik data riwayat dari server.");
      }
    };

    loadData();
  }, [user]);

  // ==========================================
  // HANDLERS UNTUK OEE
  // ==========================================
  const handleOeeChange = (id, field, value) => {
    setOeeRows(prev => prev.map(r => r.rowId === id ? { ...r, [field]: value } : r));
  };

  const actionOEE = async (row, actionType) => {
    if ((actionType === 'submit_reject_f' || actionType === 'update_reject_f') && (!row.no_batch || !row.lot_no || !row.tanggal)) {
      toast.error("Batch, Lot, dan Tanggal wajib diisi!"); return;
    }
    const tId = toast.loading("Memproses data OEE...");
    try {
      const res = await submitOEEData({ action: actionType, data: row }, user);
      if (res.status === 'success') {
        toast.success("Berhasil!", { id: tId });
        if (actionType === 'delete_reject_f') {
          setOeeRows(prev => prev.filter(r => r.rowId !== row.rowId));
        } else if (actionType === 'submit_reject_f') {
          setOeeRows(prev => [...prev, getEmptyOEE()]); 
        }
      } else {
        toast.error(res.message, { id: tId });
      }
    } catch (e) {
      toast.error("Koneksi gagal", { id: tId });
    }
  };

  // ==========================================
  // HANDLERS UNTUK DOWNTIME
  // ==========================================
  const handleDtChange = (id, field, value) => {
    setDtRows(prev => prev.map(r => r.rowId === id ? { ...r, [field]: value } : r));
  };

  const actionDT = async (row, actionType) => {
    if ((actionType === 'submit_downtime_f' || actionType === 'update_downtime_f') && (!row.tanggal || !row.no_batch)) {
      toast.error("Tanggal dan No. Batch wajib diisi!"); return;
    }
    const tId = toast.loading("Memproses Downtime...");
    try {
      const res = await submitOEEData({ action: actionType, data: row }, user);
      if (res.status === 'success') {
        toast.success("Berhasil!", { id: tId });
        if (actionType === 'delete_downtime_f') {
          setDtRows(prev => prev.filter(r => r.rowId !== row.rowId));
        } else if (actionType === 'submit_downtime_f') {
          setDtRows(prev => [...prev, getEmptyDT()]); 
        }
      } else {
        toast.error(res.message, { id: tId });
      }
    } catch (e) {
      toast.error("Koneksi gagal", { id: tId });
    }
  };

  // ==========================================
  // KELAS UNTUK FREEZE (STICKY)
  // ==========================================
  const freezeOEE1 = "sticky left-0 z-20 min-w-[90px] max-w-[90px]";
  const freezeOEE2 = "sticky left-[90px] z-20 min-w-[90px] max-w-[90px]";
  const freezeOEE3 = "sticky left-[180px] z-20 min-w-[90px] max-w-[90px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]";
  
  const freezeDT1 = "sticky left-0 z-20 min-w-[90px] max-w-[90px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]";
  const freezeRight = "sticky right-0 z-20 min-w-[120px] max-w-[120px] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] bg-gray-50";

  return (
    <div className="min-h-screen bg-white p-8 text-black font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">
        
        {/* =========================================================
            1. SPREADSHEET OEE (ZONE F)
        ========================================================= */}
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-wider uppercase">OEE - Zone F</h1>
        </div>

        <div className="overflow-auto border-2 border-black shadow-lg mb-12 custom-scrollbar max-h-[600px] relative">
          <table className="w-max border-collapse text-xs text-center whitespace-nowrap">
            <thead className="sticky top-0 z-40 text-black font-bold uppercase tracking-wider bg-gray-50">
              <tr>
                <th rowSpan="3" className={`border border-black px-4 py-2 align-middle bg-gray-100 ${freezeOEE1} z-50`}>No. Batch</th>
                <th rowSpan="3" className={`border border-black px-4 py-2 align-middle bg-gray-100 ${freezeOEE2} z-50`}>Lot No</th>
                <th rowSpan="3" className={`border border-black px-4 py-2 align-middle bg-gray-100 ${freezeOEE3} z-50`}>Tanggal</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50">Shift</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50">Grup</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50">Volume</th>
                <th colSpan="9" className="border border-black px-4 py-2 bg-gray-200">Output After Steril</th>
                <th colSpan="10" className="border border-black px-4 py-2 bg-gray-200">Output Visual Inspeksi</th>
                <th colSpan="8" className="border border-black px-4 py-2 bg-gray-200">Output Packaging</th>
                <th colSpan="2" rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-200">% Yield</th>
                <th colSpan="5" className="border border-black px-4 py-2 bg-gray-200">Available Time</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-200">TOTAL per Shift</th>
                <th colSpan="11" className="border border-black px-4 py-2 bg-gray-200">Process Details</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-200">Total Preparation + Clearance Time</th>
                <th colSpan="2" rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-200">jeda antar batch</th>
                <th rowSpan="3" className={`border border-black px-4 py-2 align-middle bg-gray-50 ${freezeRight} z-50`}>AKSI</th>
              </tr>
              <tr>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Input (Botol dari chamber)</th>
                <th colSpan="6" className="border border-black px-4 py-2 bg-gray-50">Reject After Steril</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Sampel QC</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-200">Output (TF to VI)</th>
                <th colSpan="4" className="border border-black px-4 py-2 bg-gray-50">Input</th>
                <th colSpan="3" className="border border-black px-4 py-2 bg-gray-50">Reject VI</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Hasil Baik</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Sample QC</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-200">Transfer ke Packing</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Reject</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Hasil Baik</th>
                <th colSpan="2" className="border border-black px-4 py-2 bg-gray-50">Samples</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Finished Goods</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Utuh ?</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Jumlah Batch</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-200">Total per shift</th>
                <th colSpan="5" className="border border-black px-4 py-2 bg-gray-50">(waktu per shift)</th>
                <th colSpan="5" className="border border-black px-4 py-2 bg-gray-50">Machine Run</th>
                <th colSpan="5" className="border border-black px-4 py-2 bg-gray-50">Line Clearance</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-200">TOTAL</th>
              </tr>
              <tr>
                <th className="border border-black px-4 py-2 bg-gray-50">Reject Bocor</th><th className="border border-black px-4 py-2 bg-gray-50">Reject Hanger Patah ring</th><th className="border border-black px-4 py-2 bg-gray-50">Reject Hanger Patah Lidah</th><th className="border border-black px-4 py-2 bg-gray-50">Reject Hanger Patah Lelehan</th><th className="border border-black px-4 py-2 bg-gray-50">Reject Tanpa Hanger</th><th className="border border-black px-4 py-2 bg-red-100">TOTAL</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start</th><th className="border border-black px-4 py-2 bg-gray-50">End</th><th className="border border-black px-4 py-2 bg-emerald-100">Sub total</th><th className="border border-black px-4 py-2 bg-emerald-200 text-emerald-800">Total per Shift</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Partikel</th><th className="border border-black px-4 py-2 bg-gray-50">Kosmetik</th><th className="border border-black px-4 py-2 bg-red-100">TOTAL</th>
                <th className="border border-black px-4 py-2 bg-gray-50">QC</th><th className="border border-black px-4 py-2 bg-gray-50">Others</th>
                <th className="border border-black px-4 py-2 bg-yellow-100">per Batch</th><th className="border border-black px-4 py-2 bg-yellow-200 text-yellow-800">AVG per shift</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">Start (Menit)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Menit)</th><th className="border border-black px-4 py-2 bg-purple-100 text-purple-800">Sub Total</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">Start (Menit)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Menit)</th><th className="border border-black px-4 py-2 bg-cyan-100 text-cyan-800">Sub Total</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">Start (Menit)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Menit)</th><th className="border border-black px-4 py-2 bg-sky-100 text-sky-800">Sub Total</th>
                <th className="border border-black px-4 py-2 bg-gray-50">per batch</th><th className="border border-black px-4 py-2 bg-orange-200 text-orange-800">per shift</th>
              </tr>
            </thead>
            
            <tbody className="text-black font-mono">
              {oeeRows.map((row) => (
                <tr key={row.rowId} className="hover:bg-gray-100">
                  <Cell value={row.no_batch} onChange={(e) => handleOeeChange(row.rowId, 'no_batch', e.target.value)} className={freezeOEE1} />
                  <Cell value={row.lot_no} onChange={(e) => handleOeeChange(row.rowId, 'lot_no', e.target.value)} className={freezeOEE2} />
                  <Cell value={row.tanggal} onChange={(e) => handleOeeChange(row.rowId, 'tanggal', e.target.value)} className={freezeOEE3} />
                  <Cell value={row.shift} onChange={(e) => handleOeeChange(row.rowId, 'shift', e.target.value)} />
                  <Cell value={row.group} onChange={(e) => handleOeeChange(row.rowId, 'group', e.target.value)} />
                  <Cell value={row.volume_botol} onChange={(e) => handleOeeChange(row.rowId, 'volume_botol', e.target.value)} />
                  
                  {/* Output After Steril */}
                  <Cell value={row.steril_in} onChange={(e) => handleOeeChange(row.rowId, 'steril_in', e.target.value)} />
                  <Cell value={row.steril_bocor} onChange={(e) => handleOeeChange(row.rowId, 'steril_bocor', e.target.value)} />
                  <Cell value={row.steril_h_patah_ring} onChange={(e) => handleOeeChange(row.rowId, 'steril_h_patah_ring', e.target.value)} />
                  <Cell value={row.steril_h_patah_lidah} onChange={(e) => handleOeeChange(row.rowId, 'steril_h_patah_lidah', e.target.value)} />
                  <Cell value={row.steril_h_patah_leleh} onChange={(e) => handleOeeChange(row.rowId, 'steril_h_patah_leleh', e.target.value)} />
                  <Cell value={row.steril_no_hanger} onChange={(e) => handleOeeChange(row.rowId, 'steril_no_hanger', e.target.value)} />
                  <Cell value={row.steril_rej_total} onChange={(e) => handleOeeChange(row.rowId, 'steril_rej_total', e.target.value)} />
                  <Cell value={row.steril_sample} onChange={(e) => handleOeeChange(row.rowId, 'steril_sample', e.target.value)} />
                  <Cell value={row.steril_out} onChange={(e) => handleOeeChange(row.rowId, 'steril_out', e.target.value)} />

                  {/* Output Visual Inspeksi */}
                  <Cell value={row.vi_start} onChange={(e) => handleOeeChange(row.rowId, 'vi_start', e.target.value)} />
                  <Cell value={row.vi_end} onChange={(e) => handleOeeChange(row.rowId, 'vi_end', e.target.value)} />
                  <Cell value={row.vi_sub} onChange={(e) => handleOeeChange(row.rowId, 'vi_sub', e.target.value)} />
                  <Cell value={row.tot_vi_shift} onChange={(e) => handleOeeChange(row.rowId, 'tot_vi_shift', e.target.value)} />
                  <Cell value={row.vi_partikel} onChange={(e) => handleOeeChange(row.rowId, 'vi_partikel', e.target.value)} />
                  <Cell value={row.vi_kotik} onChange={(e) => handleOeeChange(row.rowId, 'vi_kotik', e.target.value)} />
                  <Cell value={row.vi_rej_total} onChange={(e) => handleOeeChange(row.rowId, 'vi_rej_total', e.target.value)} />
                  <Cell value={row.vi_hasil_baik} onChange={(e) => handleOeeChange(row.rowId, 'vi_hasil_baik', e.target.value)} />
                  <Cell value={row.vi_sample_qc} onChange={(e) => handleOeeChange(row.rowId, 'vi_sample_qc', e.target.value)} />
                  <Cell value={row.vi_tf_packing} onChange={(e) => handleOeeChange(row.rowId, 'vi_tf_packing', e.target.value)} />

                  {/* Output Packaging */}
                  <Cell value={row.pack_reject} onChange={(e) => handleOeeChange(row.rowId, 'pack_reject', e.target.value)} />
                  <Cell value={row.pack_hasil_baik} onChange={(e) => handleOeeChange(row.rowId, 'pack_hasil_baik', e.target.value)} />
                  <Cell value={row.pack_s_qc} onChange={(e) => handleOeeChange(row.rowId, 'pack_s_qc', e.target.value)} />
                  <Cell value={row.pack_s_others} onChange={(e) => handleOeeChange(row.rowId, 'pack_s_others', e.target.value)} />
                  <Cell value={row.pack_fg} onChange={(e) => handleOeeChange(row.rowId, 'pack_fg', e.target.value)} />
                  <Cell value={row.pack_utuh} onChange={(e) => handleOeeChange(row.rowId, 'pack_utuh', e.target.value)} />
                  <Cell value={row.pack_jml_batch} onChange={(e) => handleOeeChange(row.rowId, 'pack_jml_batch', e.target.value)} />
                  <Cell value={row.tot_fg_shift} onChange={(e) => handleOeeChange(row.rowId, 'tot_fg_shift', e.target.value)} />

                  {/* Yield */}
                  <Cell value={row.yield_batch} onChange={(e) => handleOeeChange(row.rowId, 'yield_batch', e.target.value)} />
                  <Cell value={row.avg_yield_shift} onChange={(e) => handleOeeChange(row.rowId, 'avg_yield_shift', e.target.value)} />

                  {/* Available Time */}
                  <Cell value={row.av_sh} onChange={(e) => handleOeeChange(row.rowId, 'av_sh', e.target.value)} />
                  <Cell value={row.av_sm} onChange={(e) => handleOeeChange(row.rowId, 'av_sm', e.target.value)} />
                  <Cell value={row.av_eh} onChange={(e) => handleOeeChange(row.rowId, 'av_eh', e.target.value)} />
                  <Cell value={row.av_em} onChange={(e) => handleOeeChange(row.rowId, 'av_em', e.target.value)} />
                  <Cell value={row.av_sub} onChange={(e) => handleOeeChange(row.rowId, 'av_sub', e.target.value)} />

                  {/* Process Details - Machine Run & Line Clearance */}
                  <Cell value={row.run_sh} onChange={(e) => handleOeeChange(row.rowId, 'run_sh', e.target.value)} />
                  <Cell value={row.run_sm} onChange={(e) => handleOeeChange(row.rowId, 'run_sm', e.target.value)} />
                  <Cell value={row.run_eh} onChange={(e) => handleOeeChange(row.rowId, 'run_eh', e.target.value)} />
                  <Cell value={row.run_em} onChange={(e) => handleOeeChange(row.rowId, 'run_em', e.target.value)} />
                  <Cell value={row.run_sub} onChange={(e) => handleOeeChange(row.rowId, 'run_sub', e.target.value)} />
                  
                  <Cell value={row.clear_sh} onChange={(e) => handleOeeChange(row.rowId, 'clear_sh', e.target.value)} />
                  <Cell value={row.clear_sm} onChange={(e) => handleOeeChange(row.rowId, 'clear_sm', e.target.value)} />
                  <Cell value={row.clear_eh} onChange={(e) => handleOeeChange(row.rowId, 'clear_eh', e.target.value)} />
                  <Cell value={row.clear_em} onChange={(e) => handleOeeChange(row.rowId, 'clear_em', e.target.value)} />
                  <Cell value={row.clear_sub} onChange={(e) => handleOeeChange(row.rowId, 'clear_sub', e.target.value)} />

                  <Cell value={row.total_prep_clear} onChange={(e) => handleOeeChange(row.rowId, 'total_prep_clear', e.target.value)} />
                  <Cell value={row.jeda_batch} onChange={(e) => handleOeeChange(row.rowId, 'jeda_batch', e.target.value)} />
                  <Cell value={row.jeda_shift} onChange={(e) => handleOeeChange(row.rowId, 'jeda_shift', e.target.value)} />

                  {/* Kolom Aksi */}
                  <td className={`border border-black p-2 bg-white ${freezeRight}`}>
                    {row.original_id ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => actionOEE(row, 'update_reject_f')} className="bg-yellow-400 text-black px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Update</button>
                        <button onClick={() => actionOEE(row, 'delete_reject_f')} className="bg-red-500 text-white px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Hapus</button>
                      </div>
                    ) : (
                      <button onClick={() => actionOEE(row, 'submit_reject_f')} className="bg-emerald-500 text-white px-3 py-1.5 rounded font-bold shadow-sm active:scale-95 w-full text-[10px]">Kirim Baru</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* =========================================================
            2. SPREADSHEET DOWNTIME (ZONE F)
        ========================================================= */}
        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase">Downtime - Zone F</h2>
        </div>

        <div className="overflow-auto border-2 border-black shadow-lg custom-scrollbar max-h-[600px] relative">
          <table className="w-max border-collapse text-xs text-center whitespace-nowrap">
            <thead className="sticky top-0 z-40 text-black font-bold uppercase tracking-wider bg-gray-50">
              <tr>
                <th className={`border border-black px-4 py-3 bg-gray-100 ${freezeDT1} z-50`}>Tanggal</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Shift</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Grup</th>
                <th className="border border-black px-4 py-3 bg-gray-50">No. Batch</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Start (jam)</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Start (menit)</th>
                <th className="border border-black px-4 py-3 bg-gray-50">End (jam)</th>
                <th className="border border-black px-4 py-3 bg-gray-50">End (menit)</th>
                <th className="border border-black px-4 py-3 bg-gray-200">Sub Total</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Planned / Unplanned</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Root Cause</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Proses</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Unit</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Kasus</th>
                <th className={`border border-black px-4 py-3 bg-gray-50 ${freezeRight} z-50`}>AKSI</th>
              </tr>
            </thead>
            
            <tbody className="text-black font-mono">
              {dtRows.map((row) => (
                <tr key={row.rowId} className="hover:bg-gray-100">
                  <Cell value={row.tanggal} onChange={(e) => handleDtChange(row.rowId, 'tanggal', e.target.value)} className={freezeDT1} />
                  <Cell value={row.shift} onChange={(e) => handleDtChange(row.rowId, 'shift', e.target.value)} />
                  <Cell value={row.group} onChange={(e) => handleDtChange(row.rowId, 'group', e.target.value)} />
                  <Cell value={row.no_batch} onChange={(e) => handleDtChange(row.rowId, 'no_batch', e.target.value)} />
                  <Cell value={row.start_h} onChange={(e) => handleDtChange(row.rowId, 'start_h', e.target.value)} />
                  <Cell value={row.start_m} onChange={(e) => handleDtChange(row.rowId, 'start_m', e.target.value)} />
                  <Cell value={row.end_h} onChange={(e) => handleDtChange(row.rowId, 'end_h', e.target.value)} />
                  <Cell value={row.end_m} onChange={(e) => handleDtChange(row.rowId, 'end_m', e.target.value)} />
                  <Cell value={row.duration} onChange={(e) => handleDtChange(row.rowId, 'duration', e.target.value)} className="bg-gray-100 font-bold" />
                  <Cell value={row.plan_unplan} onChange={(e) => handleDtChange(row.rowId, 'plan_unplan', e.target.value)} />
                  <Cell value={row.root_cause} onChange={(e) => handleDtChange(row.rowId, 'root_cause', e.target.value)} />
                  <Cell value={row.proses} onChange={(e) => handleDtChange(row.rowId, 'proses', e.target.value)} />
                  <Cell value={row.unit} onChange={(e) => handleDtChange(row.rowId, 'unit', e.target.value)} />
                  <Cell value={row.kasus} onChange={(e) => handleDtChange(row.rowId, 'kasus', e.target.value)} className="min-w-[150px]" />
                  
                  <td className={`border border-black p-2 bg-white ${freezeRight}`}>
                    {row.original_id ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => actionDT(row, 'update_downtime_f')} className="bg-yellow-400 text-black px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Update</button>
                        <button onClick={() => actionDT(row, 'delete_downtime_f')} className="bg-red-500 text-white px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Hapus</button>
                      </div>
                    ) : (
                      <button onClick={() => actionDT(row, 'submit_downtime_f')} className="bg-emerald-500 text-white px-3 py-1.5 rounded font-bold shadow-sm active:scale-95 w-full text-[10px]">Kirim Baru</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}