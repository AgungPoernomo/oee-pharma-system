import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectC, fetchTodayDowntimeC } from '../../../services/api';
import { scrollCellIntoView } from '../../../lib/utils';
import { Toaster } from 'react-hot-toast';

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
  OUTPUT_CHAMBER: 22,
  AT_SH: 23, AT_SM: 24, AT_EH: 25, AT_EM: 26, AT_SUB: 27, TOTAL_PER_SHIFT: 28,
  RT_SH: 29, RT_SM: 30, RT_EH: 31, RT_EM: 32, RT_SUB: 33,
  LC_SH: 34, LC_SM: 35, LC_EH: 36, LC_EM: 37, LC_SUB: 38
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
  const arr = Array(39).fill('');
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
    setV(C.TRF_TO_ST, trf > 0 ? trf : 0);
    setV(C.INPUT_STERIL, trf > 0 ? trf : 0);
    setV(C.OUTPUT_CHAMBER, trf > 0 ? trf : 0);
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
  { title: 'Batch No.', width: 110, type: 'text', stickyLeft: 0 },
  { title: 'Tanggal', width: 105, type: 'date', stickyLeft: 110 },
  { title: 'Shift', width: 60, type: 'select', options: SHIFTS, stickyLeft: 215 },
  { title: 'Grup', width: 60, type: 'select', options: GROUPS, stickyLeft: 275 },
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

  // 7. Output (masuk chamber) (22)
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
  { title: 'Tanggal', width: 120, type: 'date', stickyLeft: 0 },
  { title: 'Shift', width: 60, type: 'number', stickyLeft: 120 },
  { title: 'Grup', width: 60, type: 'text', stickyLeft: 180 },
  { title: 'No. Batch', width: 115, type: 'text', stickyLeft: 240 },
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

  const [oeeData, setOeeData] = useState(() => getCachedData('C_DATA_OEE', getEmptyOEE, 100));
  const [dtData, setDtData] = useState(() => getCachedData('C_DATA_DT', getEmptyDT, 100));

  const oeeIds = useRef(getCachedIds('C_IDS_OEE', 100));
  const dtIds = useRef(getCachedIds('C_IDS_DT', 100));

  const [oeeSelection, setOeeSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const [dtSelection, setDtSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });

  const [oeeEditingCell, setOeeEditingCell] = useState(null);
  const [dtEditingCell, setDtEditingCell] = useState(null);

  const [oeeHistory, setOeeHistory] = useState({ past: [], future: [] });
  const [dtHistory, setDtHistory] = useState({ past: [], future: [] });

  const oeeGridRef = useRef(null);
  const dtGridRef = useRef(null);
  const isDraggingRef = useRef({ oee: false, dt: false });
  const fillDragRef = useRef({ active: false });

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
          setTimeout(() => localStorage.setItem('C_DATA_OEE', JSON.stringify(prev)), 0);
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
          setTimeout(() => localStorage.setItem('C_DATA_DT', JSON.stringify(prev)), 0);
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
          setTimeout(() => localStorage.setItem('C_DATA_OEE', JSON.stringify(next)), 0);
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
          setTimeout(() => localStorage.setItem('C_DATA_DT', JSON.stringify(next)), 0);
          return next;
        });
        return { past: [...h.past, dtData], future: newFuture };
      });
    }
  }, [oeeData, dtData]);

  const triggerAutosaveOEE = useCallback(async (rIdx, rowData) => {
    if (!user || !rowData[C.NO_BATCH] || !rowData[C.TANGGAL]) return;
    try {
      const payloadData = {
        original_id: oeeIds.current[rIdx] || null,
        no_batch: rowData[C.NO_BATCH],
        lot_no: '',
        tanggal: rowData[C.TANGGAL],
        shift: rowData[C.SHIFT],
        group: rowData[C.GROUP],
        volume_botol: rowData[C.VOL_BOTOL],
        cnt_start: rowData[C.CNT_START],
        cnt_end: rowData[C.CNT_END],
        cnt_sub: rowData[C.CNT_SUB],
        utuh: rowData[C.UTUH],
        jml_batch: rowData[C.JML_BATCH],
        r_washing: rowData[C.REJ_BOTOL_ISI],
        r_vk: rowData[C.REJ_SETTING],
        r_vl: rowData[C.REJ_VL],
        r_nocap: rowData[C.BOCOR_SEAL],
        r_sealnok: rowData[C.BOCOR_CUTTING],
        r_others: rowData[C.REJ_LELEHAN],
        r_sub: rowData[C.SUB_FILL_SEAL],
        s_ipc: rowData[C.SAMP_IPC],
        s_others: rowData[C.SAMP_OTHERS],
        s_sub: rowData[C.SUB_SAMPLES],
        trf_st: rowData[C.TRF_TO_ST],
        pre_in: rowData[C.INPUT_STERIL],
        pre_out: rowData[C.OUTPUT_CHAMBER],
        av_sh: rowData[C.AT_SH],
        av_sm: rowData[C.AT_SM],
        av_eh: rowData[C.AT_EH],
        av_em: rowData[C.AT_EM],
        av_sub: rowData[C.AT_SUB],
        total_avail_shift: rowData[C.TOTAL_PER_SHIFT],
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
      if (res?.status === 'success' && res.data?.id) {
        oeeIds.current[rIdx] = res.data.id;
        localStorage.setItem('C_IDS_OEE', JSON.stringify(oeeIds.current));
      }
    } catch (err) {
      console.error('Autosave OEE error:', err);
    }
  }, [user]);

  const triggerAutosaveDT = useCallback(async (rIdx, rowData) => {
    if (!user || !rowData[DC.TANGGAL] || !rowData[DC.SHIFT] || !rowData[DC.NO_BATCH]) return;
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
      if (res?.status === 'success' && res.data?.id) {
        dtIds.current[rIdx] = res.data.id;
        localStorage.setItem('C_IDS_DT', JSON.stringify(dtIds.current));
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
    const sel = gridType === 'oee' ? oeeSelection : dtSelection;
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
  }, [oeeSelection, dtSelection]);

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
            setTimeout(() => localStorage.setItem('C_DATA_OEE', JSON.stringify(recalculatedAll)), 0);
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
            setTimeout(() => localStorage.setItem('C_DATA_DT', JSON.stringify(next)), 0);
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
            const finalData = gridType === 'oee' ? recalculateAllOEE(next) : next;
            setTimeout(() => localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(finalData)), 0);
            return finalData;
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
      setTimeout(() => localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(finalData)), 0);
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
          setTimeout(() => localStorage.setItem(gridType === 'oee' ? 'C_DATA_OEE' : 'C_DATA_DT', JSON.stringify(finalData)), 0);
          return finalData;
        });
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [pushHistory, triggerAutosaveOEE, triggerAutosaveDT]);

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
        if (!row.tanggal) return false;
        const d = new Date(row.tanggal);
        return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
      };

      let mappedOEE = [];
      let mappedOEEIds = [];
      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {
        const filteredOEE = [...resOEE.data].reverse().filter(filterLast30Days);
        mappedOEE = filteredOEE.map((row) => {
          mappedOEEIds.push(row.id);
          const r = Array(39).fill('');
          r[C.NO_BATCH] = row.no_batch ?? '';
          r[C.TANGGAL] = parseToYMD(row.tanggal);
          r[C.SHIFT] = row.shift ?? '';
          r[C.GROUP] = row.group ?? '';
          r[C.VOL_BOTOL] = row.volume_botol ?? '';
          r[C.CNT_START] = row.cnt_start ?? '';
          r[C.CNT_END] = row.cnt_end ?? '';
          r[C.CNT_SUB] = row.cnt_sub ?? '';
          r[C.UTUH] = row.utuh ?? 'Y';
          r[C.JML_BATCH] = row.jml_batch ?? '';
          r[C.REJ_BOTOL_ISI] = row.r_washing ?? '';
          r[C.REJ_SETTING] = row.r_vk ?? '';
          r[C.REJ_VL] = row.r_vl ?? '';
          r[C.BOCOR_SEAL] = row.r_nocap ?? '';
          r[C.BOCOR_CUTTING] = row.r_sealnok ?? '';
          r[C.REJ_LELEHAN] = row.r_others ?? '';
          r[C.SUB_FILL_SEAL] = row.r_sub ?? '';
          r[C.SAMP_IPC] = row.s_ipc ?? '';
          r[C.SAMP_OTHERS] = row.s_others ?? '';
          r[C.SUB_SAMPLES] = row.s_sub ?? '';
          r[C.TRF_TO_ST] = row.trf_st ?? '';
          r[C.INPUT_STERIL] = row.pre_in ?? '';
          r[C.OUTPUT_CHAMBER] = row.pre_out ?? '';
          r[C.AT_SH] = row.av_sh ?? '';
          r[C.AT_SM] = row.av_sm ?? '';
          r[C.AT_EH] = row.av_eh ?? '';
          r[C.AT_EM] = row.av_em ?? '';
          r[C.AT_SUB] = row.av_sub ?? '';
          r[C.TOTAL_PER_SHIFT] = row.total_avail_shift ?? '';
          r[C.RT_SH] = row.run_sh ?? '';
          r[C.RT_SM] = row.run_sm ?? '';
          r[C.RT_EH] = row.run_eh ?? '';
          r[C.RT_EM] = row.run_em ?? '';
          r[C.RT_SUB] = row.run_sub ?? '';
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
        const filteredDT = [...resDT.data].reverse().filter(filterLast30Days);
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

      localStorage.setItem('C_DATA_OEE', JSON.stringify(finalOEEData));
      localStorage.setItem('C_DATA_DT', JSON.stringify(finalDTData));
      localStorage.setItem('C_IDS_OEE', JSON.stringify(oeeIds.current));
      localStorage.setItem('C_IDS_DT', JSON.stringify(dtIds.current));

    } catch (error) {
      console.error('Fetch data error:', error);
    }
  }, [user]);

  useEffect(() => {
    loadDataServer();
  }, [loadDataServer]);

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
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl mb-12 rounded overflow-hidden p-1">
          <div className="w-full h-[700px] overflow-auto select-none" ref={oeeGridRef} tabIndex={0} onCopy={(e) => handleCopy(e, 'oee')} onPaste={(e) => handlePaste(e, 'oee')}>
            <table className="w-max min-w-full border-collapse text-xs table-fixed">
              <thead className="bg-slate-800 text-white text-[11px] uppercase tracking-wider font-bold sticky top-0 z-20">
                <tr className="border-b border-slate-700 text-center divide-x divide-slate-700">
                  <th colSpan={5} className="py-2 bg-slate-800 sticky left-0 z-30 shadow-[1px_0_0_0_#334155]">Informasi Batch</th>
                  <th colSpan={5} className="py-2 bg-emerald-900">Counter Total Filling</th>
                  <th colSpan={7} className="py-2 bg-slate-800">Rejection Filling</th>
                  <th colSpan={3} className="py-2 bg-slate-800">Samples</th>
                  <th colSpan={1} className="py-2 bg-emerald-900">Hasil Baik</th>
                  <th colSpan={1} className="py-2 bg-slate-800"></th>
                  <th colSpan={1} className="py-2 bg-red-950"></th>
                  <th colSpan={6} className="py-2 bg-blue-950">Available Time</th>
                  <th colSpan={5} className="py-2 bg-indigo-950">Run Time</th>
                  <th colSpan={5} className="py-2 bg-purple-950">Line Clearance</th>
                </tr>
                <tr className="border-b border-slate-700 text-center divide-x divide-slate-700 bg-slate-700/80">
                  <th colSpan={5} className="py-1 bg-slate-800 sticky left-0 z-30 shadow-[1px_0_0_0_#334155]"></th>
                  <th colSpan={3} className="py-1">Per cycle batch</th>
                  <th colSpan={2} className="py-1"></th>
                  <th colSpan={1} className="py-1"></th>
                  <th colSpan={1} className="py-1"></th>
                  <th colSpan={1} className="py-1"></th>
                  <th colSpan={2} className="py-1">Bocor</th>
                  <th colSpan={1} className="py-1"></th>
                  <th colSpan={1} className="py-1"></th>
                  <th colSpan={2} className="py-1">Botol</th>
                  <th colSpan={1} className="py-1"></th>
                  <th colSpan={1} className="py-1">Transfer To ST</th>
                  <th colSpan={1} className="py-1"></th>
                  <th colSpan={1} className="py-1"></th>
                  <th colSpan={6} className="py-1"></th>
                  <th colSpan={5} className="py-1">FILLING</th>
                  <th colSpan={5} className="py-1">CIP MINOR</th>
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
                  const isSelRow = rowIdx >= Math.min(oeeSelection.startRow, oeeSelection.endRow) && rowIdx <= Math.max(oeeSelection.startRow, oeeSelection.endRow);
                  const minC = Math.min(oeeSelection.startCol, oeeSelection.endCol);
                  const maxC = Math.max(oeeSelection.startCol, oeeSelection.endCol);
                  const maxR = Math.max(oeeSelection.startRow, oeeSelection.endRow);
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
                      selectionMinCol={minC}
                      selectionMaxCol={maxC}
                      selectionMaxRow={maxR}
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
          <h2 className="text-2xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 3 - Zone C
          </h2>
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl rounded overflow-hidden p-1 mb-10">
          <div className="w-full h-[700px] overflow-auto select-none" ref={dtGridRef} tabIndex={0} onCopy={(e) => handleCopy(e, 'dt')} onPaste={(e) => handlePaste(e, 'dt')}>
            <table className="w-max min-w-full border-collapse text-xs table-fixed">
              <thead className="bg-slate-100 text-slate-700 font-semibold shadow-sm sticky top-0 z-40">
                <tr>
                  {DC_COLS_META.map((col, idx) => (
                    <th
                      key={idx}
                      style={{
                        width: col.width, minWidth: col.width, maxWidth: col.width,
                        position: col.stickyLeft !== undefined ? 'sticky' : 'static',
                        left: col.stickyLeft !== undefined ? col.stickyLeft : 'auto',
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
                {dtData.map((row, rowIdx) => {
                  const isSelRow = rowIdx >= Math.min(dtSelection.startRow, dtSelection.endRow) && rowIdx <= Math.max(dtSelection.startRow, dtSelection.endRow);
                  const dtMinC = Math.min(dtSelection.startCol, dtSelection.endCol);
                  const dtMaxC = Math.max(dtSelection.startCol, dtSelection.endCol);
                  const dtMaxR = Math.max(dtSelection.startRow, dtSelection.endRow);
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