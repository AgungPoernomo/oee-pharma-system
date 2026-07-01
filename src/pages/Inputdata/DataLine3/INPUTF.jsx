import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectF, fetchTodayDowntimeF } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };
const TEORI_YIELD = 21923;
const SHIFTS = ["1", "2", "3"];
const GROUPS = ["A", "B", "C", "D"];
const VOLUMES = ["25 ML", "100 ML", "250 ML", "500 ML", "1000 ML"];

const parseToYMD = (val) => {
  if (!val) return '';
  let str = String(val).replace(/'/g, '').trim(); 
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {}
  return '';
};

// Line 3 Zone F memiliki 49 Kolom OEE di database (disesuaikan dengan grid columns)
const getEmptyOEE_F = () => {
  const arr = Array(50).fill('');
  arr[5] = ''; 
  arr[31] = 'Y';     
  return arr;
};

// Line 3 Zone F memiliki 15 Kolom Downtime (Ada penambahan kolom 'Lot No' indeks 4)
const getEmptyDT = () => {
  const arr = Array(15).fill('');
  arr[10] = 'Unplanned'; 
  return arr;
};

// ── FUNGSI SISTEM INGATAN (CACHE) ──
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
  } catch (error) { return { status: 'error' }; }
};

export default function InputF() {
  const { user } = useAuth();
  const oeeTableRef = useRef(null); const dtTableRef = useRef(null);
  const oeeGrid = useRef(null); const dtGrid = useRef(null);
  const isCalculating = useRef(false);

  // Load ID dari Cache
  const oeeIds = useRef(getCachedIds('L3_F_IDS_OEE')); 
  const dtIds = useRef(getCachedIds('L3_F_IDS_DT'));  
  const oeeTimers = useRef({}); const dtTimers = useRef({});

  const triggerAutosaveOEE = (rIdx, sheet) => {
    if (oeeTimers.current[rIdx]) clearTimeout(oeeTimers.current[rIdx]);

    oeeTimers.current[rIdx] = setTimeout(async () => {
      const rowData = sheet.getRowData(rIdx);
      if (!rowData[0] && !rowData[2] && !rowData[3]) return;

      // PAYLOAD KHUSUS LINE 3 ZONE F
      const payloadData = {
        original_id: oeeIds.current[rIdx] || null,
        no_batch: rowData[0], lot_no: rowData[1], tanggal: rowData[2], shift: rowData[3],
        group: rowData[4], volume_botol: rowData[5],
        steril_in: rowData[6], steril_bocor: rowData[7], steril_h_patah_ring: rowData[8], 
        steril_rej_total: rowData[9], steril_out: rowData[10],
        vi_start: rowData[11], vi_end: rowData[12], vi_sub: rowData[13],
        vi_partikel_menempel: rowData[14], vi_lelehan: rowData[15], vi_rilent: rowData[16],
        vi_bocor_sealing: rowData[17], vi_bocor_logo: rowData[18], vi_bocor_bottom: rowData[19],
        vi_volume_kurang: rowData[20], vi_volume_lebih: rowData[21], vi_bercak: rowData[22],
        vi_total: rowData[23], vi_hasil_baik: rowData[24], vi_tf_packing: rowData[25],
        pack_reject: rowData[26], pack_hasil_baik: rowData[27], pack_s_qc: rowData[28],
        pack_s_others: rowData[29], pack_fg: rowData[30], pack_utuh: rowData[31], pack_jml_batch: rowData[32],
        av_sh: rowData[33], av_sm: rowData[34], av_eh: rowData[35], av_em: rowData[36], av_sub: rowData[37],
        run_sh: rowData[38], run_sm: rowData[39], run_eh: rowData[40], run_em: rowData[41], run_sub: rowData[42],
        clear_sh: rowData[43], clear_sm: rowData[44], clear_eh: rowData[45], clear_em: rowData[46], clear_sub: rowData[47],
        process_total: rowData[48]
      };

      const actionType = payloadData.original_id ? 'update_reject_f' : 'submit_reject_f';
      const res = await sendAutoSave({ action: actionType, data: payloadData, user: { ...user, line: "3" } });
      
      if (res.status === 'success' && res.original_id) {
        oeeIds.current[rIdx] = res.original_id;
        localStorage.setItem('L3_F_IDS_OEE', JSON.stringify(oeeIds.current));
      }
    }, 1000);
  };

  const triggerAutosaveDT = (rIdx, sheet) => {
    if (dtTimers.current[rIdx]) clearTimeout(dtTimers.current[rIdx]);

    dtTimers.current[rIdx] = setTimeout(async () => {
      const rowData = sheet.getRowData(rIdx);
      if (!rowData[0] && !rowData[3]) return;

      // PAYLOAD DOWNTIME LINE 3 F (Dengan tambahan kolom 'Lot No' index ke 4)
      const payloadData = {
        original_id: dtIds.current[rIdx] || null,
        tanggal: rowData[0], shift: rowData[1], group: rowData[2], no_batch: rowData[3], lot: rowData[4],
        start_h: rowData[5], start_m: rowData[6], end_h: rowData[7], end_m: rowData[8],
        duration: rowData[9], plan_unplan: rowData[10], root_cause: rowData[11],
        proses: rowData[12], unit: rowData[13], kasus: rowData[14],
      };

      const actionType = payloadData.original_id ? 'update_downtime_f' : 'submit_downtime_f';
      const res = await sendAutoSave({ action: actionType, data: payloadData, user: { ...user, line: "3" } });
      
      if (res.status === 'success' && res.original_id) {
        dtIds.current[rIdx] = res.original_id;
        localStorage.setItem('L3_F_IDS_DT', JSON.stringify(dtIds.current));
      }
    }, 1000);
  };

  const handleOEEChange = useCallback((worksheet, _cell, cStr, rStr, _value) => {
    if (isCalculating.current) return;
    let c = parseInt(cStr); let r = parseInt(rStr); let sheet = worksheet;

    const v = (col) => {
        let val = sheet.getValueFromCoords(col, r);
        return (val === "" || val === null || isNaN(val)) ? 0 : parseFloat(val);
    };
    const setV = (col, val) => sheet.setValueFromCoords(col, r, val, true); 

    isCalculating.current = true;
    try {
      // 1. Steril Reject Total (Col 9) = 7 + 8
      if (c === 7 || c === 8) setV(9, v(7) + v(8));
      
      // 2. Steril Out (Col 10) = Col 6 - Col 9
      if (c === 6 || c === 7 || c === 8) {
        let sIn = v(6);
        if (sIn > 0) setV(10, sIn - v(9)); else setV(10, '');
      }

      // 3. VI Sub Time (Col 13) = Col 12 - Col 11
      if (c === 11 || c === 12) {
        let sub = v(12) - v(11); setV(13, sub > 0 ? sub : '');
      }

      // 4. VI Reject Total (Col 23) = Sum(14 to 22)
      if (c >= 14 && c <= 22) {
        setV(23, v(14)+v(15)+v(16)+v(17)+v(18)+v(19)+v(20)+v(21)+v(22));
      }

      // 5. VI Hasil Baik (Col 24) = Col 13 (Sub) - Col 23 (Reject)
      if (c >= 11 && c <= 22) {
        let vSub = v(13);
        if (vSub > 0) {
          let vBaik = vSub - v(23);
          setV(24, vBaik);
          setV(25, vBaik); // VI_TF_PACKING (Col 25) sama dengan Hasil Baik (Col 24)
        } else { setV(24, ''); setV(25, ''); }
      }

      // 6. Pack Hasil Baik (Col 27) = Col 25 - Col 26
      // 7. Pack FG (Col 30) = Col 27 - Col 28 - Col 29
      if (c >= 11 && c <= 29) {
        let pTrf = v(25);
        if (pTrf > 0) {
          let pHasil = pTrf - v(26);
          setV(27, pHasil);
          setV(30, pHasil - v(28) - v(29));
        } else { setV(27, ''); setV(30, ''); }
      }

      // 8. Kalkulasi Jumlah Batch (Col 32)
      if (c === 5 || (c >= 11 && c <= 29)) {
        let volKey = sheet.getValueFromCoords(5, r) || "500 ML";
        let pFg = v(30);
        if (pFg > 0) {
          setV(32, (pFg / (TEORI_BATCH[volKey] || 23076)).toFixed(2));
        } else { setV(32, ''); }
      }

      const timeDiff = (sh, sm, eh, em) => {
          if (v(sh)===0 && v(sm)===0 && v(eh)===0 && v(em)===0 && sheet.getValueFromCoords(sh, r)==="") return '';
          let diff = (v(eh)*60 + v(em)) - (v(sh)*60 + v(sm));
          return diff < 0 ? diff + (24*60) : diff;
      };

      if (c >= 33 && c <= 36) setV(37, timeDiff(33, 34, 35, 36)); // AV
      if (c >= 38 && c <= 41) setV(42, timeDiff(38, 39, 40, 41)); // RUN
      if (c >= 43 && c <= 46) setV(47, timeDiff(43, 44, 45, 46)); // CLEAR

      if ((c >= 38 && c <= 41) || (c >= 43 && c <= 46)) {
        let rSub = v(42); let lSub = v(47);
        if (rSub > 0 || lSub > 0) setV(48, rSub + lSub); // PROCESS TOTAL
        else setV(48, '');
      }
    } finally {
      isCalculating.current = false;
      triggerAutosaveOEE(r, sheet);
    }
  }, []);

  const handleDTChange = useCallback((worksheet, _cell, cStr, rStr, _value) => {
    let c = parseInt(cStr); let r = parseInt(rStr); let sheet = worksheet; 
    // Menghitung Durasi berdasarkan indeks kolom Line 3
    if(c >= 5 && c <= 8) {
        let sh = parseFloat(sheet.getValueFromCoords(5, r)) || 0;
        let sm = parseFloat(sheet.getValueFromCoords(6, r)) || 0;
        let eh = parseFloat(sheet.getValueFromCoords(7, r)) || 0;
        let em = parseFloat(sheet.getValueFromCoords(8, r)) || 0;
        if(sheet.getValueFromCoords(5, r) !== "" && sheet.getValueFromCoords(7, r) !== "") {
            let diff = (eh*60 + em) - (sh*60 + sm);
            sheet.setValueFromCoords(9, r, diff < 0 ? diff + (24*60) : diff, true);
        }
    }
    if (c === 12) {
        sheet.setValueFromCoords(13, r, '', true); // Reset Unit jika Proses berubah
    }
    triggerAutosaveDT(r, sheet);
  }, []);

  const loadDataServer = useCallback(async () => {
    if (!user) return;
    try {
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectF({ ...user, line: "3" }),
        fetchTodayDowntimeF({ ...user, line: "3" })
      ]);

      let mappedOEE = []; let mappedOEEIds = [];
      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {
        mappedOEE = [...resOEE.data].reverse().map((row) => {
          mappedOEEIds.push(row.id);
          const arr = Array(50).fill('');
          arr[0] = row.no_batch ?? ''; arr[1] = row.lot_no ?? ''; arr[2] = parseToYMD(row.tanggal);
          arr[3] = row.shift ?? ''; arr[4] = row.group ?? ''; arr[5] = row.volume_botol ?? '';
          arr[6] = row.steril_in ?? ''; arr[7] = row.steril_bocor ?? ''; arr[8] = row.steril_h_patah_ring ?? '';
          arr[9] = row.steril_rej_total ?? ''; arr[10] = row.steril_out ?? '';
          arr[11] = row.vi_start ?? ''; arr[12] = row.vi_end ?? ''; arr[13] = row.vi_sub ?? '';
          arr[14] = row.vi_partikel_menempel ?? ''; arr[15] = row.vi_lelehan ?? ''; arr[16] = row.vi_rilent ?? '';
          arr[17] = row.vi_bocor_sealing ?? ''; arr[18] = row.vi_bocor_logo ?? ''; arr[19] = row.vi_bocor_bottom ?? '';
          arr[20] = row.vi_volume_kurang ?? ''; arr[21] = row.vi_volume_lebih ?? ''; arr[22] = row.vi_bercak ?? '';
          arr[23] = row.vi_total ?? ''; arr[24] = row.vi_hasil_baik ?? ''; arr[25] = row.vi_tf_packing ?? '';
          arr[26] = row.pack_reject ?? ''; arr[27] = row.pack_hasil_baik ?? ''; arr[28] = row.pack_s_qc ?? '';
          arr[29] = row.pack_s_others ?? ''; arr[30] = row.pack_fg ?? ''; arr[31] = row.pack_utuh ?? 'Y';
          arr[32] = row.pack_jml_batch ?? ''; arr[33] = row.av_sh ?? ''; arr[34] = row.av_sm ?? '';
          arr[35] = row.av_eh ?? ''; arr[36] = row.av_em ?? ''; arr[37] = row.av_sub ?? '';
          arr[38] = row.run_sh ?? ''; arr[39] = row.run_sm ?? ''; arr[40] = row.run_eh ?? '';
          arr[41] = row.run_em ?? ''; arr[42] = row.run_sub ?? ''; arr[43] = row.clear_sh ?? '';
          arr[44] = row.clear_sm ?? ''; arr[45] = row.clear_eh ?? ''; arr[46] = row.clear_em ?? '';
          arr[47] = row.clear_sub ?? ''; arr[48] = row.process_total ?? '';
          return arr;
        });
      }

      let mappedDT = []; let mappedDTIds = [];
      if (resDT?.status === 'success' && Array.isArray(resDT.data)) {
        mappedDT = [...resDT.data].reverse().map((row) => {
          mappedDTIds.push(row.id);
          return [
            parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.no_batch ?? '', row.lot ?? '',
            row.start_h ?? '', row.start_m ?? '', row.end_h ?? '', row.end_m ?? '', row.duration ?? '', 
            row.plan_unplan ?? 'Unplanned', row.root_cause ?? '', row.proses ?? '', row.unit ?? '', row.kasus ?? ''
          ];
        });
      }

      const finalOEEData = [...mappedOEE, ...Array.from({ length: 100 }, () => getEmptyOEE_F())];
      const finalDTData = [...mappedDT, ...Array.from({ length: 100 }, () => getEmptyDT())];

      if (oeeIds && oeeIds.current) oeeIds.current = [...mappedOEEIds, ...Array(100).fill(null)];
      if (dtIds && dtIds.current) dtIds.current = [...mappedDTIds, ...Array(100).fill(null)];

      if (oeeGrid.current && oeeGrid.current[0]) oeeGrid.current[0].setData(finalOEEData);
      if (dtGrid.current && dtGrid.current[0]) dtGrid.current[0].setData(finalDTData);

      localStorage.setItem('L3_F_DATA_OEE', JSON.stringify(finalOEEData));
      localStorage.setItem('L3_F_DATA_DT', JSON.stringify(finalDTData));
      localStorage.setItem('L3_F_IDS_OEE', JSON.stringify(oeeIds.current));
      localStorage.setItem('L3_F_IDS_DT', JSON.stringify(dtIds.current));

    } catch (error) { console.error(error); }
  }, [user]);

  useEffect(() => {
    const initialEmptyOEE = getCachedData('L3_F_DATA_OEE', getEmptyOEE_F, 100);
    const initialEmptyDT = getCachedData('L3_F_DATA_DT', getEmptyDT, 100);

    if (oeeTableRef.current) {
      oeeTableRef.current.innerHTML = ''; 
      oeeGrid.current = jspreadsheet(oeeTableRef.current, {
        worksheets: [{
          data: initialEmptyOEE,
          columns: [
            { type: 'text', title: 'No. Batch', width: 90 },
            { type: 'text', title: 'Lot No', width: 90 },
            { type: 'calendar', title: 'Tanggal', width: 100, options: { format: 'YYYY-MM-DD' } },
            { type: 'dropdown', title: 'Shift', source: SHIFTS, width: 60 },
            { type: 'dropdown', title: 'Grup', source: GROUPS, width: 60 },
            { type: 'dropdown', title: 'Volume', source: VOLUMES, width: 90 },
            
            { type: 'numeric', title: 'Input (Botol chamber)', width: 100 },
            { type: 'numeric', title: 'Reject Bocor', width: 90 },
            { type: 'numeric', title: 'Reject Patah ring', width: 90 },
            { type: 'numeric', title: 'TOTAL REJECT', width: 80, readOnly: true },
            { type: 'numeric', title: 'Output (TF to VI)', width: 120, readOnly: true },
            
            { type: 'numeric', title: 'Start', width: 80, readOnly: true },
            { type: 'numeric', title: 'End', width: 80 },
            { type: 'numeric', title: 'Sub total', width: 90, readOnly: true },
            
            { type: 'numeric', title: 'Partikel Menempel', width: 100 },
            { type: 'numeric', title: 'Lelehan', width: 80 },
            { type: 'numeric', title: 'Rilent', width: 80 },
            { type: 'numeric', title: 'Bocor Sealing', width: 90 },
            { type: 'numeric', title: 'Bocor Logo', width: 90 },
            { type: 'numeric', title: 'Bocor Bottom', width: 90 },
            { type: 'numeric', title: 'Volume Kurang', width: 90 },
            { type: 'numeric', title: 'Volume Lebih', width: 90 },
            { type: 'numeric', title: 'Bercak', width: 80 },
            { type: 'numeric', title: 'TOTAL', width: 80, readOnly: true },
            { type: 'numeric', title: 'Hasil Baik', width: 90, readOnly: true },
            { type: 'numeric', title: 'Transfer ke Packing', width: 130, readOnly: true },
            
            { type: 'numeric', title: 'Reject', width: 80 },
            { type: 'numeric', title: 'Hasil Baik', width: 90, readOnly: true },
            { type: 'numeric', title: 'QC', width: 70 },
            { type: 'numeric', title: 'Others', width: 70 },
            { type: 'numeric', title: 'Finished Goods', width: 110, readOnly: true },
            { type: 'dropdown', title: 'Utuh ?', source: ['Y', 'N'], width: 70 },
            { type: 'numeric', title: 'Jumlah Batch', width: 100, readOnly: true },
            
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'End (Jam)', width: 80 },
            { type: 'numeric', title: 'End (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub Total', width: 90, readOnly: true },
            
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'End (Jam)', width: 80 },
            { type: 'numeric', title: 'End (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub Total', width: 90, readOnly: true },
            
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'End (Jam)', width: 80 },
            { type: 'numeric', title: 'End (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub Total', width: 90, readOnly: true },
            { type: 'numeric', title: 'Total Preparation + Clearance Time', width: 180, readOnly: true },
          ],
          nestedHeaders: [
            [
              { title: '', colspan: 6 },
              { title: 'Output After Steril', colspan: 5 },
              { title: 'Output Visual Inspeksi', colspan: 15 },
              { title: 'Output Packaging', colspan: 7 },
              { title: 'Available Time', colspan: 5 },
              { title: 'Machine Run', colspan: 5 },
              { title: 'Line Clearance', colspan: 5 },
              { title: '', colspan: 1 }
            ],
            [
              { title: '', colspan: 6 },
              { title: 'Input', colspan: 1 },
              { title: 'Reject', colspan: 2 },
              { title: 'Total', colspan: 1 },
              { title: 'Output', colspan: 1 },
              
              { title: 'Time', colspan: 3 },
              { title: 'Reject VI', colspan: 9 },
              { title: 'Total', colspan: 1 },
              { title: 'Baik', colspan: 1 },
              { title: 'TF Pack', colspan: 1 },
              
              { title: 'Reject', colspan: 1 },
              { title: 'Baik', colspan: 1 },
              { title: 'Samples', colspan: 2 },
              { title: 'FG', colspan: 1 },
              { title: 'Utuh?', colspan: 1 },
              { title: 'Jml Batch', colspan: 1 },
              
              { title: '(waktu)', colspan: 5 },
              { title: '(waktu)', colspan: 5 },
              { title: '(waktu)', colspan: 5 },
              { title: 'TOTAL', colspan: 1 }
            ]
          ],
          freezeColumns: 3,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "700px"
        }],
        onchange: handleOEEChange,
      });
    }

    if (dtTableRef.current) {
      dtTableRef.current.innerHTML = ''; 
      const UNIT_MAP = {
        'All Team Packaging': ['Conveyor Inspeksi', 'IDDLE', 'Others', 'Robotic', 'Wait Produk', 'Line Clearance', 'Break'],
        'Cartoning': ['Carton sealer', 'Carton Unpacker', 'Case Packer - Others', 'Collecting Conveyor', 'Conveyor', 'Floating conveyor', 'Ganti Label', 'IDDLE', 'Inkjet Printer', 'Labelling', 'Labelling - Others', 'Robot', 'Vacuum Case Packer', 'Weigher', 'Weighing Checker'],
        'Conveyor': ['Carton sealer', 'Conveyor', 'Conveyor Hitam', 'Conveyor Inspek', 'Others'],
        'Visual Inspeksi': ['Conveyor Inspeksi', 'Mesin Visual Inspeksi', 'Others'],
        'Labelling': ['Carton sealer', 'Conveyor', 'Floating Conveyor', 'Ganti Label', 'Inkjet Printer', 'Labelling', 'Sensor Inkjet', 'Sensor label', 'Wait Produk'],
        'Robot': ['Collecting conveyor', 'Conveyor', 'Floating conveyor', 'Meja Collecting', 'Others', 'Robot'],
        'Unpacker': ['Carton Unpacker']
      };
      const ALL_UNITS = [...new Set(Object.values(UNIT_MAP).flat())];
      dtGrid.current = jspreadsheet(dtTableRef.current, {
        worksheets: [{
          data: initialEmptyDT,
          columns: [
            { type: 'calendar', title: 'Tanggal', width: 100, options: { format: 'YYYY-MM-DD' } },
            { type: 'dropdown', title: 'Shift', source: SHIFTS, width: 60 },
            { type: 'dropdown', title: 'Grup', source: GROUPS, width: 60 },
            { type: 'text', title: 'No. Batch', width: 120 },
            { type: 'text', title: 'Lot No', width: 120 },
            { type: 'numeric', title: 'Start (jam)', width: 80 },
            { type: 'numeric', title: 'Start (menit)', width: 90 },
            { type: 'numeric', title: 'End (jam)', width: 80 },
            { type: 'numeric', title: 'End (menit)', width: 90 },
            { type: 'numeric', title: 'Durasi (m)', width: 100, readOnly: true },
            { type: 'dropdown', title: 'Planned / Unplanned', source: ['Planned', 'Unplanned'], width: 150 },
            { type: 'dropdown', title: 'Root Cause', source: ['Production', 'Mechanical', 'Electrical', 'Utility', 'QA', 'QC', 'Warehouse', 'PPIC', 'R&D'], width: 150 },
            { type: 'dropdown', title: 'Proses', source: ['All Team Packaging', 'Cartoning', 'Conveyor', 'Visual Inspeksi', 'Labelling', 'Robot', 'Unpacker'], width: 120 },
            { 
              type: 'dropdown', title: 'Unit', width: 120, source: ALL_UNITS, 
              filter: function(instance, cell, c, r, source) {
                let sheet = dtGrid.current[0];
                let prosesValue = sheet.getValueFromCoords(12, r); // Index ke 12 karena ada tambahan kolom LOT
                return UNIT_MAP[prosesValue] || [];
              }
            },
            { type: 'text', title: 'Kasus', width: 500 }
          ],
          freezeColumns: 1, tableOverflow: true, tableWidth: "100%", tableHeight: "700px"
        }],
        onchange: handleDTChange,
      });
    }

    loadDataServer();

    return () => {
      if (oeeGrid.current && oeeGrid.current[0] && typeof oeeGrid.current[0].destroy === 'function') oeeGrid.current[0].destroy();
      if (dtGrid.current && dtGrid.current[0] && typeof dtGrid.current[0].destroy === 'function') dtGrid.current[0].destroy();
      if (oeeTableRef.current) oeeTableRef.current.innerHTML = '';
      if (dtTableRef.current) dtTableRef.current.innerHTML = '';
      oeeGrid.current = null; dtGrid.current = null;
    };
  }, [user, handleOEEChange, handleDTChange, loadDataServer]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-wider uppercase text-emerald-800">
            OEE Line 3 - Zone F <span className="text-sm font-normal normal-case text-gray-500 ml-2">(Auto-Saving & Cached)</span>
          </h1>
        </div>
        <div className="bg-white border-2 border-slate-300 shadow-xl mb-12 rounded overflow-hidden p-1">
          <div ref={oeeTableRef} />
        </div>
        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 3 - Zone F
          </h2>
        </div>
        <div className="bg-white border-2 border-slate-300 shadow-xl rounded overflow-hidden p-1 mb-10">
          <div ref={dtTableRef} />
        </div>
      </div>
    </div>
  );
}