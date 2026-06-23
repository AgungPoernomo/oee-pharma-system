import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submitOEEData, fetchTodayRejectC, fetchTodayDowntimeC, fetchValidationData } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };
const SHIFTS = ["1", "2", "3"];
const GROUPS = ["A", "B", "C", "D"];
const VOLUMES = ["25 ML", "100 ML", "250 ML", "500 ML", "1000 ML"];

const generateId = () => Math.random().toString(36).substr(2, 9);

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

const getEmptyOEE = () => ({
  rowId: generateId(), original_id: null, is_closing: false,
  no_batch: '', tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', reject_blow: '', volume_botol: '500 ML',
  cnt_start: '', cnt_end: '', cnt_sub: '', utuh: 'Y', jml_batch: '', total_cnt_shift: '',
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
  tanggal: new Date().toISOString().split('T')[0], shift: '', group: '', no_batch: '',
  start_h: '', start_m: '', end_h: '', end_m: '', duration: '',
  plan_unplan: 'Unplanned', root_cause: '', proses: '', unit: '', kasus: ''
});

const OEE_COLS = ['no_batch', 'tanggal', 'shift', 'group', 'reject_blow', 'volume_botol', 'cnt_start', 'cnt_end', 'cnt_sub', 'utuh', 'jml_batch', 'total_cnt_shift', 'r_washing', 'r_vk', 'r_vl', 'r_nocap', 'r_sealnok', 'r_others', 'r_sub', 's_ipc', 's_others', 's_sub', 'trf_st', 'total_good_shift', 'yield_batch', 'avg_yield_shift', 'pre_in', 'pre_bocor', 'pre_nocap', 'pre_vol', 'pre_thermo', 'pre_lain', 'pre_rej_total', 'pre_out', 'av_sh', 'av_sm', 'av_eh', 'av_em', 'av_sub', 'total_avail_shift', 'run_sh', 'run_sm', 'run_eh', 'run_em', 'run_sub', 'lc_sh', 'lc_sm', 'lc_eh', 'lc_em', 'lc_sub', 'total_prep_clear', 'jeda_batch', 'jeda_shift'];
const DT_COLS = ['tanggal', 'shift', 'group', 'no_batch', 'start_h', 'start_m', 'end_h', 'end_m', 'duration', 'plan_unplan', 'root_cause', 'proses', 'unit', 'kasus'];

const recalculateOEE = (rows) => {
  const v = (val) => (val === "" || val === null || val === undefined || isNaN(val)) ? 0 : parseFloat(val);
  const timeDiff = (sh, sm, eh, em) => {
    if (v(sh)===0 && v(sm)===0 && v(eh)===0 && v(em)===0 && (sh===""||sh===null)) return '';
    let start = v(sh)*60 + v(sm);
    let end = v(eh)*60 + v(em);
    let diff = end - start;
    return diff < 0 ? diff + (24*60) : diff;
  };

  let mapped = rows.map(row => {
    if (!row.no_batch && !row.tanggal && row.original_id === null) return row;

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
      total_cnt_shift: '', total_good_shift: '', avg_yield_shift: '', total_avail_shift: '', jeda_shift: '', is_closing: false
    };
  });

  const groups = {};
  mapped.forEach((row, idx) => {
    if (!row.tanggal || !row.shift || !row.no_batch) return;
    const key = `${row.tanggal}_${row.shift}`;
    if (!groups[key]) groups[key] = { rows: [], t_cnt: 0, t_good: 0, t_avail: 0, t_jeda: 0, sum_yld: 0, count_yld: 0 };
    
    groups[key].rows.push(idx);
    groups[key].t_cnt += v(row.cnt_sub);
    groups[key].t_good += v(row.trf_st);
    groups[key].t_avail += v(row.av_sub);
    groups[key].t_jeda += v(row.jeda_batch);
    if (v(row.yield_batch) > 0) {
      groups[key].sum_yld += v(row.yield_batch);
      groups[key].count_yld += 1;
    }
  });

  Object.values(groups).forEach(g => {
    if (g.rows.length > 0) {
      const closingIdx = g.rows[g.rows.length - 1]; 
      mapped[closingIdx].total_cnt_shift = g.t_cnt;
      mapped[closingIdx].total_good_shift = g.t_good;
      mapped[closingIdx].total_avail_shift = g.t_avail;
      mapped[closingIdx].jeda_shift = g.t_jeda;
      mapped[closingIdx].avg_yield_shift = g.count_yld > 0 ? (g.sum_yld / g.count_yld).toFixed(2) : 0;
      mapped[closingIdx].is_closing = true; 
    }
  });

  return mapped;
};

const Cell = ({ 
  value, onChange, className="", isHighlight=false, readOnly = false, type = "text", options = [], 
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
    <td className={`border border-black p-0 min-w-[80px] relative group ${isHighlight && !readOnly ? 'bg-emerald-50 font-bold' : 'bg-white'} ${className}`} onMouseEnter={() => onMouseEnter(rIdx, colsArray[cIdx], tableType)}>
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

export default function InputC() {
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
          fetchTodayRejectC(user),
          fetchTodayDowntimeC(user),
          fetchValidationData()
        ]);

        if (resValid.status === 'success') {
          setMasterData({ rc: resValid.data['RC_C'] || [], proses: resValid.data['DT_Proses_C'] || [], raw: resValid.data });
        }

        if (resOEE.status === 'success' && resOEE.data) {
          const reversedOEE = [...resOEE.data].reverse();
          const mappedOEE = reversedOEE.map(row => ({
            rowId: generateId(), original_id: row[row.length - 1],
            no_batch: row[2], tanggal: parseToYMD(row[3]), shift: row[4], group: row[5], reject_blow: row[6], volume_botol: row[7],
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
          setOeeRows(recalculateOEE([...mappedOEE, ...Array.from({ length: 15 }, getEmptyOEE)]));
        }

        if (resDT.status === 'success' && resDT.data) {
          const reversedDT = [...resDT.data].reverse();
          const mappedDT = reversedDT.map(row => ({
            rowId: generateId(), original_id: row[row.length - 1],
            tanggal: parseToYMD(row[2]), shift: row[3], group: row[4], no_batch: row[5],
            start_h: row[6], start_m: row[7], end_h: row[8], end_m: row[9], duration: row[10],
            plan_unplan: row[11], root_cause: row[12], proses: row[13], unit: row[14], kasus: row[15]
          }));
          setDtRows([...mappedDT, ...Array.from({ length: 15 }, getEmptyDT)]);
        }
      } catch (error) { toast.error("Gagal menarik data riwayat."); }
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
    setOeeRows(prev => recalculateOEE(prev.map(r => r.rowId === id ? { ...r, [field]: value } : r)));
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
          setOeeRows(prev => prev.map(r => r.rowId === row.rowId ? { ...r, original_id: "saved" } : r));
          setOeeRows(prev => recalculateOEE([...prev, getEmptyOEE()])); 
        }
      } else { toast.error(res.message, { id: tId }); }
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
    if ((actionType === 'submit_downtime_c' || actionType === 'update_downtime_c') && (!row.tanggal || !row.no_batch)) {
      toast.error("Tanggal dan No Batch wajib!"); return;
    }
    const tId = toast.loading("Memproses Downtime...");
    try {
      const res = await submitOEEData({ action: actionType, data: row }, user);
      if (res.status === 'success') {
        toast.success("Berhasil!", { id: tId });
        if (actionType === 'delete_downtime_c') setDtRows(prev => prev.filter(r => r.rowId !== row.rowId));
        else if (actionType === 'submit_downtime_c') {
          setDtRows(prev => prev.map(r => r.rowId === row.rowId ? { ...r, original_id: "saved" } : r));
          setDtRows(prev => [...prev, getEmptyDT()]); 
        }
      } else { toast.error(res.message, { id: tId }); }
    } catch (e) { toast.error("Koneksi gagal", { id: tId }); }
  };

  const getUnits = (prosesVal) => masterData.raw ? (masterData.raw[`Unit_${prosesVal}`] || []) : [];

  const freezeLeft1 = "sticky left-0 z-20 min-w-[100px] max-w-[100px]";
  const freezeLeft2 = "sticky left-[100px] z-20 min-w-[100px] max-w-[100px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]";

  return (
    <div className="min-h-screen bg-white p-8 text-black font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">
        
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-wider uppercase">OEE Line 4 - Zone C</h1>
        </div>

        <div className="overflow-auto border-2 border-black shadow-lg mb-12 custom-scrollbar max-h-[600px] relative">
          <table className="w-max border-collapse text-xs text-center whitespace-nowrap">
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
                
                <th rowSpan="3" className="border border-black px-4 py-2 align-middle bg-gray-50 min-w-[120px] max-w-[120px]">AKSI</th>
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
              {oeeRows.map((row, i) => (
                <tr key={row.rowId} className={`hover:bg-gray-100 ${row.is_closing ? 'border-b-4 border-emerald-500 bg-emerald-50/20' : ''}`}>
                  <Cell id={`oee-${i}-${OEE_COLS[0]}`} rIdx={i} cIdx={0} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.no_batch} onChange={(e) => handleOeeChange(row.rowId, 'no_batch', e.target.value)} className={freezeLeft1} />
                  <Cell id={`oee-${i}-${OEE_COLS[1]}`} rIdx={i} cIdx={1} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.tanggal} onChange={(e) => handleOeeChange(row.rowId, 'tanggal', e.target.value)} className={freezeLeft2} />
                  <Cell id={`oee-${i}-${OEE_COLS[2]}`} rIdx={i} cIdx={2} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.shift} onChange={(e) => handleOeeChange(row.rowId, 'shift', e.target.value)} type="select" options={SHIFTS} />
                  <Cell id={`oee-${i}-${OEE_COLS[3]}`} rIdx={i} cIdx={3} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.group} onChange={(e) => handleOeeChange(row.rowId, 'group', e.target.value)} type="select" options={GROUPS} />
                  <Cell id={`oee-${i}-${OEE_COLS[4]}`} rIdx={i} cIdx={4} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.reject_blow} onChange={(e) => handleOeeChange(row.rowId, 'reject_blow', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[5]}`} rIdx={i} cIdx={5} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.volume_botol} onChange={(e) => handleOeeChange(row.rowId, 'volume_botol', e.target.value)} type="select" options={VOLUMES} />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[6]}`} rIdx={i} cIdx={6} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.cnt_start} onChange={(e) => handleOeeChange(row.rowId, 'cnt_start', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[7]}`} rIdx={i} cIdx={7} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.cnt_end} onChange={(e) => handleOeeChange(row.rowId, 'cnt_end', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[8]}`} rIdx={i} cIdx={8} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.cnt_sub} readOnly isHighlight />
                  <Cell id={`oee-${i}-${OEE_COLS[9]}`} rIdx={i} cIdx={9} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.utuh} onChange={(e) => handleOeeChange(row.rowId, 'utuh', e.target.value)} type="select" options={['Y','N']} />
                  <Cell id={`oee-${i}-${OEE_COLS[10]}`} rIdx={i} cIdx={10} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.jml_batch} readOnly isHighlight />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[11]}`} rIdx={i} cIdx={11} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.total_cnt_shift} readOnly className={row.is_closing ? "bg-emerald-200 font-bold" : ""} />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[12]}`} rIdx={i} cIdx={12} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.r_washing} onChange={(e) => handleOeeChange(row.rowId, 'r_washing', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[13]}`} rIdx={i} cIdx={13} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.r_vk} onChange={(e) => handleOeeChange(row.rowId, 'r_vk', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[14]}`} rIdx={i} cIdx={14} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.r_vl} onChange={(e) => handleOeeChange(row.rowId, 'r_vl', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[15]}`} rIdx={i} cIdx={15} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.r_nocap} onChange={(e) => handleOeeChange(row.rowId, 'r_nocap', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[16]}`} rIdx={i} cIdx={16} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.r_sealnok} onChange={(e) => handleOeeChange(row.rowId, 'r_sealnok', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[17]}`} rIdx={i} cIdx={17} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.r_others} onChange={(e) => handleOeeChange(row.rowId, 'r_others', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[18]}`} rIdx={i} cIdx={18} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.r_sub} readOnly className="bg-red-50" />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[19]}`} rIdx={i} cIdx={19} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.s_ipc} onChange={(e) => handleOeeChange(row.rowId, 's_ipc', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[20]}`} rIdx={i} cIdx={20} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.s_others} onChange={(e) => handleOeeChange(row.rowId, 's_others', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[21]}`} rIdx={i} cIdx={21} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.s_sub} readOnly className="bg-blue-50" />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[22]}`} rIdx={i} cIdx={22} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.trf_st} readOnly isHighlight />
                  <Cell id={`oee-${i}-${OEE_COLS[23]}`} rIdx={i} cIdx={23} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.total_good_shift} readOnly className={row.is_closing ? "bg-emerald-200 font-bold" : ""} />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[24]}`} rIdx={i} cIdx={24} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.yield_batch} readOnly className="bg-yellow-50" />
                  <Cell id={`oee-${i}-${OEE_COLS[25]}`} rIdx={i} cIdx={25} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.avg_yield_shift} readOnly className={row.is_closing ? "bg-yellow-200 font-bold" : ""} />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[26]}`} rIdx={i} cIdx={26} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pre_in} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[27]}`} rIdx={i} cIdx={27} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pre_bocor} onChange={(e) => handleOeeChange(row.rowId, 'pre_bocor', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[28]}`} rIdx={i} cIdx={28} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pre_nocap} onChange={(e) => handleOeeChange(row.rowId, 'pre_nocap', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[29]}`} rIdx={i} cIdx={29} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pre_vol} onChange={(e) => handleOeeChange(row.rowId, 'pre_vol', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[30]}`} rIdx={i} cIdx={30} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pre_thermo} onChange={(e) => handleOeeChange(row.rowId, 'pre_thermo', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[31]}`} rIdx={i} cIdx={31} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pre_lain} onChange={(e) => handleOeeChange(row.rowId, 'pre_lain', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[32]}`} rIdx={i} cIdx={32} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pre_rej_total} readOnly className="bg-red-50" />
                  <Cell id={`oee-${i}-${OEE_COLS[33]}`} rIdx={i} cIdx={33} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.pre_out} readOnly />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[34]}`} rIdx={i} cIdx={34} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_sh} onChange={(e) => handleOeeChange(row.rowId, 'av_sh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[35]}`} rIdx={i} cIdx={35} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_sm} onChange={(e) => handleOeeChange(row.rowId, 'av_sm', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[36]}`} rIdx={i} cIdx={36} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_eh} onChange={(e) => handleOeeChange(row.rowId, 'av_eh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[37]}`} rIdx={i} cIdx={37} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_em} onChange={(e) => handleOeeChange(row.rowId, 'av_em', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[38]}`} rIdx={i} cIdx={38} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.av_sub} readOnly className="bg-gray-100" />
                  <Cell id={`oee-${i}-${OEE_COLS[39]}`} rIdx={i} cIdx={39} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.total_avail_shift} readOnly className={row.is_closing ? "bg-purple-200 font-bold" : ""} />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[40]}`} rIdx={i} cIdx={40} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_sh} onChange={(e) => handleOeeChange(row.rowId, 'run_sh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[41]}`} rIdx={i} cIdx={41} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_sm} onChange={(e) => handleOeeChange(row.rowId, 'run_sm', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[42]}`} rIdx={i} cIdx={42} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_eh} onChange={(e) => handleOeeChange(row.rowId, 'run_eh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[43]}`} rIdx={i} cIdx={43} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_em} onChange={(e) => handleOeeChange(row.rowId, 'run_em', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[44]}`} rIdx={i} cIdx={44} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.run_sub} readOnly className="bg-gray-100" />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[45]}`} rIdx={i} cIdx={45} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.lc_sh} onChange={(e) => handleOeeChange(row.rowId, 'lc_sh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[46]}`} rIdx={i} cIdx={46} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.lc_sm} onChange={(e) => handleOeeChange(row.rowId, 'lc_sm', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[47]}`} rIdx={i} cIdx={47} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.lc_eh} onChange={(e) => handleOeeChange(row.rowId, 'lc_eh', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[48]}`} rIdx={i} cIdx={48} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.lc_em} onChange={(e) => handleOeeChange(row.rowId, 'lc_em', e.target.value)} />
                  <Cell id={`oee-${i}-${OEE_COLS[49]}`} rIdx={i} cIdx={49} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.lc_sub} readOnly className="bg-gray-100" />
                  
                  <Cell id={`oee-${i}-${OEE_COLS[50]}`} rIdx={i} cIdx={50} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.total_prep_clear} readOnly className="bg-gray-100" />
                  <Cell id={`oee-${i}-${OEE_COLS[51]}`} rIdx={i} cIdx={51} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.jeda_batch} readOnly />
                  <Cell id={`oee-${i}-${OEE_COLS[52]}`} rIdx={i} cIdx={52} tableType="oee" colsArray={OEE_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.jeda_shift} readOnly className={row.is_closing ? "bg-orange-200 font-bold" : ""} />
                  
                  <td className={`border border-black p-2 bg-white min-w-[120px]`}>
                    {row.original_id ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => actionOEE(row, 'update_reject_c')} className="bg-yellow-400 text-black px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Update</button>
                        <button onClick={() => actionOEE(row, 'delete_reject_c')} className="bg-red-500 text-white px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Hapus</button>
                      </div>
                    ) : (
                      <button onClick={() => actionOEE(row, 'submit_reject_c')} className="bg-emerald-500 text-white px-3 py-1.5 rounded font-bold shadow-sm active:scale-95 w-full text-[10px]">Kirim Baru</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase">Downtime Line 4 - Zone C </h2>
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
              {dtRows.map((row, i) => (
                <tr key={row.rowId} className="hover:bg-gray-100">
                  <Cell id={`dt-${i}-${DT_COLS[0]}`} rIdx={i} cIdx={0} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.tanggal} onChange={(e) => handleDtChange(row.rowId, 'tanggal', e.target.value)} className={freezeLeft1} />
                  <Cell id={`dt-${i}-${DT_COLS[1]}`} rIdx={i} cIdx={1} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.shift} onChange={(e) => handleDtChange(row.rowId, 'shift', e.target.value)} type="select" options={SHIFTS} />
                  <Cell id={`dt-${i}-${DT_COLS[2]}`} rIdx={i} cIdx={2} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.group} onChange={(e) => handleDtChange(row.rowId, 'group', e.target.value)} type="select" options={GROUPS} />
                  <Cell id={`dt-${i}-${DT_COLS[3]}`} rIdx={i} cIdx={3} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.no_batch} onChange={(e) => handleDtChange(row.rowId, 'no_batch', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[4]}`} rIdx={i} cIdx={4} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.start_h} onChange={(e) => handleDtChange(row.rowId, 'start_h', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[5]}`} rIdx={i} cIdx={5} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.start_m} onChange={(e) => handleDtChange(row.rowId, 'start_m', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[6]}`} rIdx={i} cIdx={6} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.end_h} onChange={(e) => handleDtChange(row.rowId, 'end_h', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[7]}`} rIdx={i} cIdx={7} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.end_m} onChange={(e) => handleDtChange(row.rowId, 'end_m', e.target.value)} />
                  <Cell id={`dt-${i}-${DT_COLS[8]}`} rIdx={i} cIdx={8} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.duration} readOnly className="bg-gray-100 font-bold" />
                  <Cell id={`dt-${i}-${DT_COLS[9]}`} rIdx={i} cIdx={9} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.plan_unplan} onChange={(e) => handleDtChange(row.rowId, 'plan_unplan', e.target.value)} type="select" options={['Planned','Unplanned']} />
                  <Cell id={`dt-${i}-${DT_COLS[10]}`} rIdx={i} cIdx={10} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.root_cause} onChange={(e) => handleDtChange(row.rowId, 'root_cause', e.target.value)} type="select" options={masterData.rc} />
                  <Cell id={`dt-${i}-${DT_COLS[11]}`} rIdx={i} cIdx={11} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.proses} onChange={(e) => handleDtChange(row.rowId, 'proses', e.target.value)} type="select" options={masterData.proses} />
                  <Cell id={`dt-${i}-${DT_COLS[12]}`} rIdx={i} cIdx={12} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.unit} onChange={(e) => handleDtChange(row.rowId, 'unit', e.target.value)} type="select" options={getUnits(row.proses)} />
                  <Cell id={`dt-${i}-${DT_COLS[13]}`} rIdx={i} cIdx={13} tableType="dt" colsArray={DT_COLS} onKeyDown={handleKeyDown} onMouseEnter={handleMouseEnter} onMouseDownHandle={handleMouseDownHandle} value={row.kasus} onChange={(e) => handleDtChange(row.rowId, 'kasus', e.target.value)} className="min-w-[150px]" />
                  
                  <td className={`border border-black p-2 bg-white min-w-[120px]`}>
                    {row.original_id ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => actionDT(row, 'update_downtime_c')} className="bg-yellow-400 text-black px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Update</button>
                        <button onClick={() => actionDT(row, 'delete_downtime_c')} className="bg-red-500 text-white px-2 py-1.5 rounded font-bold shadow-sm active:scale-95 text-[10px]">Hapus</button>
                      </div>
                    ) : (
                      <button onClick={() => actionDT(row, 'submit_downtime_c')} className="bg-emerald-500 text-white px-3 py-1.5 rounded font-bold shadow-sm active:scale-95 w-full text-[10px]">Kirim Baru</button>
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