import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectC, fetchTodayDowntimeC } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

import { createUniver, LocaleType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import '@univerjs/preset-sheets-core/lib/index.css';

const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };
const C = {
  NO_BATCH: 0, TANGGAL: 1, SHIFT: 2, GROUP: 3, REJ_BOTOL: 4, REJ_PREFORM: 5, REJ_BLOW: 6, VOL_BOTOL: 7, 
  CNT_START: 8, CNT_END: 9, CNT_SUB: 10, UTUH: 11, JML_BATCH: 12, TOTAL_CNT: 13, WASH: 14, VK: 15, 
  VL: 16, TANPA_CAP_F: 17, SEAL_NOK: 18, OTHERS_F: 19, SUB_FILL: 20, IPC: 21, OTHERS_S: 22, SUB_SAMPLES: 23,
  TRF_TO_ST: 24, TOTAL_KESEL: 25, YIELD_BATCH: 26, AVG_SHIFT: 27, INPUT_STERIL: 28, REJ_BOCOR: 29, 
  REJ_TANPA_CAP: 30, REJ_VOL: 31, REJ_THERMO: 32, REJ_LAINLAIN: 33, TOTAL_REJ_BS: 34, OUTPUT_CHAMBER: 35, 
  AT_SH: 36, AT_SM: 37, AT_EH: 38, AT_EM: 39, AT_SUB: 40, AT_TOTAL: 41, RT_SH: 42, RT_SM: 43, RT_EH: 44, 
  RT_EM: 45, RT_SUB: 46, LC_SH: 47, LC_SM: 48, LC_EH: 49, LC_EM: 50, LC_SUB: 51
};

const DC = {
  TANGGAL: 0, SHIFT: 1, GRUP: 2, NO_BATCH: 3, SH: 4, SM: 5, EH: 6, EM: 7, DURASI: 8, TYPE: 9, ROOT: 10, PROSES: 11, UNIT: 12, KASUS: 13,
};

const parseToYMD = (val) => {
  if (!val) return '';
  const str = String(val).replace(/'/g, '').trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (_) {}
  return '';
};

const getCachedIds = (key, count = 100) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  return Array(count).fill(null);
};

const sendAutoSave = async (payload) => {
  try {
    const response = await fetch('/api/autosave-c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return await response.json();
  } catch (error) { return { status: 'error' }; }
};

const OEE_HEADERS = [
  ["", "", "", "", "", "", "", "", "Counter Filling", "", "", "", "", "", "Rejection Filling", "", "", "", "", "", "", "Samples", "", "", "Hasil Baik", "", "% Yield", "", "Reject Before Steril", "", "", "", "", "", "", "", "Available Time", "", "", "", "", "", "Run Time", "", "", "", "", "Line Clearance", "", "", "", ""],
  ["", "", "", "", "", "", "", "", "Per Cycle Batch", "", "", "", "", "", "Washing", "Filling", "Sealing", "", "", "Botol", "", "Transfer to ST", "", "", "", "Reject Before Steril", "", "", "", "", "Filling", "", "", "", "CIP Minor", "", "", "", "", "", "", "", ""],
  ["No Batch", "Tanggal", "Shift", "Group", "Reject Botol", "Reject Preform", "Reject Blow", "Volume Botol", "Start", "End", "Sub Total", "Utuh?", "Jumlah Batch", "Total Cnt/Shift", "Washing", "VK", "VL", "Tanpa Cap", "Seal NOT OK", "Others/Bocor", "Sub Total Fill-Seal", "IPC", "Others", "Sub Total Samples", "Transfer to ST", "Total Keseluruhan", "Yield/Batch (%)", "AVG/Shift (%)", "Input Before Steril", "Reject Bocor", "Reject Tanpa Cap", "Reject Vol", "Reject Thermo", "Reject Lain-lain", "Total Reject BS", "Output (Chamber)", "Start (Jam)", "Start (Menit)", "End (Jam)", "End (Menit)", "Sub Total", "Total/Shift", "Start (Jam)", "Start (Menit)", "End (Jam)", "End (Menit)", "Sub Total", "Start (Jam)", "Start (Menit)", "End (Jam)", "End (Menit)", "Sub Total"]
];

const DT_HEADERS = [
  ["Tanggal", "Shift", "Grup", "No. Batch", "Start (Jam)", "Start (Menit)", "End (Jam)", "End (Menit)", "Durasi (menit)", "Planned / Unplanned", "Root Cause", "Proses", "Unit", "Kasus"]
];

export default function InputC() {
  const { user } = useAuth();
  const oeeContainerRef = useRef(null);
  const dtContainerRef = useRef(null);
  const univerOEERef = useRef(null);
  const univerDTRef = useRef(null);
  const univerInit = useRef(false);
  const isCalculating = useRef(false);

  const oeeIds = useRef(getCachedIds('C_IDS_OEE', 200)); 
  const dtIds = useRef(getCachedIds('C_IDS_DT', 200));  
  const oeeTimers = useRef({}); 
  const dtTimers = useRef({});

  const loadDataServer = useCallback(async () => {
    if (!user) return;
    try {
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectC(user),
        fetchTodayDowntimeC(user),
      ]);

      let finalOEE = Array.from({ length: 150 }, () => Array(52).fill(''));
      let finalDT  = Array.from({ length: 150 }, () => Array(14).fill(''));

      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {
        [...resOEE.data].reverse().forEach((row, i) => {
          if(i >= 150) return;
          oeeIds.current[i + 3] = row.id; 
          finalOEE[i] = [
            row.no_batch ?? '', parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.reject_botol ?? '', row.reject_preform ?? '',
            row.reject_blow ?? '', row.volume_botol ?? '', row.cnt_start ?? '', row.cnt_end ?? '', row.cnt_sub ?? '', row.utuh ?? 'Y',
            row.jml_batch ?? '', '', row.r_washing ?? '', row.r_vk ?? '', row.r_vl ?? '', row.r_nocap ?? '',
            row.r_sealnok ?? '', row.r_others ?? '', row.r_sub ?? '', row.s_ipc ?? '', row.s_others ?? '', row.s_sub ?? '',
            row.trf_st ?? '', '', '', '', row.pre_in ?? '', row.pre_bocor ?? '',
            row.pre_nocap ?? '', row.pre_vol ?? '', row.pre_thermo ?? '', row.pre_lain ?? '', row.pre_rej_total ?? '', row.pre_out ?? '',
            row.av_sh ?? '', row.av_sm ?? '', row.av_eh ?? '', row.av_em ?? '', row.av_sub ?? '', row.total_avail_shift ?? '',
            row.run_sh ?? '', row.run_sm ?? '', row.run_eh ?? '', row.run_em ?? '', row.run_sub ?? '', row.lc_sh ?? '',
            row.lc_sm ?? '', row.lc_eh ?? '', row.lc_em ?? '', row.lc_sub ?? ''
          ]; 
        });
      }

      if (resDT?.status === 'success' && Array.isArray(resDT.data)) {
        [...resDT.data].reverse().forEach((row, i) => {
          if(i >= 150) return;
          dtIds.current[i + 1] = row.id; 
          finalDT[i] = [
            parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.no_batch ?? '', row.start_h ?? '', row.start_m ?? '',
            row.end_h ?? '', row.end_m ?? '', row.duration ?? '', row.plan_unplan ?? 'Unplanned', row.root_cause ?? '', row.proses ?? '',
            row.unit ?? '', row.kasus ?? ''
          ];
        });
      }

      if (univerOEERef.current) {
        const oeeSheet = univerOEERef.current.getActiveWorkbook().getSheetBySheetId('sheet-oee');
        oeeSheet.getRange(0, 0, 3 + 150, 52).setValues([...OEE_HEADERS, ...finalOEE]);
        try { oeeSheet.setFrozen(3, 2); } catch(e) {}
      }

      if (univerDTRef.current) {
        const dtSheet = univerDTRef.current.getActiveWorkbook().getSheetBySheetId('sheet-dt');
        dtSheet.getRange(0, 0, 1 + 150, 14).setValues([...DT_HEADERS, ...finalDT]);
        try { dtSheet.setFrozen(1, 4); } catch(e) {}
      }
    } catch (error) { }
  }, [user]);

  useEffect(() => {
    if (univerInit.current) return;
    univerInit.current = true;

    try {
      const oeeEnv = createUniver({
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS },
        presets: [ UniverSheetsCorePreset({ container: oeeContainerRef.current }) ],
      });
      oeeEnv.univerAPI.createUniverSheet({ id: 'wb-oee', sheets: { 'sheet-oee': { name: 'OEE Zone C' } } });
      univerOEERef.current = oeeEnv.univerAPI;

      oeeEnv.univerAPI.onCommandExecuted((command) => {
        if (command.id === 'sheet.mutation.set-range-values') {
          const wb = oeeEnv.univerAPI.getActiveWorkbook();
          const activeSheet = wb.getActiveSheet();
          const range = activeSheet.getSelection().getActiveRange();
          if (range && range.startRow >= 3) handleOEEChange(range.startRow, activeSheet);
        }
      });
    } catch(e) {}

    try {
      const dtEnv = createUniver({
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS },
        presets: [ UniverSheetsCorePreset({ container: dtContainerRef.current }) ],
      });
      dtEnv.univerAPI.createUniverSheet({ id: 'wb-dt', sheets: { 'sheet-dt': { name: 'Downtime Zone C' } } });
      univerDTRef.current = dtEnv.univerAPI;

      dtEnv.univerAPI.onCommandExecuted((command) => {
        if (command.id === 'sheet.mutation.set-range-values') {
          const wb = dtEnv.univerAPI.getActiveWorkbook();
          const activeSheet = wb.getActiveSheet();
          const range = activeSheet.getSelection().getActiveRange();
          if (range && range.startRow >= 1) handleDTChange(range.startRow, activeSheet);
        }
      });
    } catch(e) {}

    loadDataServer();
  }, [loadDataServer]);

  const triggerAutosaveOEE = (rIdx, sheet) => {
    if (oeeTimers.current[rIdx]) clearTimeout(oeeTimers.current[rIdx]);
    oeeTimers.current[rIdx] = setTimeout(async () => {
      const getVal = (col) => sheet.getRange(rIdx, col).getValue() || '';
      if (!getVal(C.NO_BATCH) && !getVal(C.TANGGAL) && !getVal(C.SHIFT)) return;

      const payloadData = {
        original_id: oeeIds.current[rIdx] || null,
        no_batch: getVal(C.NO_BATCH), tanggal: getVal(C.TANGGAL), shift: getVal(C.SHIFT), group: getVal(C.GROUP),
        reject_botol: getVal(C.REJ_BOTOL), reject_preform: getVal(C.REJ_PREFORM), reject_blow: getVal(C.REJ_BLOW),
        volume_botol: getVal(C.VOL_BOTOL), cnt_start: getVal(C.CNT_START), cnt_end: getVal(C.CNT_END),
        cnt_sub: getVal(C.CNT_SUB), utuh: getVal(C.UTUH), jml_batch: getVal(C.JML_BATCH),
        r_washing: getVal(C.WASH), r_vk: getVal(C.VK), r_vl: getVal(C.VL), r_nocap: getVal(C.TANPA_CAP_F),
        r_sealnok: getVal(C.SEAL_NOK), r_others: getVal(C.OTHERS_F), r_sub: getVal(C.SUB_FILL),
        s_ipc: getVal(C.IPC), s_others: getVal(C.OTHERS_S), s_sub: getVal(C.SUB_SAMPLES),
        trf_st: getVal(C.TRF_TO_ST), pre_in: getVal(C.INPUT_STERIL), pre_bocor: getVal(C.REJ_BOCOR),
        pre_nocap: getVal(C.REJ_TANPA_CAP), pre_vol: getVal(C.REJ_VOL), pre_thermo: getVal(C.REJ_THERMO),
        pre_lain: getVal(C.REJ_LAINLAIN), pre_rej_total: getVal(C.TOTAL_REJ_BS), pre_out: getVal(C.OUTPUT_CHAMBER),
        av_sh: getVal(C.AT_SH), av_sm: getVal(C.AT_SM), av_eh: getVal(C.AT_EH), av_em: getVal(C.AT_EM),
        av_sub: getVal(C.AT_SUB), total_avail_shift: getVal(C.AT_TOTAL), run_sh: getVal(C.RT_SH),
        run_sm: getVal(C.RT_SM), run_eh: getVal(C.RT_EH), run_em: getVal(C.RT_EM), run_sub: getVal(C.RT_SUB),
        lc_sh: getVal(C.LC_SH), lc_sm: getVal(C.LC_SM), lc_eh: getVal(C.LC_EH), lc_em: getVal(C.LC_EM), lc_sub: getVal(C.LC_SUB)
      };

      const res = await sendAutoSave({ action: payloadData.original_id ? 'update_reject_c' : 'submit_reject_c', data: payloadData, user });
      if (res.status === 'success' && res.original_id) {
        oeeIds.current[rIdx] = res.original_id;
        localStorage.setItem('C_IDS_OEE', JSON.stringify(oeeIds.current));
      }
    }, 1500);
  };

  const triggerAutosaveDT = (rIdx, sheet) => {
    if (dtTimers.current[rIdx]) clearTimeout(dtTimers.current[rIdx]);
    dtTimers.current[rIdx] = setTimeout(async () => {
      const getVal = (col) => sheet.getRange(rIdx, col).getValue() || '';
      if (!getVal(0) && !getVal(3)) return;

      const payloadData = {
        original_id: dtIds.current[rIdx] || null,
        tanggal: getVal(0), shift: getVal(1), group: getVal(2), no_batch: getVal(3),
        start_h: getVal(4), start_m: getVal(5), end_h: getVal(6), end_m: getVal(7),
        duration: getVal(8), plan_unplan: getVal(9), root_cause: getVal(10),
        proses: getVal(11), unit: getVal(12), kasus: getVal(13),
      };

      const res = await sendAutoSave({ action: payloadData.original_id ? 'update_downtime_c' : 'submit_downtime_c', data: payloadData, user });
      if (res.status === 'success' && res.original_id) {
        dtIds.current[rIdx] = res.original_id;
        localStorage.setItem('C_IDS_DT', JSON.stringify(dtIds.current));
      }
    }, 1500);
  };

  const handleOEEChange = (row, sheet) => {
    if (isCalculating.current) return;
    isCalculating.current = true;
    try {
      const v = (c) => { const raw = sheet.getRange(row, c).getValue(); return (raw === '' || raw == null || isNaN(raw)) ? 0 : parseFloat(raw); };
      const raw = (c) => sheet.getRange(row, c).getValue() ?? '';
      
      const setV = (c, val) => {
        if (sheet.getRange(row, c).getValue() !== val) sheet.getRange(row, c).setValue(val);
      };

      const timeDiff = (sh, sm, eh, em) => {
        if (raw(sh) === '' && raw(sm) === '' || raw(eh) === '' && raw(em) === '') return '';
        const diff = (v(eh) * 60 + v(em)) - (v(sh) * 60 + v(sm)); return diff < 0 ? diff + 24 * 60 : diff;
      };

      if (raw(C.REJ_BOTOL) !== '' || raw(C.REJ_PREFORM) !== '') setV(C.REJ_BLOW, v(C.REJ_BOTOL) + v(C.REJ_PREFORM));
      
      const sub = v(C.CNT_END) - v(C.CNT_START);
      if (raw(C.CNT_END) !== '' || raw(C.CNT_START) !== '') setV(C.CNT_SUB, sub > 0 ? sub : '');
      
      const cntSub = v(C.CNT_SUB);
      setV(C.JML_BATCH, cntSub > 0 ? (cntSub / (TEORI_BATCH[raw(C.VOL_BOTOL)] ?? 23076)).toFixed(2) : '');
      
      setV(C.SUB_FILL, v(C.WASH) + v(C.VK) + v(C.VL) + v(C.TANPA_CAP_F) + v(C.SEAL_NOK) + v(C.OTHERS_F));
      setV(C.SUB_SAMPLES, v(C.IPC) + v(C.OTHERS_S));
      
      if (cntSub > 0) {
        const trf = cntSub - (v(C.SUB_FILL) + v(C.SUB_SAMPLES));
        setV(C.TRF_TO_ST, trf > 0 ? trf : 0);
        setV(C.TOTAL_KESEL, cntSub);
        setV(C.YIELD_BATCH, ((trf / cntSub) * 100).toFixed(2));
        const inputSteril = trf - v(C.REJ_BLOW);
        setV(C.INPUT_STERIL, inputSteril > 0 ? inputSteril : 0);
      } else {
        setV(C.TRF_TO_ST, ''); setV(C.TOTAL_KESEL, ''); setV(C.YIELD_BATCH, ''); setV(C.INPUT_STERIL, '');
      }

      setV(C.TOTAL_REJ_BS, v(C.REJ_BOCOR) + v(C.REJ_TANPA_CAP) + v(C.REJ_VOL) + v(C.REJ_THERMO) + v(C.REJ_LAINLAIN));
      
      const inSteril = v(C.INPUT_STERIL);
      if (inSteril > 0) setV(C.OUTPUT_CHAMBER, inSteril - v(C.TOTAL_REJ_BS)); else setV(C.OUTPUT_CHAMBER, '');

      setV(C.AT_SUB, timeDiff(C.AT_SH, C.AT_SM, C.AT_EH, C.AT_EM));
      setV(C.RT_SUB, timeDiff(C.RT_SH, C.RT_SM, C.RT_EH, C.RT_EM));
      
      const lc = timeDiff(C.LC_SH, C.LC_SM, C.LC_EH, C.LC_EM);
      setV(C.LC_SUB, lc);
      setV(C.LC_PER_BATCH, (lc !== '' && v(C.JML_BATCH) > 0) ? (parseFloat(lc) / v(C.JML_BATCH)).toFixed(2) : (lc !== '' ? lc : ''));
      setV(C.LC_PER_SHIFT, lc);

    } finally {
      isCalculating.current = false;
      triggerAutosaveOEE(row, sheet);
    }
  };

  const handleDTChange = (row, sheet) => {
    const getRaw = (c) => sheet.getRange(row, c).getValue() ?? '';
    const getNum = (c) => parseFloat(getRaw(c)) || 0;
    if (getRaw(4) !== '' && getRaw(6) !== '') {
      const diff = (getNum(6) * 60 + getNum(7)) - (getNum(4) * 60 + getNum(5));
      sheet.getRange(row, 8).setValue(diff < 0 ? diff + 24 * 60 : diff);
    }
    triggerAutosaveDT(row, sheet);
  };

  useEffect(() => {
    const handleShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toast.success("Sistem Otomatis: Data aman tersimpan di TiDB Cloud!", { id: 'sc-save' });
        loadDataServer();
      }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (oeeContainerRef.current) {
          oeeContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast("Fokus ke Tabel OEE Zone C", { icon: '📊', id: 'sc-nav' });
        }
      }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (dtContainerRef.current) {
          dtContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast("Fokus ke Tabel Downtime Zone C", { icon: '⏱️', id: 'sc-nav' });
        }
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [loadDataServer]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans flex flex-col">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto w-full flex-1 flex flex-col">
        
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-wider uppercase text-emerald-800">
            OEE Line 4 — Zone C <span className="text-sm font-normal text-blue-600 ml-2">(Univer Edition)</span>
          </h1>
        </div>
        <div ref={oeeContainerRef} className="w-full h-[600px] border-2 border-slate-300 shadow-xl rounded overflow-hidden mb-12"></div>

        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 4 — Zone C
          </h2>
        </div>
        <div ref={dtContainerRef} className="w-full h-[500px] border-2 border-slate-300 shadow-xl rounded overflow-hidden mb-10"></div>

      </div>
    </div>
  );
}