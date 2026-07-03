import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectF, fetchTodayDowntimeF } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };
const TEORI_YIELD = 21923;
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
  } catch (e) { }
  return '';
};

const getEmptyOEE_F = () => {
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
  } catch (error) {
    console.error('Autosave Error:', error);
    return { status: 'error' };
  }
};

export default function InputF() {
  const { user } = useAuth();

  const oeeTableRef = useRef(null);
  const dtTableRef = useRef(null);
  const oeeGrid = useRef(null);
  const dtGrid = useRef(null);

  const isCalculating = useRef(false);

  // Load ID dari Cache
  const oeeIds = useRef(getCachedIds('F_IDS_OEE'));
  const dtIds = useRef(getCachedIds('F_IDS_DT'));
  const oeeTimers = useRef({});
  const dtTimers = useRef({});
  const calcTimers = useRef({});

  const triggerAutosaveOEE = (rIdx, sheet) => {
    if (oeeTimers.current[rIdx]) clearTimeout(oeeTimers.current[rIdx]);

    oeeTimers.current[rIdx] = setTimeout(async () => {
      const rowData = sheet.getRowData(rIdx);
      if (!rowData[0] && !rowData[2] && !rowData[3]) return;

      const payloadData = {
        original_id: oeeIds.current[rIdx] || null,
        no_batch: rowData[0],
        lot_no: rowData[1],
        tanggal: rowData[2],
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
      const res = await sendAutoSave({ action: actionType, data: payloadData, user });

      if (res.status === 'success' && res.original_id) {
        oeeIds.current[rIdx] = res.original_id;
        localStorage.setItem('F_IDS_OEE', JSON.stringify(oeeIds.current));
      }
    }, 1000);
  };

  const triggerAutosaveDT = (rIdx, sheet) => {
    if (dtTimers.current[rIdx]) clearTimeout(dtTimers.current[rIdx]);

    dtTimers.current[rIdx] = setTimeout(async () => {
      const rowData = sheet.getRowData(rIdx);
      if (!rowData[0] && !rowData[3]) return;

      const payloadData = {
        original_id: dtIds.current[rIdx] || null,
        tanggal: rowData[0],
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
      const res = await sendAutoSave({ action: actionType, data: payloadData, user });

      if (res.status === 'success' && res.original_id) {
        dtIds.current[rIdx] = res.original_id;
        localStorage.setItem('F_IDS_DT', JSON.stringify(dtIds.current));
      }
    }, 1000);
  };

  const runRowCalculations = useCallback((worksheet, r) => {
    if (isCalculating.current) return;
    let sheet = worksheet;

    const v = (col) => {
      let val = sheet.getValueFromCoords(col, r);
      return (val === "" || val === null || isNaN(val)) ? 0 : parseFloat(val);
    };
    const setV = (col, val) => sheet.setValueFromCoords(col, r, val, true);

    isCalculating.current = true;
    try {
      setV(12, v(7) + v(8) + v(9) + v(10) + v(11));

      let sIn = v(6);
      if (sIn > 0) setV(14, sIn - v(12) - v(13));
      else setV(14, '');

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

      let volKey = sheet.getValueFromCoords(5, r) || "500 ML";
      let pFg = v(29);
      if (pFg > 0) {
        setV(31, (pFg / (TEORI_BATCH[volKey] || 23076)).toFixed(2));
        setV(33, ((pFg / TEORI_YIELD) * 100).toFixed(2));
      } else { setV(31, ''); setV(33, ''); }

      const timeDiff = (sh, sm, eh, em) => {
        if (v(sh) === 0 && v(sm) === 0 && v(eh) === 0 && v(em) === 0 && sheet.getValueFromCoords(sh, r) === "") return '';
        let diff = (v(eh) * 60 + v(em)) - (v(sh) * 60 + v(sm));
        return diff < 0 ? diff + (24 * 60) : diff;
      };

      setV(39, timeDiff(35, 36, 37, 38));
      setV(45, timeDiff(41, 42, 43, 44));
      let lc = timeDiff(46, 47, 48, 49);
      setV(50, lc); setV(52, lc); setV(53, lc);

      let rSub = v(45); let lSub = v(50);
      if (rSub > 0 || lSub > 0) setV(51, rSub + lSub);
      else setV(51, '');
    } finally {
      isCalculating.current = false;
      triggerAutosaveOEE(r, sheet);
    }
  }, []);

  const handleOEEChange = useCallback((worksheet, _cell, _cStr, rStr, _value) => {
    if (isCalculating.current) return;
    let r = parseInt(rStr);
    if (calcTimers.current[r]) clearTimeout(calcTimers.current[r]);
    calcTimers.current[r] = setTimeout(() => {
      runRowCalculations(worksheet, r);
    }, 30);
  }, [runRowCalculations]);

  const handleDTChange = useCallback((worksheet, _cell, cStr, rStr, _value) => {
    let c = parseInt(cStr); let r = parseInt(rStr); let sheet = worksheet;
    if (calcTimers.current['dt_' + r]) clearTimeout(calcTimers.current['dt_' + r]);
    calcTimers.current['dt_' + r] = setTimeout(() => {
      if (c >= 4 && c <= 7) {
        let sh = parseFloat(sheet.getValueFromCoords(4, r)) || 0;
        let sm = parseFloat(sheet.getValueFromCoords(5, r)) || 0;
        let eh = parseFloat(sheet.getValueFromCoords(6, r)) || 0;
        let em = parseFloat(sheet.getValueFromCoords(7, r)) || 0;
        if (sheet.getValueFromCoords(4, r) !== "" && sheet.getValueFromCoords(6, r) !== "") {
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          sheet.setValueFromCoords(8, r, diff < 0 ? diff + (24 * 60) : diff, true);
        }
      }
      if (c === 11) {
        sheet.setValueFromCoords(12, r, '', true);
      }
      triggerAutosaveDT(r, sheet);
    }, 30);
  }, []);

  const loadDataServer = useCallback(async () => {
    if (!user) return;
    try {
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectF(user),
        fetchTodayDowntimeF(user)
      ]);

      let mappedOEE = [];
      let mappedOEEIds = [];
      if (resOEE?.status === 'success' && Array.isArray(resOEE.data)) {
        mappedOEE = [...resOEE.data].reverse().map((row) => {
          mappedOEEIds.push(row.id);

          const arr = Array(55).fill('');
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
        mappedDT = [...resDT.data].reverse().map((row) => {
          mappedDTIds.push(row.id);
          return [
            parseToYMD(row.tanggal), row.shift ?? '', row.group ?? '', row.no_batch ?? '', row.start_h ?? '', row.start_m ?? '',
            row.end_h ?? '', row.end_m ?? '', row.duration ?? '', row.plan_unplan ?? 'Unplanned', row.root_cause ?? '', row.proses ?? '',
            row.unit ?? '', row.kasus ?? ''
          ];
        });
      }

      const finalOEEData = [...mappedOEE, ...Array.from({ length: 100 }, () => getEmptyOEE_F())];
      const finalDTData = [...mappedDT, ...Array.from({ length: 100 }, () => getEmptyDT())];

      if (oeeIds && oeeIds.current) oeeIds.current = [...mappedOEEIds, ...Array(100).fill(null)];
      if (dtIds && dtIds.current) dtIds.current = [...mappedDTIds, ...Array(100).fill(null)];

      if (oeeGrid.current && oeeGrid.current[0]) oeeGrid.current[0].setData(finalOEEData);
      if (dtGrid.current && dtGrid.current[0]) dtGrid.current[0].setData(finalDTData);

      // SIMPAN KE INGATAN LOKAL (CACHE)
      localStorage.setItem('F_DATA_OEE', JSON.stringify(finalOEEData));
      localStorage.setItem('F_DATA_DT', JSON.stringify(finalDTData));
      localStorage.setItem('F_IDS_OEE', JSON.stringify(oeeIds.current));
      localStorage.setItem('F_IDS_DT', JSON.stringify(dtIds.current));

    } catch (error) {
      console.error(error);
    }
  }, [user]);

  useEffect(() => {
    const initialEmptyOEE = getCachedData('F_DATA_OEE', getEmptyOEE_F, 100);
    const initialEmptyDT = getCachedData('F_DATA_DT', getEmptyDT, 100);

    if (oeeTableRef.current) {
      oeeTableRef.current.innerHTML = '';
      oeeGrid.current = jspreadsheet(oeeTableRef.current, {
        worksheets: [{
          data: initialEmptyOEE,
          columns: [
            { type: 'text', title: 'No. Batch', width: 90 },
            { type: 'text', title: 'Lot No', width: 90 },
            { type: 'calendar', title: 'Tanggal', width: 100, options: { format: 'YYYY-MM-DD' } },
            { type: 'numeric', title: 'Shift', width: 60 },
            { type: 'text', title: 'Grup', width: 60 },
            { type: 'dropdown', title: 'Volume', width: 90, source: VOLUMES },
            { type: 'numeric', title: 'Input (Botol chamber)', width: 100 },
            { type: 'numeric', title: 'Reject Bocor', width: 90 },
            { type: 'numeric', title: 'Reject Patah ring', width: 90 },
            { type: 'numeric', title: 'Reject Patah Lidah', width: 90 },
            { type: 'numeric', title: 'Reject Patah Lelehan', width: 90 },
            { type: 'numeric', title: 'Reject Tanpa Hanger', width: 90 },
            { type: 'numeric', title: 'TOTAL', width: 80, readOnly: true },
            { type: 'numeric', title: 'Sampel QC', width: 80 },
            { type: 'numeric', title: 'Output (TF to VI)', width: 120, readOnly: true },
            { type: 'numeric', title: 'Start', width: 80, readOnly: true },
            { type: 'numeric', title: 'End', width: 80 },
            { type: 'numeric', title: 'Sub total', width: 90, readOnly: true },
            { type: 'numeric', title: 'Total per Shift', width: 110, readOnly: true },
            { type: 'numeric', title: 'Partikel', width: 80 },
            { type: 'numeric', title: 'Kosmetik', width: 80 },
            { type: 'numeric', title: 'TOTAL', width: 80, readOnly: true },
            { type: 'numeric', title: 'Hasil Baik', width: 90, readOnly: true },
            { type: 'numeric', title: 'QC', width: 80 },
            { type: 'numeric', title: 'Transfer ke Packing', width: 130, readOnly: true },

            { type: 'numeric', title: 'Reject', width: 80 },
            { type: 'numeric', title: 'Hasil Baik', width: 90, readOnly: true },
            { type: 'numeric', title: 'QC', width: 70 },
            { type: 'numeric', title: 'Others', width: 70 },
            { type: 'numeric', title: 'Finished Goods', width: 110, readOnly: true },
            { type: 'text', title: 'Utuh ?', width: 70 },
            { type: 'numeric', title: 'Jumlah Batch', width: 100, readOnly: true },
            { type: 'numeric', title: 'Total per shift', width: 110, readOnly: true },

            { type: 'percent', title: 'per Batch', width: 90, readOnly: true },
            { type: 'percent', title: 'AVERAGE per shift', width: 120, readOnly: true },

            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'End (Jam)', width: 80 },
            { type: 'numeric', title: 'End (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub Total', width: 90, readOnly: true },
            { type: 'numeric', title: 'TOTAL', width: 80, readOnly: true },

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
            { type: 'numeric', title: 'TOTAL', width: 80, readOnly: true },
          ],
          nestedHeaders: [
            [
              { title: '', colspan: 6 },
              { title: 'Output After Steril', colspan: 9 },
              { title: 'Output Visual Inspeksi', colspan: 10 },
              { title: 'Output Packaging', colspan: 8 },
              { title: '% Yield', colspan: 2 },
              { title: 'Available Time', colspan: 5 },
              { title: 'TOTAL per Shift', colspan: 1 },
              { title: 'Process Details', colspan: 11 },
            ],
            [
              { title: '', colspan: 6 },
              { title: 'Input (Botol dari chamber)', colspan: 1 },
              { title: 'Reject After Steril', colspan: 6 },
              { title: 'Sampel QC', colspan: 1 },
              { title: 'Output (TF to VI)', colspan: 1 },
              { title: 'Input', colspan: 4 },
              { title: 'Reject VI', colspan: 3 },
              { title: 'Hasil Baik', colspan: 1 },
              { title: 'Sample QC', colspan: 1 },
              { title: 'Transfer ke Packing', colspan: 1 },
              { title: 'Reject', colspan: 1 },
              { title: 'Hasil Baik', colspan: 1 },
              { title: 'Samples', colspan: 2 },
              { title: 'Finished Goods', colspan: 1 },
              { title: 'Utuh ?', colspan: 1 },
              { title: 'Jumlah Batch', colspan: 1 },
              { title: 'Total per shift', colspan: 1 },
              { title: '', colspan: 2 },
              { title: '(waktu per shift)', colspan: 5 },
              { title: '', colspan: 1 },
              { title: 'Machine Run', colspan: 5 },
              { title: 'Line Clearance', colspan: 5 },
              { title: 'TOTAL', colspan: 1 },
              { title: '', colspan: 1 },
              { title: '', colspan: 2 }
            ]
          ],
          freezeColumns: 5,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "700px",
          minDimensions: [52, 20]
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
            { type: 'numeric', title: 'Shift', width: 60 },
            { type: 'text', title: 'Grup', width: 60 },
            { type: 'text', title: 'No. Batch', width: 120 },
            { type: 'numeric', title: 'Start (jam)', width: 80 },
            { type: 'numeric', title: 'Start (menit)', width: 90 },
            { type: 'numeric', title: 'End (jam)', width: 80 },
            { type: 'numeric', title: 'End (menit)', width: 90 },
            { type: 'numeric', title: 'Durasi (m)', width: 100, readOnly: true },
            { type: 'text', title: 'Planned / Unplanned', width: 150 },
            { type: 'dropdown', title: 'Root Cause', source: ['Production', 'Mechanical', 'Electrical', 'Utility', 'QA', 'QC', 'Warehouse', 'PPIC', 'R&D'], width: 150 },
            { type: 'dropdown', title: 'Proses', source: ['All Team Packaging', 'Cartoning', 'Conveyor', 'Visual Inspeksi', 'Labelling', 'Robot', 'Unpacker'], width: 120 },
            {
              type: 'dropdown',
              title: 'Unit',
              width: 120,
              source: ALL_UNITS,
              filter: function (instance, cell, c, r, source) {
                let sheet = dtGrid.current[0];
                let prosesValue = sheet.getValueFromCoords(11, r);
                return UNIT_MAP[prosesValue] || [];
              }
            },
            { type: 'text', title: 'Kasus', align: 'left', width: 700 }
          ],
          freezeColumns: 1,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "700px",
          minDimensions: [14, 20]
        }],
        onchange: handleDTChange,
      });
    }

    loadDataServer();

    return () => {
      if (oeeGrid.current && oeeGrid.current[0] && typeof oeeGrid.current[0].destroy === 'function') {
        oeeGrid.current[0].destroy();
      }
      if (dtGrid.current && dtGrid.current[0] && typeof dtGrid.current[0].destroy === 'function') {
        dtGrid.current[0].destroy();
      }
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
            OEE Line 1 - Zone F
          </h1>
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl mb-12 rounded overflow-hidden p-1">
          <div ref={oeeTableRef} />
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 1 - Zone F
          </h2>
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl rounded overflow-hidden p-1 mb-10">
          <div ref={dtTableRef} />
        </div>

      </div>
    </div>
  );
}