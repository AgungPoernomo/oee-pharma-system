import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
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
  { title: 'No Batch', width: 100, type: 'text', stickyLeft: 0 },
  { title: 'Tanggal', width: 115, type: 'date', stickyLeft: 100 },
  { title: 'Shift', width: 55, type: 'number', stickyLeft: 215 },
  { title: 'Group', width: 55, type: 'text', stickyLeft: 270 },
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
  { title: 'Total Keseluruhan', width: 125, type: 'number', readOnly: true },
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
  { title: 'Tanggal', width: 120, type: 'date', stickyLeft: 0 },
  { title: 'Shift', width: 60, type: 'number' },
  { title: 'Grup', width: 60, type: 'text' },
  { title: 'No. Batch', width: 115, type: 'text' },
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

// Highly optimized memoized row component (only re-renders when rowData or this row's selection/editing changes!)
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
  onCellMouseDown,
  onCellMouseEnter,
  onCellDoubleClick,
  onFillHandleMouseDown,
  onFinishEdit,
  onCancelEdit
}) => {
  const prosesValue = gridType === 'dt' ? rowData[DC.PROSES] : '';
  const unitOptions = gridType === 'dt' ? (UNIT_MAP_C[prosesValue] || ALL_UNITS_C) : [];

  return (
    <tr className="border-b border-slate-200 text-xs hover:bg-slate-50/60">
      {colsMeta.map((col, colIdx) => {
        const val = rowData[colIdx] ?? '';
        const isSticky = col.stickyLeft !== undefined;
        const isSelected = isSelectedRow && colIdx >= selectionMinCol && colIdx <= selectionMaxCol;
        const isFillHandleCorner = isSelectedRow && rowIdx === selectionMaxRow && colIdx === selectionMaxCol;
        const isEditing = editingColIdx === colIdx;

        const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 10 } : {};

        let bgClass = 'bg-white';
        if (col.readOnly) bgClass = 'bg-slate-100/90 text-slate-600';
        if (isSelected && !isEditing) {
          bgClass = gridType === 'oee' ? 'bg-emerald-100/90' : 'bg-indigo-100/90';
        }
        if (isSticky && !isSelected) {
          bgClass = col.readOnly ? 'bg-slate-100' : 'bg-white';
        }

        const borderSticky = isSticky && colIdx === (gridType === 'oee' ? 3 : 0) ? 'shadow-[1px_0_0_0_#cbd5e1]' : '';
        const selectionRing = isSelected && !isEditing ? (gridType === 'oee' ? 'ring-1 ring-emerald-500 ring-inset' : 'ring-1 ring-indigo-500 ring-inset') : '';

        const initVal = (isEditing && editingInitialValue !== undefined) ? editingInitialValue : val;

        return (
          <td
            key={colIdx}
            data-row={rowIdx}
            data-col={colIdx}
            style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
            className={`p-0 border-r border-slate-200 align-middle select-none relative ${bgClass} ${borderSticky} ${selectionRing}`}
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
              <div className="w-full h-7 px-1.5 flex items-center overflow-hidden whitespace-nowrap text-ellipsis cursor-cell relative">
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
});

export default function InputC() {
  const { user } = useAuth();

  const [oeeData, setOeeData] = useState(() => getCachedData('C_DATA_OEE', getEmptyOEE, 100));
  const [dtData, setDtData] = useState(() => getCachedData('C_DATA_DT', getEmptyDT, 100));

  const [oeeSelection, setOeeSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const [dtSelection, setDtSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });

  const [oeeEditingCell, setOeeEditingCell] = useState(null);
  const [dtEditingCell, setDtEditingCell] = useState(null);

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
    if (gridType === 'oee') {
      setOeeSelection({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
      setOeeEditingCell(null);
      if (oeeGridRef.current) oeeGridRef.current.focus();
    } else {
      setDtSelection({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
      setDtEditingCell(null);
      if (dtGridRef.current) dtGridRef.current.focus();
    }
  }, []);

  const handleCellMouseEnter = useCallback((rowIdx, colIdx, gridType) => {
    if (fillDragRef.current.active && fillDragRef.current.gridType === gridType) {
      fillDragRef.current.targetRow = rowIdx;
      fillDragRef.current.targetCol = colIdx;
      if (gridType === 'oee') {
        setOeeSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
      } else {
        setDtSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
      }
      return;
    }
    if (!isDraggingRef.current[gridType]) return;
    if (gridType === 'oee') {
      setOeeSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
    } else {
      setDtSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
    }
  }, []);

  const handleCellDoubleClick = useCallback((rowIdx, colIdx, gridType) => {
    if (gridType === 'oee') {
      setOeeEditingCell({ row: rowIdx, col: colIdx, mode: 'enter' });
    } else {
      setDtEditingCell({ row: rowIdx, col: colIdx, mode: 'enter' });
    }
  }, []);

  const handleFinishEdit = useCallback((rowIdx, colIdx, value, gridType, moveKey) => {
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
  }, [triggerAutosaveOEE, triggerAutosaveDT, pushHistory, oeeData.length, dtData.length]);

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
        setSel({ startRow, startCol, endRow: nextR, endCol: nextC });
      } else {
        setSel({ startRow: nextR, startCol: nextC, endRow: nextR, endCol: nextC });
      }
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      if (!colsMeta[activeCol].readOnly) {
        setEditing({ row: activeRow, col: activeCol, mode: 'enter' });
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const minR = Math.min(startRow, endRow);
      const maxR = Math.max(startRow, endRow);
      const minC = Math.min(startCol, endCol);
      const maxC = Math.max(startCol, endCol);

      const setData = gridType === 'oee' ? setOeeData : setDtData;
      const calcRow = gridType === 'oee' ? calculateOEERow : calculateDTRow;
      const triggerSave = gridType === 'oee' ? triggerAutosaveOEE : triggerAutosaveDT;

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
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (!colsMeta[activeCol].readOnly) {
        e.preventDefault();
        setEditing({ row: activeRow, col: activeCol, mode: 'direct', initialValue: e.key });
      }
    }
  }, [oeeSelection, dtSelection, oeeEditingCell, dtEditingCell, oeeData, dtData, triggerAutosaveOEE, triggerAutosaveDT, handleUndo, handleRedo, pushHistory]);

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
    const td = oeeGridRef.current.querySelector(`td[data-row="${oeeSelection.endRow}"][data-col="${oeeSelection.endCol}"]`);
    if (td && typeof td.scrollIntoView === 'function') {
      td.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [oeeSelection.endRow, oeeSelection.endCol]);

  useEffect(() => {
    if (!dtGridRef.current) return;
    const td = dtGridRef.current.querySelector(`td[data-row="${dtSelection.endRow}"][data-col="${dtSelection.endCol}"]`);
    if (td && typeof td.scrollIntoView === 'function') {
      td.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [dtSelection.endRow, dtSelection.endCol]);

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
            row.lc_sm ?? '', row.lc_eh ?? '', row.lc_em ?? '', row.lc_sub ?? ''
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
              <thead className="bg-slate-800 text-white text-[11px] uppercase tracking-wider font-bold sticky top-0 z-20">
                <tr className="border-b border-slate-700 text-center divide-x divide-slate-700">
                  <th colSpan="4" className="py-2 bg-slate-800 sticky left-0 z-30 shadow-[1px_0_0_0_#334155]">General Info</th>
                  <th colSpan="4" className="py-2 bg-slate-800">Reject Botol & Volume</th>
                  <th colSpan="6" className="py-2 bg-emerald-900">Counter Filling</th>
                  <th colSpan="7" className="py-2 bg-slate-800">Rejection Filling</th>
                  <th colSpan="3" className="py-2 bg-slate-800">Samples</th>
                  <th colSpan="2" className="py-2 bg-emerald-900">Hasil Baik</th>
                  <th colSpan="2" className="py-2 bg-slate-800">% Yield</th>
                  <th colSpan="8" className="py-2 bg-red-950">Reject Before Steril</th>
                  <th colSpan="6" className="py-2 bg-blue-950">Available Time</th>
                  <th colSpan="5" className="py-2 bg-indigo-950">Run Time</th>
                  <th colSpan="5" className="py-2 bg-purple-950">Line Clearance</th>
                </tr>
                <tr className="border-b border-slate-700 text-center divide-x divide-slate-700 bg-slate-700/80">
                  <th colSpan="4" className="py-1 bg-slate-800 sticky left-0 z-30 shadow-[1px_0_0_0_#334155]"></th>
                  <th colSpan="4" className="py-1"></th>
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
                </tr>
                <tr className="border-b border-slate-700 text-center divide-x divide-slate-700 bg-slate-900">
                  {OEE_COLS_META.map((col, idx) => {
                    const isSticky = col.stickyLeft !== undefined;
                    const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 30 } : {};
                    return (
                      <th
                        key={idx}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
                        className={`py-2 px-1.5 text-center leading-tight whitespace-normal break-words ${isSticky ? 'bg-slate-900' : ''} ${isSticky && idx === 3 ? 'shadow-[1px_0_0_0_#334155]' : ''}`}
                      >
                        {col.title}
                      </th>
                    );
                  })}
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
                      onCellMouseDown={handleCellMouseDown}
                      onCellMouseEnter={handleCellMouseEnter}
                      onCellDoubleClick={handleCellDoubleClick}
                      onFillHandleMouseDown={handleFillHandleMouseDown}
                      onFinishEdit={handleFinishEdit}
                      onCancelEdit={handleCancelEdit}
                    />
                  );
                })}
              </tbody>
            </table>
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
                  {DT_COLS_META.map((col, idx) => {
                    const isSticky = col.stickyLeft !== undefined;
                    const stickyStyle = isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 30 } : {};
                    return (
                      <th
                        key={idx}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...stickyStyle }}
                        className={`py-2.5 px-2 text-center leading-tight whitespace-normal break-words ${isSticky ? 'bg-indigo-950 shadow-[1px_0_0_0_#312e81]' : ''}`}
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
                      onCellMouseDown={handleCellMouseDown}
                      onCellMouseEnter={handleCellMouseEnter}
                      onCellDoubleClick={handleCellDoubleClick}
                      onFillHandleMouseDown={handleFillHandleMouseDown}
                      onFinishEdit={handleFinishEdit}
                      onCancelEdit={handleCancelEdit}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}