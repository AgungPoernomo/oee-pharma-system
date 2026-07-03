import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectC, fetchTodayDowntimeC } from '../../../services/api';
import { Toaster } from 'react-hot-toast';

const TEORI_BATCH = {
  "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194,
};
const VOLUMES = ["25 ML", "100 ML", "250 ML", "500 ML", "1000 ML"];

const C = {
  NO_BATCH: 0, TANGGAL: 1, SHIFT: 2, GROUP: 3, REJ_BOTOL: 4, REJ_PREFORM: 5,
  REJ_BLOW: 6, VOL_BOTOL: 7, CNT_START: 8, CNT_END: 9, CNT_SUB: 10, UTUH: 11,
  JML_BATCH: 12, TOTAL_CNT: 13, WASH: 14, VK: 15, VL: 16, TANPA_CAP_F: 17,
  SEAL_NOK: 18, OTHERS_F: 19, SUB_FILL: 20, IPC: 21, OTHERS_S: 22, SUB_SAMPLES: 23,
  TRF_TO_ST: 24, TOTAL_KESEL: 25, YIELD_BATCH: 26, AVG_SHIFT: 27, INPUT_STERIL: 28,
  REJ_BOCOR: 29, REJ_TANPA_CAP: 30, REJ_VOL: 31, REJ_THERMO: 32, REJ_LAINLAIN: 33,
  TOTAL_REJ_BS: 34, OUTPUT_CHAMBER: 35, AT_SH: 36, AT_SM: 37, AT_EH: 38, AT_EM: 39,
  AT_SUB: 40, AT_TOTAL: 41, RT_SH: 42, RT_SM: 43, RT_EH: 44, RT_EM: 45, RT_SUB: 46,
  LC_SH: 47, LC_SM: 48, LC_EH: 49, LC_EM: 50, LC_SUB: 51, LC_PER_BATCH: 52,
  LC_PER_SHIFT: 53, TOTAL_PREP: 54,
};

const DC = {
  TANGGAL: 0, SHIFT: 1, GRUP: 2, NO_BATCH: 3, SH: 4, SM: 5, EH: 6, EM: 7,
  DURASI: 8, TYPE: 9, ROOT: 10, PROSES: 11, UNIT: 12, KASUS: 13,
};

const parseToYMD = (val) => {
  if (!val) return '';
  const str = String(val).replace(/'/g, '').trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (err) {
    void err;
  }
  return '';
};

const getEmptyOEE = () => {
  const arr = Array(55).fill('');
  arr[C.UTUH] = 'Y';
  return arr;
};

const getEmptyDT = () => {
  const arr = Array(14).fill('');
  arr[DC.TYPE] = 'Unplanned';
  return arr;
};

const getCachedData = (key, emptyGenerator, count = 100) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch (e) { console.error('Cache read error', e); }
  return Array.from({ length: count }, emptyGenerator);
};

const getCachedIds = (key, count = 100) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch (e) { console.error('Cache ID read error', e); }
  return Array(count).fill(null);
};

const sendAutoSave = async (payload) => {
  try {
    const response = await fetch('/api/autosave-c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Autosave Error:', error);
    return { status: 'error' };
  }
};

const UNIT_MAP_C = {
  'Blowing': ['Conveyor Preform Hijau', 'Hopper Preform', 'Conveyor Hopper Putih', 'Preform Feeding Chute', 'Rotary Preform', 'Minion', 'Supply Hanger', 'Heater Lamp', 'Heating Tube', 'Vertical Punch', 'Servo 1', 'Midstation', 'Servo 2', 'Servo 3', 'Servo 4', 'Neckseal', 'Stretch Servo', 'Bottom Mold', 'Pin Bottom', 'Body Mould - Utara', 'Body Mould - Selatan', 'Molding', 'Overturn', 'Transfer Blow-Fill', 'Supply Chiller', 'Compresor - Highpress (Oilfree)', 'Compresor - Lowpress (Oilless)', 'RH TMS', 'Suhu TMS', 'Supply Preform', 'Trial', 'Blowing-Others', 'Changeover'],
  'Filling': ['Laserjet', 'Gripper Washing', 'PLC', 'Ionizer', 'Carousel 1', 'Carousel 2', 'Carousel 3', 'Buffer Tank', 'Filling', 'Carousel 4', 'Carousel 5', 'Carousel 6', 'Cap Feeding Chute', 'Sealing', 'Heater', 'Cooling Heater Sealing', 'Wheelcap Ganjil', 'Wheelcap Genap', 'Conveyor Filling', 'Tandonan', 'Gear', 'Compresor-Oilfree', 'Compresor-Oilless', 'Trial', 'CIP/SIP', 'Filling-Others', 'Supply Listrik', 'Line Clearance', 'Break'],
  'Mixing': ['Supply WFI', 'Tanki D1', 'Tanki D2', 'Filter Produk', 'Mixing Produk', 'CIP/SIP', 'Integrity', 'PLC', 'Trial'],
  'Autoclave': ['Conveyor', 'Meja A', 'Meja B', 'Lifter A', 'Lifter B', 'Tray kereta', 'Turn table', 'Kereta Anjlok', 'Kereta Habis', 'Jalur penuh', 'Chamber A', 'Chamber B', 'Doorseal', 'Autoclave-Other', 'Pick and Place']
};
const ALL_UNITS_C = [...new Set(Object.values(UNIT_MAP_C).flat())];

// Pure calculation functions
const calculateOEERow = (row) => {
  const next = [...row];
  const raw = (c) => next[c] !== null && next[c] !== undefined ? next[c] : '';
  const v = (c) => {
    const val = raw(c);
    return (val === '' || isNaN(val)) ? 0 : parseFloat(val);
  };
  const setV = (c, val) => { next[c] = val; };
  const timeDiff = (sh, sm, eh, em) => {
    if (raw(sh) === '' && raw(sm) === '' && raw(eh) === '' && raw(em) === '') return '';
    const diff = (v(eh) * 60 + v(em)) - (v(sh) * 60 + v(sm));
    return diff < 0 ? diff + 24 * 60 : diff;
  };

  setV(C.REJ_BLOW, raw(C.REJ_BOTOL) !== '' || raw(C.REJ_PREFORM) !== '' ? v(C.REJ_BOTOL) + v(C.REJ_PREFORM) : '');
  const sub = v(C.CNT_END) - v(C.CNT_START);
  setV(C.CNT_SUB, sub > 0 ? sub : '');
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
  const inputSterilVal = v(C.INPUT_STERIL);
  setV(C.OUTPUT_CHAMBER, inputSterilVal > 0 ? inputSterilVal - v(C.TOTAL_REJ_BS) : '');
  setV(C.AT_SUB, timeDiff(C.AT_SH, C.AT_SM, C.AT_EH, C.AT_EM));
  setV(C.RT_SUB, timeDiff(C.RT_SH, C.RT_SM, C.RT_EH, C.RT_EM));
  const lc = timeDiff(C.LC_SH, C.LC_SM, C.LC_EH, C.LC_EM);
  setV(C.LC_SUB, lc);
  const jmlBatchVal = v(C.JML_BATCH);
  setV(C.LC_PER_BATCH, (lc !== '' && jmlBatchVal > 0) ? (parseFloat(lc) / jmlBatchVal).toFixed(2) : (lc !== '' ? lc : ''));
  setV(C.LC_PER_SHIFT, lc);

  return next;
};

const calculateDTRow = (row) => {
  const next = [...row];
  const raw = (c) => next[c] !== null && next[c] !== undefined ? next[c] : '';
  const v = (c) => {
    const val = raw(c);
    return (val === '' || isNaN(val)) ? 0 : parseFloat(val);
  };
  if (raw(DC.SH) !== '' && raw(DC.EH) !== '') {
    const diff = (v(DC.EH) * 60 + v(DC.EM)) - (v(DC.SH) * 60 + v(DC.SM));
    next[DC.DURASI] = diff < 0 ? diff + 24 * 60 : diff;
  } else {
    next[DC.DURASI] = '';
  }
  return next;
};

const OEE_COLS_META = [
  { title: 'No Batch', width: 110, type: 'text', stickyLeft: 0 },
  { title: 'Tanggal', width: 130, type: 'date', stickyLeft: 110 },
  { title: 'Shift', width: 65, type: 'number', stickyLeft: 240 },
  { title: 'Group', width: 65, type: 'text', stickyLeft: 305 },
  { title: 'Reject Botol', width: 95, type: 'number' },
  { title: 'Reject Preform', width: 105, type: 'number' },
  { title: 'Reject Blow', width: 90, type: 'number', readOnly: true },
  { title: 'Volume Botol', width: 110, type: 'select', options: VOLUMES },
  { title: 'Start', width: 80, type: 'number' },
  { title: 'End', width: 80, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true },
  { title: 'Utuh?', width: 65, type: 'select', options: ['Y', 'N'] },
  { title: 'Jumlah Batch', width: 100, type: 'number', readOnly: true },
  { title: 'Total Cnt/Shift', width: 115, type: 'number', readOnly: true },
  { title: 'Washing', width: 75, type: 'number' },
  { title: 'VK', width: 60, type: 'number' },
  { title: 'VL', width: 60, type: 'number' },
  { title: 'Tanpa Cap', width: 80, type: 'number' },
  { title: 'Seal NOT OK', width: 90, type: 'number' },
  { title: 'Others/Bocor', width: 95, type: 'number' },
  { title: 'Sub Total Fill-Seal', width: 140, type: 'number', readOnly: true },
  { title: 'IPC', width: 60, type: 'number' },
  { title: 'Others', width: 65, type: 'number' },
  { title: 'Sub Total Samples', width: 135, type: 'number', readOnly: true },
  { title: 'Transfer to ST', width: 110, type: 'number', readOnly: true },
  { title: 'Total Keseluruhan', width: 135, type: 'number', readOnly: true },
  { title: 'Yield/Batch (%)', width: 110, type: 'number', readOnly: true },
  { title: 'AVG/Shift (%)', width: 110, type: 'number', readOnly: true },
  { title: 'Input Before Steril', width: 140, type: 'number', readOnly: true },
  { title: 'Reject Bocor', width: 100, type: 'number' },
  { title: 'Reject Tanpa Cap', width: 120, type: 'number' },
  { title: 'Reject Vol', width: 85, type: 'number' },
  { title: 'Reject Thermo', width: 105, type: 'number' },
  { title: 'Reject Lain-lain', width: 115, type: 'number' },
  { title: 'Total Reject BS', width: 120, type: 'number', readOnly: true },
  { title: 'Output (Chamber)', width: 130, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 90, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 90, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true },
  { title: 'Total/Shift', width: 95, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 90, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 90, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 90, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 90, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true },
  { title: 'LC/Batch', width: 85, type: 'number', readOnly: true },
  { title: 'LC/Shift', width: 85, type: 'number', readOnly: true },
  { title: 'Total Prep', width: 95, type: 'number' },
];

const DT_COLS_META = [
  { title: 'Tanggal', width: 130, type: 'date', stickyLeft: 0 },
  { title: 'Shift', width: 65, type: 'number' },
  { title: 'Grup', width: 65, type: 'text' },
  { title: 'No. Batch', width: 120, type: 'text' },
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 85, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 85, type: 'number' },
  { title: 'Durasi (menit)', width: 105, type: 'number', readOnly: true },
  { title: 'Planned / Unplanned', width: 160, type: 'select', options: ['Planned', 'Unplanned'] },
  { title: 'Root Cause', width: 150, type: 'select', options: ['Production', 'Mechanical', 'Electrical', 'Utility', 'QA', 'QC', 'Warehouse', 'PPIC', 'R&D'] },
  { title: 'Proses', width: 130, type: 'select', options: ['Blowing', 'Filling', 'Mixing', 'Autoclave'] },
  { title: 'Unit', width: 180, type: 'select_unit' },
  { title: 'Kasus', width: 400, type: 'text' },
];

// Memoized Row Components for high performance
const OEERow = React.memo(({ rowData, rowIdx, onChange, onKeyDown, onPaste }) => {
  return (
    <tr className="hover:bg-emerald-50/40 border-b border-slate-200 text-xs">
      {OEE_COLS_META.map((col, colIdx) => {
        const val = rowData[colIdx] ?? '';
        const isSticky = col.stickyLeft !== undefined;
        const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 10 } : {};

        let cellContent;
        if (col.readOnly) {
          cellContent = (
            <div className="w-full h-7 px-2 flex items-center bg-slate-100 text-slate-600 select-none overflow-hidden text-ellipsis whitespace-nowrap">
              {val}
            </div>
          );
        } else if (col.type === 'select') {
          cellContent = (
            <select
              value={val}
              onChange={(e) => onChange(rowIdx, colIdx, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, rowIdx, colIdx, 'oee')}
              data-grid="oee"
              data-row={rowIdx}
              data-col={colIdx}
              className="w-full h-7 px-1 bg-white border-0 focus:ring-1 focus:ring-emerald-500 text-xs outline-none"
            >
              <option value=""></option>
              {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          );
        } else {
          cellContent = (
            <input
              type={col.type === 'date' ? 'date' : 'text'}
              value={val}
              onChange={(e) => onChange(rowIdx, colIdx, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, rowIdx, colIdx, 'oee')}
              onPaste={(e) => onPaste(e, rowIdx, colIdx, true)}
              data-grid="oee"
              data-row={rowIdx}
              data-col={colIdx}
              className="w-full h-7 px-2 bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs outline-none"
            />
          );
        }

        return (
          <td
            key={colIdx}
            style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
            className={`p-0 border-r border-slate-200 ${isSticky ? 'bg-white shadow-[1px_0_0_0_#e2e8f0]' : ''}`}
          >
            {cellContent}
          </td>
        );
      })}
    </tr>
  );
});

const DTRow = React.memo(({ rowData, rowIdx, onChange, onKeyDown, onPaste }) => {
  const prosesValue = rowData[DC.PROSES];
  const unitOptions = UNIT_MAP_C[prosesValue] || ALL_UNITS_C;

  return (
    <tr className="hover:bg-indigo-50/40 border-b border-slate-200 text-xs">
      {DT_COLS_META.map((col, colIdx) => {
        const val = rowData[colIdx] ?? '';
        const isSticky = col.stickyLeft !== undefined;
        const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 10 } : {};

        let cellContent;
        if (col.readOnly) {
          cellContent = (
            <div className="w-full h-7 px-2 flex items-center bg-slate-100 text-slate-600 select-none overflow-hidden text-ellipsis whitespace-nowrap">
              {val}
            </div>
          );
        } else if (col.type === 'select') {
          cellContent = (
            <select
              value={val}
              onChange={(e) => onChange(rowIdx, colIdx, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, rowIdx, colIdx, 'dt')}
              data-grid="dt"
              data-row={rowIdx}
              data-col={colIdx}
              className="w-full h-7 px-1 bg-white border-0 focus:ring-1 focus:ring-indigo-500 text-xs outline-none"
            >
              <option value=""></option>
              {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          );
        } else if (col.type === 'select_unit') {
          cellContent = (
            <select
              value={val}
              onChange={(e) => onChange(rowIdx, colIdx, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, rowIdx, colIdx, 'dt')}
              data-grid="dt"
              data-row={rowIdx}
              data-col={colIdx}
              className="w-full h-7 px-1 bg-white border-0 focus:ring-1 focus:ring-indigo-500 text-xs outline-none"
            >
              <option value=""></option>
              {unitOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          );
        } else {
          cellContent = (
            <input
              type={col.type === 'date' ? 'date' : 'text'}
              value={val}
              onChange={(e) => onChange(rowIdx, colIdx, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, rowIdx, colIdx, 'dt')}
              onPaste={(e) => onPaste(e, rowIdx, colIdx, false)}
              data-grid="dt"
              data-row={rowIdx}
              data-col={colIdx}
              className="w-full h-7 px-2 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white text-xs outline-none"
            />
          );
        }

        return (
          <td
            key={colIdx}
            style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
            className={`p-0 border-r border-slate-200 ${isSticky ? 'bg-white shadow-[1px_0_0_0_#e2e8f0]' : ''}`}
          >
            {cellContent}
          </td>
        );
      })}
    </tr>
  );
});

export default function InputC() {
  const { user } = useAuth();

  const [oeeData, setOeeData] = useState(() => getCachedData('C_DATA_OEE', getEmptyOEE, 100));
  const [dtData, setDtData] = useState(() => getCachedData('C_DATA_DT', getEmptyDT, 100));

  const oeeIds = useRef(getCachedIds('C_IDS_OEE'));
  const dtIds = useRef(getCachedIds('C_IDS_DT'));
  const oeeTimers = useRef({});
  const dtTimers = useRef({});

  const triggerAutosaveOEE = useCallback((rIdx, rowData) => {
    if (oeeTimers.current[rIdx]) clearTimeout(oeeTimers.current[rIdx]);

    oeeTimers.current[rIdx] = setTimeout(async () => {
      if (!rowData[C.NO_BATCH] && !rowData[C.TANGGAL] && !rowData[C.SHIFT]) return;

      const payloadData = {
        original_id: oeeIds.current[rIdx] || null,
        no_batch: rowData[C.NO_BATCH],
        tanggal: rowData[C.TANGGAL],
        shift: rowData[C.SHIFT],
        group: rowData[C.GROUP],
        reject_botol: rowData[C.REJ_BOTOL],
        reject_preform: rowData[C.REJ_PREFORM],
        reject_blow: rowData[C.REJ_BLOW],
        volume_botol: rowData[C.VOL_BOTOL],
        cnt_start: rowData[C.CNT_START],
        cnt_end: rowData[C.CNT_END],
        cnt_sub: rowData[C.CNT_SUB],
        utuh: rowData[C.UTUH],
        jml_batch: rowData[C.JML_BATCH],
        r_washing: rowData[C.WASH],
        r_vk: rowData[C.VK],
        r_vl: rowData[C.VL],
        r_nocap: rowData[C.TANPA_CAP_F],
        r_sealnok: rowData[C.SEAL_NOK],
        r_others: rowData[C.OTHERS_F],
        r_sub: rowData[C.SUB_FILL],
        s_ipc: rowData[C.IPC],
        s_others: rowData[C.OTHERS_S],
        s_sub: rowData[C.SUB_SAMPLES],
        trf_st: rowData[C.TRF_TO_ST],
        pre_in: rowData[C.INPUT_STERIL],
        pre_bocor: rowData[C.REJ_BOCOR],
        pre_nocap: rowData[C.REJ_TANPA_CAP],
        pre_vol: rowData[C.REJ_VOL],
        pre_thermo: rowData[C.REJ_THERMO],
        pre_lain: rowData[C.REJ_LAINLAIN],
        pre_rej_total: rowData[C.TOTAL_REJ_BS],
        pre_out: rowData[C.OUTPUT_CHAMBER],
        av_sh: rowData[C.AT_SH],
        av_sm: rowData[C.AT_SM],
        av_eh: rowData[C.AT_EH],
        av_em: rowData[C.AT_EM],
        av_sub: rowData[C.AT_SUB],
        total_avail_shift: rowData[C.AT_TOTAL],
        run_sh: rowData[C.RT_SH],
        run_sm: rowData[C.RT_SM],
        run_eh: rowData[C.RT_EH],
        run_em: rowData[C.RT_EM],
        run_sub: rowData[C.RT_SUB],
        lc_sh: rowData[C.LC_SH],
        lc_sm: rowData[C.LC_SM],
        lc_eh: rowData[C.LC_EH],
        lc_em: rowData[C.LC_EM],
        lc_sub: rowData[C.LC_SUB]
      };

      const actionType = payloadData.original_id ? 'update_reject_c' : 'submit_reject_c';
      const res = await sendAutoSave({ action: actionType, data: payloadData, user });

      if (res.status === 'success' && res.original_id) {
        oeeIds.current[rIdx] = res.original_id;
        localStorage.setItem('C_IDS_OEE', JSON.stringify(oeeIds.current));
      }
    }, 1000);
  }, [user]);

  const triggerAutosaveDT = useCallback((rIdx, rowData) => {
    if (dtTimers.current[rIdx]) clearTimeout(dtTimers.current[rIdx]);

    dtTimers.current[rIdx] = setTimeout(async () => {
      if (!rowData[DC.TANGGAL] && !rowData[DC.NO_BATCH]) return;

      const payloadData = {
        original_id: dtIds.current[rIdx] || null,
        tanggal: rowData[DC.TANGGAL],
        shift: rowData[DC.SHIFT],
        group: rowData[DC.GRUP],
        no_batch: rowData[DC.NO_BATCH],
        start_h: rowData[DC.SH], start_m: rowData[DC.SM],
        end_h: rowData[DC.EH], end_m: rowData[DC.EM],
        duration: rowData[DC.DURASI],
        plan_unplan: rowData[DC.TYPE],
        root_cause: rowData[DC.ROOT],
        proses: rowData[DC.PROSES],
        unit: rowData[DC.UNIT],
        kasus: rowData[DC.KASUS],
      };

      const actionType = payloadData.original_id ? 'update_downtime_c' : 'submit_downtime_c';
      const res = await sendAutoSave({ action: actionType, data: payloadData, user });

      if (res.status === 'success' && res.original_id) {
        dtIds.current[rIdx] = res.original_id;
        localStorage.setItem('C_IDS_DT', JSON.stringify(dtIds.current));
      }
    }, 1000);
  }, [user]);

  const handleOEECellChange = useCallback((rowIdx, colIdx, value) => {
    setOeeData(prev => {
      const next = [...prev];
      const targetRow = [...next[rowIdx]];
      targetRow[colIdx] = value;
      const calculatedRow = calculateOEERow(targetRow);
      next[rowIdx] = calculatedRow;
      triggerAutosaveOEE(rowIdx, calculatedRow);
      localStorage.setItem('C_DATA_OEE', JSON.stringify(next));
      return next;
    });
  }, [triggerAutosaveOEE]);

  const handleDTCellChange = useCallback((rowIdx, colIdx, value) => {
    setDtData(prev => {
      const next = [...prev];
      const targetRow = [...next[rowIdx]];
      targetRow[colIdx] = value;
      if (colIdx === DC.PROSES) {
        targetRow[DC.UNIT] = '';
      }
      const calculatedRow = calculateDTRow(targetRow);
      next[rowIdx] = calculatedRow;
      triggerAutosaveDT(rowIdx, calculatedRow);
      localStorage.setItem('C_DATA_DT', JSON.stringify(next));
      return next;
    });
  }, [triggerAutosaveDT]);

  const handlePaste = useCallback((e, startRowIdx, startColIdx, isOEE) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const rows = pasteText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (rows[rows.length - 1] === '') rows.pop();

    const setData = isOEE ? setOeeData : setDtData;
    const calcRow = isOEE ? calculateOEERow : calculateDTRow;
    const triggerSave = isOEE ? triggerAutosaveOEE : triggerAutosaveDT;
    const maxCols = isOEE ? 55 : 14;

    setData(prevData => {
      const nextData = [...prevData];
      rows.forEach((rowStr, rOffset) => {
        const targetRowIdx = startRowIdx + rOffset;
        if (targetRowIdx >= nextData.length) return;

        const cells = rowStr.split('\t');
        const targetRow = [...nextData[targetRowIdx]];

        cells.forEach((cellVal, cOffset) => {
          const targetColIdx = startColIdx + cOffset;
          if (targetColIdx >= maxCols) return;
          targetRow[targetColIdx] = cellVal.trim();
        });

        const calculatedRow = calcRow(targetRow);
        nextData[targetRowIdx] = calculatedRow;
        triggerSave(targetRowIdx, calculatedRow);
      });

      localStorage.setItem(isOEE ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(nextData));
      return nextData;
    });
  }, [triggerAutosaveOEE, triggerAutosaveDT]);

  const handleKeyDown = useCallback((e, rowIdx, colIdx, gridType) => {
    if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
      e.preventDefault();
      let nextRow = rowIdx;
      if (e.key === 'ArrowDown' || e.key === 'Enter') nextRow += 1;
      if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIdx - 1);

      const nextElem = document.querySelector(`[data-grid="${gridType}"][data-row="${nextRow}"][data-col="${colIdx}"]`);
      if (nextElem) nextElem.focus();
    }
  }, []);

  const loadDataServer = useCallback(async () => {
    if (!user) return;
    try {
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectC(user),
        fetchTodayDowntimeC(user),
      ]);

      let mappedOEE = [];
      let mappedOEEIds = [];
      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {
        mappedOEE = [...resOEE.data].reverse().map((row) => {
          mappedOEEIds.push(row.id);
          const r = [
            row.no_batch ?? '', parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.reject_botol ?? '', row.reject_preform ?? '',
            row.reject_blow ?? '', row.volume_botol ?? '', row.cnt_start ?? '', row.cnt_end ?? '', row.cnt_sub ?? '', row.utuh ?? 'Y',
            row.jml_batch ?? '', '', row.r_washing ?? '', row.r_vk ?? '', row.r_vl ?? '', row.r_nocap ?? '',
            row.r_sealnok ?? '', row.r_others ?? '', row.r_sub ?? '', row.s_ipc ?? '', row.s_others ?? '', row.s_sub ?? '',
            row.trf_st ?? '', '', '', '', row.pre_in ?? '', row.pre_bocor ?? '',
            row.pre_nocap ?? '', row.pre_vol ?? '', row.pre_thermo ?? '', row.pre_lain ?? '', row.pre_rej_total ?? '', row.pre_out ?? '',
            row.av_sh ?? '', row.av_sm ?? '', row.av_eh ?? '', row.av_em ?? '', row.av_sub ?? '', row.total_avail_shift ?? '',
            row.run_sh ?? '', row.run_sm ?? '', row.run_eh ?? '', row.run_em ?? '', row.run_sub ?? '', row.lc_sh ?? '',
            row.lc_sm ?? '', row.lc_eh ?? '', row.lc_em ?? '', row.lc_sub ?? '', '', '', ''
          ];
          return calculateOEERow(r);
        });
      }

      let mappedDT = [];
      let mappedDTIds = [];
      if (resDT?.status === 'success' && Array.isArray(resDT.data)) {
        mappedDT = [...resDT.data].reverse().map((row) => {
          mappedDTIds.push(row.id);
          const r = [
            parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.no_batch ?? '', row.start_h ?? '', row.start_m ?? '',
            row.end_h ?? '', row.end_m ?? '', row.duration ?? '', row.plan_unplan ?? 'Unplanned', row.root_cause ?? '', row.proses ?? '',
            row.unit ?? '', row.kasus ?? ''
          ];
          return calculateDTRow(r);
        });
      }

      const EMPTY_ROWS = 100;
      const finalOEE = [...mappedOEE, ...Array.from({ length: EMPTY_ROWS }, getEmptyOEE)];
      const finalDT = [...mappedDT, ...Array.from({ length: EMPTY_ROWS }, getEmptyDT)];

      oeeIds.current = [...mappedOEEIds, ...Array(EMPTY_ROWS).fill(null)];
      dtIds.current = [...mappedDTIds, ...Array(EMPTY_ROWS).fill(null)];

      setOeeData(finalOEE.slice(0, 100));
      setDtData(finalDT.slice(0, 100));

      localStorage.setItem('C_DATA_OEE', JSON.stringify(finalOEE.slice(0, 100)));
      localStorage.setItem('C_DATA_DT', JSON.stringify(finalDT.slice(0, 100)));
      localStorage.setItem('C_IDS_OEE', JSON.stringify(oeeIds.current));
      localStorage.setItem('C_IDS_DT', JSON.stringify(dtIds.current));

    } catch (error) {
      console.error('[InputC] loadDataServer error:', error);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDataServer();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDataServer]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-wider uppercase text-emerald-800">
            OEE Line 4 — Zone C (Native Grid)
          </h1>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
            ⚡ HTML Fast Grid Enabled
          </span>
        </div>

        <div className="bg-white border border-slate-300 shadow-lg mb-10 rounded overflow-hidden">
          <div className="overflow-x-auto max-h-[680px]">
            <table className="border-collapse w-full text-left table-fixed">
              <thead className="bg-slate-800 text-white text-[11px] uppercase tracking-wider font-bold sticky top-0 z-20">
                <tr className="border-b border-slate-700 text-center divide-x divide-slate-700">
                  <th colSpan="8" className="py-2 bg-slate-800 sticky left-0 z-30">General Info</th>
                  <th colSpan="6" className="py-2 bg-emerald-900">Counter Filling</th>
                  <th colSpan="7" className="py-2 bg-slate-800">Rejection Filling</th>
                  <th colSpan="3" className="py-2 bg-slate-800">Samples</th>
                  <th colSpan="2" className="py-2 bg-emerald-900">Hasil Baik</th>
                  <th colSpan="2" className="py-2 bg-slate-800">% Yield</th>
                  <th colSpan="8" className="py-2 bg-red-950">Reject Before Steril</th>
                  <th colSpan="6" className="py-2 bg-blue-950">Available Time</th>
                  <th colSpan="5" className="py-2 bg-indigo-950">Run Time</th>
                  <th colSpan="5" className="py-2 bg-purple-950">Line Clearance</th>
                  <th colSpan="1" className="py-2 bg-slate-800">Prep</th>
                </tr>
                <tr className="border-b border-slate-700 text-center divide-x divide-slate-700 bg-slate-700/80">
                  <th colSpan="8" className="py-1 bg-slate-800 sticky left-0 z-30"></th>
                  <th colSpan="3" className="py-1">Per Cycle Batch</th>
                  <th colSpan="3" className="py-1"></th>
                  <th colSpan="1" className="py-1">Washing</th>
                  <th colSpan="2" className="py-1">Filling</th>
                  <th colSpan="2" className="py-1">Sealing</th>
                  <th colSpan="2" className="py-1"></th>
                  <th colSpan="2" className="py-1">Botol</th>
                  <th colSpan="1" className="py-1"></th>
                  <th colSpan="2" className="py-1">Transfer to ST</th>
                  <th colSpan="2" className="py-1"></th>
                  <th colSpan="1" className="py-1"></th>
                  <th colSpan="6" className="py-1">Reject Before Steril</th>
                  <th colSpan="1" className="py-1"></th>
                  <th colSpan="6" className="py-1"></th>
                  <th colSpan="5" className="py-1">Filling</th>
                  <th colSpan="5" className="py-1">CIP Minor</th>
                  <th colSpan="1" className="py-1"></th>
                </tr>
                <tr className="border-b border-slate-700 text-center divide-x divide-slate-700 bg-slate-900">
                  {OEE_COLS_META.map((col, idx) => {
                    const isSticky = col.stickyLeft !== undefined;
                    const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 30 } : {};
                    return (
                      <th
                        key={idx}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
                        className={`py-2 px-1 overflow-hidden text-ellipsis whitespace-nowrap ${isSticky ? 'bg-slate-900 shadow-[1px_0_0_0_#334155]' : ''}`}
                      >
                        {col.title}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {oeeData.map((row, rowIdx) => (
                  <OEERow
                    key={rowIdx}
                    rowData={row}
                    rowIdx={rowIdx}
                    onChange={handleOEECellChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 4 — Zone C (Native Grid)
          </h2>
        </div>

        <div className="bg-white border border-slate-300 shadow-lg rounded overflow-hidden mb-12">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="border-collapse w-full text-left table-fixed">
              <thead className="bg-indigo-950 text-white text-[11px] uppercase tracking-wider font-bold sticky top-0 z-20">
                <tr className="border-b border-indigo-900 text-center divide-x divide-indigo-900">
                  {DT_COLS_META.map((col, idx) => {
                    const isSticky = col.stickyLeft !== undefined;
                    const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 30 } : {};
                    return (
                      <th
                        key={idx}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
                        className={`py-2.5 px-2 overflow-hidden text-ellipsis whitespace-nowrap ${isSticky ? 'bg-indigo-950 shadow-[1px_0_0_0_#312e81]' : ''}`}
                      >
                        {col.title}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dtData.map((row, rowIdx) => (
                  <DTRow
                    key={rowIdx}
                    rowData={row}
                    rowIdx={rowIdx}
                    onChange={handleDTCellChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}