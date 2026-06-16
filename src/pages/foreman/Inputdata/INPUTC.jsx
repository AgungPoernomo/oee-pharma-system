import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitOEEData, fetchTodayRejectC, fetchTodayDowntimeC } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

// ==========================================
// CONSTANTS & HELPERS
// ==========================================
const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };
const generateId = () => Math.random().toString(36).substr(2, 9);

const getEmptyOEE = () => ({
  rowId: generateId(), original_id: null, is_closing: false,
  no_batch: '', tanggal: '', shift: '', group: '', reject_blow: '', volume_botol: '',
  cnt_start: '', cnt_end: '', cnt_sub: '', utuh: '', jml_batch: '', total_cnt_shift: '',
  r_washing: '', r_vk: '', r_vl: '', r_nocap: '', r_sealnok: '', r_others: '', r_sub: '',
  s_ipc: '', s_others: '', s_sub: '', trf_st: '', total_good_shift: '',
  yield_batch: '', avg_yield_shift: '',
  pre_in: '', pre_bocor: '', pre_nocap: '', pre_vol: '', pre_thermo: '', pre_lain: '', pre_rej_total: '', pre_out: '',
  av_sh: '', av_sm: '', av_eh: '', av_em: '', av_sub: '', total_avail_shift: '',
  run_sh: '', run_sm: '', run_eh: '', run_em: '', run_sub: '',
  lc_sh: '', lc_sm: '', lc_eh: '', lc_em: '', lc_sub: '',
  total_prep_clear: '', jeda_batch: '', jeda_shift: ''
});

const getEmptyDT = () => ({
  rowId: generateId(), original_id: null,
  tanggal: '', shift: '', group: '', no_batch: '',
  start_h: '', start_m: '', end_h: '', end_m: '', duration: '',
  plan_unplan: '', root_cause: '', proses: '', unit: '', kasus: ''
});

// ==========================================
// AUTO-CALCULATION ENGINE (OEE C)
// ==========================================
const recalculateOEE = (rows) => {
  const v = (val) => (val === "" || val === null || val === undefined || isNaN(val)) ? 0 : parseFloat(val);
  const timeDiff = (sh, sm, eh, em) => {
    if (v(sh)===0 && v(sm)===0 && v(eh)===0 && v(em)===0 && (sh===""||sh===null)) return '';
    let start = v(sh)*60 + v(sm);
    let end = v(eh)*60 + v(em);
    let diff = end - start;
    return diff < 0 ? diff + (24*60) : diff;
  };

  // FASE 1: Kalkulasi Level Baris (Row-Level Math)
  let mapped = rows.map(row => {
    // Lewati baris yang masih kosong melompong
    if (!row.no_batch && !row.tanggal && !row.cnt_end) return row;

    const cnt_start = v(row.cnt_start);
    const cnt_end = v(row.cnt_end);
    const cnt_sub = cnt_end > 0 ? cnt_end - cnt_start : '';
    
    const teori = TEORI_BATCH[row.volume_botol] || 23076;
    const jml_batch = cnt_sub !== '' && teori > 0 ? (cnt_sub / teori).toFixed(2) : '';

    const r_sub = v(row.r_washing) + v(row.r_vk) + v(row.r_vl) + v(row.r_nocap) + v(row.r_sealnok) + v(row.r_others);
    const s_sub = v(row.s_ipc) + v(row.s_others);
    const trf_st = cnt_sub !== '' ? cnt_sub - r_sub - s_sub : '';
    const yield_batch = cnt_sub > 0 ? ((trf_st / cnt_sub) * 100).toFixed(2) : '';

    const pre_in = trf_st;
    const pre_rej_total = v(row.pre_bocor) + v(row.pre_nocap) + v(row.pre_vol) + v(row.pre_thermo) + v(row.pre_lain);
    const pre_out = pre_in !== '' ? pre_in - pre_rej_total : '';

    const av_sub = timeDiff(row.av_sh, row.av_sm, row.av_eh, row.av_em);
    const run_sub = timeDiff(row.run_sh, row.run_sm, row.run_eh, row.run_em);
    const lc_sub = timeDiff(row.lc_sh, row.lc_sm, row.lc_eh, row.lc_em);

    const total_prep_clear = lc_sub !== '' ? lc_sub : '';
    const jeda_batch = lc_sub !== '' ? lc_sub : '';

    return {
      ...row,
      cnt_sub, jml_batch, r_sub: r_sub||'', s_sub: s_sub||'', trf_st, yield_batch,
      pre_in, pre_rej_total: pre_rej_total||'', pre_out,
      av_sub, run_sub, lc_sub, total_prep_clear, jeda_batch,
      // Reset akumulasi shift sebelum dihitung ulang di Fase 2
      total_cnt_shift: '', total_good_shift: '', avg_yield_shift: '', total_avail_shift: '', jeda_shift: '', is_closing: false
    };
  });

  // FASE 2: Kalkulasi Level Shift (Smart Shift Detection)
  const groups = {};
  mapped.forEach((row, idx) => {
    if (!row.tanggal || !row.shift || !row.no_batch) return;
    const key = `${row.tanggal}_${row.shift}`;
    if (!groups[key]) {
      groups[key] = { rows: [], t_cnt: 0, t_good: 0, t_avail: 0, t_jeda: 0, sum_yld: 0, count_yld: 0 };
    }
    groups[key].rows.push(idx); // Simpan index baris
    groups[key].t_cnt += v(row.cnt_sub);
    groups[key].t_good += v(row.trf_st);
    groups[key].t_avail += v(row.av_sub);
    groups[key].t_jeda += v(row.jeda_batch);
    if (v(row.yield_batch) > 0) {
      groups[key].sum_yld += v(row.yield_batch);
      groups[key].count_yld += 1;
    }
  });

  // Temukan baris terakhir dari setiap kelompok (Akhir Shift)
  Object.values(groups).forEach(g => {
    if (g.rows.length > 0) {
      const closingIdx = g.rows[g.rows.length - 1]; // Baris paling bawah dari shift tersebut
      mapped[closingIdx].total_cnt_shift = g.t_cnt;
      mapped[closingIdx].total_good_shift = g.t_good;
      mapped[closingIdx].total_avail_shift = g.t_avail;
      mapped[closingIdx].jeda_shift = g.t_jeda;
      mapped[closingIdx].avg_yield_shift = g.count_yld > 0 ? (g.sum_yld / g.count_yld).toFixed(2) : 0;
      mapped[closingIdx].is_closing = true; // Tandai ke backend bahwa ini Akhir Shift
    }
  });

  return mapped;
};

// ==========================================
// KOMPONEN CELL INPUT
// ==========================================
const Cell = ({ value, onChange, className="", isHighlight=false }) => (
  <td className={`border border-black p-0 min-w-[80px] ${isHighlight ? 'bg-emerald-50 font-bold' : 'bg-white'} ${className}`}>
    <input 
      type="text" 
      value={value || ''} 
      onChange={onChange} 
      className="w-full h-full p-2 text-center text-xs font-mono outline-none focus:bg-emerald-100 focus:ring-1 focus:ring-emerald-500 transition-colors bg-transparent"
    />
  </td>
);

export default function InputC() {
  const { user } = useAuth();
  const [oeeRows, setOeeRows] = useState(Array.from({ length: 5 }, getEmptyOEE));
  const [dtRows, setDtRows] = useState(Array.from({ length: 5 }, getEmptyDT));

  // ==========================================
  // FETCH DATA
  // ==========================================
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [resOEE, resDT] = await Promise.all([
          fetchTodayRejectC(user),
          fetchTodayDowntimeC(user)
        ]);

        if (resOEE.status === 'success' && resOEE.data) {
          const mappedOEE = resOEE.data.map(row => ({
            rowId: generateId(), original_id: row[row.length - 1],
            no_batch: row[2], tanggal: row[3], shift: row[4], group: row[5], reject_blow: row[6], volume_botol: row[7],
            cnt_start: row[8], cnt_end: row[9], cnt_sub: row[10], utuh: row[11], jml_batch: row[12], total_cnt_shift: row[13],
            r_washing: row[14], r_vk: row[15], r_vl: row[16], r_nocap: row[17], r_sealnok: row[18], r_others: row[19], r_sub: row[20],
            s_ipc: row[21], s_others: row[22], s_sub: row[23], trf_st: row[24], total_good_shift: row[25],
            yield_batch: row[26], avg_yield_shift: row[27],
            pre_in: row[28], pre_bocor: row[29], pre_nocap: row[30], pre_vol: row[31], pre_thermo: row[32], pre_lain: row[33], pre_rej_total: row[34], pre_out: row[35],
            av_sh: row[36], av_sm: row[37], av_eh: row[38], av_em: row[39], av_sub: row[40], total_avail_shift: row[41],
            run_sh: row[59], run_sm: row[60], run_eh: row[61], run_em: row[62], run_sub: row[63],
            lc_sh: row[64], lc_sm: row[65], lc_eh: row[66], lc_em: row[67], lc_sub: row[68],
            total_prep_clear: row[69], jeda_batch: row[70], jeda_shift: row[71]
          }));
          // Kalkulasi ulang data yang baru ditarik bersama 5 baris kosong
          setOeeRows(recalculateOEE([...mappedOEE, ...Array.from({ length: 5 }, getEmptyOEE)]));
        }

        if (resDT.status === 'success' && resDT.data) {
          const mappedDT = resDT.data.map(row => ({
            rowId: generateId(), original_id: row[row.length - 1],
            tanggal: row[2], shift: row[3], group: row[4], no_batch: row[5],
            start_h: row[6], start_m: row[7], end_h: row[8], end_m: row[9], duration: row[10],
            plan_unplan: row[11], root_cause: row[12], proses: row[13], unit: row[14], kasus: row[15]
          }));
          setDtRows([...mappedDT, ...Array.from({ length: 5 }, getEmptyDT)]);
        }
      } catch (error) { toast.error("Gagal menarik data riwayat."); }
    };
    loadData();
  }, [user]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleOeeChange = (id, field, value) => {
    setOeeRows(prev => {
      const newRows = prev.map(r => r.rowId === id ? { ...r, [field]: value } : r);
      return recalculateOEE(newRows); // Tembak ke kalkulator otomatis
    });
  };

  const actionOEE = async (row, actionType) => {
    if ((actionType === 'submit_reject_c' || actionType === 'update_reject_c') && (!row.no_batch || !row.tanggal)) {
      toast.error("No Batch dan Tanggal wajib diisi!"); return;
    }
    const tId = toast.loading("Memproses data OEE...");
    try {
      const res = await submitOEEData({ action: actionType, data: row }, user);
      if (res.status === 'success') {
        toast.success(row.is_closing ? "Akhir Shift Tersimpan!" : "Berhasil!", { id: tId });
        if (actionType === 'delete_reject_c') {
          setOeeRows(prev => recalculateOEE(prev.filter(r => r.rowId !== row.rowId)));
        } else if (actionType === 'submit_reject_c') {
          setOeeRows(prev => recalculateOEE([...prev, getEmptyOEE()])); 
        }
      } else { toast.error(res.message, { id: tId }); }
    } catch (e) { toast.error("Koneksi gagal", { id: tId }); }
  };

  const handleDtChange = (id, field, value) => {
    setDtRows(prev => prev.map(r => r.rowId === id ? { ...r, [field]: value } : r));
  };

  const actionDT = async (row, actionType) => {
    if ((actionType === 'submit_downtime_c' || actionType === 'update_downtime_c') && (!row.tanggal)) {
      toast.error("Tanggal wajib diisi!"); return;
    }
    const tId = toast.loading("Memproses Downtime...");
    try {
      const res = await submitOEEData({ action: actionType, data: row }, user);
      if (res.status === 'success') {
        toast.success("Berhasil!", { id: tId });
        if (actionType === 'delete_downtime_c') setDtRows(prev => prev.filter(r => r.rowId !== row.rowId));
        else if (actionType === 'submit_downtime_c') setDtRows(prev => [...prev, getEmptyDT()]); 
      } else { toast.error(res.message, { id: tId }); }
    } catch (e) { toast.error("Koneksi gagal", { id: tId }); }
  };

  // KELAS UNTUK FREEZE (STICKY)
  const freezeLeft1 = "sticky left-0 z-20 min-w-[100px] max-w-[100px]";
  const freezeLeft2 = "sticky left-[100px] z-20 min-w-[100px] max-w-[100px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]";
  const freezeRight = "sticky right-0 z-20 min-w-[120px] max-w-[120px] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] bg-gray-50";

  return (
    <div className="min-h-screen bg-white p-8 text-black font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">
        
        {/* =========================================================
            1. SPREADSHEET OEE
        ========================================================= */}
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-wider uppercase">OEE - Zone C</h1>
        </div>

        <div className="overflow-auto border-2 border-black shadow-lg mb-12 custom-scrollbar max-h-[600px] relative">
          <table className="w-full border-collapse text-xs text-center whitespace-nowrap">
            <thead className="sticky top-0 z-40 text-black font-bold uppercase tracking-wider bg-gray-50">
              <tr>
                <th rowSpan="3" className={`border border-black px-4 py-2 align-middle bg-gray-100 ${freezeLeft1} z-50`}>No Batch</th>
                <th rowSpan="3" className={`border border-black px-4 py-2 align-middle bg-gray-100 ${freezeLeft2} z-50`}>Tanggal</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50">Shift</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50">Group</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50 text-red-600">Reject Blow</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50">Volume Botol</th>
                <th colSpan="6" className="border border-black px-4 py-2 bg-gray-200">Counter Filling</th>
                <th colSpan="7" className="border border-black px-4 py-2 bg-gray-200">Rejection Filling</th>
                <th colSpan="3" className="border border-black px-4 py-2 bg-gray-200">Samples</th>
                <th colSpan="2" className="border border-black px-4 py-2 bg-gray-200">Hasil Baik</th>
                <th colSpan="2" className="border border-black px-4 py-2 bg-gray-200">% Yield</th>
                <th colSpan="8" className="border border-black px-4 py-2 bg-gray-200">Reject Before Steril</th>
                <th colSpan="6" className="border border-black px-4 py-2 bg-gray-200">Available Time</th>
                <th colSpan="5" className="border border-black px-4 py-2 bg-gray-200">Run Time</th>
                <th colSpan="5" className="border border-black px-4 py-2 bg-gray-200">Line Clearance</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-200">Total Prep + Clear</th>
                <th colSpan="2" className="border border-black px-4 py-2 bg-gray-200">Jeda antar batch</th>
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50">AKSI</th>
              </tr>
              <tr>
                <th colSpan="3" className="border border-black px-4 py-2 bg-gray-50">Per cycle batch</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Utuh?</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-emerald-100">jumlah batch</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-emerald-200 text-emerald-800">TOTAL Cnt per shift</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Washing</th>
                <th colSpan="2" className="border border-black px-4 py-2 bg-gray-50">Filling</th>
                <th colSpan="2" className="border border-black px-4 py-2 bg-gray-50">Sealing</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Others/Bocor</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-red-100 text-red-800">Sub Total Fill-Seal</th>
                <th colSpan="2" className="border border-black px-4 py-2 bg-gray-50">Botol</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-blue-100 text-blue-800">Sub Total Samples</th>
                <th colSpan="2" className="border border-black px-4 py-2 bg-gray-50">Transfer to ST</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-emerald-100">per Batch</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-yellow-200 text-yellow-800">AVG per shift</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Input Before Steril</th>
                <th colSpan="6" className="border border-black px-4 py-2 bg-gray-50">Reject Before Steril</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-200">Output (masuk chamber)</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Start (Jam)</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">Start (Menit)</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">END (Jam)</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">END (Menit)</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-200">Sub total</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-purple-200 text-purple-800">TOTAL KESELURUHAN (Available) per Shift</th>
                <th colSpan="5" className="border border-black px-4 py-2 bg-gray-50">Filling</th>
                <th colSpan="5" className="border border-black px-4 py-2 bg-gray-50">CIP Minor</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-gray-50">per batch</th>
                <th rowSpan="2" className="border border-black px-4 py-2 align-middle bg-orange-200 text-orange-800">per shift</th>
              </tr>
              <tr>
                <th className="border border-black px-4 py-2 bg-gray-50">Start</th><th className="border border-black px-4 py-2 bg-gray-50">End</th><th className="border border-black px-4 py-2 bg-emerald-100">sub total</th>
                <th className="border border-black px-4 py-2 bg-gray-50">VK</th><th className="border border-black px-4 py-2 bg-gray-50">VL</th><th className="border border-black px-4 py-2 bg-gray-50">Tanpa Cap</th><th className="border border-black px-4 py-2 bg-gray-50">Seal NOT OK</th>
                <th className="border border-black px-4 py-2 bg-gray-50">IPC</th><th className="border border-black px-4 py-2 bg-gray-50">Others</th>
                <th className="border border-black px-4 py-2 bg-emerald-100">Sub Total Transfer to ST</th><th className="border border-black px-4 py-2 bg-emerald-200 text-emerald-800">TOTAL KESELURUHAN</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Reject Bocor</th><th className="border border-black px-4 py-2 bg-gray-50">Reject Tanpa Cap</th><th className="border border-black px-4 py-2 bg-gray-50">Reject Vol</th><th className="border border-black px-4 py-2 bg-gray-50">Reject Thermo</th><th className="border border-black px-4 py-2 bg-gray-50">Reject Lain-lain</th><th className="border border-black px-4 py-2 bg-red-100">TOTAL Reject Before Steril</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">Start (Menit)</th><th className="border border-black px-4 py-2 bg-gray-50">END (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">END (Menit)</th><th className="border border-black px-4 py-2 bg-gray-200">Sub total</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">Start (Menit)</th><th className="border border-black px-4 py-2 bg-gray-50">END (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">END (Menit)</th><th className="border border-black px-4 py-2 bg-gray-200">Sub total</th>
              </tr>
            </thead>
            
            <tbody className="text-black font-mono">
              {oeeRows.map((row) => (
                <tr key={row.rowId} className={`hover:bg-gray-100 ${row.is_closing ? 'border-b-4 border-emerald-500 bg-emerald-50/20' : ''}`}>
                  <Cell value={row.no_batch} onChange={(e) => handleOeeChange(row.rowId, 'no_batch', e.target.value)} className={freezeLeft1} />
                  <Cell value={row.tanggal} onChange={(e) => handleOeeChange(row.rowId, 'tanggal', e.target.value)} className={freezeLeft2} />
                  <Cell value={row.shift} onChange={(e) => handleOeeChange(row.rowId, 'shift', e.target.value)} />
                  <Cell value={row.group} onChange={(e) => handleOeeChange(row.rowId, 'group', e.target.value)} />
                  <Cell value={row.reject_blow} onChange={(e) => handleOeeChange(row.rowId, 'reject_blow', e.target.value)} />
                  <Cell value={row.volume_botol} onChange={(e) => handleOeeChange(row.rowId, 'volume_botol', e.target.value)} />
                  <Cell value={row.cnt_start} onChange={(e) => handleOeeChange(row.rowId, 'cnt_start', e.target.value)} />
                  <Cell value={row.cnt_end} onChange={(e) => handleOeeChange(row.rowId, 'cnt_end', e.target.value)} />
                  <Cell value={row.cnt_sub} onChange={(e) => handleOeeChange(row.rowId, 'cnt_sub', e.target.value)} isHighlight />
                  <Cell value={row.utuh} onChange={(e) => handleOeeChange(row.rowId, 'utuh', e.target.value)} />
                  <Cell value={row.jml_batch} onChange={(e) => handleOeeChange(row.rowId, 'jml_batch', e.target.value)} isHighlight />
                  
                  <Cell value={row.total_cnt_shift} onChange={(e) => handleOeeChange(row.rowId, 'total_cnt_shift', e.target.value)} className={row.is_closing ? "bg-emerald-200 font-bold" : ""} />
                  
                  <Cell value={row.r_washing} onChange={(e) => handleOeeChange(row.rowId, 'r_washing', e.target.value)} />
                  <Cell value={row.r_vk} onChange={(e) => handleOeeChange(row.rowId, 'r_vk', e.target.value)} />
                  <Cell value={row.r_vl} onChange={(e) => handleOeeChange(row.rowId, 'r_vl', e.target.value)} />
                  <Cell value={row.r_nocap} onChange={(e) => handleOeeChange(row.rowId, 'r_nocap', e.target.value)} />
                  <Cell value={row.r_sealnok} onChange={(e) => handleOeeChange(row.rowId, 'r_sealnok', e.target.value)} />
                  <Cell value={row.r_others} onChange={(e) => handleOeeChange(row.rowId, 'r_others', e.target.value)} />
                  <Cell value={row.r_sub} onChange={(e) => handleOeeChange(row.rowId, 'r_sub', e.target.value)} className="bg-red-50" />
                  
                  <Cell value={row.s_ipc} onChange={(e) => handleOeeChange(row.rowId, 's_ipc', e.target.value)} />
                  <Cell value={row.s_others} onChange={(e) => handleOeeChange(row.rowId, 's_others', e.target.value)} />
                  <Cell value={row.s_sub} onChange={(e) => handleOeeChange(row.rowId, 's_sub', e.target.value)} className="bg-blue-50" />
                  
                  <Cell value={row.trf_st} onChange={(e) => handleOeeChange(row.rowId, 'trf_st', e.target.value)} isHighlight />
                  <Cell value={row.total_good_shift} onChange={(e) => handleOeeChange(row.rowId, 'total_good_shift', e.target.value)} className={row.is_closing ? "bg-emerald-200 font-bold" : ""} />
                  
                  <Cell value={row.yield_batch} onChange={(e) => handleOeeChange(row.rowId, 'yield_batch', e.target.value)} className="bg-yellow-50" />
                  <Cell value={row.avg_yield_shift} onChange={(e) => handleOeeChange(row.rowId, 'avg_yield_shift', e.target.value)} className={row.is_closing ? "bg-yellow-200 font-bold" : ""} />
                  
                  <Cell value={row.pre_in} onChange={(e) => handleOeeChange(row.rowId, 'pre_in', e.target.value)} />
                  <Cell value={row.pre_bocor} onChange={(e) => handleOeeChange(row.rowId, 'pre_bocor', e.target.value)} />
                  <Cell value={row.pre_nocap} onChange={(e) => handleOeeChange(row.rowId, 'pre_nocap', e.target.value)} />
                  <Cell value={row.pre_vol} onChange={(e) => handleOeeChange(row.rowId, 'pre_vol', e.target.value)} />
                  <Cell value={row.pre_thermo} onChange={(e) => handleOeeChange(row.rowId, 'pre_thermo', e.target.value)} />
                  <Cell value={row.pre_lain} onChange={(e) => handleOeeChange(row.rowId, 'pre_lain', e.target.value)} />
                  <Cell value={row.pre_rej_total} onChange={(e) => handleOeeChange(row.rowId, 'pre_rej_total', e.target.value)} className="bg-red-50" />
                  <Cell value={row.pre_out} onChange={(e) => handleOeeChange(row.rowId, 'pre_out', e.target.value)} />
                  
                  <Cell value={row.av_sh} onChange={(e) => handleOeeChange(row.rowId, 'av_sh', e.target.value)} />
                  <Cell value={row.av_sm} onChange={(e) => handleOeeChange(row.rowId, 'av_sm', e.target.value)} />
                  <Cell value={row.av_eh} onChange={(e) => handleOeeChange(row.rowId, 'av_eh', e.target.value)} />
                  <Cell value={row.av_em} onChange={(e) => handleOeeChange(row.rowId, 'av_em', e.target.value)} />
                  <Cell value={row.av_sub} onChange={(e) => handleOeeChange(row.rowId, 'av_sub', e.target.value)} className="bg-gray-100" />
                  <Cell value={row.total_avail_shift} onChange={(e) => handleOeeChange(row.rowId, 'total_avail_shift', e.target.value)} className={row.is_closing ? "bg-purple-200 font-bold" : ""} />
                  
                  <Cell value={row.run_sh} onChange={(e) => handleOeeChange(row.rowId, 'run_sh', e.target.value)} />
                  <Cell value={row.run_sm} onChange={(e) => handleOeeChange(row.rowId, 'run_sm', e.target.value)} />
                  <Cell value={row.run_eh} onChange={(e) => handleOeeChange(row.rowId, 'run_eh', e.target.value)} />
                  <Cell value={row.run_em} onChange={(e) => handleOeeChange(row.rowId, 'run_em', e.target.value)} />
                  <Cell value={row.run_sub} onChange={(e) => handleOeeChange(row.rowId, 'run_sub', e.target.value)} className="bg-gray-100" />
                  
                  <Cell value={row.lc_sh} onChange={(e) => handleOeeChange(row.rowId, 'lc_sh', e.target.value)} />
                  <Cell value={row.lc_sm} onChange={(e) => handleOeeChange(row.rowId, 'lc_sm', e.target.value)} />
                  <Cell value={row.lc_eh} onChange={(e) => handleOeeChange(row.rowId, 'lc_eh', e.target.value)} />
                  <Cell value={row.lc_em} onChange={(e) => handleOeeChange(row.rowId, 'lc_em', e.target.value)} />
                  <Cell value={row.lc_sub} onChange={(e) => handleOeeChange(row.rowId, 'lc_sub', e.target.value)} className="bg-gray-100" />
                  
                  <Cell value={row.total_prep_clear} onChange={(e) => handleOeeChange(row.rowId, 'total_prep_clear', e.target.value)} className="bg-gray-100" />
                  <Cell value={row.jeda_batch} onChange={(e) => handleOeeChange(row.rowId, 'jeda_batch', e.target.value)} />
                  <Cell value={row.jeda_shift} onChange={(e) => handleOeeChange(row.rowId, 'jeda_shift', e.target.value)} className={row.is_closing ? "bg-orange-200 font-bold" : ""} />
                  
                  <td className={`border border-black p-2 bg-white ${freezeRight}`}>
                    {row.original_id ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => actionOEE(row, 'update_reject_c')} className="bg-yellow-400 text-black px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Update</button>
                        <button onClick={() => actionOEE(row, 'delete_reject_c')} className="bg-red-500 text-white px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Hapus</button>
                      </div>
                    ) : (
                      <button onClick={() => actionOEE(row, 'submit_reject_c')} className="bg-emerald-500 text-white px-3 py-1.5 rounded font-bold shadow-sm active:scale-95 w-full text-[10px]">Kirim</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* =========================================================
            2. SPREADSHEET DOWNTIME
        ========================================================= */}
        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase">Downtime - Zone C</h2>
        </div>

        <div className="overflow-auto border-2 border-black shadow-lg custom-scrollbar max-h-[600px] relative">
          <table className="w-full border-collapse text-xs text-center whitespace-nowrap">
            <thead className="sticky top-0 z-40 text-black font-bold uppercase tracking-wider bg-gray-50">
              <tr>
                <th className={`border border-black px-4 py-3 bg-gray-100 ${freezeLeft1} z-50`}>Tanggal</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Shift</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Grup</th>
                <th className="border border-black px-4 py-3 bg-gray-50">No. Batch</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Start (jam)</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Start (menit)</th>
                <th className="border border-black px-4 py-3 bg-gray-50">End (jam)</th>
                <th className="border border-black px-4 py-3 bg-gray-50">End (menit)</th>
                <th className="border border-black px-4 py-3 bg-gray-200">Durasi (m)</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Planned / Unplanned</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Root Cause</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Proses</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Unit</th>
                <th className="border border-black px-4 py-3 bg-gray-50">Kasus</th>
                <th className="border border-black px-4 py-3 bg-gray-50 min-w-[120px]">AKSI</th>
              </tr>
            </thead>
            
            <tbody className="text-black font-mono">
              {dtRows.map((row) => (
                <tr key={row.rowId} className="hover:bg-gray-100">
                  <Cell value={row.tanggal} onChange={(e) => handleDtChange(row.rowId, 'tanggal', e.target.value)} className={freezeLeft1} />
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
                        <button onClick={() => actionDT(row, 'update_downtime_c')} className="bg-yellow-400 text-black px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Update</button>
                        <button onClick={() => actionDT(row, 'delete_downtime_c')} className="bg-red-500 text-white px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Hapus</button>
                      </div>
                    ) : (
                      <button onClick={() => actionDT(row, 'submit_downtime_c')} className="bg-emerald-500 text-white px-3 py-1.5 rounded font-bold shadow-sm active:scale-95 w-full text-[10px]">Kirim</button>
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