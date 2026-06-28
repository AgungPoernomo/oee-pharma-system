import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectC, fetchTodayDowntimeC } from '../../../services/api';
import toast, { Toaster } from 'react-hot-toast';

import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

const TEORI_BATCH = { "25 ML": 29412, "100 ML": 56880, "250 ML": 21509, "500 ML": 23076, "1000 ML": 60194 };
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

// 55 Kolom OEE murni tanpa tombol aksi
const getEmptyOEE = () => {
  const arr = Array(55).fill('');
  arr[11] = 'Y'; // Default Utuh = Y
  return arr;
};

// 14 Kolom DT murni tanpa tombol aksi
const getEmptyDT = () => {
  const arr = Array(14).fill('');
  arr[9] = 'Unplanned'; // Default
  return arr;
};

export default function InputC() {
  const { user } = useAuth();
  
  const oeeTableRef = useRef(null);
  const dtTableRef = useRef(null);
  const oeeGrid = useRef(null);
  const dtGrid = useRef(null);
  const isCalculating = useRef(false);

  // ===============================================
  // FUNGSI PENARIKAN 100% DATA DARI SPREADSHEET
  // ===============================================
  const loadDataServer = async () => {
    if (!user) return;
    try {
      const toastId = toast.loading("Menarik data dari server...");
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectC(user),
        fetchTodayDowntimeC(user)
      ]);

      let mappedOEE = [];
      if (resOEE.status === 'success' && resOEE.data) {
        const reversedOEE = [...resOEE.data].reverse(); // Data terbaru di atas
        mappedOEE = reversedOEE.map((row) => {
          let yieldBatch = row[26] ? (parseFloat(row[26]) * 100).toFixed(2) : '';
          return [
            row[2] || '', parseToYMD(row[3]), row[4] || '', row[5] || '', 
            row[72] || '', // [4] Reject Botol
            row[73] || '', // [5] Reject Preform
            row[6] || '',  // [6] Reject Blow (Hasil OEE Lama)
            row[7] || '',  // [7] Volume Botol
            
            row[8] || '', row[9] || '', row[10] || '', row[11] || 'Y', row[12] || '', row[13] || '',
            row[14] || '', row[15] || '', row[16] || '', row[17] || '', row[18] || '', row[19] || '', row[20] || '',
            row[21] || '', row[22] || '', row[23] || '', 
            row[24] || '', row[25] || '', yieldBatch, row[27] || '',
            
            row[28] || '', row[29] || '', row[30] || '', row[31] || '', row[32] || '', row[33] || '', row[34] || '', row[35] || '',
            row[36] || '', row[37] || '', row[38] || '', row[39] || '', row[40] || '', row[41] || '',
            row[59] || '', row[60] || '', row[61] || '', row[62] || '', row[63] || '',
            row[64] || '', row[65] || '', row[66] || '', row[67] || '', row[68] || '',
            row[69] || '', row[70] || '', row[71] || ''
          ]; // Pas 55 Kolom
        });
      }

      let mappedDT = [];
      if (resDT.status === 'success' && resDT.data) {
        const reversedDT = [...resDT.data].reverse();
        mappedDT = reversedDT.map((row) => {
          return [
            parseToYMD(row[2]), row[3] || '', row[4] || '', row[5] || '',
            row[6] || '', row[7] || '', row[8] || '', row[9] || '', row[10] || '',
            row[11] || 'Unplanned', row[12] || '', row[13] || '', row[14] || '', row[15] || ''
          ]; // Pas 14 Kolom
        });
      }

      // Tambahkan baris kosong di bawah data yang sudah ditarik untuk tempat input baru
      const finalOEEData = [...mappedOEE, ...Array.from({ length: 30 }, () => getEmptyOEE())];
      const finalDTData = [...mappedDT, ...Array.from({ length: 30 }, () => getEmptyDT())];

      // Tembakkan data ke JSpreadsheet (Indeks [0] wajib untuk JSS CE versi 4+)
      if (oeeGrid.current && oeeGrid.current[0]) {
        oeeGrid.current[0].setData(finalOEEData);
      }
      if (dtGrid.current && dtGrid.current[0]) {
        dtGrid.current[0].setData(finalDTData);
      }

      toast.success("100% Data berhasil ditarik!", { id: toastId });
    } catch (error) { 
      toast.error("Gagal menarik data.");
      console.error(error); 
    }
  };

  useEffect(() => {
    // Render awal tabel kosong
    const initialEmptyOEE = Array.from({ length: 20 }, () => getEmptyOEE());
    const initialEmptyDT = Array.from({ length: 20 }, () => getEmptyDT());

    if (oeeTableRef.current) {
      oeeTableRef.current.innerHTML = ''; 
      oeeGrid.current = jspreadsheet(oeeTableRef.current, {
        worksheets: [{
          data: initialEmptyOEE,
          columns: [
            { type: 'text', title: 'No Batch', width: 100 },
            { type: 'calendar', title: 'Tanggal', width: 100, options: { format: 'YYYY-MM-DD' } },
            { type: 'dropdown', title: 'Shift', source: SHIFTS, width: 60 },
            { type: 'dropdown', title: 'Group', source: GROUPS, width: 60 },
            { type: 'numeric', title: 'Reject Botol', width: 95 }, 
            { type: 'numeric', title: 'Reject Preform', width: 105 }, 
            { type: 'numeric', title: 'Reject Blow', width: 90, readOnly: true }, 
            { type: 'dropdown', title: 'Volume Botol', source: VOLUMES, width: 100 },
            
            { type: 'numeric', title: 'Start', width: 80 },
            { type: 'numeric', title: 'End', width: 80 },
            { type: 'numeric', title: 'sub total', width: 80, readOnly: true },
            { type: 'dropdown', title: 'Utuh?', source: ['Y', 'N'], width: 60 },
            { type: 'numeric', title: 'jumlah batch', width: 90, readOnly: true },
            { type: 'numeric', title: 'TOTAL Cnt per shift', width: 120, readOnly: true },
            
            { type: 'numeric', title: 'Washing', width: 70 },
            { type: 'numeric', title: 'VK', width: 60 },
            { type: 'numeric', title: 'VL', width: 60 },
            { type: 'numeric', title: 'Tanpa Cap', width: 80 },
            { type: 'numeric', title: 'Seal NOT OK', width: 90 },
            { type: 'numeric', title: 'Others/Bocor', width: 90 },
            { type: 'numeric', title: 'Sub Total Fill-Seal', width: 130, readOnly: true },
            
            { type: 'numeric', title: 'IPC', width: 60 },
            { type: 'numeric', title: 'Others', width: 60 },
            { type: 'numeric', title: 'Sub Total Samples', width: 130, readOnly: true },
            
            { type: 'numeric', title: 'Sub Total Transfer to ST', width: 160, readOnly: true },
            { type: 'numeric', title: 'TOTAL KESELURUHAN', width: 150, readOnly: true },
            
            { type: 'numeric', title: 'per Batch', width: 80, readOnly: true },
            { type: 'numeric', title: 'AVG per shift', width: 100, readOnly: true },
            
            { type: 'numeric', title: 'Input Before Steril', width: 130, readOnly: true },
            { type: 'numeric', title: 'Reject Bocor', width: 90 },
            { type: 'numeric', title: 'Reject Tanpa Cap', width: 120 },
            { type: 'numeric', title: 'Reject Vol', width: 80 },
            { type: 'numeric', title: 'Reject Thermo', width: 100 },
            { type: 'numeric', title: 'Reject Lain-lain', width: 110 },
            { type: 'numeric', title: 'TOTAL Reject Before Steril', width: 160, readOnly: true },
            { type: 'numeric', title: 'Output (masuk chamber)', width: 160, readOnly: true },
            
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'END (Jam)', width: 80 },
            { type: 'numeric', title: 'END (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub total', width: 80, readOnly: true },
            { type: 'numeric', title: 'TOTAL KESELURUHAN per Shift', width: 200, readOnly: true },
            
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'END (Jam)', width: 80 },
            { type: 'numeric', title: 'END (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub total', width: 80, readOnly: true },
            
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'END (Jam)', width: 80 },
            { type: 'numeric', title: 'END (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub total', width: 80, readOnly: true },
            
            { type: 'numeric', title: 'Total Prep + Clear', width: 130, readOnly: true },
            { type: 'numeric', title: 'per batch', width: 80, readOnly: true },
            { type: 'numeric', title: 'per shift', width: 80, readOnly: true }
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
              { title: 'Jeda antar batch', colspan: 2 }
            ],
            [
              { title: '', colspan: 8 }, 
              { title: 'Per cycle batch', colspan: 3 },
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
              { title: '', colspan: 1 },
              { title: '', colspan: 2 }
            ]
          ],
          freezeColumns: 2,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "500px"
        }],
        
        onchange: function(worksheet, cell, cStr, rStr, value) {
          if (isCalculating.current) return;
          let c = parseInt(cStr); let r = parseInt(rStr);
          let sheet = worksheet;

          const v = (col) => {
              let val = sheet.getValueFromCoords(col, r);
              return (val === "" || val === null || isNaN(val)) ? 0 : parseFloat(val);
          };
          const setV = (col, val) => sheet.setValueFromCoords(col, r, val, true); 

          isCalculating.current = true;

          if (c === 4 || c === 5) {
              if(sheet.getValueFromCoords(4, r) !== '' || sheet.getValueFromCoords(5, r) !== '') {
                  setV(6, v(4) + v(5));
              } else { setV(6, ''); }
          }
          if (c === 8 || c === 9) {
              let sub = v(9) - v(8); setV(10, sub > 0 ? sub : '');
          }
          if (c === 7 || c === 10) {
              let vol = sheet.getValueFromCoords(7, r);
              let cnt_sub = v(10);
              setV(12, cnt_sub > 0 ? (cnt_sub / (TEORI_BATCH[vol] || 23076)).toFixed(2) : '');
          }
          if (c >= 14 && c <= 19) setV(20, v(14)+v(15)+v(16)+v(17)+v(18)+v(19));
          if (c === 21 || c === 22) setV(23, v(21)+v(22));
          if (c === 10 || c === 20 || c === 23) {
              let sub = v(10);
              if (sub > 0) {
                  let trf = sub - v(20) - v(23);
                  setV(24, trf); setV(26, ((trf / sub) * 100).toFixed(2)); setV(28, trf); 
              } else { setV(24, ''); setV(26, ''); setV(28, ''); }
          }
          if (c >= 29 && c <= 33) setV(34, v(29)+v(30)+v(31)+v(32)+v(33));
          if (c === 28 || c === 34) {
              let preIn = v(28); setV(35, preIn > 0 ? preIn - v(34) : '');
          }

          const timeDiff = (sh, sm, eh, em) => {
              if (v(sh)===0 && v(sm)===0 && v(eh)===0 && v(em)===0 && sheet.getValueFromCoords(sh, r)==="") return '';
              let diff = (v(eh)*60 + v(em)) - (v(sh)*60 + v(sm));
              return diff < 0 ? diff + (24*60) : diff;
          };
          if (c >= 36 && c <= 39) setV(40, timeDiff(36, 37, 38, 39));
          if (c >= 42 && c <= 45) setV(46, timeDiff(42, 43, 44, 45));
          if (c >= 47 && c <= 50) {
              let lc = timeDiff(47, 48, 49, 50);
              setV(51, lc); setV(52, lc); setV(53, lc);
          }

          isCalculating.current = false;
        }
      });
    }

    if (dtTableRef.current) {
      dtTableRef.current.innerHTML = ''; 
      dtGrid.current = jspreadsheet(dtTableRef.current, {
        worksheets: [{
          data: initialEmptyDT,
          columns: [
            { type: 'calendar', title: 'Tanggal', width: 100, options: { format: 'YYYY-MM-DD' } },
            { type: 'dropdown', title: 'Shift', source: SHIFTS, width: 60 },
            { type: 'dropdown', title: 'Grup', source: GROUPS, width: 60 },
            { type: 'text', title: 'No. Batch', width: 120 },
            { type: 'numeric', title: 'Start (jam)', width: 80 },
            { type: 'numeric', title: 'Start (menit)', width: 90 },
            { type: 'numeric', title: 'End (jam)', width: 80 },
            { type: 'numeric', title: 'End (menit)', width: 90 },
            { type: 'numeric', title: 'Durasi (m)', width: 100, readOnly: true },
            { type: 'dropdown', title: 'Planned / Unplanned', source: ['Planned', 'Unplanned'], width: 150 },
            { type: 'text', title: 'Root Cause', width: 150 },
            { type: 'text', title: 'Proses', width: 120 },
            { type: 'text', title: 'Unit', width: 120 },
            { type: 'text', title: 'Kasus', width: 250 }
          ],
          freezeColumns: 1,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "350px"
        }],
        onchange: function(worksheet, cell, cStr, rStr, value) {
          let c = parseInt(cStr); let r = parseInt(rStr); let sheet = worksheet; 
          if(c >= 4 && c <= 7) {
              let sh = parseFloat(sheet.getValueFromCoords(4, r)) || 0;
              let sm = parseFloat(sheet.getValueFromCoords(5, r)) || 0;
              let eh = parseFloat(sheet.getValueFromCoords(6, r)) || 0;
              let em = parseFloat(sheet.getValueFromCoords(7, r)) || 0;
              if(sheet.getValueFromCoords(4, r) !== "" && sheet.getValueFromCoords(6, r) !== "") {
                  let diff = (eh*60 + em) - (sh*60 + sm);
                  sheet.setValueFromCoords(8, r, diff < 0 ? diff + (24*60) : diff, true);
              }
          }
        }
      });
    }

    // Panggil data setelah grid ter-inisialisasi
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
      
      oeeGrid.current = null; 
      dtGrid.current = null;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans">
      <Toaster position="bottom-right" />
      <div className="max-w-full mx-auto">
        
        {/* WADAH TABEL OEE */}
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-wider uppercase text-emerald-800">
            OEE Line 4 - Zone C
          </h1>
          <p className="text-sm text-slate-500 mt-1">Data ditarik secara penuh 100% dari Spreadsheet.</p>
        </div>
        
        <div className="bg-white border-2 border-slate-300 shadow-xl mb-12 rounded overflow-hidden p-1">
          <div ref={oeeTableRef} />
        </div>

        {/* WADAH TABEL DOWNTIME */}
        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-wider uppercase text-indigo-800">
            Downtime Line 4 - Zone C
          </h2>
        </div>

        <div className="bg-white border-2 border-slate-300 shadow-xl rounded overflow-hidden p-1 mb-10">
          <div ref={dtTableRef} />
        </div>

      </div>
    </div>
  );
}