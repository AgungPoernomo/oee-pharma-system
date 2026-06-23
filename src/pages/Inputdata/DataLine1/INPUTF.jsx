import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitOEEData, fetchTodayRejectF, fetchTodayDowntimeF, fetchValidationData } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };
const TEORI_YIELD = 21923;
const SHIFTS = ["1", "2", "3"];
const GROUPS = ["A", "B", "C", "D"];
const VOLUMES = ["25 ML", "100 ML", "250 ML", "500 ML", "1000 ML"];

const generateId = () => Math.random().toString(36).substr(2, 9);

const getEmptyOEE = () => ({
  rowId: generateId(), original_id: null, is_closing: false,
  no_batch: '', lot_no: '', tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', volume_botol: '500 ML',
  steril_in: '', steril_bocor: '', steril_h_patah_ring: '', steril_h_patah_lidah: '', steril_h_patah_leleh: '', steril_no_hanger: '', steril_rej_total: '', steril_sample: '', steril_out: '',
  vi_start: '', vi_end: '', vi_sub: '', tot_vi_shift: '',
  vi_partikel: '', vi_kotik: '', vi_rej_total: '', vi_hasil_baik: '', vi_sample_qc: '', vi_tf_packing: '',
  pack_reject: '', pack_hasil_baik: '', pack_s_qc: '', pack_s_others: '', pack_fg: '', pack_utuh: 'Y', pack_jml_batch: '', tot_fg_shift: '',
  yield_batch: '', avg_yield_shift: '',
  av_sh: '', av_sm: '', av_eh: '', av_em: '', av_sub: '', total_avail_shift: '',
  run_sh: '', run_sm: '', run_eh: '', run_em: '', run_sub: '',
  clear_sh: '', clear_sm: '', clear_eh: '', clear_em: '', clear_sub: '',
  process_total: '', total_prep_clear: '', jeda_batch: '', jeda_shift: ''
});

const getEmptyDT = () => ({
  rowId: generateId(), original_id: null,
  tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', no_batch: '',
  start_h: '', start_m: '', end_h: '', end_m: '', duration: '',
  plan_unplan: 'Unplanned', root_cause: '', proses: '', unit: '', kasus: ''
});

const OEE_COLS = ['no_batch', 'lot_no', 'tanggal', 'shift', 'group', 'volume_botol', 'steril_in', 'steril_bocor', 'steril_h_patah_ring', 'steril_h_patah_lidah', 'steril_h_patah_leleh', 'steril_no_hanger', 'steril_rej_total', 'steril_sample', 'steril_out', 'vi_start', 'vi_end', 'vi_sub', 'tot_vi_shift', 'vi_partikel', 'vi_kotik', 'vi_rej_total', 'vi_hasil_baik', 'vi_sample_qc', 'vi_tf_packing', 'pack_reject', 'pack_hasil_baik', 'pack_s_qc', 'pack_s_others', 'pack_fg', 'pack_utuh', 'pack_jml_batch', 'tot_fg_shift', 'yield_batch', 'avg_yield_shift', 'av_sh', 'av_sm', 'av_eh', 'av_em', 'av_sub', 'total_avail_shift', 'run_sh', 'run_sm', 'run_eh', 'run_em', 'run_sub', 'clear_sh', 'clear_sm', 'clear_eh', 'clear_em', 'clear_sub', 'process_total', 'total_prep_clear', 'jeda_batch', 'jeda_shift'];
const DT_COLS = ['tanggal', 'shift', 'group', 'no_batch', 'start_h', 'start_m', 'end_h', 'end_m', 'duration', 'plan_unplan', 'root_cause', 'proses', 'unit', 'kasus'];

const recalculateOEE_F = (rows) => {
  const v = (val) => (val === "" || val === null || val === undefined || isNaN(val)) ? 0 : parseFloat(val);
  const timeDiff = (sh, sm, eh, em) => {
    if (v(sh)===0 && v(sm)===0 && v(eh)===0 && v(em)===0 && (sh===""||sh===null)) return '';
    let start = v(sh)*60 + v(sm);
    let end = v(eh)*60 + v(em);
    let diff = end - start;
    return diff < 0 ? diff + (24*60) : diff;
  };

  let mapped = rows.map(row => {
    if (!row.no_batch && !row.lot_no && row.original_id === null) return row;

    const steril_rej_total = v(row.steril_bocor) + v(row.steril_h_patah_ring) + v(row.steril_h_patah_lidah) + v(row.steril_h_patah_leleh) + v(row.steril_no_hanger);
    const steril_out = row.steril_in !== '' ? v(row.steril_in) - steril_rej_total - v(row.steril_sample) : '';

    const vi_sub = row.vi_end !== '' ? v(row.vi_end) - v(row.vi_start) : '';
    const vi_rej_total = v(row.vi_partikel) + v(row.vi_kotik);
    const vi_hasil_baik = vi_sub !== '' ? vi_sub - vi_rej_total : '';
    const vi_tf_packing = vi_hasil_baik !== '' ? vi_hasil_baik - v(row.vi_sample_qc) : '';

    const pack_hasil_baik = vi_tf_packing !== '' ? vi_tf_packing - v(row.pack_reject) : '';
    const pack_fg = pack_hasil_baik !== '' ? pack_hasil_baik - (v(row.pack_s_qc) + v(row.pack_s_others)) : '';
    
    const volKey = row.volume_botol || "500 ML";
    const pack_jml_batch = pack_fg !== '' ? (pack_fg / (TEORI_BATCH[volKey] || 23076)).toFixed(2) : '';
    const yield_batch = pack_fg > 0 ? ((pack_fg / TEORI_YIELD) * 100).toFixed(2) : '';

    const av_sub = timeDiff(row.av_sh, row.av_sm, row.av_eh, row.av_em);
    const run_sub = timeDiff(row.run_sh, row.run_sm, row.run_eh, row.run_em);
    const clear_sub = timeDiff(row.clear_sh, row.clear_sm, row.clear_eh, row.clear_em);

    const process_total = (run_sub !== '' || clear_sub !== '') ? v(run_sub) + v(clear_sub) : '';
    const total_prep_clear = clear_sub; 
    const jeda_batch = clear_sub; 

    return {
      ...row,
      steril_rej_total: steril_rej_total || '', steril_out,
      vi_sub, vi_rej_total: vi_rej_total || '', vi_hasil_baik, vi_tf_packing,
      pack_hasil_baik, pack_fg, pack_jml_batch, yield_batch,
      av_sub, run_sub, clear_sub, process_total, total_prep_clear, jeda_batch,
      tot_vi_shift: '', tot_fg_shift: '', avg_yield_shift: '', total_avail_shift: '', jeda_shift: '', is_closing: false
    };
  });

  const groups = {};
  mapped.forEach((row, idx) => {
    if (!row.tanggal || !row.shift || !row.no_batch) return;
    const key = `${row.tanggal}_${row.shift}`;
    if (!groups[key]) groups[key] = { rows: [], t_vi: 0, t_fg: 0, t_avail: 0, t_jeda: 0, sum_yld: 0, count_yld: 0 };
    groups[key].rows.push(idx);
    groups[key].t_vi += v(row.vi_sub);
    groups[key].t_fg += v(row.pack_fg);
    groups[key].t_avail += v(row.av_sub);
    groups[key].t_jeda += v(row.jeda_batch);
    if (v(row.yield_batch) > 0) { groups[key].sum_yld += v(row.yield_batch); groups[key].count_yld += 1; }
  });

  Object.values(groups).forEach(g => {
    if (g.rows.length > 0) {
      const closingIdx = g.rows[g.rows.length - 1];
      mapped[closingIdx].tot_vi_shift = g.t_vi;
      mapped[closingIdx].tot_fg_shift = g.t_fg;
      mapped[closingIdx].total_avail_shift = g.t_avail;
      mapped[closingIdx].jeda_shift = g.t_jeda;
      mapped[closingIdx].avg_yield_shift = g.count_yld > 0 ? (g.sum_yld / g.count_yld).toFixed(2) : 0;
      mapped[closingIdx].is_closing = true;
    }
  });

  return mapped;
};

const Cell = ({ 
  value, onChange, className = "", readOnly = false, type = "text", options = [], 
  id, rIdx, cIdx, tableType, colsArray, onKeyDown, onMouseEnter, onMouseDownHandle
}) => {
  const baseClass = "w-full h-full p-2 text-center text-xs font-mono outline-none transition-colors bg-transparent";
  
  const content = () => {
    if (readOnly) {
      return <input id={id} readOnly value={value || ''} tabIndex={-1} className={`${baseClass} text-slate-400 bg-slate-100 cursor-not-allowed`} />;
    }
    if (type === 'select') {
      return (
        <select id={id} value={value || ''} onChange={onChange} onKeyDown={(e) => onKeyDown(e, rIdx, cIdx, tableType, colsArray)} className={`${baseClass} focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer`}>
            <option value="">-</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <input 
        id={id} type={type} value={value || ''} onChange={onChange} 
        onKeyDown={(e) => onKeyDown(e, rIdx, cIdx, tableType, colsArray)}
        className={`${baseClass} focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500`}
      />
    );
  }

  return (
    <td className={`border border-black p-0 min-w-[80px] relative group bg-white ${className}`} onMouseEnter={() => onMouseEnter(rIdx, colsArray[cIdx], tableType)}>
      {content()}
      {!readOnly && (
        <div 
          className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-600 cursor-crosshair opacity-0 group-focus-within:opacity-100 border border-white"
          onMouseDown={(e) => onMouseDownHandle(e, value, colsArray[cIdx], rIdx, tableType)}
        />
      )}
    </td>
  );
}

export default function InputF() {
  const { user } = useAuth();
  
  const [oeeRows, setOeeRows] = useState(Array.from({ length: 15 }, getEmptyOEE));
  const [dtRows, setDtRows] = useState(Array.from({ length: 15 }, getEmptyDT));
  const [masterData, setMasterData] = useState({ rc: [], proses: [], unit: [] });
  
  const [dragState, setDragState] = useState({ isDragging: false, val: null, col: null, startIdx: null, type: null });

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [resOEE, resDT, resValid] = await Promise.all([
          fetchTodayRejectF(user),
          fetchTodayDowntimeF(user),
          fetchValidationData()
        ]);

        if (resValid.status === 'success') {
          setMasterData({ rc: resValid.data['RC_F'] || [], proses: resValid.data['DT_Proses_F'] || [], raw: resValid.data });
        }

        if (resOEE.status === 'success' && resOEE.data) {
          const reversedOEE = [...resOEE.data].reverse();
          const mappedOEE = reversedOEE.map(row => ({
            rowId: generateId(), original_id: row[row.length - 1],
            no_batch: row[2], lot_no: row[3], tanggal: row[4], shift: row[5], group: row[6], volume_botol: row[7],
            steril_in: row[8], steril_bocor: row[9], steril_h_patah_ring: row[10], steril_h_patah_lidah: row[11], steril_h_patah_leleh: row[12], steril_no_hanger: row[13], steril_rej_total: row[14], steril_sample: row[15], steril_out: row[16],
            vi_start: row[17], vi_end: row[18], vi_sub: row[19], tot_vi_shift: row[20],
            vi_partikel: row[21], vi_kotik: row[22], vi_rej_total: row[23], vi_hasil_baik: row[24], vi_sample_qc: row[25], vi_tf_packing: row[26],
            pack_reject: row[27], pack_hasil_baik: row[28], pack_s_qc: row[29], pack_s_others: row[30], pack_fg: row[31], pack_utuh: row[32], pack_jml_batch: row[33], tot_fg_shift: row[34],
            yield_batch: row[35], avg_yield_shift: row[36],
            av_sh: row[37], av_sm: row[38], av_eh: row[39], av_em: row[40], av_sub: row[41], total_avail_shift: row[42],
            run_sh: row[48], run_sm: row[49], run_eh: row[50], run_em: row[51], run_sub: row[52],
            clear_sh: row[58], clear_sm: row[59], clear_eh: row[60], clear_em: row[61], clear_sub: row[62], process_total: row[63],
            total_prep_clear: row[64], jeda_batch: row[65], jeda_shift: row[66]
          }));
          setOeeRows(recalculateOEE_F([...mappedOEE, ...Array.from({ length: 15 }, getEmptyOEE)]));
        }

        if (resDT.status === 'success' && resDT.data) {
          const reversedDT = [...resDT.data].reverse();
          const mappedDT = reversedDT.map(row => ({
            rowId: generateId(), original_id: row[row.length - 1],
            tanggal: row[2], shift: row[3], group: row[4], no_batch: row[5],
            start_h: row[7], start_m: row[8], end_h: row[9], end_m: row[10], duration: row[11],
            plan_unplan: row[12], root_cause: row[13], proses: row[14], unit: row[15], kasus: row[16]
          }));
          setDtRows([...mappedDT, ...Array.from({ length: 15 }, getEmptyDT)]);
        }
      } catch (error) { toast.error("Gagal menarik data."); }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    const handleMouseUp = () => setDragState({ isDragging: false, val: null, col: null, startIdx: null, type: null });
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseDownHandle = (e, val, col, startIdx, type) => {
    e.preventDefault();
    setDragState({ isDragging: true, val, col, startIdx, type });
  };

  const handleMouseEnter = (idx, col, type) => {
    if (dragState.isDragging && dragState.col === col && dragState.type === type) {
      if (type === 'oee') handleOeeChange(oeeRows[idx].rowId, col, dragState.val);
      else handleDtChange(dtRows[idx].rowId, col, dragState.val);
    }
  };

  const handleKeyDown = (e, rIdx, cIdx, tableType, colsArray) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    
    const isAtStart = e.target.selectionStart === 0;
    const isAtEnd = e.target.selectionEnd === e.target.value.length;
    
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || (e.key === 'ArrowLeft' && isAtStart) || (e.key === 'ArrowRight' && isAtEnd)) {
      e.preventDefault();
      let nextR = rIdx, nextC = cIdx;
      if (e.key === 'ArrowUp') nextR = Math.max(0, rIdx - 1);
      if (e.key === 'ArrowDown') nextR = Math.min((tableType === 'oee' ? oeeRows : dtRows).length - 1, rIdx + 1);
      if (e.key === 'ArrowLeft') nextC = Math.max(0, cIdx - 1);
      if (e.key === 'ArrowRight') nextC = Math.min(colsArray.length - 1, cIdx + 1);

      const nextId = `${tableType}-${nextR}-${colsArray[nextC]}`;
      const el = document.getElementById(nextId);
      if (el) {
        el.focus();
        if (el.tagName === 'INPUT') el.select();
      }
    }
  };

  const handleOeeChange = (id, field, value) => {
    setOeeRows(prev => recalculateOEE_F(prev.map(r => r.rowId === id ? { ...r, [field]: value } : r)));
  };

  const actionOEE = async (row, actionType) => {
    if ((actionType === 'submit_reject_f' || actionType === 'update_reject_f') && (!row.no_batch || !row.lot_no || !row.tanggal)) {
      toast.error("Batch, Lot, dan Tanggal wajib!"); return;
    }
    const tId = toast.loading("Memproses...");
    try {
      const res = await submitOEEData({ action: actionType, data: row }, user);
      if (res.status === 'success') {
        toast.success(row.is_closing ? "Akhir Shift Tersimpan!" : "Berhasil!", { id: tId });
        if (actionType === 'delete_reject_f') setOeeRows(prev => recalculateOEE_F(prev.filter(r => r.rowId !== row.rowId)));
        else if (actionType === 'submit_reject_f') {
          setOeeRows(prev => prev.map(r => r.rowId === row.rowId ? { ...r, original_id: "saved" } : r));
          setOeeRows(prev => recalculateOEE_F([...prev, getEmptyOEE()])); 
        }
      } else toast.error(res.message, { id: tId });
    } catch (e) { toast.error("Koneksi gagal", { id: tId }); }
  };

  const handleDtChange = (id, field, value) => {
    setDtRows(prev => {
      let newRows = prev.map(r => r.rowId === id ? { ...r, [field]: value } : r);
      if(field === 'start_h' || field === 'start_m' || field === 'end_h' || field === 'end_m') {
        newRows = newRows.map(r => {
          if (r.rowId === id && r.start_h && r.start_m && r.end_h && r.end_m) {
            let start = (parseInt(r.start_h)*60) + parseInt(r.start_m);
            let end = (parseInt(r.end_h)*60) + parseInt(r.end_m);
            let d = end - start;
            r.duration = d < 0 ? d + (24*60) : d;
          }
          return r;
        });
      }
      return newRows;
    });
  };

  const actionDT = async (row, actionType) => {
    if ((actionType === 'submit_downtime_f' || actionType === 'update_downtime_f') && (!row.tanggal || !row.no_batch)) {
      toast.error("Tanggal dan Batch wajib!"); return;
    }
    const tId = toast.loading("Memproses...");
    try {
      const res = await submitOEEData({ action: actionType, data: row }, user);
      if (res.status === 'success') {
        toast.success("Berhasil!", { id: tId });
        if (actionType === 'delete_downtime_f') setDtRows(prev => prev.filter(r => r.rowId !== row.rowId));
        else if (actionType === 'submit_downtime_f') {
          setDtRows(prev => prev.map(r => r.rowId === row.rowId ? { ...r, original_id: "saved" } : r));
          setDtRows(prev => [...prev, getEmptyDT()]); 
        }
      } else toast.error(res.message, { id: tId });
    } catch (e) { toast.error("Koneksi gagal", { id: tId }); }
  };

  const getUnits = (prosesVal) => masterData.raw ? (masterData.raw[`Unit_${prosesVal}`] || []) : [];

  const freezeOEE1 = "sticky left-0 z-20 min-w-[90px] max-w-[90px]";
  const freezeOEE2 = "sticky left-[90px] z-20 min-w-[90px] max-w-[90px]";
  const freezeOEE3 = "sticky left-[180px] z-20 min-w-[100px] max-w-[100px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]";
  
  const freezeDT1 = "sticky left-0 z-20 min-w-[100px] max-w-[100px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]";

  return (
    <div className="min-h-screen bg-white p-8 text-black font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">
        
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-wider uppercase">OEE Line 1 - Zone F</h1>
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
                
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50 min-w-[120px] max-w-[120px]">AKSI</th>
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
                <th className="border border-black px-4 py-2 bg-yellow-100">per Batch</th><th className="border border-black px-4 py-2 bg-yellow-200 text-yellow-800">AVERAGE per shift</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">Start (Menit)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Menit)</th><th className="border border-black px-4 py-2 bg-purple-100 text-purple-800">Sub Total</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">Start (Menit)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Menit)</th><th className="border border-black px-4 py-2 bg-cyan-100 text-cyan-800">Sub Total</th>
                <th className="border border-black px-4 py-2 bg-gray-50">Start (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">Start (Menit)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Jam)</th><th className="border border-black px-4 py-2 bg-gray-50">End (Menit)</th><th className="border border-black px-4 py-2 bg-sky-100 text-sky-800">Sub Total</th>
                <th className="border border-black px-4 py-2 bg-gray-50">per batch</th><th className="border border-black px-4 py-2 bg-orange-200 text-orange-800">per shift</th>
              </tr>
            </thead>
            
            <tbody className="text-black font-mono">
              {oeeRows.map((row, i) => (
                <tr key={row.rowId} className={`hover:bg-gray-100 ${row.is_closing ? 'border-b-4 border-emerald-500 bg-emerald-50/20' : ''}`}>
                  <Cell id={`oee-${i}-${OEE_COLS[0]}`} rIdx={i} cIdx={0} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.no_batch} onChange={(e) => handleOeeChange(row.rowId, 'no_batch', e.target.value)} className={freezeOEE1} />
                  <Cell id={`oee-${i}-${OEE_COLS[1]}`} rIdx={i} cIdx={1} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.lot_no} onChange={(e) => handleOeeChange(row.rowId, 'lot_no', e.target.value)} className={freezeOEE2} />
                  <Cell id={`oee-${i}-${OEE_COLS[2]}`} rIdx={i} cIdx={2} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.tanggal} onChange={(e) => handleOeeChange(row.rowId, 'tanggal', e.target.value)} className={freezeOEE3} />
                  <Cell id={`oee-${i}-${OEE_COLS[3]}`} rIdx={i} cIdx={3} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.shift} onChange={(e) => handleOeeChange(row.rowId, 'shift', e.target.value)} type="select" options={SHIFTS} />
                  <Cell id={`oee-${i}-${OEE_COLS[4]}`} rIdx={i} cIdx={4} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.group} onChange={(e) => handleOeeChange(row.rowId, 'group', e.target.value)} type="select" options={GROUPS} />
                  <Cell id={`oee-${i}-${OEE_COLS[5]}`} rIdx={i} cIdx={5} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.volume_botol} onChange={(e) => handleOeeChange(row.rowId, 'volume_botol', e.target.value)} type="select" options={VOLUMES} />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[6]}`} rIdx={i} cIdx={6} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_in} onChange={(e) => handleOeeChange(row.rowId, 'steril_in', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[7]}`} rIdx={i} cIdx={7} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_bocor} onChange={(e) => handleOeeChange(row.rowId, 'steril_bocor', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[8]}`} rIdx={i} cIdx={8} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_h_patah_ring} onChange={(e) => handleOeeChange(row.rowId, 'steril_h_patah_ring', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[9]}`} rIdx={i} cIdx={9} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_h_patah_lidah} onChange={(e) => handleOeeChange(row.rowId, 'steril_h_patah_lidah', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[10]}`} rIdx={i} cIdx={10} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_h_patah_leleh} onChange={(e) => handleOeeChange(row.rowId, 'steril_h_patah_leleh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[11]}`} rIdx={i} cIdx={11} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_no_hanger} onChange={(e) => handleOeeChange(row.rowId, 'steril_no_hanger', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[12]}`} rIdx={i} cIdx={12} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_rej_total} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[13]}`} rIdx={i} cIdx={13} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_sample} onChange={(e) => handleOeeChange(row.rowId, 'steril_sample', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[14]}`} rIdx={i} cIdx={14} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.steril_out} readOnly />

                  <Cell id={`oee-${i}-${OEE_COLS[15]}`} rIdx={i} cIdx={15} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_start} onChange={(e) => handleOeeChange(row.rowId, 'vi_start', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[16]}`} rIdx={i} cIdx={16} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_end} onChange={(e) => handleOeeChange(row.rowId, 'vi_end', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[17]}`} rIdx={i} cIdx={17} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_sub} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[18]}`} rIdx={i} cIdx={18} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.tot_vi_shift} readOnly />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[19]}`} rIdx={i} cIdx={19} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_partikel} onChange={(e) => handleOeeChange(row.rowId, 'vi_partikel', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[20]}`} rIdx={i} cIdx={20} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_kotik} onChange={(e) => handleOeeChange(row.rowId, 'vi_kotik', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[21]}`} rIdx={i} cIdx={21} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_rej_total} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[22]}`} rIdx={i} cIdx={22} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_hasil_baik} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[23]}`} rIdx={i} cIdx={23} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_sample_qc} onChange={(e) => handleOeeChange(row.rowId, 'vi_sample_qc', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[24]}`} rIdx={i} cIdx={24} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.vi_tf_packing} readOnly />

                  <Cell id={`oee-${i}-${OEE_COLS[25]}`} rIdx={i} cIdx={25} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pack_reject} onChange={(e) => handleOeeChange(row.rowId, 'pack_reject', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[26]}`} rIdx={i} cIdx={26} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pack_hasil_baik} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[27]}`} rIdx={i} cIdx={27} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pack_s_qc} onChange={(e) => handleOeeChange(row.rowId, 'pack_s_qc', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[28]}`} rIdx={i} cIdx={28} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pack_s_others} onChange={(e) => handleOeeChange(row.rowId, 'pack_s_others', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[29]}`} rIdx={i} cIdx={29} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pack_fg} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[30]}`} rIdx={i} cIdx={30} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pack_utuh} onChange={(e) => handleOeeChange(row.rowId, 'pack_utuh', e.target.value)} type="select" options={['Y','N']} />
                  <Cell id={`oee-${i}-${OEE_COLS[31]}`} rIdx={i} cIdx={31} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pack_jml_batch} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[32]}`} rIdx={i} cIdx={32} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.tot_fg_shift} readOnly />

                  <Cell id={`oee-${i}-${OEE_COLS[33]}`} rIdx={i} cIdx={33} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.yield_batch} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[34]}`} rIdx={i} cIdx={34} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.avg_yield_shift} readOnly />

                  <Cell id={`oee-${i}-${OEE_COLS[35]}`} rIdx={i} cIdx={35} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_sh} onChange={(e) => handleOeeChange(row.rowId, 'av_sh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[36]}`} rIdx={i} cIdx={36} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_sm} onChange={(e) => handleOeeChange(row.rowId, 'av_sm', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[37]}`} rIdx={i} cIdx={37} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_eh} onChange={(e) => handleOeeChange(row.rowId, 'av_eh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[38]}`} rIdx={i} cIdx={38} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_em} onChange={(e) => handleOeeChange(row.rowId, 'av_em', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[39]}`} rIdx={i} cIdx={39} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_sub} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[40]}`} rIdx={i} cIdx={40} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.total_avail_shift} readOnly />

                  <Cell id={`oee-${i}-${OEE_COLS[41]}`} rIdx={i} cIdx={41} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_sh} onChange={(e) => handleOeeChange(row.rowId, 'run_sh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[42]}`} rIdx={i} cIdx={42} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_sm} onChange={(e) => handleOeeChange(row.rowId, 'run_sm', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[43]}`} rIdx={i} cIdx={43} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_eh} onChange={(e) => handleOeeChange(row.rowId, 'run_eh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[44]}`} rIdx={i} cIdx={44} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_em} onChange={(e) => handleOeeChange(row.rowId, 'run_em', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[45]}`} rIdx={i} cIdx={45} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_sub} readOnly />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[46]}`} rIdx={i} cIdx={46} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.clear_sh} onChange={(e) => handleOeeChange(row.rowId, 'clear_sh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[47]}`} rIdx={i} cIdx={47} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.clear_sm} onChange={(e) => handleOeeChange(row.rowId, 'clear_sm', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[48]}`} rIdx={i} cIdx={48} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.clear_eh} onChange={(e) => handleOeeChange(row.rowId, 'clear_eh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[49]}`} rIdx={i} cIdx={49} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.clear_em} onChange={(e) => handleOeeChange(row.rowId, 'clear_em', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[50]}`} rIdx={i} cIdx={50} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.clear_sub} readOnly />

                  <Cell id={`oee-${i}-${OEE_COLS[51]}`} rIdx={i} cIdx={51} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.process_total} readOnly />

                  <Cell id={`oee-${i}-${OEE_COLS[52]}`} rIdx={i} cIdx={52} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.total_prep_clear} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[53]}`} rIdx={i} cIdx={53} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.jeda_batch} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[54]}`} rIdx={i} cIdx={54} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.jeda_shift} readOnly />

                  <td className="border border-black p-2 bg-white min-w-[120px] max-w-[120px]">
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


        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase">Downtime Line 1 - Zone F</h2>
        </div>

        <div className="overflow-auto border-2 border-black shadow-lg custom-scrollbar max-h-[600px] relative">
          <table className="w-max border-collapse text-xs text-center whitespace-nowrap">
            <thead className="sticky top-0 z-40 text-black font-bold uppercase tracking-wider bg-gray-50">
              <tr>
                <th className={`border border-black px-4 py-3 bg-gray-100 ${freezeDT1} z-50 shadow-[2px_0_5px_rgba(0,0,0,0.1)]`}>Tanggal</th>
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
                <th className="border border-black px-4 py-3 bg-gray-50 min-w-[120px] max-w-[120px]">AKSI</th>
              </tr>
            </thead>
            
            <tbody className="text-black font-mono">
              {dtRows.map((row, i) => (
                <tr key={row.rowId} className="hover:bg-gray-100">
                  <Cell id={`dt-${i}-${DT_COLS[0]}`} rIdx={i} cIdx={0} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.tanggal} onChange={(e) => handleDtChange(row.rowId, 'tanggal', e.target.value)} className={freezeDT1} />
                  <Cell id={`dt-${i}-${DT_COLS[1]}`} rIdx={i} cIdx={1} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.shift} onChange={(e) => handleDtChange(row.rowId, 'shift', e.target.value)} type="select" options={SHIFTS} />
                  <Cell id={`dt-${i}-${DT_COLS[2]}`} rIdx={i} cIdx={2} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.group} onChange={(e) => handleDtChange(row.rowId, 'group', e.target.value)} type="select" options={GROUPS} />
                  <Cell id={`dt-${i}-${DT_COLS[3]}`} rIdx={i} cIdx={3} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.no_batch} onChange={(e) => handleDtChange(row.rowId, 'no_batch', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[4]}`} rIdx={i} cIdx={4} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.start_h} onChange={(e) => handleDtChange(row.rowId, 'start_h', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[5]}`} rIdx={i} cIdx={5} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.start_m} onChange={(e) => handleDtChange(row.rowId, 'start_m', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[6]}`} rIdx={i} cIdx={6} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.end_h} onChange={(e) => handleDtChange(row.rowId, 'end_h', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[7]}`} rIdx={i} cIdx={7} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.end_m} onChange={(e) => handleDtChange(row.rowId, 'end_m', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[8]}`} rIdx={i} cIdx={8} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.duration} readOnly />
                  <Cell id={`dt-${i}-${DT_COLS[9]}`} rIdx={i} cIdx={9} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.plan_unplan} onChange={(e) => handleDtChange(row.rowId, 'plan_unplan', e.target.value)} type="select" options={['Planned','Unplanned']} />
                  <Cell id={`dt-${i}-${DT_COLS[10]}`} rIdx={i} cIdx={10} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.root_cause} onChange={(e) => handleDtChange(row.rowId, 'root_cause', e.target.value)} type="select" options={masterData.rc} />
                  <Cell id={`dt-${i}-${DT_COLS[11]}`} rIdx={i} cIdx={11} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.proses} onChange={(e) => handleDtChange(row.rowId, 'proses', e.target.value)} type="select" options={masterData.proses} />
                  <Cell id={`dt-${i}-${DT_COLS[12]}`} rIdx={i} cIdx={12} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.unit} onChange={(e) => handleDtChange(row.rowId, 'unit', e.target.value)} type="select" options={getUnits(row.proses)} />
                  <Cell id={`dt-${i}-${DT_COLS[13]}`} rIdx={i} cIdx={13} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.kasus} onChange={(e) => handleDtChange(row.rowId, 'kasus', e.target.value)} className="min-w-[200px]" />
                  
                  <td className="border border-black p-2 bg-white min-w-[120px] max-w-[120px]">
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