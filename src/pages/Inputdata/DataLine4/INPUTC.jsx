import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectC, fetchTodayDowntimeC } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

const TEORI_BATCH = {
  "25 ML":   29412, "100 ML":  56880, "250 ML":  21509, "500 ML":  23076, "1000 ML": 60194,
};
const SHIFTS  = ["1", "2", "3"];
const GROUPS  = ["A", "B", "C", "D"];
const VOLUMES = ["25 ML", "100 ML", "250 ML", "500 ML", "1000 ML"];

const C = {
  NO_BATCH:  0,
  TANGGAL:   1,
  SHIFT:     2,
  GROUP:     3,
  REJ_BOTOL:    4,
  REJ_PREFORM:  5,
  REJ_BLOW:     6,  // readOnly — = col4 + col5
  VOL_BOTOL:    7,
  CNT_START:    8,  // readOnly (from server)
  CNT_END:      9,
  CNT_SUB:     10,  // readOnly — = end - start
  UTUH:        11,
  JML_BATCH:   12,  // readOnly — = sub / teori
  TOTAL_CNT:   13,  // readOnly — = akumulasi sub total satu shift (hanya informatif)
  WASH:   14,
  VK:     15,
  VL:     16,
  TANPA_CAP_F: 17,
  SEAL_NOK:    18,
  OTHERS_F:    19,
  SUB_FILL:    20,  // readOnly — = sum(14..19)
  IPC:         21,
  OTHERS_S:    22,
  SUB_SAMPLES: 23,  // readOnly — = 21+22
  TRF_TO_ST:   24,  // readOnly — = sub - fill - samples
  TOTAL_KESEL: 25,  // readOnly — = sub (sama dengan CNT_SUB, total keseluruhan flow)
  YIELD_BATCH: 26,  // readOnly — = trf / sub * 100
  AVG_SHIFT:   27,  // readOnly — = avg yield per shift (dihitung saat save, bukan real-time)
  INPUT_STERIL:  28,  // readOnly — = TRF_TO_ST - REJ_BLOW (input ke sterilisasi)
  REJ_BOCOR:     29,
  REJ_TANPA_CAP: 30,
  REJ_VOL:       31,
  REJ_THERMO:    32,
  REJ_LAINLAIN:  33,
  TOTAL_REJ_BS:  34,  // readOnly — = sum(29..33)
  OUTPUT_CHAMBER:35,  // readOnly — = input_steril - total_rej_bs
  AT_SH: 36, AT_SM: 37, AT_EH: 38, AT_EM: 39,
  AT_SUB: 40,           // readOnly
  AT_TOTAL: 41,         // readOnly — akumulasi per shift (di-handle sisi server/report)
  RT_SH: 42, RT_SM: 43, RT_EH: 44, RT_EM: 45,
  RT_SUB: 46,           // readOnly
  LC_SH: 47, LC_SM: 48, LC_EH: 49, LC_EM: 50,
  LC_SUB:    51,        // readOnly — durasi LC
  LC_PER_BATCH: 52,     // readOnly — = LC_SUB / JML_BATCH
  LC_PER_SHIFT: 53,     // readOnly — same as LC_SUB (total per shift = sum di report)
  TOTAL_PREP: 54,       // readOnly — = AT_SUB + LC_SUB (dihitung sisi report)
};

const DC = {
  TANGGAL: 0,
  SHIFT:   1,
  GRUP:    2,
  NO_BATCH:3,
  SH: 4, SM: 5, EH: 6, EM: 7,
  DURASI:  8,  
  TYPE:    9,
  ROOT:   10,
  PROSES: 11,
  UNIT:   12,
  KASUS:  13,
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
  } catch (_) {}
  return '';
};

const getEmptyOEE = () => {
  const arr = Array(55).fill('');
  arr[C.UTUH] = '';         
  return arr;
};

const getEmptyDT = () => {
  const arr = Array(14).fill('');
  arr[DC.TYPE] = '';  
  return arr;
};

export default function InputC() {
  const { user } = useAuth();

  const oeeTableRef = useRef(null);
  const dtTableRef  = useRef(null);
  const oeeGrid     = useRef(null);
  const dtGrid      = useRef(null);
  const isCalculating = useRef(false);

  // ── OEE: onchange handler ───────────────────
  const handleOEEChange = useCallback((worksheet, _cell, cStr, rStr, _value) => {
    if (isCalculating.current) return;

    const col = parseInt(cStr);
    const row = parseInt(rStr);
    const sheet = worksheet;

    /**
     * Ambil nilai numerik dari koordinat. Return 0 jika kosong / NaN.
     */
    const v = (c) => {
      const raw = sheet.getValueFromCoords(c, row);
      return (raw === '' || raw === null || raw === undefined || isNaN(raw))
        ? 0
        : parseFloat(raw);
    };

    const raw = (c) => sheet.getValueFromCoords(c, row) ?? '';

    const setV = (c, val) => sheet.setValueFromCoords(c, row, val, true);

    const timeDiff = (sh, sm, eh, em) => {
      const startEmpty = raw(sh) === '' && raw(sm) === '';
      const endEmpty   = raw(eh) === '' && raw(em) === '';
      if (startEmpty || endEmpty) return '';
      const diff = (v(eh) * 60 + v(em)) - (v(sh) * 60 + v(sm));
      return diff < 0 ? diff + 24 * 60 : diff;
    };

    isCalculating.current = true;

    try {
      // ── Reject Blow = Reject Botol + Reject Preform ──────────────
      if (col === C.REJ_BOTOL || col === C.REJ_PREFORM) {
        const rb = raw(C.REJ_BOTOL), rp = raw(C.REJ_PREFORM);
        setV(C.REJ_BLOW, rb !== '' || rp !== '' ? v(C.REJ_BOTOL) + v(C.REJ_PREFORM) : '');
      }

      // ── Sub total counter = End - Start ──────────────────────────
      if (col === C.CNT_END || col === C.CNT_START) {
        const sub = v(C.CNT_END) - v(C.CNT_START);
        setV(C.CNT_SUB, sub > 0 ? sub : '');
      }

      // ── Jumlah batch = sub / teori ───────────────────────────────
      if (col === C.VOL_BOTOL || col === C.CNT_SUB || col === C.CNT_END || col === C.CNT_START) {
        const vol    = raw(C.VOL_BOTOL);
        const cntSub = v(C.CNT_SUB);
        const teori  = TEORI_BATCH[vol] ?? 23076;
        setV(C.JML_BATCH, cntSub > 0 ? (cntSub / teori).toFixed(2) : '');
      }

      // ── Sub Total Fill-Seal = sum(14..19) ────────────────────────
      if (col >= C.WASH && col <= C.OTHERS_F) {
        setV(C.SUB_FILL, v(C.WASH) + v(C.VK) + v(C.VL) + v(C.TANPA_CAP_F) + v(C.SEAL_NOK) + v(C.OTHERS_F));
      }

      // ── Sub Total Samples = IPC + Others ─────────────────────────
      if (col === C.IPC || col === C.OTHERS_S) {
        setV(C.SUB_SAMPLES, v(C.IPC) + v(C.OTHERS_S));
      }

      if (
        col === C.CNT_SUB   || col === C.CNT_END   || col === C.CNT_START ||
        col === C.SUB_FILL  || col === C.SUB_SAMPLES ||
        col === C.REJ_BOTOL || col === C.REJ_PREFORM
      ) {
        const sub  = v(C.CNT_SUB);
        const fill = v(C.SUB_FILL);
        const samp = v(C.SUB_SAMPLES);
        const blow = v(C.REJ_BLOW);   // FIX: sertakan reject blow

        if (sub > 0) {
          const trf = sub - (fill + samp);
          setV(C.TRF_TO_ST,   trf > 0 ? trf : 0);
          setV(C.TOTAL_KESEL, sub);
          setV(C.YIELD_BATCH, ((trf / sub) * 100).toFixed(2));

          // FIX: Input Before Steril = TRF - Reject Blow
          const inputSteril = trf - blow;
          setV(C.INPUT_STERIL, inputSteril > 0 ? inputSteril : 0);
        } else {
          setV(C.TRF_TO_ST,    '');
          setV(C.TOTAL_KESEL,  '');
          setV(C.YIELD_BATCH,  '');
          setV(C.INPUT_STERIL, '');
        }
      }

      // ── Reject Before Steril = sum(29..33) ───────────────────────
      if (col >= C.REJ_BOCOR && col <= C.REJ_LAINLAIN) {
        setV(C.TOTAL_REJ_BS,
          v(C.REJ_BOCOR) + v(C.REJ_TANPA_CAP) + v(C.REJ_VOL) + v(C.REJ_THERMO) + v(C.REJ_LAINLAIN)
        );
      }

      // ── Output (masuk chamber) = Input - Reject Before Steril ────
      if (col === C.INPUT_STERIL || (col >= C.REJ_BOCOR && col <= C.REJ_LAINLAIN)) {
        const inputSteril = v(C.INPUT_STERIL);
        setV(C.OUTPUT_CHAMBER, inputSteril > 0 ? inputSteril - v(C.TOTAL_REJ_BS) : '');
      }

      // ── Available Time ────────────────────────────────────────────
      if (col >= C.AT_SH && col <= C.AT_EM) {
        setV(C.AT_SUB, timeDiff(C.AT_SH, C.AT_SM, C.AT_EH, C.AT_EM));
        // FIX: AT_TOTAL (col 41) merupakan akumulasi per shift yang
        //      dihitung di sisi report/server, bukan real-time per baris.
        //      Tidak di-set di sini untuk menghindari konflik.
      }

      // ── Run Time (Filling) ────────────────────────────────────────
      if (col >= C.RT_SH && col <= C.RT_EM) {
        setV(C.RT_SUB, timeDiff(C.RT_SH, C.RT_SM, C.RT_EH, C.RT_EM));
      }

      // ── Line Clearance ────────────────────────────────────────────
      if (col >= C.LC_SH && col <= C.LC_EM) {
        const lc     = timeDiff(C.LC_SH, C.LC_SM, C.LC_EH, C.LC_EM);
        const jmlBatch = v(C.JML_BATCH);

        setV(C.LC_SUB, lc);

        // FIX: per_batch = LC / jumlah_batch (bukan nilai identik)
        if (lc !== '' && jmlBatch > 0) {
          setV(C.LC_PER_BATCH, (parseFloat(lc) / jmlBatch).toFixed(2));
        } else {
          setV(C.LC_PER_BATCH, lc !== '' ? lc : '');
        }

        // LC_PER_SHIFT = LC_SUB (total durasi LC untuk shift ini di baris ini)
        // Akumulasi per shift dilakukan di level report/server.
        setV(C.LC_PER_SHIFT, lc);
      }

    } finally {
      // Pastikan flag selalu direset meski ada error
      isCalculating.current = false;
    }
  }, []);

  // ── DT: onchange handler ────────────────────
  const handleDTChange = useCallback((worksheet, _cell, cStr, rStr, _value) => {
    const col   = parseInt(cStr);
    const row   = parseInt(rStr);
    const sheet = worksheet;

    if (col >= DC.SH && col <= DC.EM) {
      const getRaw = (c) => sheet.getValueFromCoords(c, row) ?? '';
      const getNum = (c) => parseFloat(getRaw(c)) || 0;

      // FIX: hanya hitung jika start DAN end sudah terisi
      if (getRaw(DC.SH) !== '' && getRaw(DC.EH) !== '') {
        const diff =
          (getNum(DC.EH) * 60 + getNum(DC.EM)) -
          (getNum(DC.SH) * 60 + getNum(DC.SM));
        sheet.setValueFromCoords(DC.DURASI, row, diff < 0 ? diff + 24 * 60 : diff, true);
      }
    }
  }, []);

  // ── Load data dari server ───────────────────
// ── Load data dari server (TiDB) ───────────────────
  const loadDataServer = useCallback(async () => {
    if (!user) return;
    try {
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectC(user),
        fetchTodayDowntimeC(user),
      ]);

      let mappedOEE = [];
      let mappedOEEIds = []; // Simpan ID
      if (resOEE.status === 'success' && Array.isArray(resOEE.data)) {
        // Data dari TiDB sudah urut DESC, kita tidak perlu .reverse() lagi
        mappedOEE = resOEE.data.map((row) => {
          mappedOEEIds.push(row.id); // Simpan Primary Key ID TiDB
          return [
            row.no_batch || '', parseToYMD(row.tanggal), row.shift || '', row.group || '', row.reject_botol || '', row.reject_preform || '',
            row.reject_blow || '', row.volume_botol || '', row.cnt_start || '', row.cnt_end || '', row.cnt_sub || '', row.utuh || 'Y',
            row.jml_batch || '', row.total_cnt_shift || '', row.r_washing || '', row.r_vk || '', row.r_vl || '', row.r_nocap || '',
            row.r_sealnok || '', row.r_others || '', row.r_sub || '', row.s_ipc || '', row.s_others || '', row.s_sub || '',
            row.trf_st || '', row.total_good_shift || '', row.yield_batch || '', row.avg_yield_shift || '', row.pre_in || '', row.pre_bocor || '',
            row.pre_nocap || '', row.pre_vol || '', row.pre_thermo || '', row.pre_lain || '', row.pre_rej_total || '', row.pre_out || '',
            row.av_sh || '', row.av_sm || '', row.av_eh || '', row.av_em || '', row.av_sub || '', row.total_avail_shift || '',
            row.run_sh || '', row.run_sm || '', row.run_eh || '', row.run_em || '', row.run_sub || '', row.lc_sh || '',
            row.lc_sm || '', row.lc_eh || '', row.lc_em || '', row.lc_sub || '', row.jeda_batch || '', row.jeda_shift || '', row.total_prep_clear || ''
          ]; 
        });
      }

      let mappedDT = [];
      let mappedDTIds = [];
      if (resDT.status === 'success' && Array.isArray(resDT.data)) {
        mappedDT = resDT.data.map((row) => {
          mappedDTIds.push(row.id); // Simpan Primary Key ID TiDB
          return [
            parseToYMD(row.tanggal), row.shift || '', row.group || '', row.no_batch || '', row.start_h || '', row.start_m || '',
            row.end_h || '', row.end_m || '', row.duration || '', row.plan_unplan || 'Unplanned', row.root_cause || '', row.proses || '',
            row.unit || '', row.kasus || ''
          ];
        });
      }

      const EMPTY_ROWS = 100;
      const finalOEE = [...mappedOEE, ...Array.from({ length: EMPTY_ROWS }, getEmptyOEE)];
      const finalDT  = [...mappedDT,  ...Array.from({ length: EMPTY_ROWS }, getEmptyDT)];

      // Simpan referensi array ID agar Autosave bisa melakukan UPDATE (bukan insert ganda)
      oeeIds.current = [...mappedOEEIds, ...Array(EMPTY_ROWS).fill(null)];
      dtIds.current = [...mappedDTIds, ...Array(EMPTY_ROWS).fill(null)];

      if (oeeGrid.current?.[0]) oeeGrid.current[0].setData(finalOEE);
      if (dtGrid.current?.[0]) dtGrid.current[0].setData(finalDT);

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
    const initialOEE = Array.from({ length: 20 }, getEmptyOEE);
    const initialDT  = Array.from({ length: 20 }, getEmptyDT);

    // ── OEE Grid ──────────────────────────────
    if (oeeTableRef.current) {
      oeeTableRef.current.innerHTML = '';
      oeeGrid.current = jspreadsheet(oeeTableRef.current, {
        worksheets: [{
          data: initialOEE,
          columns: [
            // ── Identity ──
            { type: 'text',     title: 'No Batch',          width: 100 },
            { type: 'calendar', title: 'Tanggal',            width: 110, options: { format: 'YYYY-MM-DD' } },
            { type: 'dropdown', title: 'Shift',              width: 60,  source: SHIFTS },
            { type: 'dropdown', title: 'Group',              width: 60,  source: GROUPS },
            // ── Counter Filling ──
            { type: 'numeric',  title: 'Reject Botol',       width: 95  },
            { type: 'numeric',  title: 'Reject Preform',     width: 105 },
            { type: 'numeric',  title: 'Reject Blow',        width: 90,  readOnly: true },
            { type: 'dropdown', title: 'Volume Botol',       width: 100, source: VOLUMES },
            { type: 'numeric',  title: 'Start',              width: 80,  readOnly: true },
            { type: 'numeric',  title: 'End',                width: 80  },
            { type: 'numeric',  title: 'Sub Total',          width: 85,  readOnly: true },
            { type: 'dropdown', title: 'Utuh?',              width: 60,  source: ['Y', 'N'] },
            { type: 'numeric',  title: 'Jumlah Batch',       width: 100, readOnly: true },
            { type: 'numeric',  title: 'Total Cnt/Shift',    width: 115, readOnly: true },
            // ── Rejection Filling ──
            { type: 'numeric',  title: 'Washing',            width: 75  },
            { type: 'numeric',  title: 'VK',                 width: 60  },
            { type: 'numeric',  title: 'VL',                 width: 60  },
            { type: 'numeric',  title: 'Tanpa Cap',          width: 80  },
            { type: 'numeric',  title: 'Seal NOT OK',        width: 90  },
            { type: 'numeric',  title: 'Others/Bocor',       width: 90  },
            { type: 'numeric',  title: 'Sub Total Fill-Seal',width: 140, readOnly: true },
            // ── Samples ──
            { type: 'numeric',  title: 'IPC',                width: 60  },
            { type: 'numeric',  title: 'Others',             width: 65  },
            { type: 'numeric',  title: 'Sub Total Samples',  width: 135, readOnly: true },
            // ── Hasil Baik ──
            { type: 'numeric',  title: 'Transfer to ST',     width: 105, readOnly: true },
            { type: 'numeric',  title: 'Total Keseluruhan',  width: 135, readOnly: true },
            // ── % Yield ──
            { type: 'numeric',  title: 'Yield/Batch (%)',    width: 100, readOnly: true },
            { type: 'numeric',  title: 'AVG/Shift (%)',      width: 100, readOnly: true },
            // ── Reject Before Steril ──
            { type: 'numeric',  title: 'Input Before Steril',width: 135, readOnly: true },
            { type: 'numeric',  title: 'Reject Bocor',       width: 100 },
            { type: 'numeric',  title: 'Reject Tanpa Cap',   width: 120 },
            { type: 'numeric',  title: 'Reject Vol',         width: 85  },
            { type: 'numeric',  title: 'Reject Thermo',      width: 105 },
            { type: 'numeric',  title: 'Reject Lain-lain',   width: 115 },
            { type: 'numeric',  title: 'Total Reject BS',    width: 115, readOnly: true },
            { type: 'numeric',  title: 'Output (Chamber)',   width: 125, readOnly: true },
            // ── Available Time ──
            { type: 'numeric',  title: 'Start (Jam)',        width: 80  },
            { type: 'numeric',  title: 'Start (Menit)',      width: 90  },
            { type: 'numeric',  title: 'End (Jam)',          width: 80  },
            { type: 'numeric',  title: 'End (Menit)',        width: 90  },
            { type: 'numeric',  title: 'Sub Total',          width: 80,  readOnly: true },
            { type: 'numeric',  title: 'Total/Shift',        width: 95,  readOnly: true },
            // ── Run Time ──
            { type: 'numeric',  title: 'Start (Jam)',        width: 80  },
            { type: 'numeric',  title: 'Start (Menit)',      width: 90  },
            { type: 'numeric',  title: 'End (Jam)',          width: 80  },
            { type: 'numeric',  title: 'End (Menit)',        width: 90  },
            { type: 'numeric',  title: 'Sub Total',          width: 80,  readOnly: true },
            // ── Line Clearance ──
            { type: 'numeric',  title: 'Start (Jam)',        width: 80  },
            { type: 'numeric',  title: 'Start (Menit)',      width: 90  },
            { type: 'numeric',  title: 'End (Jam)',          width: 80  },
            { type: 'numeric',  title: 'End (Menit)',        width: 90  },
            { type: 'numeric',  title: 'Sub Total',          width: 80,  readOnly: true },
            // ── Jeda ──
            { type: 'numeric',  title: 'Total Prep+Clear',   width: 130, readOnly: true },
            { type: 'numeric',  title: 'Per Batch',          width: 80,  readOnly: true },
            { type: 'numeric',  title: 'Per Shift',          width: 80,  readOnly: true },
          ],
          nestedHeaders: [
            [
              { title: '',                   colspan: 8  },
              { title: 'Counter Filling',    colspan: 6  },
              { title: 'Rejection Filling',  colspan: 7  },
              { title: 'Samples',            colspan: 3  },
              { title: 'Hasil Baik',         colspan: 2  },
              { title: '% Yield',            colspan: 2  },
              { title: 'Reject Before Steril', colspan: 8 },
              { title: 'Available Time',     colspan: 6  },
              { title: 'Run Time',           colspan: 5  },
              { title: 'Line Clearance',     colspan: 5  },
              { title: '',                   colspan: 1  },
              { title: 'Jeda Antar Batch',   colspan: 2  },
            ],
            [
              { title: '',              colspan: 8 },
              { title: 'Per Cycle Batch', colspan: 3 },
              { title: '',              colspan: 3 },
              { title: 'Washing',       colspan: 1 },
              { title: 'Filling',       colspan: 2 },
              { title: 'Sealing',       colspan: 2 },
              { title: '',              colspan: 2 },
              { title: 'Botol',         colspan: 2 },
              { title: '',              colspan: 1 },
              { title: 'Transfer to ST', colspan: 2 },
              { title: '',              colspan: 2 },
              { title: '',              colspan: 1 },
              { title: 'Reject Before Steril', colspan: 6 },
              { title: '',              colspan: 1 },
              { title: '',              colspan: 6 },
              { title: 'Filling',       colspan: 5 },
              { title: 'CIP Minor',     colspan: 5 },
              { title: '',              colspan: 1 },
              { title: '',              colspan: 2 },
            ],
          ],
          freezeColumns: 2,
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
            { type: 'dropdown', title: 'Shift', width: 60,  source: SHIFTS },
            { type: 'dropdown', title: 'Grup', width: 60,  source: GROUPS },
            { type: 'text',     title: 'No. Batch', width: 120 },
            { type: 'numeric',  title: 'Start (Jam)', width: 70  },
            { type: 'numeric',  title: 'Start (Menit)', width: 80  },
            { type: 'numeric',  title: 'End (Jam)', width: 70  },
            { type: 'numeric',  title: 'End (Menit)', width: 80  },
            { type: 'numeric',  title: 'Durasi (menit)', width: 90,  readOnly: true },
            { type: 'dropdown', title: 'Planned / Unplanned', width: 150, source: ['Planned', 'Unplanned'] },
            { type: 'dropdown', title: 'Root Cause', width: 150, source: ['Production', 'Mechanical', 'Electrical', 'Utility', 'QA', 'QC', 'Warehouse', 'PPIC', 'R&D'] },
            { type: 'dropdown', title: 'Proses', width: 120, source: ['Blowing', 'Filling', 'Mixing', 'Autoclave'] },
            { 
              type: 'dropdown', 
              title: 'Unit',
              width: 120,
              source: ALL_UNITS_C,
              filter: function(instance, cell, c, r, source) {
                let sheet = dtGrid.current[0];
                let prosesValue = sheet.getValueFromCoords(11, r);
                return UNIT_MAP_C[prosesValue] || [];
              }
            },
            { type: 'text',     title: 'Kasus', width: 800 },
          ],
          freezeColumns: 1,
          tableOverflow: true,
          tableWidth: '100%',
          tableHeight: '700px',
        }],
        onchange: function(worksheet, cell, cStr, rStr, value) {
          let c = parseInt(cStr);
          let r = parseInt(rStr);
          let sheet = worksheet;
          
          if (c === 11) {
            sheet.setValueFromCoords(12, r, '', true);
          }
          
          if (typeof handleDTChange === 'function') {
            handleDTChange(worksheet, cell, cStr, rStr, value);
          }
        }
      });
    }

    loadDataServer();

    return () => {
      if (typeof oeeGrid.current?.[0]?.destroy === 'function') {
        oeeGrid.current[0].destroy();
      }
      if (typeof dtGrid.current?.[0]?.destroy === 'function') {
        dtGrid.current[0].destroy();
      }
      if (oeeTableRef.current) oeeTableRef.current.innerHTML = '';
      if (dtTableRef.current)  dtTableRef.current.innerHTML  = '';
      oeeGrid.current = null;
      dtGrid.current  = null;
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