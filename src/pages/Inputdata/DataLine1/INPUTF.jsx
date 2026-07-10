import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectF, fetchTodayDowntimeF } from '../../../services/api';
import { scrollCellIntoView } from '../../../lib/utils';
import { Toaster } from 'react-hot-toast';

const TEORI_BATCH = { "100 ML": 56880, "250 ML": 21509, "500 ML": 11538, "1000 ML": 11538, "100 ML PAR": 27522 };
const TEORI_YIELD = 11538;
const VOLUMES = ["100 ML", "250 ML", "500 ML", "1000 ML", "100 ML PAR"];

const parseToYMD = (val) => {
  if (!val) return '';
  const str = String(val).replace(/['"]/g, '').trim();
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(str)) {
    const parts = str.split(/[-/.]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].split(' ')[0].padStart(2, '0')}`;
  }
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(str)) {
    const parts = str.split(/[-/.]/);
    return `${parts[2].split(' ')[0]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (err) {
    void err;
  }
  return str.substring(0, 10);
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
  arr[5] = '';
  arr[30] = 'Y';
  return arr;
};

const getEmptyDT = () => {
  const arr = Array(14).fill('');
  arr[9] = 'Unplanned';
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
    const response = await fetch('/api/autosave-f', {
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

const UNIT_MAP_F = {
  'All Team Packaging': ['Conveyor Inspeksi', 'IDDLE', 'Others', 'Robotic', 'Wait Produk', 'Line Clearance', 'Break'],
  'Cartoning': ['Carton sealer', 'Carton Unpacker', 'Case Packer - Others', 'Collecting Conveyor', 'Conveyor', 'Floating conveyor', 'Ganti Label', 'IDDLE', 'Inkjet Printer', 'Labelling', 'Labelling - Others', 'Robot', 'Vacuum Case Packer', 'Weigher', 'Weighing Checker'],
  'Conveyor': ['Carton sealer', 'Conveyor', 'Conveyor Hitam', 'Conveyor Inspek', 'Others'],
  'Visual Inspeksi': ['Conveyor Inspeksi', 'Mesin Visual Inspeksi', 'Others'],
  'Labelling': ['Carton sealer', 'Conveyor', 'Floating Conveyor', 'Ganti Label', 'Inkjet Printer', 'Labelling', 'Sensor Inkjet', 'Sensor label', 'Wait Produk'],
  'Robot': ['Collecting conveyor', 'Conveyor', 'Floating conveyor', 'Meja Collecting', 'Others', 'Robot'],
  'Unpacker': ['Carton Unpacker']
};
const ALL_UNITS_F = [...new Set(Object.values(UNIT_MAP_F).flat())];

const calculateOEERow = (row) => {
  const next = [...row];
  const v = (col) => {
    let val = next[col];
    return (val === "" || val === null || isNaN(val)) ? 0 : parseFloat(val);
  };
  const setV = (col, val) => { next[col] = val; };

  setV(12, v(7) + v(8) + v(9) + v(10) + v(11));

  let sIn = v(6);
  if (sIn > 0) {
    let sOut = sIn - v(12) - v(13);
    setV(14, sOut);
    setV(16, sOut);
  } else {
    setV(14, '');
    setV(16, '');
  }

  let sub = v(16) - v(15); setV(17, sub > 0 ? sub : '');

  setV(21, v(19) + v(20));

  let vSub = v(17);
  if (vSub > 0) {
    let vBaik = vSub - v(21);
    setV(22, vBaik);
    setV(24, vBaik - v(23));
  } else { setV(22, ''); setV(24, ''); }

  let pTrf = v(24);
  if (pTrf > 0) {
    let pHasil = pTrf - v(25);
    setV(26, pHasil);
    setV(29, pHasil - v(27) - v(28));
  } else { setV(26, ''); setV(29, ''); }

  let volKey = next[5] || "500 ML";
  let pFg = v(29);
  if (pFg > 0) {
    setV(31, (pFg / (TEORI_BATCH[volKey] || 23076)).toFixed(2));
    setV(33, ((pFg / TEORI_YIELD) * 100).toFixed(2));
  } else { setV(31, ''); setV(33, ''); }

  const timeDiff = (sh, sm, eh, em) => {
    if (v(sh) === 0 && v(sm) === 0 && v(eh) === 0 && v(em) === 0 && next[sh] === "") return '';
    let diff = (v(eh) * 60 + v(em)) - (v(sh) * 60 + v(sm));
    return diff < 0 ? diff + (24 * 60) : diff;
  };

  setV(39, timeDiff(35, 36, 37, 38));
  setV(45, timeDiff(41, 42, 43, 44));
  let lc = timeDiff(46, 47, 48, 49);
  setV(50, lc);

  let rSub = v(45); let lSub = v(50);
  if (rSub > 0 || lSub > 0) setV(51, rSub + lSub);
  else setV(51, '');

  return next;
};

const calculateDTRow = (row) => {
  const next = [...row];
  const raw = (c) => next[c] !== null && next[c] !== undefined ? next[c] : '';
  const v = (c) => {
    const val = raw(c);
    return (val === '' || isNaN(val)) ? 0 : parseFloat(val);
  };
  if (raw(4) !== '' && raw(6) !== '') {
    const diff = (v(6) * 60 + v(7)) - (v(4) * 60 + v(5));
    next[8] = diff < 0 ? diff + 24 * 60 : diff;
  } else {
    next[8] = '';
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
  { title: 'No Batch', width: 90, type: 'text', stickyLeft: 60 },
  { title: 'Lot No', width: 90, type: 'text', stickyLeft: 150 },
  { title: 'Tanggal', width: 100, type: 'date', stickyLeft: 240 },
  { title: 'Shift', width: 60, type: 'number', stickyLeft: 340 },
  { title: 'Group', width: 60, type: 'text', stickyLeft: 400 },
  { title: 'Volume', width: 90, type: 'select', options: VOLUMES },
  { title: 'Input (Botol chamber)', width: 100, type: 'number' },
  { title: 'Reject Bocor', width: 90, type: 'number' },
  { title: 'Reject Patah ring', width: 90, type: 'number' },
  { title: 'Reject Patah Lidah', width: 90, type: 'number' },
  { title: 'Reject Patah Lelehan', width: 90, type: 'number' },
  { title: 'Reject Tanpa Hanger', width: 90, type: 'number' },
  { title: 'TOTAL', width: 80, type: 'number', readOnly: true },
  { title: 'Sampel QC', width: 80, type: 'number' },
  { title: 'Output (TF to VI)', width: 120, type: 'number', readOnly: true },
  { title: 'Start', width: 80, type: 'number' },
  { title: 'End', width: 80, type: 'number' },
  { title: 'Sub total', width: 90, type: 'number', readOnly: true },
  { title: 'Total per Shift', width: 110, type: 'number', readOnly: true },
  { title: 'Partikel', width: 80, type: 'number' },
  { title: 'Kosmetik', width: 80, type: 'number' },
  { title: 'TOTAL', width: 80, type: 'number', readOnly: true },
  { title: 'Hasil Baik', width: 90, type: 'number', readOnly: true },
  { title: 'QC', width: 80, type: 'number' },
  { title: 'Transfer ke Packing', width: 130, type: 'number', readOnly: true },
  { title: 'Reject', width: 80, type: 'number' },
  { title: 'Hasil Baik', width: 90, type: 'number', readOnly: true },
  { title: 'QC', width: 70, type: 'number' },
  { title: 'Others', width: 70, type: 'number' },
  { title: 'Finished Goods', width: 110, type: 'number', readOnly: true },
  { title: 'Utuh ?', width: 70, type: 'select', options: ['Y', 'N'] },
  { title: 'Jumlah Batch', width: 100, type: 'number', readOnly: true },
  { title: 'Total per shift', width: 110, type: 'number', readOnly: true },
  { title: 'per Batch (%)', width: 90, type: 'number', readOnly: true },
  { title: 'AVERAGE per shift (%)', width: 120, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 90, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 90, type: 'number' },
  { title: 'Sub Total', width: 90, type: 'number', readOnly: true },
  { title: 'TOTAL', width: 80, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 90, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 90, type: 'number' },
  { title: 'Sub Total', width: 90, type: 'number', readOnly: true },
  { title: 'Start (Jam)', width: 80, type: 'number' },
  { title: 'Start (Menit)', width: 90, type: 'number' },
  { title: 'End (Jam)', width: 80, type: 'number' },
  { title: 'End (Menit)', width: 90, type: 'number' },
  { title: 'Sub Total', width: 90, type: 'number', readOnly: true },
  { title: 'TOTAL', width: 80, type: 'number', readOnly: true }
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
  { title: 'Proses', width: 125, type: 'select', options: ['All Team Packaging', 'Cartoning', 'Conveyor', 'Visual Inspeksi', 'Labelling', 'Robot', 'Unpacker'] },
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
  const prosesValue = gridType === 'dt' ? rowData[11] : '';
  const unitOptions = gridType === 'dt' ? (UNIT_MAP_F[prosesValue] || ALL_UNITS_F) : [];

  return (
    <tr className="border-b border-slate-200 text-xs hover:bg-slate-50/60" style={{ height: '29px', maxHeight: '29px' }} onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, rowIdx, gridType)}>
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

        const borderSticky = isSticky && colIdx === (gridType === 'oee' ? 4 : 3) ? 'shadow-[1px_0_0_0_#cbd5e1]' : '';
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

export default function InputF() {
  const { user } = useAuth();
  const line1User = useMemo(() => ({ ...(user || {}), line: "1", plant: "1" }), [user]);

  // [BUG-09 FIX] Gunakan kunci localStorage per-line agar data antar line tidak saling menimpa
  const LS_OEE = 'F_DATA_OEE_L1', LS_DT = 'F_DATA_DT_L1', LS_IDS_OEE = 'F_IDS_OEE_L1', LS_IDS_DT = 'F_IDS_DT_L1';

  const [oeeData, setOeeData] = useState(() => getCachedData(LS_OEE, getEmptyOEE, 100));
  const [dtData, setDtData] = useState(() => getCachedData(LS_DT, getEmptyDT, 100));

  const [oeeSelection, setOeeSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const [dtSelection, setDtSelection] = useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });

  const [oeeEditingCell, setOeeEditingCell] = useState(null);
  const [dtEditingCell, setDtEditingCell] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const [oeeScrollTop, setOeeScrollTop] = useState(0);
  const [dtScrollTop, setDtScrollTop] = useState(0);
  
  const ROW_HEIGHT = 29;
  const VISIBLE_ROWS = Math.ceil(700 / ROW_HEIGHT);
  const BUFFER_ROWS = 15;

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    // [BUG-07 FIX] Gunakan named handler agar bisa di-removeEventListener dengan benar (cegah memory leak)
    const handleContextMenuClose = (e) => {
      if (!e.target.closest('table')) setContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('contextmenu', handleContextMenuClose);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('contextmenu', handleContextMenuClose);
    };
  }, []);

  const isDraggingRef = useRef({ oee: false, dt: false });
  const fillDragRef = useRef({ active: false });
  const oeeGridRef = useRef(null);
  const dtGridRef = useRef(null);

  const oeeIds = useRef(getCachedIds(LS_IDS_OEE));
  const dtIds = useRef(getCachedIds(LS_IDS_DT));
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
        isValidKey(rowData[2]) &&
        isValidKey(rowData[0]) &&
        isValidKey(rowData[3]);

      const isRowEmpty = 
        !isValidKey(rowData[2]) &&
        !isValidKey(rowData[0]) &&
        !isValidKey(rowData[3]) &&
        !isValidKey(rowData[6]) &&
        !isValidKey(rowData[7]);

      if (!isKeyComplete) {
        if (original_id && isRowEmpty) {
          await sendAutoSave({ action: 'delete_reject_f', data: { original_id }, user: line1User });
          oeeIds.current[rIdx] = null;
          localStorage.setItem(LS_IDS_OEE, JSON.stringify(oeeIds.current));
        }
        return;
      }

      const payloadData = {
        original_id: oeeIds.current[rIdx] || null,
        no_batch: rowData[0],
        lot_no: rowData[1],
        tanggal: parseToYMD(rowData[2]) || rowData[2],
        shift: rowData[3],
        group: rowData[4],
        volume_botol: rowData[5],
        steril_in: rowData[6],
        steril_bocor: rowData[7],
        steril_h_patah_ring: rowData[8],
        steril_h_patah_lidah: rowData[9],
        steril_h_patah_leleh: rowData[10],
        steril_no_hanger: rowData[11],
        steril_rej_total: rowData[12],
        steril_sample: rowData[13],
        steril_out: rowData[14],
        vi_start: rowData[15],
        vi_end: rowData[16],
        vi_sub: rowData[17],
        vi_partikel: rowData[19],
        vi_kotik: rowData[20],
        vi_rej_total: rowData[21],
        vi_hasil_baik: rowData[22],
        vi_qc: rowData[23],
        vi_tf_packing: rowData[24],
        pack_reject: rowData[25],
        pack_hasil_baik: rowData[26],
        pack_s_qc: rowData[27],
        pack_s_others: rowData[28],
        pack_fg: rowData[29],
        pack_utuh: rowData[30],
        pack_jml_batch: rowData[31],
        av_sh: rowData[35],
        av_sm: rowData[36],
        av_eh: rowData[37],
        av_em: rowData[38],
        av_sub: rowData[39],
        total_avail_shift: rowData[40],
        run_sh: rowData[41],
        run_sm: rowData[42],
        run_eh: rowData[43],
        run_em: rowData[44],
        run_sub: rowData[45],
        clear_sh: rowData[46],
        clear_sm: rowData[47],
        clear_eh: rowData[48],
        clear_em: rowData[49],
        clear_sub: rowData[50],
        process_total: rowData[51]
      };

      const actionType = payloadData.original_id ? 'update_reject_f' : 'submit_reject_f';
      const res = await sendAutoSave({ action: actionType, data: payloadData, user: line1User });

      if (res.status === 'success' && res.original_id) {
        oeeIds.current[rIdx] = res.original_id;
        localStorage.setItem(LS_IDS_OEE, JSON.stringify(oeeIds.current));
      }
    }, 1000);
  }, [line1User]);

  const triggerAutosaveDT = useCallback((rIdx, rowData) => {
    if (dtTimers.current[rIdx]) clearTimeout(dtTimers.current[rIdx]);

    dtTimers.current[rIdx] = setTimeout(async () => {
      const original_id = dtIds.current[rIdx] || null;
      const isValidKey = (val) => val !== '' && val !== null && val !== undefined && String(val).trim() !== '';
      const isKeyComplete = 
        isValidKey(rowData[0]) &&
        isValidKey(rowData[1]);

      const isRowEmpty = 
        !isValidKey(rowData[0]) &&
        !isValidKey(rowData[3]) &&
        !isValidKey(rowData[1]) &&
        !isValidKey(rowData[10]) &&
        !isValidKey(rowData[13]);

      if (!isKeyComplete) {
        if (original_id && isRowEmpty) {
          await sendAutoSave({ action: 'delete_downtime_f', data: { original_id }, user: line1User });
          dtIds.current[rIdx] = null;
          localStorage.setItem(LS_IDS_DT, JSON.stringify(dtIds.current));
        }
        return;
      }

      const payloadData = {
        original_id: dtIds.current[rIdx] || null,
        tanggal: parseToYMD(rowData[0]) || rowData[0],
        shift: rowData[1],
        group: rowData[2],
        no_batch: rowData[3],
        start_h: rowData[4], start_m: rowData[5],
        end_h: rowData[6], end_m: rowData[7],
        duration: rowData[8],
        plan_unplan: rowData[9],
        root_cause: rowData[10],
        proses: rowData[11],
        unit: rowData[12],
        kasus: rowData[13],
      };

      const actionType = payloadData.original_id ? 'update_downtime_f' : 'submit_downtime_f';
      const res = await sendAutoSave({ action: actionType, data: payloadData, user: line1User });

      if (res.status === 'success' && res.original_id) {
        dtIds.current[rIdx] = res.original_id;
        localStorage.setItem(LS_IDS_DT, JSON.stringify(dtIds.current));
      }
    }, 1000);
  }, [line1User]);

  const handleUndo = useCallback((gridType) => {
    const histRef = gridType === 'oee' ? oeeHistory : dtHistory;
    const redoRef = gridType === 'oee' ? oeeRedo : dtRedo;
    const setData = gridType === 'oee' ? setOeeData : setDtData;

    if (histRef.current.length === 0) return;
    setData(prevData => {
      redoRef.current.push(prevData);
      const targetState = histRef.current.pop();
      localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(targetState));
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
      localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(targetState));
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
        const actionType = gridType === 'oee' ? 'delete_reject_f' : 'delete_downtime_f';
        await sendAutoSave({ action: actionType, data: { original_id }, user: line1User });
      }
    }

    idsRef.current = idsRef.current.filter((_, idx) => idx < minR || idx > maxR);
    const emptyFunc = gridType === 'oee' ? getEmptyOEE : getEmptyDT;
    while (idsRef.current.length < 50) {
      idsRef.current.push(null);
    }

    setData(prev => {
      const next = prev.filter((_, idx) => idx < minR || idx > maxR);
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
  }, [oeeSelection, dtSelection, line1User]);

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
    requestAnimationFrame(() => {
      if (gridType === 'oee') {
        setOeeSelection({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
        setOeeEditingCell(null);
        if (oeeGridRef.current) oeeGridRef.current.focus();
      } else {
        setDtSelection({ startRow: rowIdx, startCol: colIdx, endRow: rowIdx, endCol: colIdx });
        setDtEditingCell(null);
        if (dtGridRef.current) dtGridRef.current.focus();
      }
    });
  }, []);

  const handleCellMouseEnter = useCallback((rowIdx, colIdx, gridType) => {
    if (fillDragRef.current.active && fillDragRef.current.gridType === gridType) {
      fillDragRef.current.targetRow = rowIdx;
      fillDragRef.current.targetCol = colIdx;
      requestAnimationFrame(() => {
        if (gridType === 'oee') {
          setOeeSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
        } else {
          setDtSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
        }
      });
      return;
    }
    if (!isDraggingRef.current[gridType]) return;
    requestAnimationFrame(() => {
      if (gridType === 'oee') {
        setOeeSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
      } else {
        setDtSelection(prev => ({ ...prev, endRow: rowIdx, endCol: colIdx }));
      }
    });
  }, []);

  const handleCellDoubleClick = useCallback((rowIdx, colIdx, gridType) => {
    requestAnimationFrame(() => {
      if (gridType === 'oee') {
        setOeeEditingCell({ row: rowIdx, col: colIdx, mode: 'enter' });
      } else {
        setDtEditingCell({ row: rowIdx, col: colIdx, mode: 'enter' });
      }
    });
  }, []);

  const handleFinishEdit = useCallback((rowIdx, colIdx, value, gridType, moveKey) => {
    requestAnimationFrame(() => {
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
            requestAnimationFrame(() => localStorage.setItem(LS_OEE, JSON.stringify(next)));
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
            if (colIdx === 11) targetRow[12] = '';
            const calculatedRow = calculateDTRow(targetRow);
            next[rowIdx] = calculatedRow;
            triggerAutosaveDT(rowIdx, calculatedRow);
            requestAnimationFrame(() => localStorage.setItem(LS_DT, JSON.stringify(next)));
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
    });
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

      requestAnimationFrame(() => {
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
            requestAnimationFrame(() => localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(next)));
          }
          return next;
        });
      });
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (!colsMeta[activeCol].readOnly) {
        e.preventDefault();
        const initialValue = e.key;
        requestAnimationFrame(() => setEditing({ row: activeRow, col: activeCol, mode: 'direct', initialValue }));
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

      requestAnimationFrame(() => localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(nextData)));
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
        const noBatchCol = gridType === 'oee' ? 0 : 3;

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

          requestAnimationFrame(() => localStorage.setItem(gridType === 'oee' ? LS_OEE : LS_DT, JSON.stringify(nextData)));
          return nextData;
        });
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [pushHistory, triggerAutosaveOEE, triggerAutosaveDT]);

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
    if (!line1User) return;
    try {
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectF(line1User),
        fetchTodayDowntimeF(line1User),
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
          const arr = Array(52).fill('');
          arr[0] = row.no_batch ?? '';
          arr[1] = row.lot_no ?? '';
          arr[2] = parseToYMD(row.tanggal);
          arr[3] = row.shift ?? '';
          arr[4] = row.group ?? '';
          arr[5] = row.volume_botol ?? '';
          arr[6] = row.steril_in ?? '';
          arr[7] = row.steril_bocor ?? '';
          arr[8] = row.steril_h_patah_ring ?? '';
          arr[9] = row.steril_h_patah_lidah ?? '';
          arr[10] = row.steril_h_patah_leleh ?? '';
          arr[11] = row.steril_no_hanger ?? '';
          arr[12] = row.steril_rej_total ?? '';
          arr[13] = row.steril_sample ?? '';
          arr[14] = row.steril_out ?? '';
          arr[15] = row.vi_start ?? '';
          arr[16] = row.vi_end ?? '';
          arr[17] = row.vi_sub ?? '';
          arr[19] = row.vi_partikel ?? '';
          arr[20] = row.vi_kotik ?? '';
          arr[21] = row.vi_rej_total ?? '';
          arr[22] = row.vi_hasil_baik ?? '';
          arr[23] = row.vi_qc ?? '';
          arr[24] = row.vi_tf_packing ?? '';
          arr[25] = row.pack_reject ?? '';
          arr[26] = row.pack_hasil_baik ?? '';
          arr[27] = row.pack_s_qc ?? '';
          arr[28] = row.pack_s_others ?? '';
          arr[29] = row.pack_fg ?? '';
          arr[30] = row.pack_utuh ?? 'Y';
          arr[31] = row.pack_jml_batch ?? '';
          arr[35] = row.av_sh ?? '';
          arr[36] = row.av_sm ?? '';
          arr[37] = row.av_eh ?? '';
          arr[38] = row.av_em ?? '';
          arr[39] = row.av_sub ?? '';
          arr[40] = row.total_avail_shift ?? '';
          arr[41] = row.run_sh ?? '';
          arr[42] = row.run_sm ?? '';
          arr[43] = row.run_eh ?? '';
          arr[44] = row.run_em ?? '';
          arr[45] = row.run_sub ?? '';
          arr[46] = row.clear_sh ?? '';
          arr[47] = row.clear_sm ?? '';
          arr[48] = row.clear_eh ?? '';
          arr[49] = row.clear_em ?? '';
          arr[50] = row.clear_sub ?? '';
          arr[51] = row.process_total ?? '';
          return arr;
        });
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
  }, [line1User]);

  useEffect(() => {
    loadDataServer();
  }, [loadDataServer]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans outline-none">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-wider uppercase text-emerald-800">
            OEE Line 1 - Zone F
          </h1>
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl mb-12 rounded overflow-hidden p-1 contain-content" style={{ contain: 'content', contentVisibility: 'auto', containIntrinsicSize: '700px' }}>
          <div 
            className="w-full h-[700px] overflow-auto select-none outline-none" 
            ref={oeeGridRef} 
            tabIndex={0} 
            onScroll={(e) => setOeeScrollTop(e.target.scrollTop)}
            onKeyDown={(e) => handleGridKeyDown(e, 'oee')} 
            onCopy={(e) => handleCopy(e, 'oee')} 
            onPaste={(e) => handlePaste(e, 'oee')}
          >
            <table className="w-max min-w-full border-collapse text-xs table-fixed">
              <thead className="bg-slate-100 text-slate-700 font-semibold shadow-sm sticky top-0 z-40 will-change-transform">
                <tr>
                  <th rowSpan={3} className="py-1.5 px-2 bg-slate-200 text-slate-800 font-mono text-center sticky top-0 left-0 z-50 w-[60px] min-w-[60px] max-w-[60px] shadow-[1px_0_0_0_#cbd5e1]">ID</th>
                  <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={9} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Output After Steril</th>
                  <th colSpan={10} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Output Visual Inspeksi</th>
                  <th colSpan={8} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Output Packaging</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">% Yield</th>
                  <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Available Time</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">TOTAL per Shift</th>
                  <th colSpan={11} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Process Details</th>
                </tr>
                <tr>
                  <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Input (Botol dari chamber)</th>
                  <th colSpan={6} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Reject After Steril</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Sampel QC</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Output (TF to VI)</th>
                  <th colSpan={4} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Input</th>
                  <th colSpan={3} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Reject VI</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Hasil Baik</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Sample QC</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Transfer ke Packing</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Reject</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Hasil Baik</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Samples</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Finished Goods</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Utuh ?</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Jumlah Batch</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Total per shift</th>
                  <th colSpan={2} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">(waktu per shift)</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center"></th>
                  <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Machine Run</th>
                  <th colSpan={5} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">Line Clearance</th>
                  <th colSpan={1} className="border-r border-b border-slate-300 px-2 py-1.5 text-center">TOTAL</th>
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
                      className={`border-r border-b border-slate-300 px-1 py-2 text-center text-[10px] uppercase tracking-wide ${col.stickyLeft !== undefined ? 'bg-slate-200' : 'bg-slate-100'} ${col.stickyLeft !== undefined && idx === 4 ? 'shadow-[1px_0_0_0_#cbd5e1]' : ''}`}
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

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 1 - Zone F
          </h2>
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl rounded overflow-hidden p-1 mb-10 contain-content" style={{ contain: 'content', contentVisibility: 'auto', containIntrinsicSize: '700px' }}>
          <div 
            className="w-full h-[700px] overflow-auto select-none outline-none" 
            ref={dtGridRef} 
            tabIndex={0} 
            onScroll={(e) => setDtScrollTop(e.target.scrollTop)}
            onKeyDown={(e) => handleGridKeyDown(e, 'dt')} 
            onCopy={(e) => handleCopy(e, 'dt')} 
            onPaste={(e) => handlePaste(e, 'dt')}
          >
            <table className="w-max min-w-full border-collapse text-xs table-fixed">
              <thead className="bg-slate-100 text-slate-700 font-semibold shadow-sm sticky top-0 z-40 will-change-transform">
                <tr>
                  <th className="py-1.5 px-2 bg-slate-200 text-slate-800 font-mono text-center sticky top-0 left-0 z-50 w-[60px] min-w-[60px] max-w-[60px] shadow-[1px_0_0_0_#cbd5e1]">ID</th>
                  {DT_COLS_META.map((col, idx) => (
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
                  const startIdx = Math.max(0, Math.floor(dtScrollTop / ROW_HEIGHT) - BUFFER_ROWS);
                  const endIdx = Math.min(dtData.length - 1, startIdx + VISIBLE_ROWS + (BUFFER_ROWS * 2));
                  
                  return (
                    <>
                      {startIdx > 0 && <tr style={{ height: `${startIdx * ROW_HEIGHT}px` }}><td colSpan={DT_COLS_META.length + 1} className="p-0 border-none"></td></tr>}
                      {dtData.slice(startIdx, endIdx + 1).map((row, index) => {
                        const rowIdx = startIdx + index;
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
                      {endIdx < dtData.length - 1 && <tr style={{ height: `${(dtData.length - 1 - endIdx) * ROW_HEIGHT}px` }}><td colSpan={DT_COLS_META.length + 1} className="p-0 border-none"></td></tr>}
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