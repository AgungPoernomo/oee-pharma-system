import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectC, fetchTodayDowntimeC } from '../../../services/api';
import { scrollCellIntoView } from '../../../lib/utils';
import { Toaster } from 'react-hot-toast';

const TEORI_BATCH = {
  "100 ML": 56880, "250 ML": 21509, "500 ML": 21730, "1000 ML": 60194,
};
const VOLUMES = ["100 ML", "250 ML", "500 ML", "1000 ML"];

const C = {
  NO_BATCH: 0, TANGGAL: 1, SHIFT: 2, GROUP: 3, REJ_BOTOL: 4, REJ_PREFORM: 5,
  REJ_BLOW: 6, VOL_BOTOL: 7, CNT_START: 8, CNT_END: 9, CNT_SUB: 10, UTUH: 11,
  JML_BATCH: 12, TOTAL_CNT: 13, WASH: 14, VK: 15, VL: 16, TANPA_CAP_F: 17,
  SEAL_NOK: 18, OTHERS_F: 19, SUB_FILL: 20, IPC: 21, OTHERS_S: 22, SUB_SAMPLES: 23,
  TRF_TO_ST: 24, TOTAL_KESEL: 25, YIELD_BATCH: 26, AVG_SHIFT: 27, INPUT_STERIL: 28,
  REJ_BOCOR: 29, REJ_TANPA_CAP: 30, REJ_VOL: 31, REJ_THERMO: 32, REJ_LAINLAIN: 33,
  TOTAL_REJ_BS: 34, OUTPUT_CHAMBER: 35, AT_SH: 36, AT_SM: 37, AT_EH: 38, AT_EM: 39,
  AT_SUB: 40, AT_TOTAL: 41, RT_SH: 42, RT_SM: 43, RT_EH: 44, RT_EM: 45, RT_SUB: 46,
  LC_SH: 47, LC_SM: 48, LC_EH: 49, LC_EM: 50, LC_SUB: 51,
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

const incrementBatchNumber = (str, step) => {
  if (!str || String(str).length < 2) return str;
  const s = String(str);
  const prefix = s.slice(0, -2);
  const last2 = s.slice(-2);
  const num = parseInt(last2, 10);
  if (isNaN(num)) return str;
  const nextNum = num + step;
  return prefix + String(nextNum < 0 ? 0 : nextNum).padStart(2, '0');
};

const getEmptyOEE = () => {
  const arr = Array(52).fill('');
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
    setV(C.INPUT_STERIL, trf > 0 ? trf : 0);
  } else {
    setV(C.TRF_TO_ST, ''); setV(C.TOTAL_KESEL, ''); setV(C.YIELD_BATCH, ''); setV(C.INPUT_STERIL, '');
  }
  setV(C.TOTAL_REJ_BS, v(C.REJ_BOCOR) + v(C.REJ_TANPA_CAP) + v(C.REJ_VOL) + v(C.REJ_THERMO) + v(C.REJ_LAINLAIN));
  const inputSterilVal = v(C.INPUT_STERIL);
  setV(C.OUTPUT_CHAMBER, inputSterilVal > 0 ? inputSterilVal - v(C.TOTAL_REJ_BS) : '');
  setV(C.AT_SUB, timeDiff(C.AT_SH, C.AT_SM, C.AT_EH, C.AT_EM));
  setV(C.RT_SUB, timeDiff(C.RT_SH, C.RT_SM, C.RT_EH, C.RT_EM));
  setV(C.LC_SUB, timeDiff(C.LC_SH, C.LC_SM, C.LC_EH, C.LC_EM));

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

const recalculateAllOEE = (data) => {
  const shiftData = {};
  
  data.forEach((row, index) => {
    const tanggal = row[C.TANGGAL];
    const shift = row[C.SHIFT];
    
    if (tanggal && shift) {
      const key = `${tanggal}_${shift}`;
      if (!shiftData[key]) {
        shiftData[key] = {
          atSubSum: 0,
          cntSubSum: 0,
          yieldBatchSum: 0,
          yieldBatchCount: 0,
          lastRowIdx: -1
        };
      }
      
      const atSub = parseFloat(row[C.AT_SUB]);
      if (!isNaN(atSub)) shiftData[key].atSubSum += atSub;
      
      const cntSub = parseFloat(row[C.CNT_SUB]);
      if (!isNaN(cntSub)) shiftData[key].cntSubSum += cntSub;
      
      const yieldBatch = parseFloat(row[C.YIELD_BATCH]);
      if (!isNaN(yieldBatch)) {
        shiftData[key].yieldBatchSum += yieldBatch;
        shiftData[key].yieldBatchCount += 1;
      }
      
      shiftData[key].lastRowIdx = index;
    }
  });

  return data.map((row, index) => {
    const tanggal = row[C.TANGGAL];
    const shift = row[C.SHIFT];
    
    let newAtTotal = '';
    let newTotalCnt = '';
    let newAvgShift = '';
    
    if (tanggal && shift) {
      const key = `${tanggal}_${shift}`;
      if (shiftData[key] && shiftData[key].lastRowIdx === index) {
        newAtTotal = shiftData[key].atSubSum;
        newTotalCnt = shiftData[key].cntSubSum;
        if (shiftData[key].yieldBatchCount > 0) {
          newAvgShift = (shiftData[key].yieldBatchSum / shiftData[key].yieldBatchCount).toFixed(2);
        }
      }
    }
    
    if (row[C.AT_TOTAL] !== newAtTotal || row[C.TOTAL_CNT] !== newTotalCnt || row[C.AVG_SHIFT] !== newAvgShift) {
      const newRow = [...row];
      newRow[C.AT_TOTAL] = newAtTotal;
      newRow[C.TOTAL_CNT] = newTotalCnt;
      newRow[C.AVG_SHIFT] = newAvgShift;
      return newRow;
    }
    
    return row;
  });
};

const findEdgeCell = (data, r, c, key, maxR, maxC) => {
  let dr = 0, dc = 0;
  if (key === 'ArrowUp') dr = -1;
  if (key === 'ArrowDown') dr = 1;
  if (key === 'ArrowLeft') dc = -1;
  if (key === 'ArrowRight') dc = 1;

  const isVal = (rowIdx, colIdx) => {
    if (rowIdx < 0 || rowIdx > maxR || colIdx < 0 || colIdx > maxC) return false;
    const v = data[rowIdx]?.[colIdx];
    return v !== null && v !== undefined && v !== '';
  };

  let currR = r + dr;
  let currC = c + dc;
  if (currR < 0 || currR > maxR || currC < 0 || currC > maxC) return { r, c };

  const startHasVal = isVal(r, c);
  const nextHasVal = isVal(currR, currC);

  if (!startHasVal || !nextHasVal) {
    while (currR >= 0 && currR <= maxR && currC >= 0 && currC <= maxC) {
      if (isVal(currR, currC)) return { r: currR, c: currC };
      currR += dr;
      currC += dc;
    }
    return {
      r: Math.max(0, Math.min(maxR, currR - dr)),
      c: Math.max(0, Math.min(maxC, currC - dc))
    };
  } else {
    while (currR >= 0 && currR <= maxR && currC >= 0 && currC <= maxC) {
      if (!isVal(currR + dr, currC + dc)) return { r: currR, c: currC };
      currR += dr;
      currC += dc;
    }
    return { r: currR, c: currC };
  }
};

const OEE_COLS_META = [
  { title: 'No Batch', width: 100, type: 'text', stickyLeft: 60 },
  { title: 'Tanggal', width: 115, type: 'date', stickyLeft: 160 },
  { title: 'Shift', width: 55, type: 'number', stickyLeft: 275 },
  { title: 'Group', width: 55, type: 'text', stickyLeft: 330 },
  { title: 'Reject Botol', width: 85, type: 'number' },
  { title: 'Reject Preform', width: 90, type: 'number' },
  { title: 'Reject Blow', width: 85, type: 'number', readOnly: true },
  { title: 'Volume Botol', width: 100, type: 'select', options: VOLUMES },
  { title: 'Start', width: 75, type: 'number' },
  { title: 'End', width: 75, type: 'number' },
  { title: 'Sub Total', width: 80, type: 'number', readOnly: true },
  { title: 'Utuh?', width: 60, type: 'select', options: ['Y', 'N'] },
  { title: 'Jumlah Batch', width: 95, type: 'number', readOnly: true },
  { title: 'Total Cnt/Shift', width: 105, type: 'number', readOnly: true },
  { title: 'Washing', width: 75, type: 'number' },
  { title: 'VK', width: 60, type: 'number' },
  { title: 'VL', width: 60, type: 'number' },
  { title: 'Tanpa Cap', width: 80, type: 'number' },
  { title: 'Seal NOT OK', width: 90, type: 'number' },
  { title: 'Others / Bocor', width: 90, type: 'number' },
  { title: 'Sub Total Fill-Seal', width: 125, type: 'number', readOnly: true },
  { title: 'IPC', width: 60, type: 'number' },
  { title: 'Others', width: 65, type: 'number' },
  { title: 'Sub Total Samples', width: 125, type: 'number', readOnly: true },
  { title: 'Transfer to ST', width: 105, type: 'number', readOnly: true },
  { title: 'Total Per Shift', width: 125, type: 'number', readOnly: true },
  { title: 'Yield / Batch (%)', width: 105, type: 'number', readOnly: true },
  { title: 'AVG / Shift (%)', width: 105, type: 'number', readOnly: true },
  { title: 'Input Before Steril', width: 125, type: 'number', readOnly: true },
  { title: 'Reject Bocor', width: 90, type: 'number' },
  { title: 'Reject Tanpa Cap', width: 115, type: 'number' },
  { title: 'Reject Vol', width: 80, type: 'number' },
  { title: 'Reject Thermo', width: 95, type: 'number' },
  { title: 'Reject Lain-lain', width: 105, type: 'number' },
  { title: 'Total Reject BS', width: 110, type: 'number', readOnly: true },
  { title: 'Output (Chamber)', width: 120, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 75, type: 'number' },
  { title: 'Start (Menit)', width: 80, type: 'number' },
  { title: 'End (Jam)', width: 75, type: 'number' },
  { title: 'End (Menit)', width: 80, type: 'number' },
  { title: 'Sub Total', width: 80, type: 'number', readOnly: true },
  { title: 'Total / Shift', width: 90, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 75, type: 'number' },
  { title: 'Start (Menit)', width: 80, type: 'number' },
  { title: 'End (Jam)', width: 75, type: 'number' },
  { title: 'End (Menit)', width: 80, type: 'number' },
  { title: 'Sub Total', width: 80, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 75, type: 'number' },
  { title: 'Start (Menit)', width: 80, type: 'number' },
  { title: 'End (Jam)', width: 75, type: 'number' },
  { title: 'End (Menit)', width: 80, type: 'number' },
  { title: 'Sub Total', width: 80, type: 'number', readOnly: true },
];

const DT_COLS_META = [
  { title: 'Tanggal', width: 120, type: 'date', stickyLeft: 60 },
  { title: 'Shift', width: 60, type: 'number', stickyLeft: 180 },
  { title: 'Grup', width: 60, type: 'text', stickyLeft: 240 },
  { title: 'No. Batch', width: 115, type: 'text', stickyLeft: 300 },
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 85, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 85, type: 'number' },
  { title: 'Durasi (menit)', width: 105, type: 'number', readOnly: true },
  { title: 'Planned / Unplanned', width: 155, type: 'select', options: ['Planned', 'Unplanned'] },
  { title: 'Root Cause', width: 145, type: 'select', options: ['Production', 'Mechanical', 'Electrical', 'Utility', 'QA', 'QC', 'Warehouse', 'PPIC', 'R&D'] },
  { title: 'Proses', width: 125, type: 'select', options: ['Blowing', 'Filling', 'Mixing', 'Autoclave'] },
  { title: 'Unit', width: 180, type: 'select_unit' },
  { title: 'Kasus', width: 400, type: 'text' },
];

const AutocompleteCombobox = ({
  initVal,
  options,
  onFinish,
  onCancel,
  editMode,
  gridType
}) => {
  const [val, setVal] = useState(initVal || '');
  const [isOpen, setIsOpen] = useState(true);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [rect, setRect] = useState(null);

  const filteredOptions = (options || []).filter(o =>
    String(o).toLowerCase().includes(String(val).toLowerCase())
  );

  const getInitialIdx = () => {
    if (!initVal) return 0;
    const found = filteredOptions.findIndex(o => String(o).toLowerCase() === String(initVal).toLowerCase());
    return found !== -1 ? found : 0;
  };

  const [highlightIdx, setHighlightIdx] = useState(getInitialIdx);

  const updateRect = useCallback(() => {
    if (inputRef.current) {
      setRect(inputRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [updateRect]);

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-idx="${highlightIdx}"]`);
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIdx, isOpen]);

  const getAutoSelectedVal = (currentVal) => {
    if (isOpen && filteredOptions.length > 0) {
      return filteredOptions[highlightIdx] !== undefined ? filteredOptions[highlightIdx] : filteredOptions[0];
    }
    return currentVal;
  };

  return (
    <div className="w-full h-full relative flex items-center">
      <input
        ref={inputRef}
        type="text"
        autoFocus
        value={val}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onFocus={(e) => {
          updateRect();
          if (editMode === 'direct') {
            const el = e.target;
            el.selectionStart = el.selectionEnd = el.value.length;
          }
        }}
        onChange={(e) => {
          setVal(e.target.value);
          setIsOpen(true);
          setHighlightIdx(0);
        }}
        onBlur={() => {
          onFinish(getAutoSelectedVal(val));
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'ArrowDown') {
            if (isOpen && filteredOptions.length > 0) {
              e.preventDefault();
              setHighlightIdx(prev => (prev + 1) % filteredOptions.length);
            } else if (editMode === 'direct') {
              e.preventDefault();
              onFinish(getAutoSelectedVal(val), 'ArrowDown');
            }
          } else if (e.key === 'ArrowUp') {
            if (isOpen && filteredOptions.length > 0) {
              e.preventDefault();
              setHighlightIdx(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
            } else if (editMode === 'direct') {
              e.preventDefault();
              onFinish(getAutoSelectedVal(val), 'ArrowUp');
            }
          } else if (e.key === 'Enter') {
            e.preventDefault();
            onFinish(getAutoSelectedVal(val), 'Enter');
          } else if (e.key === 'Tab') {
            e.preventDefault();
            onFinish(getAutoSelectedVal(val), 'Tab');
          } else if (e.key === 'Escape') {
            e.preventDefault();
            if (isOpen) setIsOpen(false);
            else onCancel();
          } else if (editMode === 'direct' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            onFinish(getAutoSelectedVal(val), e.key);
          }
        }}
        className={`w-full h-7 px-1.5 text-xs font-semibold border-2 outline-none bg-white z-50 relative pr-5 ${gridType === 'oee' ? 'border-emerald-600' : 'border-indigo-600'}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(prev => !prev);
          updateRect();
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-50 px-0.5 focus:outline-none"
      >
        ▼
      </button>

      {isOpen && rect && filteredOptions.length > 0 && createPortal(
        <div
          ref={listRef}
          style={{
            position: 'fixed',
            top: rect.bottom + 2,
            left: rect.left,
            width: Math.max(rect.width, 220),
            maxHeight: '220px'
          }}
          className="overflow-y-auto bg-white border border-slate-300 shadow-2xl rounded py-1 z-[999999] text-xs font-sans"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {filteredOptions.map((opt, idx) => {
            const isHi = idx === highlightIdx;
            return (
              <div
                key={opt}
                data-idx={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFinish(opt, 'Enter');
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`px-2.5 py-1.5 cursor-pointer font-medium transition-colors ${isHi ? (gridType === 'oee' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white') : 'text-slate-700 hover:bg-slate-100'}`}
              >
                {opt}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

const SpreadsheetRow = React.memo(({
  rowData,
  rowIdx,
  colsMeta,
  gridType,
  isSelectedRow,
  selectionMinCol,
  selectionMaxCol,
  selectionMaxRow,
  editingColIdx,
  editMode,
  editingInitialValue,
  rowId,
  onSelectRow,
  onCellMouseDown,
  onCellMouseEnter,
  onCellDoubleClick,
  onFillHandleMouseDown,
  onFinishEdit,
  onCancelEdit,
  onRowContextMenu
}) => {
  const prosesValue = gridType === 'dt' ? rowData[DC.PROSES] : '';
  const unitOptions = gridType === 'dt' ? (UNIT_MAP_C[prosesValue] || ALL_UNITS_C) : [];

  return (
    <tr className="border-b border-slate-200 text-xs hover:bg-slate-50/60" onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, rowIdx, gridType)}>
      <td
        className="p-1 bg-slate-200 text-slate-700 font-mono text-center text-xs sticky left-0 z-30 cursor-pointer hover:bg-red-200 hover:text-red-800 transition-colors shadow-[1px_0_0_0_#cbd5e1] font-bold select-none"
        style={{ width: 60, minWidth: 60, maxWidth: 60, position: 'sticky', left: 0, zIndex: 30 }}
        onClick={() => onSelectRow && onSelectRow(rowIdx, gridType)}
        title="Klik untuk memilih baris ini"
      >
        {rowIdx + 1}
      </td>
      {colsMeta.map((col, colIdx) => {
        const val = rowData[colIdx] ?? '';
        const isSticky = col.stickyLeft !== undefined;
        const isSelected = isSelectedRow && colIdx >= selectionMinCol && colIdx <= selectionMaxCol;
        const isFillHandleCorner = isSelectedRow && rowIdx === selectionMaxRow && colIdx === selectionMaxCol;
        const isEditing = editingColIdx === colIdx;

        const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 10 } : {};

        let bgClass = 'bg-white';
        if (col.readOnly) bgClass = 'bg-slate-100 text-slate-600';
        if (isSelected && !isEditing) {
          bgClass = gridType === 'oee' ? 'bg-emerald-100' : 'bg-indigo-100';
        }
        if (isSticky && !isSelected) {
          bgClass = col.readOnly ? 'bg-slate-100' : 'bg-white';
        }

        const borderSticky = isSticky && colIdx === (gridType === 'oee' ? 3 : 3) ? 'shadow-[1px_0_0_0_#cbd5e1]' : '';
        const selectionRing = isSelected && !isEditing ? (gridType === 'oee' ? 'ring-1 ring-emerald-500 ring-inset' : 'ring-1 ring-indigo-500 ring-inset') : '';

        const initVal = (isEditing && editingInitialValue !== undefined) ? editingInitialValue : val;
        const relativeClass = (isFillHandleCorner || isEditing) ? 'relative' : '';

        return (
          <td
            key={colIdx}
            data-row={rowIdx}
            data-col={colIdx}
            style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
            className={`p-0 border-r border-slate-200 align-middle select-none ${relativeClass} ${bgClass} ${borderSticky} ${selectionRing}`}
            onMouseDown={(e) => onCellMouseDown(e, rowIdx, colIdx, gridType)}
            onMouseEnter={() => onCellMouseEnter(rowIdx, colIdx, gridType)}
            onDoubleClick={() => !col.readOnly && onCellDoubleClick(rowIdx, colIdx, gridType)}
          >
            {isEditing && !col.readOnly ? (
              col.type === 'select' || col.type === 'select_unit' ? (
                <AutocompleteCombobox
                  initVal={initVal}
                  options={col.type === 'select_unit' ? unitOptions : col.options}
                  onFinish={(newVal, moveKey) => onFinishEdit(rowIdx, colIdx, newVal, gridType, moveKey)}
                  onCancel={onCancelEdit}
                  editMode={editMode}
                  gridType={gridType}
                />
              ) : (
                <input
                  type={col.type === 'date' ? 'date' : 'text'}
                  autoFocus
                  defaultValue={initVal}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onFocus={(e) => {
                    if (editMode === 'direct') {
                      const el = e.target;
                      el.selectionStart = el.selectionEnd = el.value.length;
                    }
                  }}
                  onBlur={(e) => onFinishEdit(rowIdx, colIdx, e.target.value, gridType)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (editMode === 'direct') {
                      if (['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                        onFinishEdit(rowIdx, colIdx, e.currentTarget.value, gridType, e.key);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        onCancelEdit();
                      }
                    } else {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        onFinishEdit(rowIdx, colIdx, e.currentTarget.value, gridType, e.key);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        onCancelEdit();
                      }
                    }
                  }}
                  className={`w-full h-7 px-1.5 text-xs font-semibold border-2 outline-none bg-white z-50 relative ${gridType === 'oee' ? 'border-emerald-600' : 'border-indigo-600'}`}
                />
              )
            ) : (
              <div className={`w-full h-7 px-1.5 flex items-center overflow-hidden whitespace-nowrap text-ellipsis cursor-cell ${isFillHandleCorner ? 'relative' : ''}`}>
                {val}
                {isFillHandleCorner && !isEditing && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onFillHandleMouseDown(e, rowIdx, colIdx, gridType);
                    }}
                    className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border border-white cursor-crosshair z-30 ${gridType === 'oee' ? 'bg-emerald-600' : 'bg-indigo-600'}`}
                  />
                )}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}, (prev, next) => {
  if (prev.rowData !== next.rowData) return false;
  if (prev.isSelectedRow !== next.isSelectedRow) return false;
  if (prev.editingColIdx !== next.editingColIdx) return false;
  if (prev.editMode !== next.editMode) return false;
  if (prev.editingInitialValue !== next.editingInitialValue) return false;

  if (prev.isSelectedRow || next.isSelectedRow) {
    if (prev.selectionMinCol !== next.selectionMinCol) return false;
    if (prev.selectionMaxCol !== next.selectionMaxCol) return false;
    if (prev.selectionMaxRow !== next.selectionMaxRow) return false;
  }
  return true;
});

export default function InputC() {
  const { user } = useAuth();

  const [oeeData, setOeeData] = useState(() => getCachedData('C_DATA_OEE', getEmptyOEE, 100));
  const [dtData, setDtData] = useState(() => getCachedData('C_DATA_DT', getEmptyDT, 100));

  const [oeeSelection, setOeeSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const [dtSelection, setDtSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });

  const [oeeEditingCell, setOeeEditingCell] = useState(null);
  const [dtEditingCell, setDtEditingCell] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('table')) setContextMenu(null);
    });
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('contextmenu', handleCloseMenu);
    };
  }, []);

  const isDraggingRef = useRef({ oee: false, dt: false });
  const fillDragRef = useRef({ active: false });
  const oeeGridRef = useRef(null);
  const dtGridRef = useRef(null);

  const oeeIds = useRef(getCachedIds('C_IDS_OEE'));
  const dtIds = useRef(getCachedIds('C_IDS_DT'));
  const oeeTimers = useRef({});
  const dtTimers = useRef({});

  const oeeHistory = useRef([]);
  const oeeRedo = useRef([]);
  const dtHistory = useRef([]);
  const dtRedo = useRef([]);

  const pushHistory = useCallback((gridType, prevData) => {
    const histRef = gridType === 'oee' ? oeeHistory : dtHistory;
    const redoRef = gridType === 'oee' ? oeeRedo : dtRedo;
    if (histRef.current.length >= 50) histRef.current.shift();
    histRef.current.push(prevData);
    redoRef.current = [];
  }, []);

  const triggerAutosaveOEE = useCallback((rIdx, rowData) => {
    if (oeeTimers.current[rIdx]) clearTimeout(oeeTimers.current[rIdx]);

    oeeTimers.current[rIdx] = setTimeout(async () => {
      const original_id = oeeIds.current[rIdx] || null;
      const isValidKey = (val) => val !== '' && val !== null && val !== undefined && String(val).trim() !== '';
      const isKeyComplete = 
        isValidKey(rowData[C.TANGGAL]) &&
        isValidKey(rowData[C.NO_BATCH]) &&
        isValidKey(rowData[C.SHIFT]) &&
        isValidKey(rowData[C.AT_SH]) &&
        isValidKey(rowData[C.AT_SM]) &&
        isValidKey(rowData[C.AT_EH]) &&
        isValidKey(rowData[C.AT_EM]);

      if (!isKeyComplete) {
        if (original_id) {
          await sendAutoSave({ action: 'delete_reject_c', data: { original_id }, user });
          oeeIds.current[rIdx] = null;
          localStorage.setItem('C_IDS_OEE', JSON.stringify(oeeIds.current));
        }
        return;
      }

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
      const original_id = dtIds.current[rIdx] || null;
      const isValidKey = (val) => val !== '' && val !== null && val !== undefined && String(val).trim() !== '';
      const isKeyComplete = 
        isValidKey(rowData[DC.TANGGAL]) &&
        isValidKey(rowData[DC.NO_BATCH]) &&
        isValidKey(rowData[DC.SHIFT]) &&
        isValidKey(rowData[DC.SH]) &&
        isValidKey(rowData[DC.SM]) &&
        isValidKey(rowData[DC.EH]) &&
        isValidKey(rowData[DC.EM]);

      if (!isKeyComplete) {
        if (original_id) {
          await sendAutoSave({ action: 'delete_downtime_c', data: { original_id }, user });
          dtIds.current[rIdx] = null;
          localStorage.setItem('C_IDS_DT', JSON.stringify(dtIds.current));
        }
        return;
      }

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

  useEffect(() => {
    const nextData = recalculateAllOEE(oeeData);
    let changed = false;
    for (let i = 0; i < oeeData.length; i++) {
      if (nextData[i] !== oeeData[i]) {
        changed = true;
        triggerAutosaveOEE(i, nextData[i]);
      }
    }
    if (changed) {
      setOeeData(nextData);
      setTimeout(() => localStorage.setItem('C_DATA_OEE', JSON.stringify(nextData)), 0);
    }
  }, [oeeData, triggerAutosaveOEE]);

  const handleUndo = useCallback((gridType) => {
    const histRef = gridType === 'oee' ? oeeHistory : dtHistory;
    const redoRef = gridType === 'oee' ? oeeRedo : dtRedo;
    const setData = gridType === 'oee' ? setOeeData : setDtData;

    if (histRef.current.length === 0) return;
    setData(prevData => {
      redoRef.current.push(prevData);
      const targetState = histRef.current.pop();
      localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(targetState));
      const triggerSave = gridType === 'oee' ? triggerAutosaveOEE : triggerAutosaveDT;
      targetState.forEach((row, rIdx) => {
        if (row !== prevData[rIdx]) triggerSave(rIdx, row);
      });
      return targetState;
    });
  }, [triggerAutosaveOEE, triggerAutosaveDT]);

  const handleRedo = useCallback((gridType) => {
    const histRef = gridType === 'oee' ? oeeHistory : dtHistory;
    const redoRef = gridType === 'oee' ? oeeRedo : dtRedo;
    const setData = gridType === 'oee' ? setOeeData : setDtData;

    if (redoRef.current.length === 0) return;
    setData(prevData => {
      histRef.current.push(prevData);
      const targetState = redoRef.current.pop();
      localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(targetState));
      const triggerSave = gridType === 'oee' ? triggerAutosaveOEE : triggerAutosaveDT;
      targetState.forEach((row, rIdx) => {
        if (row !== prevData[rIdx]) triggerSave(rIdx, row);
      });
      return targetState;
    });
  }, [triggerAutosaveOEE, triggerAutosaveDT]);

  const handleSelectRow = useCallback((rowIdx, gridType) => {
    const maxCols = (gridType === 'oee' ? OEE_COLS_META : DT_COLS_META).length - 1;
    if (gridType === 'oee') {
      setOeeSelection({ startRow: rowIdx, startCol: 0, endRow: rowIdx, endCol: maxCols });
      setOeeEditingCell(null);
    } else {
      setDtSelection({ startRow: rowIdx, startCol: 0, endRow: rowIdx, endCol: maxCols });
      setDtEditingCell(null);
    }
  }, []);

  const handleRowContextMenu = useCallback((e, rowIdx, gridType) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = gridType === 'oee' ? oeeSelection : dtSelection;
    const minR = Math.min(sel.startRow, sel.endRow);
    const maxR = Math.max(sel.startRow, sel.endRow);
    if (rowIdx < minR || rowIdx > maxR) {
      handleSelectRow(rowIdx, gridType);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      gridType,
      rowIdx
    });
  }, [handleSelectRow, oeeSelection, dtSelection]);

  const handleDeleteRow = useCallback(async (gridType) => {
    const sel = gridType === 'oee' ? oeeSelection : dtSelection;
    const minR = Math.min(sel.startRow, sel.endRow);
    const maxR = Math.max(sel.startRow, sel.endRow);
    const idsRef = gridType === 'oee' ? oeeIds : dtIds;
    const setData = gridType === 'oee' ? setOeeData : setDtData;

    for (let r = minR; r <= maxR; r++) {
      const original_id = idsRef.current[r];
      if (original_id) {
        const actionType = gridType === 'oee' ? 'delete_reject_c' : 'delete_downtime_c';
        await sendAutoSave({ action: actionType, data: { original_id }, user });
      }
    }

    setData(prev => {
      const next = prev.filter((_, idx) => idx < minR || idx > maxR);
      idsRef.current = idsRef.current.filter((_, idx) => idx < minR || idx > maxR);
      const emptyFunc = gridType === 'oee' ? getEmptyOEE : getEmptyDT;
      while (next.length < 50) {
        next.push(emptyFunc());
      }
      localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(next));
      localStorage.setItem(gridType === 'oee' ? 'C_IDS_OEE' : 'C_IDS_DT', JSON.stringify(idsRef.current));
      return next;
    });

    if (gridType === 'oee') {
      setOeeSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    } else {
      setDtSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    }
  }, [oeeSelection, dtSelection, user]);

  const handleAdd1000Rows = useCallback((gridType) => {
    if (gridType === 'oee') {
      const newRows = Array.from({ length: 1000 }, getEmptyOEE);
      oeeIds.current = [...oeeIds.current, ...Array(1000).fill(null)];
      setOeeData(prev => {
        const next = [...prev, ...newRows];
        localStorage.setItem('C_DATA_OEE', JSON.stringify(next));
        localStorage.setItem('C_IDS_OEE', JSON.stringify(oeeIds.current));
        return next;
      });
    } else {
      const newRows = Array.from({ length: 1000 }, getEmptyDT);
      dtIds.current = [...dtIds.current, ...Array(1000).fill(null)];
      setDtData(prev => {
        const next = [...prev, ...newRows];
        localStorage.setItem('C_DATA_DT', JSON.stringify(next));
        localStorage.setItem('C_IDS_DT', JSON.stringify(dtIds.current));
        return next;
      });
    }
  }, []);

  const handleFillHandleMouseDown = useCallback((e, rowIdx, colIdx, gridType) => {
    if (e.button !== 0) return;
    const sel = gridType === 'oee' ? oeeSelection : dtSelection;
    const minR = Math.min(sel.startRow, sel.endRow);
    const maxR = Math.max(sel.startRow, sel.endRow);
    const minC = Math.min(sel.startCol, sel.endCol);
    const maxC = Math.max(sel.startCol, sel.endCol);

    fillDragRef.current = {
      active: true,
      gridType,
      startRow: minR,
      endRow: maxR,
      startCol: minC,
      endCol: maxC,
      targetRow: maxR,
      targetCol: maxC,
      isCtrl: e.ctrlKey || e.metaKey
    };
  }, [oeeSelection, dtSelection]);

  const handleCellMouseDown = useCallback((e, rowIdx, colIdx, gridType) => {
    if (e.button !== 0) return;
    isDraggingRef.current[gridType] = true;
    setTimeout(() => {
      if (gridType === 'oee') {
        setOeeSelection({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
        setOeeEditingCell(null);
        if (oeeGridRef.current) oeeGridRef.current.focus();
      } else {
        setDtSelection({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
        setDtEditingCell(null);
        if (dtGridRef.current) dtGridRef.current.focus();
      }
    }, 0);
  }, []);

  const handleCellMouseEnter = useCallback((rowIdx, colIdx, gridType) => {
    if (fillDragRef.current.active && fillDragRef.current.gridType === gridType) {
      fillDragRef.current.targetRow = rowIdx;
      fillDragRef.current.targetCol = colIdx;
      setTimeout(() => {
        if (gridType === 'oee') {
          setOeeSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
        } else {
          setDtSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
        }
      }, 0);
      return;
    }
    if (!isDraggingRef.current[gridType]) return;
    setTimeout(() => {
      if (gridType === 'oee') {
        setOeeSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
      } else {
        setDtSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
      }
    }, 0);
  }, []);

  const handleCellDoubleClick = useCallback((rowIdx, colIdx, gridType) => {
    setTimeout(() => {
      if (gridType === 'oee') {
        setOeeEditingCell({ row: rowIdx, col: colIdx, mode: 'enter' });
      } else {
        setDtEditingCell({ row: rowIdx, col: colIdx, mode: 'enter' });
      }
    }, 0);
  }, []);

  const handleFinishEdit = useCallback((rowIdx, colIdx, value, gridType, moveKey) => {
    setTimeout(() => {
      if (gridType === 'oee') {
        setOeeEditingCell(null);
        setOeeData(prev => {
          const next = [...prev];
          const targetRow = [...next[rowIdx]];
          if (targetRow[colIdx] !== value) {
            pushHistory('oee', prev);
            targetRow[colIdx] = value;
            const calculatedRow = calculateOEERow(targetRow);
            next[rowIdx] = calculatedRow;
            triggerAutosaveOEE(rowIdx, calculatedRow);
            setTimeout(() => localStorage.setItem('C_DATA_OEE', JSON.stringify(next)), 0);
          }
          return next;
        });
        let nextR = rowIdx;
        let nextC = colIdx;
        const maxR = oeeData.length - 1;
        if (moveKey === 'Enter' || moveKey === 'ArrowDown') nextR = Math.min(maxR, rowIdx + 1);
        else if (moveKey === 'ArrowUp') nextR = Math.max(0, rowIdx - 1);
        else if (moveKey === 'Tab' || moveKey === 'ArrowRight') nextC = Math.min(51, colIdx + 1);
        else if (moveKey === 'ArrowLeft') nextC = Math.max(0, colIdx - 1);

        if (moveKey) {
          setOeeSelection({ startRow: nextR, startCol: nextC, endRow: nextR, endCol: nextC });
        }
        if (oeeGridRef.current) oeeGridRef.current.focus();
      } else {
        setDtEditingCell(null);
        setDtData(prev => {
          const next = [...prev];
          const targetRow = [...next[rowIdx]];
          if (targetRow[colIdx] !== value) {
            pushHistory('dt', prev);
            targetRow[colIdx] = value;
            if (colIdx === DC.PROSES) targetRow[DC.UNIT] = '';
            const calculatedRow = calculateDTRow(targetRow);
            next[rowIdx] = calculatedRow;
            triggerAutosaveDT(rowIdx, calculatedRow);
            setTimeout(() => localStorage.setItem('C_DATA_DT', JSON.stringify(next)), 0);
          }
          return next;
        });
        let nextR = rowIdx;
        let nextC = colIdx;
        const maxR = dtData.length - 1;
        if (moveKey === 'Enter' || moveKey === 'ArrowDown') nextR = Math.min(maxR, rowIdx + 1);
        else if (moveKey === 'ArrowUp') nextR = Math.max(0, rowIdx - 1);
        else if (moveKey === 'Tab' || moveKey === 'ArrowRight') nextC = Math.min(13, colIdx + 1);
        else if (moveKey === 'ArrowLeft') nextC = Math.max(0, colIdx - 1);

        if (moveKey) {
          setDtSelection({ startRow: nextR, startCol: nextC, endRow: nextR, endCol: nextC });
        }
        if (dtGridRef.current) dtGridRef.current.focus();
      }
    }, 0);
  }, [oeeData.length, dtData.length, triggerAutosaveOEE, triggerAutosaveDT, pushHistory]);

  const handleCancelEdit = useCallback(() => {
    setOeeEditingCell(null);
    setDtEditingCell(null);
  }, []);

  const handleGridKeyDown = useCallback((e, gridType) => {
    const sel = gridType === 'oee' ? oeeSelection : dtSelection;
    const editing = gridType === 'oee' ? oeeEditingCell : dtEditingCell;
    const setSel = gridType === 'oee' ? setOeeSelection : setDtSelection;
    const setEditing = gridType === 'oee' ? setOeeEditingCell : setDtEditingCell;
    const colsMeta = gridType === 'oee' ? OEE_COLS_META : DT_COLS_META;
    const maxCols = colsMeta.length - 1;
    const maxR = (gridType === 'oee' ? oeeData : dtData).length - 1;

    if (editing) return;

    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) handleRedo(gridType);
      else handleUndo(gridType);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      handleRedo(gridType);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      setSel({ startRow: 0, startCol: 0, endRow: maxR, endCol: maxCols });
      return;
    }

    const { startRow, startCol, endRow, endCol } = sel;
    const activeRow = endRow;
    const activeCol = endCol;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      e.preventDefault();
      let nextR = activeRow;
      let nextC = activeCol;

      if (e.ctrlKey || e.metaKey) {
        const edge = findEdgeCell(gridType === 'oee' ? oeeData : dtData, activeRow, activeCol, e.key, maxR, maxCols);
        nextR = edge.r;
        nextC = edge.c;
      } else {
        if (e.key === 'ArrowUp') nextR = Math.max(0, activeRow - 1);
        if (e.key === 'ArrowDown') nextR = Math.min(maxR, activeRow + 1);
        if (e.key === 'ArrowLeft') nextC = Math.max(0, activeCol - 1);
        if (e.key === 'ArrowRight' || e.key === 'Tab') nextC = Math.min(maxCols, activeCol + 1);
      }

      if (e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        setTimeout(() => setSel({ startRow, startCol, endRow: nextR, endCol: nextC }), 0);
      } else {
        setTimeout(() => setSel({ startRow: nextR, startCol: nextC, endRow: nextR, endCol: nextC }), 0);
      }
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      if (!colsMeta[activeCol].readOnly) {
        setTimeout(() => setEditing({ row: activeRow, col: activeCol, mode: 'enter' }), 0);
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const maxCols = (gridType === 'oee' ? OEE_COLS_META : DT_COLS_META).length - 1;
      if (startCol === 0 && endCol === maxCols) {
        void handleDeleteRow(gridType);
        return;
      }
      const minR = Math.min(startRow, endRow);
      const maxR = Math.max(startRow, endRow);
      const minC = Math.min(startCol, endCol);
      const maxC = Math.max(startCol, endCol);

      const setData = gridType === 'oee' ? setOeeData : setDtData;
      const calcRow = gridType === 'oee' ? calculateOEERow : calculateDTRow;
      const triggerSave = gridType === 'oee' ? triggerAutosaveOEE : triggerAutosaveDT;

      setTimeout(() => {
        setData(prev => {
          const next = [...prev];
          let changedAny = false;
          for (let r = minR; r <= maxR; r++) {
            const targetRow = [...next[r]];
            let changed = false;
            for (let c = minC; c <= maxC; c++) {
              if (!colsMeta[c].readOnly && targetRow[c] !== '') {
                targetRow[c] = '';
                changed = true;
                changedAny = true;
              }
            }
            if (changed) {
              const calculatedRow = calcRow(targetRow);
              next[r] = calculatedRow;
              triggerSave(r, calculatedRow);
            }
          }
          if (changedAny) {
            pushHistory(gridType, prev);
            setTimeout(() => localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(next)), 0);
          }
          return next;
        });
      }, 0);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (!colsMeta[activeCol].readOnly) {
        e.preventDefault();
        const initialValue = e.key;
        setTimeout(() => setEditing({ row: activeRow, col: activeCol, mode: 'direct', initialValue }), 0);
      }
    }
  }, [oeeSelection, dtSelection, oeeEditingCell, dtEditingCell, oeeData, dtData, triggerAutosaveOEE, triggerAutosaveDT, handleUndo, handleRedo, pushHistory, handleDeleteRow]);

  const handleCopy = useCallback((e, gridType) => {
    e.preventDefault();
    const sel = gridType === 'oee' ? oeeSelection : dtSelection;
    const data = gridType === 'oee' ? oeeData : dtData;
    const minR = Math.min(sel.startRow, sel.endRow);
    const maxR = Math.max(sel.startRow, sel.endRow);
    const minC = Math.min(sel.startCol, sel.endCol);
    const maxC = Math.max(sel.startCol, sel.endCol);

    const rowsText = [];
    for (let r = minR; r <= maxR; r++) {
      const rowVals = [];
      for (let c = minC; c <= maxC; c++) {
        rowVals.push(data[r]?.[c] ?? '');
      }
      rowsText.push(rowVals.join('\t'));
    }
    e.clipboardData.setData('text/plain', rowsText.join('\n'));
  }, [oeeSelection, dtSelection, oeeData, dtData]);

  const handlePaste = useCallback((e, gridType) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const sel = gridType === 'oee' ? oeeSelection : dtSelection;
    const startR = Math.min(sel.startRow, sel.endRow);
    const startC = Math.min(sel.startCol, sel.endCol);

    const rows = pasteText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (rows[rows.length - 1] === '') rows.pop();

    const setData = gridType === 'oee' ? setOeeData : setDtData;
    const calcRow = gridType === 'oee' ? calculateOEERow : calculateDTRow;
    const triggerSave = gridType === 'oee' ? triggerAutosaveOEE : triggerAutosaveDT;
    const colsMeta = gridType === 'oee' ? OEE_COLS_META : DT_COLS_META;
    const maxCols = colsMeta.length;

    setData(prevData => {
      pushHistory(gridType, prevData);
      const nextData = [...prevData];
      rows.forEach((rowStr, rOffset) => {
        const targetRowIdx = startR + rOffset;
        if (targetRowIdx >= nextData.length) return;

        const cells = rowStr.split('\t');
        const targetRow = [...nextData[targetRowIdx]];

        cells.forEach((cellVal, cOffset) => {
          const targetColIdx = startC + cOffset;
          if (targetColIdx >= maxCols || colsMeta[targetColIdx].readOnly) return;
          targetRow[targetColIdx] = cellVal.trim();
        });

        const calculatedRow = calcRow(targetRow);
        nextData[targetRowIdx] = calculatedRow;
        triggerSave(targetRowIdx, calculatedRow);
      });

      setTimeout(() => localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(nextData)), 0);
      return nextData;
    });
  }, [oeeSelection, dtSelection, triggerAutosaveOEE, triggerAutosaveDT, pushHistory]);

  useEffect(() => {
    const handleMouseUp = (e) => {
      isDraggingRef.current = { oee: false, dt: false };

      if (fillDragRef.current.active) {
        const { gridType, startRow, endRow, startCol, endCol, targetRow, targetCol } = fillDragRef.current;
        const isCtrl = e.ctrlKey || e.metaKey || fillDragRef.current.isCtrl;
        fillDragRef.current = { active: false };

        if (targetRow === endRow && targetCol === endCol) return;

        const setData = gridType === 'oee' ? setOeeData : setDtData;
        const calcRow = gridType === 'oee' ? calculateOEERow : calculateDTRow;
        const triggerSave = gridType === 'oee' ? triggerAutosaveOEE : triggerAutosaveDT;
        const colsMeta = gridType === 'oee' ? OEE_COLS_META : DT_COLS_META;
        const noBatchCol = gridType === 'oee' ? C.NO_BATCH : DC.NO_BATCH;

        setData(prevData => {
          pushHistory(gridType, prevData);
          const nextData = [...prevData];
          const H = endRow - startRow + 1;

          if (targetRow > endRow) {
            for (let r = endRow + 1; r <= targetRow; r++) {
              if (r >= nextData.length) break;
              const targetRowArr = [...nextData[r]];
              const srcOffset = (r - startRow) % H;
              const stepCount = Math.floor((r - startRow) / H);
              const srcRowArr = prevData[startRow + srcOffset];

              let rowChanged = false;
              for (let c = startCol; c <= endCol; c++) {
                if (colsMeta[c].readOnly) continue;
                const srcVal = srcRowArr[c];
                let nextVal = srcVal;

                if (isCtrl && srcVal !== '' && srcVal !== null && srcVal !== undefined) {
                  if (c === noBatchCol) {
                    nextVal = incrementBatchNumber(srcVal, stepCount);
                  } else if (!isNaN(parseFloat(srcVal))) {
                    nextVal = String(parseFloat(srcVal) + stepCount);
                  }
                }
                if (targetRowArr[c] !== nextVal) {
                  targetRowArr[c] = nextVal;
                  rowChanged = true;
                }
              }

              if (rowChanged) {
                const calculatedRow = calcRow(targetRowArr);
                nextData[r] = calculatedRow;
                triggerSave(r, calculatedRow);
              }
            }
          } else if (targetRow < startRow) {
            for (let r = startRow - 1; r >= targetRow; r--) {
              if (r < 0) break;
              const targetRowArr = [...nextData[r]];
              const stepCount = startRow - r;
              const srcRowArr = prevData[startRow];

              let rowChanged = false;
              for (let c = startCol; c <= endCol; c++) {
                if (colsMeta[c].readOnly) continue;
                const srcVal = srcRowArr[c];
                let nextVal = srcVal;

                if (isCtrl && srcVal !== '' && srcVal !== null && srcVal !== undefined) {
                  if (c === noBatchCol) {
                    nextVal = incrementBatchNumber(srcVal, -stepCount);
                  } else if (!isNaN(parseFloat(srcVal))) {
                    nextVal = String(parseFloat(srcVal) - stepCount);
                  }
                }
                if (targetRowArr[c] !== nextVal) {
                  targetRowArr[c] = nextVal;
                  rowChanged = true;
                }
              }

              if (rowChanged) {
                const calculatedRow = calcRow(targetRowArr);
                nextData[r] = calculatedRow;
                triggerSave(r, calculatedRow);
              }
            }
          }

          setTimeout(() => localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(nextData)), 0);
          return nextData;
        });
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [pushHistory, triggerAutosaveOEE, triggerAutosaveDT]);

  // Auto scroll into view on navigation
  useEffect(() => {
    if (!oeeGridRef.current) return;
    const tbody = oeeGridRef.current.querySelector('tbody');
    const rowEl = tbody?.rows?.[oeeSelection.endRow];
    const td = rowEl?.cells?.[oeeSelection.endCol];
    scrollCellIntoView(td, oeeGridRef.current);
  }, [oeeSelection.endRow, oeeSelection.endCol]);

  useEffect(() => {
    if (!dtGridRef.current) return;
    const tbody = dtGridRef.current.querySelector('tbody');
    const rowEl = tbody?.rows?.[dtSelection.endRow];
    const td = rowEl?.cells?.[dtSelection.endCol];
    scrollCellIntoView(td, dtGridRef.current);
  }, [dtSelection.endRow, dtSelection.endCol]);

  const loadDataServer = useCallback(async () => {
    if (!user) return;
    try {
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectC(user),
        fetchTodayDowntimeC(user),
      ]);

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const filterLast30Days = (row) => {
        return true;
      };

      let mappedOEE = [];
      let mappedOEEIds = [];
      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {
        mappedOEE = resOEE.data.filter(filterLast30Days).reverse().map((row) => {
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
            row.lc_sm ?? '', row.lc_eh ?? '', row.lc_em ?? '', row.lc_sub ?? ''
          ];
          return calculateOEERow(r);
        });
      }

      let mappedDT = [];
      let mappedDTIds = [];
      if (resDT?.status === 'success' && Array.isArray(resDT.data)) {
        mappedDT = resDT.data.filter(filterLast30Days).reverse().map((row) => {
          mappedDTIds.push(row.id);
          const r = [
            parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.no_batch ?? '', row.start_h ?? '', row.start_m ?? '',
            row.end_h ?? '', row.end_m ?? '', row.duration ?? '', row.plan_unplan ?? 'Unplanned', row.root_cause ?? '', row.proses ?? '',
            row.unit ?? '', row.kasus ?? ''
          ];
          return calculateDTRow(r);
        });
      }

      const EMPTY_ROWS = 50;
      const finalOEE = [...mappedOEE, ...Array.from({ length: EMPTY_ROWS }, getEmptyOEE)];
      const finalDT = [...mappedDT, ...Array.from({ length: EMPTY_ROWS }, getEmptyDT)];

      oeeIds.current = [...mappedOEEIds, ...Array(EMPTY_ROWS).fill(null)];
      dtIds.current = [...mappedDTIds, ...Array(EMPTY_ROWS).fill(null)];

      setOeeData(finalOEE);
      setDtData(finalDT);

      localStorage.setItem('C_DATA_OEE', JSON.stringify(finalOEE));
      localStorage.setItem('C_DATA_DT', JSON.stringify(finalDT));
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

  const oeeMinR = Math.min(oeeSelection.startRow, oeeSelection.endRow);
  const oeeMaxR = Math.max(oeeSelection.startRow, oeeSelection.endRow);
  const oeeMinC = Math.min(oeeSelection.startCol, oeeSelection.endCol);
  const oeeMaxC = Math.max(oeeSelection.startCol, oeeSelection.endCol);

  const dtMinR = Math.min(dtSelection.startRow, dtSelection.endRow);
  const dtMaxR = Math.max(dtSelection.startRow, dtSelection.endRow);
  const dtMinC = Math.min(dtSelection.startCol, dtSelection.endCol);
  const dtMaxC = Math.max(dtSelection.startCol, dtSelection.endCol);

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-wider uppercase text-emerald-800 inline-block mr-3">
              OEE Line 4 — Zone C
            </h1>
          </div>
        </div>

        <div
          ref={oeeGridRef}
          tabIndex={0}
          onKeyDown={(e) => handleGridKeyDown(e, 'oee')}
          onCopy={(e) => handleCopy(e, 'oee')}
          onPaste={(e) => handlePaste(e, 'oee')}
          className="bg-white border border-slate-300 shadow-lg mb-10 rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="overflow-x-auto max-h-[680px]">
            <table className="border-collapse w-max min-w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold shadow-sm sticky top-0 z-40">
                <tr>
                  <th rowSpan={3} className="py-1.5 px-2 bg-slate-200 text-slate-800 font-mono text-center sticky top-0 left-0 z-50 w-[60px] min-w-[60px] max-w-[60px] shadow-[1px_0_0_0_#cbd5e1]">ID</th>
                  <th colSpan={4} className="border-r border-b border-slate-300 px-2 py-1.5 text-center sticky left-[60px] z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1]">General Info</th>
                  <th colSpan={4} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Reject Botol & Volume</th>
                  <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Counter Filling</th>
                  <th colSpan={7} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Rejection Filling</th>
                  <th colSpan={3} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Samples</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Hasil Baik</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">% Yield</th>
                  <th colSpan={8} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Reject Before Steril</th>
                  <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Available Time</th>
                  <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Run Time</th>
                  <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Line Clearance</th>
                </tr>
                <tr>
                  <th colSpan={4} className="border-r border-b border-slate-300 px-2 py-1.5 text-center sticky left-[60px] z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1]"></th>
                  <th colSpan={4} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={3} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Per Cycle Batch</th>
                  <th colSpan={3} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Washing</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Filling</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Sealing</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Botol</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Transfer to ST</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Reject Before Steril</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Filling</th>
                  <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">CIP Minor</th>
                </tr>
                <tr>
                  {OEE_COLS_META.map((col, idx) => (
                    <th
                      key={idx}
                      style={{
                        width: col.width, minWidth: col.width, maxWidth: col.width,
                        position: col.stickyLeft !== undefined ? 'sticky' : 'static',
                        left: col.stickyLeft !== undefined ? col.stickyLeft : 'auto',
                        zIndex: col.stickyLeft !== undefined ? 41 : 40,
                      }}
                      className={`border-r border-b border-slate-300 px-1 py-2 text-center text-[10px] uppercase tracking-wide ${col.stickyLeft !== undefined ? 'bg-slate-200' : 'bg-slate-100'} ${col.stickyLeft !== undefined && idx === 3 ? 'shadow-[1px_0_0_0_#cbd5e1]' : ''}`}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {oeeData.map((row, rowIdx) => {
                  const isSelRow = rowIdx >= oeeMinR && rowIdx <= oeeMaxR;
                  const edCol = (oeeEditingCell && oeeEditingCell.row === rowIdx) ? oeeEditingCell.col : -1;
                  const edMode = (oeeEditingCell && oeeEditingCell.row === rowIdx) ? oeeEditingCell.mode : null;
                  const edInit = (oeeEditingCell && oeeEditingCell.row === rowIdx) ? oeeEditingCell.initialValue : undefined;
                  return (
                    <SpreadsheetRow
                      key={rowIdx}
                      rowData={row}
                      rowIdx={rowIdx}
                      colsMeta={OEE_COLS_META}
                      gridType="oee"
                      isSelectedRow={isSelRow}
                      selectionMinCol={oeeMinC}
                      selectionMaxCol={oeeMaxC}
                      selectionMaxRow={oeeMaxR}
                      editingColIdx={edCol}
                      editMode={edMode}
                      editingInitialValue={edInit}
                      rowId={oeeIds.current[rowIdx] || null}
                      onSelectRow={handleSelectRow}
                      onCellMouseDown={handleCellMouseDown}
                      onCellMouseEnter={handleCellMouseEnter}
                      onCellDoubleClick={handleCellDoubleClick}
                      onFillHandleMouseDown={handleFillHandleMouseDown}
                      onFinishEdit={handleFinishEdit}
                      onCancelEdit={handleCancelEdit}
                      onRowContextMenu={handleRowContextMenu}
                    />
                  );
                })}
              </tbody>
            </table>
            <div className="p-2 bg-slate-100 border-t border-slate-300 flex items-center justify-start">
              <button
                type="button"
                onClick={() => handleAdd1000Rows('oee')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow transition-colors text-xs flex items-center gap-1.5 sticky left-2 z-30"
              >
                <span>+ Tambah Baris</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 4 — Zone C
          </h2>
        </div>

        <div
          ref={dtGridRef}
          tabIndex={0}
          onKeyDown={(e) => handleGridKeyDown(e, 'dt')}
          onCopy={(e) => handleCopy(e, 'dt')}
          onPaste={(e) => handlePaste(e, 'dt')}
          className="bg-white border border-slate-300 shadow-lg rounded overflow-hidden mb-12 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <div className="overflow-x-auto max-h-[500px]">
            <table className="border-collapse w-max min-w-full text-left">
              <thead className="bg-indigo-950 text-white text-[11px] uppercase tracking-wider font-bold sticky top-0 z-20">
                <tr className="border-b border-indigo-900 text-center divide-x divide-indigo-900">
                  <th className="py-2.5 px-2 bg-indigo-950 text-white font-mono text-center sticky left-0 z-40 w-[60px] min-w-[60px] max-w-[60px] shadow-[1px_0_0_0_#312e81]">ID</th>
                  {DT_COLS_META.map((col, idx) => {
                    const isSticky = col.stickyLeft !== undefined;
                    const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 30 } : {};
                    return (
                      <th
                        key={idx}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
                        className={`py-2.5 px-2 text-center leading-tight whitespace-normal break-words ${isSticky ? 'bg-indigo-950' : ''} ${isSticky && idx === 3 ? 'shadow-[1px_0_0_0_#312e81]' : ''}`}
                      >
                        {col.title}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dtData.map((row, rowIdx) => {
                  const isSelRow = rowIdx >= dtMinR && rowIdx <= dtMaxR;
                  const edCol = (dtEditingCell && dtEditingCell.row === rowIdx) ? dtEditingCell.col : -1;
                  const edMode = (dtEditingCell && dtEditingCell.row === rowIdx) ? dtEditingCell.mode : null;
                  const edInit = (dtEditingCell && dtEditingCell.row === rowIdx) ? dtEditingCell.initialValue : undefined;
                  return (
                    <SpreadsheetRow
                      key={rowIdx}
                      rowData={row}
                      rowIdx={rowIdx}
                      colsMeta={DT_COLS_META}
                      gridType="dt"
                      isSelectedRow={isSelRow}
                      selectionMinCol={dtMinC}
                      selectionMaxCol={dtMaxC}
                      selectionMaxRow={dtMaxR}
                      editingColIdx={edCol}
                      editMode={edMode}
                      editingInitialValue={edInit}
                      rowId={dtIds.current[rowIdx] || null}
                      onSelectRow={handleSelectRow}
                      onCellMouseDown={handleCellMouseDown}
                      onCellMouseEnter={handleCellMouseEnter}
                      onCellDoubleClick={handleCellDoubleClick}
                      onFillHandleMouseDown={handleFillHandleMouseDown}
                      onFinishEdit={handleFinishEdit}
                      onCancelEdit={handleCancelEdit}
                      onRowContextMenu={handleRowContextMenu}
                    />
                  );
                })}
              </tbody>
            </table>
            <div className="p-2 bg-slate-100 border-t border-slate-300 flex items-center justify-start">
              <button
                type="button"
                onClick={() => handleAdd1000Rows('dt')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow transition-colors text-xs flex items-center gap-1.5 sticky left-2 z-30"
              >
                <span>+ Tambah Baris</span>
              </button>
            </div>
          </div>
        </div>

        {contextMenu && createPortal(
          <div
            className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-2xl py-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              type="button"
              onClick={() => {
                handleDeleteRow(contextMenu.gridType);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
            >
              <span>🗑️</span>
              <span>Delete {contextMenu.gridType === 'oee' ? 'OEE' : 'Downtime'} Row</span>
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}