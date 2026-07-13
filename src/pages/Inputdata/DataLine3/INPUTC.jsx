import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectC, fetchTodayDowntimeC, fetchAllRejectC, fetchAllDowntimeC } from '../../../services/api';
import { scrollCellIntoView } from '../../../lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

const TEORI_BATCH = { "25 ML": 29412 };
const VOLUMES = ["25 ML"];
const SHIFTS = ["1", "2", "3"];
const GROUPS = ["A", "B", "C", "D"];

const C = {
  NO_BATCH: 0, TANGGAL: 1, SHIFT: 2, GROUP: 3, VOL_BOTOL: 4,
  CNT_START: 5, CNT_END: 6, CNT_SUB: 7, UTUH: 8, JML_BATCH: 9,
  REJ_BOTOL_ISI: 10, REJ_SETTING: 11, REJ_VL: 12, BOCOR_SEAL: 13, BOCOR_CUTTING: 14, REJ_LELEHAN: 15, SUB_FILL_SEAL: 16,
  SAMP_IPC: 17, SAMP_OTHERS: 18, SUB_SAMPLES: 19,
  TRF_TO_ST: 20,
  INPUT_STERIL: 21,
  REJECT_BEFORE_STERIL: 22,
  OUTPUT_CHAMBER: 23,
  AT_SH: 24, AT_SM: 25, AT_EH: 26, AT_EM: 27, AT_SUB: 28, TOTAL_PER_SHIFT: 29,
  RT_SH: 30, RT_SM: 31, RT_EH: 32, RT_EM: 33, RT_SUB: 34,
  LC_SH: 35, LC_SM: 36, LC_EH: 37, LC_EM: 38, LC_SUB: 39
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
  const arr = Array(40).fill('');
  arr[C.UTUH] = '';
  return arr;
};

const getEmptyDT = () => {
  const arr = Array(14).fill('');
  arr[DC.TYPE] = '';
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
  'Filling': ['Laserjet', 'Gripper Washing', 'PLC', 'Ionizer', 'Carousel 1', 'Carousel 2', 'Carousel 3', 'Buffer Tank', 'Filling', 'Carousel 4', 'Carousel 5', 'Carousel 6', 'Cap Feeding Chute', 'Sealing', 'Heater', 'Cooling Heater Sealing', 'Wheelcap Ganjil', 'Wheelcap Genap', 'Conveyor Filling', 'Tandonan', 'Gear', 'Compresor-Oilfree', 'Compresor-Oilless', 'Trial', 'CIP/SIP', 'Filling-Others', 'Supply Listrik', 'Line Clearance', 'Break'],
  'Mixing': ['Supply WFI', 'Tanki D1', 'Tanki D2', 'Filter Produk', 'Mixing Produk', 'CIP/SIP', 'Integrity', 'PLC', 'Trial'],
  'Autoclave': ['Conveyor', 'Meja A', 'Meja B', 'Lifter A', 'Lifter B', 'Tray kereta', 'Turn table', 'Kereta Anjlok', 'Kereta Habis', 'Jalur penuh', 'Chamber A', 'Chamber B', 'Doorseal', 'Autoclave-Other', 'Pick and Place']
};
const ALL_UNITS_C = [...new Set(Object.values(UNIT_MAP_C).flat())];

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

  const sub = v(C.CNT_END) - v(C.CNT_START);
  setV(C.CNT_SUB, sub > 0 ? sub : '');
  const cntSub = v(C.CNT_SUB);
  setV(C.JML_BATCH, cntSub > 0 ? (cntSub / (TEORI_BATCH[raw(C.VOL_BOTOL)] ?? 23076)).toFixed(2) : '');

  setV(C.SUB_FILL_SEAL, v(C.REJ_BOTOL_ISI) + v(C.REJ_SETTING) + v(C.REJ_VL) + v(C.BOCOR_SEAL) + v(C.BOCOR_CUTTING) + v(C.REJ_LELEHAN));
  setV(C.SUB_SAMPLES, v(C.SAMP_IPC) + v(C.SAMP_OTHERS));

  if (cntSub > 0) {
    const trf = cntSub - (v(C.SUB_FILL_SEAL) + v(C.SUB_SAMPLES));
    const inSteril = trf > 0 ? trf : 0;
    setV(C.TRF_TO_ST, inSteril);
    setV(C.INPUT_STERIL, inSteril);
    const outChamber = inSteril - v(C.REJECT_BEFORE_STERIL);
    setV(C.OUTPUT_CHAMBER, outChamber > 0 ? outChamber : 0);
  } else {
    setV(C.TRF_TO_ST, ''); setV(C.INPUT_STERIL, ''); setV(C.OUTPUT_CHAMBER, '');
  }

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
        shiftData[key] = { atSubSum: 0, lastRowIdx: -1 };
      }
      const atSub = parseFloat(row[C.AT_SUB]);
      if (!isNaN(atSub)) shiftData[key].atSubSum += atSub;
      shiftData[key].lastRowIdx = index;
    }
  });

  return data.map((row, index) => {
    const tanggal = row[C.TANGGAL];
    const shift = row[C.SHIFT];
    let newAtTotal = '';
    if (tanggal && shift) {
      const key = `${tanggal}_${shift}`;
      if (shiftData[key] && shiftData[key].lastRowIdx === index) {
        newAtTotal = shiftData[key].atSubSum;
      }
    }
    if (row[C.TOTAL_PER_SHIFT] !== newAtTotal) {
      const newRow = [...row];
      newRow[C.TOTAL_PER_SHIFT] = newAtTotal;
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
  // 1. Batch Info (0..4)
  { title: 'Batch No.', width: 110, type: 'text', stickyLeft: 60 },
  { title: 'Tanggal', width: 105, type: 'date', stickyLeft: 170 },
  { title: 'Shift', width: 60, type: 'select', options: SHIFTS, stickyLeft: 275 },
  { title: 'Grup', width: 60, type: 'select', options: GROUPS, stickyLeft: 335 },
  { title: 'Volume', width: 90, type: 'select', options: VOLUMES }, // 4

  // 2. Counter Total Filling (5..9)
  { title: 'Start', width: 80, type: 'number' },
  { title: 'End', width: 80, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true },
  { title: 'Utuh? Y/N', width: 75, type: 'select', options: ['Y', 'N'] },
  { title: 'Jumlah batch', width: 95, type: 'number', readOnly: true },

  // 3. Rejection Filling (10..16)
  { title: 'botol + isi', width: 85, type: 'number' },
  { title: 'Setting', width: 80, type: 'number' },
  { title: 'VL', width: 65, type: 'number' },
  { title: 'Seal', width: 65, type: 'number' },
  { title: 'Cutting', width: 70, type: 'number' },
  { title: 'Lelehan', width: 75, type: 'number' },
  { title: 'Sub Total Fill-Seal', width: 130, type: 'number', readOnly: true },

  // 4. Samples (17..19)
  { title: 'IPC', width: 65, type: 'number' },
  { title: 'Others', width: 70, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true },

  // 5. Hasil Baik (Transfer to ST) (20)
  { title: 'Sub Total', width: 110, type: 'number', readOnly: true },

  // 6. Input Before Steril (21)
  { title: 'Input Before Steril', width: 130, type: 'number', readOnly: true },

  // 7. Reject Before Steril (22)
  { title: 'Reject Before Steril', width: 130, type: 'number' },

  // 8. Output (masuk chamber) (23)
  { title: 'Output (masuk chamber)', width: 150, type: 'number', readOnly: true },

  // 8. Available Time (23..28)
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 85, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 85, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true },
  { title: 'TOTAL PER SHIFT', width: 125, type: 'number', readOnly: true },

  // 9. Run Time (Filling) (29..33)
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 85, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 85, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true },

  // 10. Line Clearance (CIP Minor) (34..38)
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 85, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 85, type: 'number' },
  { title: 'Sub Total', width: 85, type: 'number', readOnly: true }
];

const DC_COLS_META = [
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
  { title: 'Proses', width: 125, type: 'select', options: ['Filling', 'Mixing', 'Autoclave'] },
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
    <tr
      className="border-b border-slate-200 text-xs hover:bg-slate-50/60"
      onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, rowIdx, gridType)}
    >
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

        const borderSticky = isSticky && colIdx === 3 ? 'shadow-[1px_0_0_0_#cbd5e1]' : '';
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

  // [BUG-09 FIX] Kunci localStorage per-line (Line 3) agar data antar line tidak saling menimpa
  const LS_OEE = 'C_DATA_OEE_L3', LS_DT = 'C_DATA_DT_L3', LS_IDS_OEE = 'C_IDS_OEE_L3', LS_IDS_DT = 'C_IDS_DT_L3';

  const [oeeData, setOeeData] = useState(() => getCachedData(LS_OEE, getEmptyOEE, 100));
  const [dtData, setDtData] = useState(() => getCachedData(LS_DT, getEmptyDT, 100));

  const oeeIds = useRef(getCachedIds(LS_IDS_OEE, 100));
  const dtIds = useRef(getCachedIds(LS_IDS_DT, 100));

  const [oeeSelection, setOeeSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const [dtSelection, setDtSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const selectionRef = useRef({ oee: oeeSelection, dt: dtSelection });
  useEffect(() => {
    selectionRef.current = { oee: oeeSelection, dt: dtSelection };
  }, [oeeSelection, dtSelection]);

  const [oeeEditingCell, setOeeEditingCell] = useState(null);
  const [dtEditingCell, setDtEditingCell] = useState(null);

  const [oeeHistory, setOeeHistory] = useState({ past: [], future: [] });
  const [dtHistory, setDtHistory] = useState({ past: [], future: [] });

  const [contextMenu, setContextMenu] = useState(null);

  const [oeeScrollTop, setOeeScrollTop] = useState(0);
  const [dtScrollTop, setDtScrollTop] = useState(0);
  
  const ROW_HEIGHT = 29;
  const VISIBLE_ROWS = Math.ceil(700 / ROW_HEIGHT);
  const BUFFER_ROWS = 15;

  const oeeGridRef = useRef(null);
  const dtGridRef = useRef(null);
  const isDraggingRef = useRef({ oee: false, dt: false });
  const fillDragRef = useRef({ active: false });

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    const handleContextMenuClose = (e) => { if (!e.target.closest('table')) setContextMenu(null); };
    window.addEventListener('contextmenu', handleContextMenuClose);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('contextmenu', handleContextMenuClose);
    };
  }, []);


  const pushHistory = useCallback((gridType, prevData) => {
    if (gridType === 'oee') {
      setOeeHistory(h => ({ past: [...h.past.slice(-20), prevData], future: [] }));
    } else {
      setDtHistory(h => ({ past: [...h.past.slice(-20), prevData], future: [] }));
    }
  }, []);

  const handleUndo = useCallback((gridType) => {
    if (gridType === 'oee') {
      setOeeHistory(h => {
        if (h.past.length === 0) return h;
        const prev = h.past[h.past.length - 1];
        const newPast = h.past.slice(0, -1);
        setOeeData(curr => {
          setTimeout(() => localStorage.setItem(LS_OEE, JSON.stringify(prev)), 0);
          return prev;
        });
        return { past: newPast, future: [oeeData, ...h.future] };
      });
    } else {
      setDtHistory(h => {
        if (h.past.length === 0) return h;
        const prev = h.past[h.past.length - 1];
        const newPast = h.past.slice(0, -1);
        setDtData(curr => {
          setTimeout(() => localStorage.setItem(LS_DT, JSON.stringify(prev)), 0);
          return prev;
        });
        return { past: newPast, future: [dtData, ...h.future] };
      });
    }
  }, [oeeData, dtData]);

  const handleRedo = useCallback((gridType) => {
    if (gridType === 'oee') {
      setOeeHistory(h => {
        if (h.future.length === 0) return h;
        const next = h.future[0];
        const newFuture = h.future.slice(1);
        setOeeData(curr => {
          setTimeout(() => localStorage.setItem(LS_OEE, JSON.stringify(next)), 0);
          return next;
        });
        return { past: [...h.past, oeeData], future: newFuture };
      });
    } else {
      setDtHistory(h => {
        if (h.future.length === 0) return h;
        const next = h.future[0];
        const newFuture = h.future.slice(1);
        setDtData(curr => {
          setTimeout(() => localStorage.setItem(LS_DT, JSON.stringify(next)), 0);
          return next;
        });
        return { past: [...h.past, dtData], future: newFuture };
      });
    }
  }, [oeeData, dtData]);

  const handleSelectRow = useCallback((rowIdx, gridType) => {
    const maxCols = (gridType === 'oee' ? OEE_COLS_META : DC_COLS_META).length - 1;
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
    const sel = gridType === 'oee' ? selectionRef.current.oee : selectionRef.current.dt;
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
  }, [handleSelectRow]);

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
      localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(next));
      localStorage.setItem(gridType === 'oee' ? LS_IDS_OEE : LS_IDS_DT, JSON.stringify(idsRef.current));
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
        localStorage.setItem(LS_OEE, JSON.stringify(next));
        localStorage.setItem(LS_IDS_OEE, JSON.stringify(oeeIds.current));
        return next;
      });
    } else {
      const newRows = Array.from({ length: 1000 }, getEmptyDT);
      dtIds.current = [...dtIds.current, ...Array(1000).fill(null)];
      setDtData(prev => {
        const next = [...prev, ...newRows];
        localStorage.setItem(LS_DT, JSON.stringify(next));
        localStorage.setItem(LS_IDS_DT, JSON.stringify(dtIds.current));
        return next;
      });
    }
  }, []);

  const triggerAutosaveOEE = useCallback(async (rIdx, rowData) => {
    if (!user) return;
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
        localStorage.setItem(LS_IDS_OEE, JSON.stringify(oeeIds.current));
      }
      return;
    }
    try {
      const payloadData = {
        original_id: oeeIds.current[rIdx] || null,
        no_batch: rowData[C.NO_BATCH],
        lot_no: '',
        tanggal: rowData[C.TANGGAL],
        shift: rowData[C.SHIFT],
        group: rowData[C.GROUP],
        vol_botol: rowData[C.VOL_BOTOL],
        cnt_start: rowData[C.CNT_START],
        cnt_end: rowData[C.CNT_END],
        cnt_sub: rowData[C.CNT_SUB],
        utuh: rowData[C.UTUH],
        jml_batch: rowData[C.JML_BATCH],
        rej_botol_isi: rowData[C.REJ_BOTOL_ISI],
        rej_setting: rowData[C.REJ_SETTING],
        rej_vl: rowData[C.REJ_VL],
        bocor_seal: rowData[C.BOCOR_SEAL],
        bocor_cutting: rowData[C.BOCOR_CUTTING],
        rej_lelehan: rowData[C.REJ_LELEHAN],
        sub_fill_seal: rowData[C.SUB_FILL_SEAL],
        samp_ipc: rowData[C.SAMP_IPC],
        samp_others: rowData[C.SAMP_OTHERS],
        sub_samples: rowData[C.SUB_SAMPLES],
        trf_to_st: rowData[C.TRF_TO_ST],
        input_steril: rowData[C.INPUT_STERIL],
        reject_before_steril: rowData[C.REJECT_BEFORE_STERIL],
        output_chamber: rowData[C.OUTPUT_CHAMBER],
        at_sh: rowData[C.AT_SH],
        at_sm: rowData[C.AT_SM],
        at_eh: rowData[C.AT_EH],
        at_em: rowData[C.AT_EM],
        at_sub: rowData[C.AT_SUB],
        total_per_shift: rowData[C.TOTAL_PER_SHIFT],
        rt_sh: rowData[C.RT_SH],
        rt_sm: rowData[C.RT_SM],
        rt_eh: rowData[C.RT_EH],
        rt_em: rowData[C.RT_EM],
        rt_sub: rowData[C.RT_SUB],
        lc_sh: rowData[C.LC_SH],
        lc_sm: rowData[C.LC_SM],
        lc_eh: rowData[C.LC_EH],
        lc_em: rowData[C.LC_EM],
        lc_sub: rowData[C.LC_SUB]
      };

      const actionType = payloadData.original_id ? 'update_reject_c' : 'submit_reject_c';
      const res = await sendAutoSave({ action: actionType, data: payloadData, user });
      const newId = res?.original_id || res?.data?.id;
      if (res?.status === 'success' && newId) {
        oeeIds.current[rIdx] = newId;
        localStorage.setItem(LS_IDS_OEE, JSON.stringify(oeeIds.current));
      }
    } catch (err) {
      console.error('Autosave OEE error:', err);
    }
  }, [user]);

  const triggerAutosaveDT = useCallback(async (rIdx, rowData) => {
    if (!user) return;
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
        localStorage.setItem(LS_IDS_DT, JSON.stringify(dtIds.current));
      }
      return;
    }
    try {
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
      const newId = res?.original_id || res?.data?.id;
      if (res?.status === 'success' && newId) {
        dtIds.current[rIdx] = newId;
        localStorage.setItem(LS_IDS_DT, JSON.stringify(dtIds.current));
      }
    } catch (err) {
      console.error('Autosave DT error:', err);
    }
  }, [user]);

  const handleCellMouseDown = useCallback((e, rowIdx, colIdx, gridType) => {
    if (e.button !== 0) return;
    const setSel = gridType === 'oee' ? setOeeSelection : setDtSelection;
    const setEditing = gridType === 'oee' ? setOeeEditingCell : setDtEditingCell;

    setEditing(null);
    if (e.shiftKey) {
      setSel(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
    } else {
      isDraggingRef.current[gridType] = true;
      setSel({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
    }
  }, []);

  const handleCellMouseEnter = useCallback((rowIdx, colIdx, gridType) => {
    if (!isDraggingRef.current[gridType]) return;
    const setSel = gridType === 'oee' ? setOeeSelection : setDtSelection;
    setSel(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
  }, []);

  const handleFillHandleMouseDown = useCallback((e, rowIdx, colIdx, gridType) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const sel = gridType === 'oee' ? selectionRef.current.oee : selectionRef.current.dt;
    fillDragRef.current = {
      active: true,
      gridType,
      startRow: Math.min(sel.startRow, sel.endRow),
      endRow: Math.max(sel.startRow, sel.endRow),
      startCol: Math.min(sel.startCol, sel.endCol),
      endCol: Math.max(sel.startCol, sel.endCol),
      targetRow: Math.max(sel.startRow, sel.endRow),
      targetCol: Math.max(sel.startCol, sel.endCol),
      isCtrl: e.ctrlKey || e.metaKey
    };

    const handleMouseMove = (moveEvent) => {
      if (!fillDragRef.current.active) return;
      const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const td = el?.closest('td');
      if (td) {
        const r = parseInt(td.getAttribute('data-row'), 10);
        const c = parseInt(td.getAttribute('data-col'), 10);
        if (!isNaN(r) && !isNaN(c)) {
          fillDragRef.current.targetRow = r;
          fillDragRef.current.targetCol = c;
          const setSel = fillDragRef.current.gridType === 'oee' ? setOeeSelection : setDtSelection;
          const sR = fillDragRef.current.startRow;
          const eR = fillDragRef.current.endRow;
          const sC = fillDragRef.current.startCol;
          const eC = fillDragRef.current.endCol;

          if (r > eR) {
            setSel({ startRow: sR, startCol: sC, endRow: r, endCol: eC });
          } else if (r < sR) {
            setSel({ startRow: r, startCol: sC, endRow: eR, endCol: eC });
          } else {
            setSel({ startRow: sR, startCol: sC, endRow: eR, endCol: eC });
          }
        }
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = { oee: false, dt: false };
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
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
            const recalculatedAll = recalculateAllOEE(next);
            triggerAutosaveOEE(rowIdx, recalculatedAll[rowIdx]);
            setTimeout(() => localStorage.setItem(LS_OEE, JSON.stringify(recalculatedAll)), 0);
            return recalculatedAll;
          }
          return next;
        });
        let nextR = rowIdx;
        let nextC = colIdx;
        const maxR = oeeData.length - 1;
        const maxC = OEE_COLS_META.length - 1;
        if (moveKey === 'Enter' || moveKey === 'ArrowDown') nextR = Math.min(maxR, rowIdx + 1);
        else if (moveKey === 'ArrowUp') nextR = Math.max(0, rowIdx - 1);
        else if (moveKey === 'Tab' || moveKey === 'ArrowRight') nextC = Math.min(maxC, colIdx + 1);
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
            setTimeout(() => localStorage.setItem(LS_DT, JSON.stringify(next)), 0);
          }
          return next;
        });
        let nextR = rowIdx;
        let nextC = colIdx;
        const maxR = dtData.length - 1;
        const maxC = DC_COLS_META.length - 1;
        if (moveKey === 'Enter' || moveKey === 'ArrowDown') nextR = Math.min(maxR, rowIdx + 1);
        else if (moveKey === 'ArrowUp') nextR = Math.max(0, rowIdx - 1);
        else if (moveKey === 'Tab' || moveKey === 'ArrowRight') nextC = Math.min(maxC, colIdx + 1);
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
    const colsMeta = gridType === 'oee' ? OEE_COLS_META : DC_COLS_META;
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
      const maxCols = (gridType === 'oee' ? OEE_COLS_META : DC_COLS_META).length - 1;
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
            setTimeout(() => localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(next)), 0);
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
    const colsMeta = gridType === 'oee' ? OEE_COLS_META : DC_COLS_META;
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

      const finalData = gridType === 'oee' ? recalculateAllOEE(nextData) : nextData;
      setTimeout(() => localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(finalData)), 0);
      return finalData;
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
        const colsMeta = gridType === 'oee' ? OEE_COLS_META : DC_COLS_META;
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

          const finalData = gridType === 'oee' ? recalculateAllOEE(nextData) : nextData;
          setTimeout(() => localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(finalData)), 0);
          return finalData;
        });
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [pushHistory, triggerAutosaveOEE, triggerAutosaveDT]);

  // Auto scroll into view on navigation (Virtual Scroll Aware)
  useEffect(() => {
    if (!oeeGridRef.current) return;
    const grid = oeeGridRef.current;
    
    const ROW_HEIGHT = 29;
    const HEADER_HEIGHT = 65;
    const rowTop = (oeeSelection.endRow * ROW_HEIGHT) + HEADER_HEIGHT;
    const rowBottom = rowTop + ROW_HEIGHT;
    
    if (rowTop < grid.scrollTop + HEADER_HEIGHT) {
      grid.scrollTop = Math.max(0, rowTop - HEADER_HEIGHT);
    } else if (rowBottom > grid.scrollTop + grid.clientHeight) {
      grid.scrollTop = rowBottom - grid.clientHeight;
    }

    requestAnimationFrame(() => {
      const td = grid.querySelector(`td[data-row="${oeeSelection.endRow}"][data-col="${oeeSelection.endCol}"]`);
      if (td) scrollCellIntoView(td, grid);
    });
  }, [oeeSelection.endRow, oeeSelection.endCol]);

  useEffect(() => {
    if (!dtGridRef.current) return;
    const grid = dtGridRef.current;
    
    const ROW_HEIGHT = 29;
    const HEADER_HEIGHT = 45;
    const rowTop = (dtSelection.endRow * ROW_HEIGHT) + HEADER_HEIGHT;
    const rowBottom = rowTop + ROW_HEIGHT;
    
    if (rowTop < grid.scrollTop + HEADER_HEIGHT) {
      grid.scrollTop = Math.max(0, rowTop - HEADER_HEIGHT);
    } else if (rowBottom > grid.scrollTop + grid.clientHeight) {
      grid.scrollTop = rowBottom - grid.clientHeight;
    }

    requestAnimationFrame(() => {
      const td = grid.querySelector(`td[data-row="${dtSelection.endRow}"][data-col="${dtSelection.endCol}"]`);
      if (td) scrollCellIntoView(td, grid);
    });
  }, [dtSelection.endRow, dtSelection.endCol]);

  const loadDataServer = useCallback(async () => {
    if (!user) return;
    try {
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectC(user),
        fetchTodayDowntimeC(user),
      ]);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const filterCurrentMonth = (row) => {
        if (!row || !row.tanggal) return false;
        const ymd = parseToYMD(row.tanggal);
        if (!ymd) return false;
        const [year, month] = ymd.split('-').map(Number);
        return year === currentYear && month === currentMonth;
      };

      let mappedOEE = [];
      let mappedOEEIds = [];
      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {
        const filteredOEE = [...resOEE.data].reverse().filter(filterCurrentMonth);
        mappedOEE = filteredOEE.map((row) => {
          mappedOEEIds.push(row.id);
          const r = Array(40).fill('');
          r[C.NO_BATCH] = row.no_batch ?? '';
          r[C.TANGGAL] = parseToYMD(row.tanggal);
          r[C.SHIFT] = row.shift ?? '';
          r[C.GROUP] = row.group ?? '';
          r[C.VOL_BOTOL] = row.vol_botol ?? '';
          r[C.CNT_START] = row.cnt_start ?? '';
          r[C.CNT_END] = row.cnt_end ?? '';
          r[C.CNT_SUB] = row.cnt_sub ?? '';
          r[C.UTUH] = row.utuh ?? 'Y';
          r[C.JML_BATCH] = row.jml_batch ?? '';
          r[C.REJ_BOTOL_ISI] = row.rej_botol_isi ?? '';
          r[C.REJ_SETTING] = row.rej_setting ?? '';
          r[C.REJ_VL] = row.rej_vl ?? '';
          r[C.BOCOR_SEAL] = row.bocor_seal ?? '';
          r[C.BOCOR_CUTTING] = row.bocor_cutting ?? '';
          r[C.REJ_LELEHAN] = row.rej_lelehan ?? '';
          r[C.SUB_FILL_SEAL] = row.sub_fill_seal ?? '';
          r[C.SAMP_IPC] = row.samp_ipc ?? '';
          r[C.SAMP_OTHERS] = row.samp_others ?? '';
          r[C.SUB_SAMPLES] = row.sub_samples ?? '';
          r[C.TRF_TO_ST] = row.trf_to_st ?? '';
          r[C.INPUT_STERIL] = row.input_steril ?? '';
          r[C.REJECT_BEFORE_STERIL] = row.reject_before_steril ?? '';
          r[C.OUTPUT_CHAMBER] = row.output_chamber ?? '';
          r[C.AT_SH] = row.at_sh ?? '';
          r[C.AT_SM] = row.at_sm ?? '';
          r[C.AT_EH] = row.at_eh ?? '';
          r[C.AT_EM] = row.at_em ?? '';
          r[C.AT_SUB] = row.at_sub ?? '';
          r[C.TOTAL_PER_SHIFT] = row.total_per_shift ?? '';
          r[C.RT_SH] = row.rt_sh ?? '';
          r[C.RT_SM] = row.rt_sm ?? '';
          r[C.RT_EH] = row.rt_eh ?? '';
          r[C.RT_EM] = row.rt_em ?? '';
          r[C.RT_SUB] = row.rt_sub ?? '';
          r[C.LC_SH] = row.lc_sh ?? '';
          r[C.LC_SM] = row.lc_sm ?? '';
          r[C.LC_EH] = row.lc_eh ?? '';
          r[C.LC_EM] = row.lc_em ?? '';
          r[C.LC_SUB] = row.lc_sub ?? '';
          return calculateOEERow(r);
        });
        mappedOEE = recalculateAllOEE(mappedOEE);
      }

      let mappedDT = [];
      let mappedDTIds = [];
      if (resDT?.status === 'success' && Array.isArray(resDT.data)) {
        const filteredDT = [...resDT.data].reverse().filter(filterCurrentMonth);
        mappedDT = filteredDT.map((row) => {
          mappedDTIds.push(row.id);
          return [
            parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.no_batch ?? '', row.start_h ?? '', row.start_m ?? '',
            row.end_h ?? '', row.end_m ?? '', row.duration ?? '', row.plan_unplan ?? 'Unplanned', row.root_cause ?? '', row.proses ?? '',
            row.unit ?? '', row.kasus ?? ''
          ];
        });
      }

      const getEmptyOEEWithUtuh = () => {
        const e = getEmptyOEE();
        return e;
      };

      const finalOEEData = [...mappedOEE, ...Array.from({ length: Math.max(50, 100 - mappedOEE.length) }, getEmptyOEEWithUtuh)];
      const finalDTData = [...mappedDT, ...Array.from({ length: Math.max(50, 100 - mappedDT.length) }, getEmptyDT)];

      oeeIds.current = [...mappedOEEIds, ...Array(finalOEEData.length - mappedOEEIds.length).fill(null)];
      dtIds.current = [...mappedDTIds, ...Array(finalDTData.length - mappedDTIds.length).fill(null)];

      setOeeData(finalOEEData);
      setDtData(finalDTData);

      localStorage.setItem(LS_OEE, JSON.stringify(finalOEEData));
      localStorage.setItem(LS_DT, JSON.stringify(finalDTData));
      localStorage.setItem(LS_IDS_OEE, JSON.stringify(oeeIds.current));
      localStorage.setItem(LS_IDS_DT, JSON.stringify(dtIds.current));

    } catch (error) {
      console.error('Fetch data error:', error);
    }
  }, [user]);

  useEffect(() => {
    loadDataServer();
  }, [loadDataServer]);

  const handleDownloadExcelOEE = useCallback(async () => {
    const toastId = toast.loading("Mengunduh semua data OEE dari TiDB...");
    try {
      const line3User = { ...(user || {}), line: "3" };
      const res = await fetchAllRejectC(line3User);
      if (res?.status === 'success' && Array.isArray(res.data)) {
        const headers = OEE_COLS_META.map(col => col.title);
        const exportRows = res.data.map((row) => {
          const r = Array(40).fill('');
          r[C.NO_BATCH] = row.no_batch ?? '';
          r[C.TANGGAL] = parseToYMD(row.tanggal);
          r[C.SHIFT] = row.shift ?? '';
          r[C.GROUP] = row.group ?? '';
          r[C.VOL_BOTOL] = row.vol_botol ?? '';
          r[C.CNT_START] = row.cnt_start ?? '';
          r[C.CNT_END] = row.cnt_end ?? '';
          r[C.CNT_SUB] = row.cnt_sub ?? '';
          r[C.UTUH] = row.utuh ?? 'Y';
          r[C.JML_BATCH] = row.jml_batch ?? '';
          r[C.REJ_BOTOL_ISI] = row.rej_botol_isi ?? '';
          r[C.REJ_SETTING] = row.rej_setting ?? '';
          r[C.REJ_VL] = row.rej_vl ?? '';
          r[C.BOCOR_SEAL] = row.bocor_seal ?? '';
          r[C.BOCOR_CUTTING] = row.bocor_cutting ?? '';
          r[C.REJ_LELEHAN] = row.rej_lelehan ?? '';
          r[C.SUB_FILL_SEAL] = row.sub_fill_seal ?? '';
          r[C.SAMP_IPC] = row.samp_ipc ?? '';
          r[C.SAMP_OTHERS] = row.samp_others ?? '';
          r[C.SUB_SAMPLES] = row.sub_samples ?? '';
          r[C.TRF_TO_ST] = row.trf_to_st ?? '';
          r[C.INPUT_STERIL] = row.input_steril ?? '';
          r[C.REJECT_BEFORE_STERIL] = row.reject_before_steril ?? '';
          r[C.OUTPUT_CHAMBER] = row.output_chamber ?? '';
          r[C.AT_SH] = row.at_sh ?? '';
          r[C.AT_SM] = row.at_sm ?? '';
          r[C.AT_EH] = row.at_eh ?? '';
          r[C.AT_EM] = row.at_em ?? '';
          r[C.AT_SUB] = row.at_sub ?? '';
          r[C.TOTAL_PER_SHIFT] = row.total_per_shift ?? '';
          r[C.RT_SH] = row.rt_sh ?? '';
          r[C.RT_SM] = row.rt_sm ?? '';
          r[C.RT_EH] = row.rt_eh ?? '';
          r[C.RT_EM] = row.rt_em ?? '';
          r[C.RT_SUB] = row.rt_sub ?? '';
          r[C.LC_SH] = row.lc_sh ?? '';
          r[C.LC_SM] = row.lc_sm ?? '';
          r[C.LC_EH] = row.lc_eh ?? '';
          r[C.LC_EM] = row.lc_em ?? '';
          r[C.LC_SUB] = row.lc_sub ?? '';
          return calculateOEERow(r);
        });
        const ws = XLSX.utils.aoa_to_sheet([headers, ...exportRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Semua Data OEE");
        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Semua_Data_OEE_Line3_ZoneC_${today}.xlsx`);
        toast.success("Download Excel OEE berhasil!", { id: toastId });
      } else {
        toast.error("Gagal memuat data OEE dari server", { id: toastId });
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengunduh data", { id: toastId });
    }
  }, [user]);

  const handleDownloadExcelDT = useCallback(async () => {
    const toastId = toast.loading("Mengunduh semua data Downtime dari TiDB...");
    try {
      const line3User = { ...(user || {}), line: "3" };
      const res = await fetchAllDowntimeC(line3User);
      if (res?.status === 'success' && Array.isArray(res.data)) {
        const headers = DC_COLS_META.map(col => col.title);
        const exportRows = res.data.map((row) => {
          return [
            parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.no_batch ?? '', row.start_h ?? '', row.start_m ?? '',
            row.end_h ?? '', row.end_m ?? '', row.duration ?? '', row.plan_unplan ?? 'Unplanned', row.root_cause ?? '', row.proses ?? '',
            row.unit ?? '', row.kasus ?? ''
          ];
        });
        const ws = XLSX.utils.aoa_to_sheet([headers, ...exportRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Semua Data Downtime");
        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Semua_Data_Downtime_Line3_ZoneC_${today}.xlsx`);
        toast.success("Download Excel Downtime berhasil!", { id: toastId });
      } else {
        toast.error("Gagal memuat data Downtime dari server", { id: toastId });
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengunduh data", { id: toastId });
    }
  }, [user]);

  const oeeMinR = Math.min(oeeSelection.startRow, oeeSelection.endRow);
  const oeeMaxR = Math.max(oeeSelection.startRow, oeeSelection.endRow);
  const oeeMinC = Math.min(oeeSelection.startCol, oeeSelection.endCol);
  const oeeMaxC = Math.max(oeeSelection.startCol, oeeSelection.endCol);

  const dtMinR = Math.min(dtSelection.startRow, dtSelection.endRow);
  const dtMaxR = Math.max(dtSelection.startRow, dtSelection.endRow);
  const dtMinC = Math.min(dtSelection.startCol, dtSelection.endCol);
  const dtMaxC = Math.max(dtSelection.startCol, dtSelection.endCol);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans outline-none" tabIndex={0} onKeyDown={(e) => {
      if (oeeEditingCell || dtEditingCell) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'F2', 'Backspace', 'Delete'].includes(e.key) || (e.ctrlKey && ['z', 'y', 'a'].includes(e.key.toLowerCase())) || (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey)) {
        handleGridKeyDown(e, oeeSelection.endRow !== undefined && document.activeElement === oeeGridRef.current ? 'oee' : 'dt');
      }
    }}>
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-wider uppercase text-emerald-800">
            OEE Line 3 - Zone C
          </h1>
          <button
            type="button"
            onClick={handleDownloadExcelOEE}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm border border-emerald-500"
          >
            <Download size={16} />
            <span>Download Excel (OEE)</span>
          </button>
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl mb-12 rounded overflow-hidden p-1 contain-content" style={{ contain: 'content', contentVisibility: 'auto', containIntrinsicSize: '700px' }}>
          <div className="w-full h-[700px] overflow-auto select-none outline-none" ref={oeeGridRef} tabIndex={0} onScroll={(e) => setOeeScrollTop(e.target.scrollTop)} onCopy={(e) => handleCopy(e, 'oee')} onPaste={(e) => handlePaste(e, 'oee')}>
            <div className="w-max min-w-full pr-[350px] pb-[150px]">
              <table className="w-max min-w-full border-collapse text-xs table-fixed text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold shadow-sm sticky top-0 z-40 will-change-transform">
                  <tr>
                    <th rowSpan={3} className="py-1.5 px-2 bg-slate-200 text-slate-800 font-mono text-center sticky top-0 left-0 z-50 w-[60px] min-w-[60px] max-w-[60px] shadow-[1px_0_0_0_#cbd5e1]">ID</th>
                    <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center sticky left-[60px] z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1]">Informasi Batch</th>
                    <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Counter Total Filling</th>
                    <th colSpan={7} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Rejection Filling</th>
                    <th colSpan={3} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Samples</th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Hasil Baik</th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Available Time</th>
                    <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Run Time</th>
                    <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Line Clearance</th>
                  </tr>
                  <tr>
                    <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center sticky left-[60px] z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1]"></th>
                    <th colSpan={3} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Per cycle batch</th>
                    <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Bocor</th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Botol</th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Transfer To ST</th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                    <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">FILLING</th>
                    <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">CIP MINOR</th>
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
                  {(() => {
                    const startIdx = Math.max(0, Math.floor(oeeScrollTop / ROW_HEIGHT) - BUFFER_ROWS);
                    const endIdx = Math.min(oeeData.length - 1, startIdx + VISIBLE_ROWS + (BUFFER_ROWS * 2));
                    
                    return (
                      <>
                        {startIdx > 0 && <tr style={{ height: `${startIdx * ROW_HEIGHT}px` }}><td colSpan={OEE_COLS_META.length + 1} className="p-0 border-none"></td></tr>}
                        {oeeData.slice(startIdx, endIdx + 1).map((row, index) => {
                          const rowIdx = startIdx + index;
                          const isSelRow = rowIdx >= oeeMinR && rowIdx <= oeeMaxR;
                          const edCol = (oeeEditingCell && oeeEditingCell.row === rowIdx) ? oeeEditingCell.col : null;
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
                        {endIdx < oeeData.length - 1 && <tr style={{ height: `${(oeeData.length - 1 - endIdx) * ROW_HEIGHT}px` }}><td colSpan={OEE_COLS_META.length + 1} className="p-0 border-none"></td></tr>}
                      </>
                    );
                  })()}
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
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 3 - Zone C
          </h2>
          <button
            type="button"
            onClick={handleDownloadExcelDT}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm border border-indigo-500"
          >
            <Download size={16} />
            <span>Download Excel (Downtime)</span>
          </button>
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl rounded overflow-hidden p-1 mb-10 contain-content" style={{ contain: 'content', contentVisibility: 'auto', containIntrinsicSize: '700px' }}>
          <div className="w-full h-[700px] overflow-auto select-none outline-none" ref={dtGridRef} tabIndex={0} onScroll={(e) => setDtScrollTop(e.target.scrollTop)} onCopy={(e) => handleCopy(e, 'dt')} onPaste={(e) => handlePaste(e, 'dt')}>
            <div className="w-max min-w-full pr-[350px] pb-[150px]">
              <table className="w-max min-w-full border-collapse text-xs table-fixed text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold shadow-sm sticky top-0 z-40 will-change-transform">
                  <tr>
                    <th className="py-2 px-1 bg-slate-200 text-slate-800 font-mono text-center sticky top-0 left-0 z-50 w-[60px] min-w-[60px] max-w-[60px] shadow-[1px_0_0_0_#cbd5e1]">ID</th>
                    {DC_COLS_META.map((col, idx) => (
                      <th
                        key={idx}
                        style={{
                          width: col.width, minWidth: col.width, maxWidth: col.width,
                          position: col.stickyLeft !== undefined ? 'sticky' : 'static',
                          left: col.stickyLeft !== undefined ? col.stickyLeft : 'auto',
                          top: col.stickyLeft !== undefined ? 0 : 'auto',
                          zIndex: col.stickyLeft !== undefined ? 41 : 40,
                        }}
                        className={`border-r border-b border-slate-[300] px-1 py-2 text-center text-[10px] uppercase tracking-wide ${col.stickyLeft !== undefined ? 'bg-slate-200' : 'bg-slate-100'} ${col.stickyLeft !== undefined && idx === 3 ? 'shadow-[1px_0_0_0_#cbd5e1]' : ''}`}
                      >
                        {col.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const startIdx = Math.max(0, Math.floor(dtScrollTop / ROW_HEIGHT) - BUFFER_ROWS);
                    const endIdx = Math.min(dtData.length - 1, startIdx + VISIBLE_ROWS + (BUFFER_ROWS * 2));
                    
                    return (
                      <>
                        {startIdx > 0 && <tr style={{ height: `${startIdx * ROW_HEIGHT}px` }}><td colSpan={DC_COLS_META.length + 1} className="p-0 border-none"></td></tr>}
                        {dtData.slice(startIdx, endIdx + 1).map((row, index) => {
                          const rowIdx = startIdx + index;
                          const isSelRow = rowIdx >= dtMinR && rowIdx <= dtMaxR;
                          const edCol = (dtEditingCell && dtEditingCell.row === rowIdx) ? dtEditingCell.col : null;
                          const edMode = (dtEditingCell && dtEditingCell.row === rowIdx) ? dtEditingCell.mode : null;
                          const edInit = (dtEditingCell && dtEditingCell.row === rowIdx) ? dtEditingCell.initialValue : undefined;

                          return (
                            <SpreadsheetRow
                              key={rowIdx}
                              rowData={row}
                              rowIdx={rowIdx}
                              colsMeta={DC_COLS_META}
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
                        {endIdx < dtData.length - 1 && <tr style={{ height: `${(dtData.length - 1 - endIdx) * ROW_HEIGHT}px` }}><td colSpan={DC_COLS_META.length + 1} className="p-0 border-none"></td></tr>}
                      </>
                    );
                  })()}
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
        </div>

        {contextMenu && createPortal(
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[999999] bg-white border border-slate-300 shadow-2xl rounded-md py-1.5 min-w-[150px] text-xs font-sans text-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                handleDeleteRow(contextMenu.gridType);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-600 font-semibold flex items-center gap-2 transition-colors"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          </div>,
          document.body
        )}

      </div>
    </div>
  );
}