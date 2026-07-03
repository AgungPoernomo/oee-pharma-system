import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectC, fetchTodayDowntimeC } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

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
  } catch (_) { }
  return '';
};

const getEmptyOEE = () => {
  const arr = Array(52).fill('');
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

export default function InputC() {
  const { user } = useAuth();

  const oeeTableRef = useRef(null);
  const dtTableRef = useRef(null);
  const oeeGrid = useRef(null);
  const dtGrid = useRef(null);
  const isCalculating = useRef(false);

  const oeeIds = useRef(getCachedIds('C_IDS_OEE'));
  const dtIds = useRef(getCachedIds('C_IDS_DT'));
  const oeeTimers = useRef({});
  const dtTimers = useRef({});
  const calcTimers = useRef({});

  const triggerAutosaveOEE = (rIdx, sheet) => {
    if (oeeTimers.current[rIdx]) clearTimeout(oeeTimers.current[rIdx]);

    oeeTimers.current[rIdx] = setTimeout(async () => {
      const rowData = sheet.getRowData(rIdx);
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
  };

  const triggerAutosaveDT = (rIdx, sheet) => {
    if (dtTimers.current[rIdx]) clearTimeout(dtTimers.current[rIdx]);

    dtTimers.current[rIdx] = setTimeout(async () => {
      const rowData = sheet.getRowData(rIdx);
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
  };

  const runRowCalculations = useCallback((worksheet, row) => {
    if (isCalculating.current) return;
    const sheet = worksheet;

    const v = (c) => {
      const raw = sheet.getValueFromCoords(c, row);
      return (raw === '' || raw === null || raw === undefined || isNaN(raw)) ? 0 : parseFloat(raw);
    };
    const raw = (c) => sheet.getValueFromCoords(c, row) ?? '';
    const setV = (c, val) => sheet.setValueFromCoords(c, row, val, true);
    const timeDiff = (sh, sm, eh, em) => {
      if (raw(sh) === '' && raw(sm) === '' || raw(eh) === '' && raw(em) === '') return '';
      const diff = (v(eh) * 60 + v(em)) - (v(sh) * 60 + v(sm));
      return diff < 0 ? diff + 24 * 60 : diff;
    };

    isCalculating.current = true;
    try {
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
      setV(C.LC_PER_BATCH, (lc !== '' && v(C.JML_BATCH) > 0) ? (parseFloat(lc) / v(C.JML_BATCH)).toFixed(2) : (lc !== '' ? lc : ''));
      setV(C.LC_PER_SHIFT, lc);
    } finally {
      isCalculating.current = false;
      triggerAutosaveOEE(row, sheet);
    }
  }, []);

  const handleOEEChange = useCallback((worksheet, _cell, _cStr, rStr, _value) => {
    if (isCalculating.current) return;
    const row = parseInt(rStr);
    if (calcTimers.current[row]) clearTimeout(calcTimers.current[row]);
    calcTimers.current[row] = setTimeout(() => {
      runRowCalculations(worksheet, row);
    }, 30);
  }, [runRowCalculations]);

  const handleDTChange = useCallback((worksheet, _cell, cStr, rStr, _value) => {
    const col = parseInt(cStr); const row = parseInt(rStr); const sheet = worksheet;
    if (calcTimers.current['dt_' + row]) clearTimeout(calcTimers.current['dt_' + row]);
    calcTimers.current['dt_' + row] = setTimeout(() => {
      if (col >= DC.SH && col <= DC.EM) {
        const getRaw = (c) => sheet.getValueFromCoords(c, row) ?? '';
        const getNum = (c) => parseFloat(getRaw(c)) || 0;
        if (getRaw(DC.SH) !== '' && getRaw(DC.EH) !== '') {
          const diff = (getNum(DC.EH) * 60 + getNum(DC.EM)) - (getNum(DC.SH) * 60 + getNum(DC.SM));
          sheet.setValueFromCoords(DC.DURASI, row, diff < 0 ? diff + 24 * 60 : diff, true);
        }
      }
      if (col === DC.PROSES) sheet.setValueFromCoords(DC.UNIT, row, '', true);
      triggerAutosaveDT(row, sheet);
    }, 30);
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
          return [
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

      const EMPTY_ROWS = 100;
      const finalOEE = [...mappedOEE, ...Array.from({ length: EMPTY_ROWS }, getEmptyOEE)];
      const finalDT = [...mappedDT, ...Array.from({ length: EMPTY_ROWS }, getEmptyDT)];

      if (oeeIds && oeeIds.current) oeeIds.current = [...mappedOEEIds, ...Array(EMPTY_ROWS).fill(null)];
      if (dtIds && dtIds.current) dtIds.current = [...mappedDTIds, ...Array(EMPTY_ROWS).fill(null)];

      if (oeeGrid.current?.[0]) oeeGrid.current[0].setData(finalOEE);
      if (dtGrid.current?.[0]) dtGrid.current[0].setData(finalDT);

      localStorage.setItem('C_DATA_OEE', JSON.stringify(finalOEE));
      localStorage.setItem('C_DATA_DT', JSON.stringify(finalDT));
      localStorage.setItem('C_IDS_OEE', JSON.stringify(oeeIds.current));
      localStorage.setItem('C_IDS_DT', JSON.stringify(dtIds.current));

    } catch (error) {
      console.error('[InputC] loadDataServer error:', error);
    }
  }, [user]);

  const UNIT_MAP_C = {
    'Blowing': ['Conveyor Preform Hijau', 'Hopper Preform', 'Conveyor Hopper Putih', 'Preform Feeding Chute', 'Rotary Preform', 'Minion', 'Supply Hanger', 'Heater Lamp', 'Heating Tube', 'Vertical Punch', 'Servo 1', 'Midstation', 'Servo 2', 'Servo 3', 'Servo 4', 'Neckseal', 'Stretch Servo', 'Bottom Mold', 'Pin Bottom', 'Body Mould - Utara', 'Body Mould - Selatan', 'Molding', 'Overturn', 'Transfer Blow-Fill', 'Supply Chiller', 'Compresor - Highpress (Oilfree)', 'Compresor - Lowpress (Oilless)', 'RH TMS', 'Suhu TMS', 'Supply Preform', 'Trial', 'Blowing-Others', 'Changeover'],
    'Filling': ['Laserjet', 'Gripper Washing', 'PLC', 'Ionizer', 'Carousel 1', 'Carousel 2', 'Carousel 3', 'Buffer Tank', 'Filling', 'Carousel 4', 'Carousel 5', 'Carousel 6', 'Cap Feeding Chute', 'Sealing', 'Heater', 'Cooling Heater Sealing', 'Wheelcap Ganjil', 'Wheelcap Genap', 'Conveyor Filling', 'Tandonan', 'Gear', 'Compresor-Oilfree', 'Compresor-Oilless', 'Trial', 'CIP/SIP', 'Filling-Others', 'Supply Listrik', 'Line Clearance', 'Break'],
    'Mixing': ['Supply WFI', 'Tanki D1', 'Tanki D2', 'Filter Produk', 'Mixing Produk', 'CIP/SIP', 'Integrity', 'PLC', 'Trial'],
    'Autoclave': ['Conveyor', 'Meja A', 'Meja B', 'Lifter A', 'Lifter B', 'Tray kereta', 'Turn table', 'Kereta Anjlok', 'Kereta Habis', 'Jalur penuh', 'Chamber A', 'Chamber B', 'Doorseal', 'Autoclave-Other', 'Pick and Place']
  };
  const ALL_UNITS_C = [...new Set(Object.values(UNIT_MAP_C).flat())];

  useEffect(() => {
    const initialOEE = getCachedData('C_DATA_OEE', getEmptyOEE, 100);
    const initialDT = getCachedData('C_DATA_DT', getEmptyDT, 100);

    if (oeeTableRef.current) {
      oeeTableRef.current.innerHTML = '';
      oeeGrid.current = jspreadsheet(oeeTableRef.current, {
        worksheets: [{
          data: initialOEE,
          columns: [
            { type: 'text', title: 'No Batch', width: 100 },
            { type: 'calendar', title: 'Tanggal', width: 110, options: { format: 'YYYY-MM-DD' } },
            { type: 'numeric', title: 'Shift', width: 60, },
            { type: 'text', title: 'Group', width: 60, },
            { type: 'numeric', title: 'Reject Botol', width: 95 },
            { type: 'numeric', title: 'Reject Preform', width: 105 },
            { type: 'numeric', title: 'Reject Blow', width: 90, readOnly: true },
            { type: 'dropdown', title: 'Volume Botol', width: 100, source: VOLUMES },
            { type: 'numeric', title: 'Start', width: 80, },
            { type: 'numeric', title: 'End', width: 80 },
            { type: 'numeric', title: 'Sub Total', width: 85, readOnly: true },
            { type: 'dropdown', title: 'Utuh?', width: 60, source: ['Y', 'N'] },
            { type: 'numeric', title: 'Jumlah Batch', width: 100, readOnly: true },
            { type: 'numeric', title: 'Total Cnt/Shift', width: 115, readOnly: true },
            { type: 'numeric', title: 'Washing', width: 75 },
            { type: 'numeric', title: 'VK', width: 60 },
            { type: 'numeric', title: 'VL', width: 60 },
            { type: 'numeric', title: 'Tanpa Cap', width: 80 },
            { type: 'numeric', title: 'Seal NOT OK', width: 90 },
            { type: 'numeric', title: 'Others/Bocor', width: 90 },
            { type: 'numeric', title: 'Sub Total Fill-Seal', width: 140, readOnly: true },
            { type: 'numeric', title: 'IPC', width: 60 },
            { type: 'numeric', title: 'Others', width: 65 },
            { type: 'numeric', title: 'Sub Total Samples', width: 135, readOnly: true },
            { type: 'numeric', title: 'Transfer to ST', width: 105, readOnly: true },
            { type: 'numeric', title: 'Total Keseluruhan', width: 135, readOnly: true },
            { type: 'numeric', title: 'Yield/Batch (%)', width: 100, readOnly: true },
            { type: 'numeric', title: 'AVG/Shift (%)', width: 100, readOnly: true },
            { type: 'numeric', title: 'Input Before Steril', width: 135, readOnly: true },
            { type: 'numeric', title: 'Reject Bocor', width: 100 },
            { type: 'numeric', title: 'Reject Tanpa Cap', width: 120 },
            { type: 'numeric', title: 'Reject Vol', width: 85 },
            { type: 'numeric', title: 'Reject Thermo', width: 105 },
            { type: 'numeric', title: 'Reject Lain-lain', width: 115 },
            { type: 'numeric', title: 'Total Reject BS', width: 115, readOnly: true },
            { type: 'numeric', title: 'Output (Chamber)', width: 125, readOnly: true },
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'End (Jam)', width: 80 },
            { type: 'numeric', title: 'End (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub Total', width: 80, readOnly: true },
            { type: 'numeric', title: 'Total/Shift', width: 95, readOnly: true },
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'End (Jam)', width: 80 },
            { type: 'numeric', title: 'End (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub Total', width: 80, readOnly: true },
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'End (Jam)', width: 80 },
            { type: 'numeric', title: 'End (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub Total', width: 80, readOnly: true },
          ],
          nestedHeaders: [
            [
              { title: '', colspan: 8 },
              { title: 'Counter Filling', colspan: 6 },
              { title: 'Rejection Filling', colspan: 7 },
              { title: 'Samples', colspan: 3 },
              { title: 'Hasil Baik', colspan: 2 },
              { title: '% Yield', colspan: 2 },
              { title: 'Reject Before Steril', colspan: 8 },
              { title: 'Available Time', colspan: 6 },
              { title: 'Run Time', colspan: 5 },
              { title: 'Line Clearance', colspan: 5 },
              { title: '', colspan: 1 },
            ],
            [
              { title: '', colspan: 8 },
              { title: 'Per Cycle Batch', colspan: 3 },
              { title: '', colspan: 3 },
              { title: 'Washing', colspan: 1 },
              { title: 'Filling', colspan: 2 },
              { title: 'Sealing', colspan: 2 },
              { title: '', colspan: 2 },
              { title: 'Botol', colspan: 2 },
              { title: '', colspan: 1 },
              { title: 'Transfer to ST', colspan: 2 },
              { title: '', colspan: 2 },
              { title: '', colspan: 1 },
              { title: 'Reject Before Steril', colspan: 6 },
              { title: '', colspan: 1 },
              { title: '', colspan: 6 },
              { title: 'Filling', colspan: 5 },
              { title: 'CIP Minor', colspan: 5 },
            ],
          ],
          freezeColumns: 4,
          cellAlignment: 'left',
          tableOverflow: true,
          tableWidth: '100%',
          tableHeight: '700px',
        }],
        onchange: handleOEEChange,
      });
    }

    if (dtTableRef.current) {
      dtTableRef.current.innerHTML = '';
      dtGrid.current = jspreadsheet(dtTableRef.current, {
        worksheets: [{
          data: initialDT,
          columns: [
            { type: 'calendar', title: 'Tanggal', width: 110, options: { format: 'YYYY-MM-DD' } },
            { type: 'numeric', title: 'Shift', width: 60, },
            { type: 'text', title: 'Grup', width: 60, },
            { type: 'text', title: 'No. Batch', width: 120 },
            { type: 'numeric', title: 'Start (Jam)', width: 70 },
            { type: 'numeric', title: 'Start (Menit)', width: 80 },
            { type: 'numeric', title: 'End (Jam)', width: 70 },
            { type: 'numeric', title: 'End (Menit)', width: 80 },
            { type: 'numeric', title: 'Durasi (menit)', width: 90, readOnly: true },
            { type: 'dropdown', title: 'Planned / Unplanned', width: 150, source: ['Planned', 'Unplanned'] },
            { type: 'dropdown', title: 'Root Cause', width: 150, source: ['Production', 'Mechanical', 'Electrical', 'Utility', 'QA', 'QC', 'Warehouse', 'PPIC', 'R&D'] },
            { type: 'dropdown', title: 'Proses', width: 120, source: ['Blowing', 'Filling', 'Mixing', 'Autoclave'] },
            {
              type: 'dropdown',
              title: 'Unit',
              width: 120,
              source: ALL_UNITS_C,
              filter: function (instance, cell, c, r, source) {
                let sheet = dtGrid.current[0];
                let prosesValue = sheet.getValueFromCoords(11, r);
                return UNIT_MAP_C[prosesValue] || [];
              }
            },
            { type: 'text', title: 'Kasus', align: 'left', width: 800, },
          ],
          freezeColumns: 1,
          tableOverflow: true,
          tableWidth: '100%',
          tableHeight: '700px',
        }],
        onchange: handleDTChange,
      });
    }

    loadDataServer();

    return () => {
      try {
        if (oeeTableRef.current) jspreadsheet.destroy(oeeTableRef.current, true);
        if (dtTableRef.current) jspreadsheet.destroy(dtTableRef.current, true);
      } catch (e) { console.error('Destroy error', e); }
      if (oeeTableRef.current) oeeTableRef.current.innerHTML = '';
      if (dtTableRef.current) dtTableRef.current.innerHTML = '';
      oeeGrid.current = null;
      dtGrid.current = null;
    };
  }, [user, handleOEEChange, handleDTChange, loadDataServer]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">

        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-wider uppercase text-emerald-800">
            OEE Line 4 — Zone C
          </h1>
        </div>
        <div className="bg-white border-2 border-slate-300 shadow-xl mb-12 rounded overflow-hidden p-1">
          <div ref={oeeTableRef} />
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 4 — Zone C
          </h2>
        </div>
        <div className="bg-white border-2 border-slate-300 shadow-xl rounded overflow-hidden p-1 mb-10">
          <div ref={dtTableRef} />
        </div>

      </div>
    </div>
  );
}