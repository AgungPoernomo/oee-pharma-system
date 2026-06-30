import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchTodayRejectF, fetchTodayDowntimeF, fetchValidationData } from '../../../services/api';
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

const getEmptyOEE_F = () => {
  const arr = Array(55).fill('');
  arr[5] = ''; 
  arr[30] = '';     
  return arr;
};

const getEmptyDT = () => {
  const arr = Array(14).fill('');
  arr[9] = ''; // Default
  return arr;
};

export default function InputF() {
  const { user } = useAuth();
  
  const oeeTableRef = useRef(null);
  const dtTableRef = useRef(null);
  const oeeGrid = useRef(null);
  const dtGrid = useRef(null);
  
  const isCalculating = useRef(false);

  const loadDataServer = async () => {
    if (!user) return;
    try {
      const toastId = toast.loading("Menarik data Zone F dari server...");
      const [resOEE, resDT] = await Promise.all([
        fetchTodayRejectF(user),
        fetchTodayDowntimeF(user)
      ]);

      let mappedOEE = [];
      if (resOEE.status === 'success' && resOEE.data) {
        const reversedOEE = [...resOEE.data].reverse(); // Data terbaru di atas
        mappedOEE = reversedOEE.map((row) => {
          let yieldBatch = row[35] ? (parseFloat(row[35]) * 100).toFixed(2) : '';
          return [
            row[2] || '', row[3] || '', parseToYMD(row[4]), row[5] || '', row[6] || '', row[7] || '', 
            row[8] || '', row[9] || '', row[10] || '', row[11] || '', row[12] || '', row[13] || '', row[14] || '', row[15] || '', row[16] || '',
            row[17] || '', row[18] || '', row[19] || '', row[20] || '',
            row[21] || '', row[22] || '', row[23] || '', row[24] || '', row[25] || '', row[26] || '',
            row[27] || '', row[28] || '', row[29] || '', row[30] || '', row[31] || '', row[32] || 'Y', row[33] || '', row[34] || '',
            yieldBatch, row[36] || '',
            row[37] || '', row[38] || '', row[39] || '', row[40] || '', row[41] || '', row[42] || '',
            row[48] || '', row[49] || '', row[50] || '', row[51] || '', row[52] || '',
            row[58] || '', row[59] || '', row[60] || '', row[61] || '', row[62] || '', 
            row[63] || '', row[64] || '', row[65] || '', row[66] || ''
          ];
        });
      }

      let mappedDT = [];
      if (resDT.status === 'success' && resDT.data) {
        const reversedDT = [...resDT.data].reverse();
        mappedDT = reversedDT.map((row) => {
          return [
            parseToYMD(row[2]), row[3] || '', row[4] || '', row[5] || '',
            row[7] || '', row[8] || '', row[9] || '', row[10] || '', row[11] || '',
            row[12] || 'Unplanned', row[13] || '', row[14] || '', row[15] || '', row[16] || ''
          ];
        });
      }

      const finalOEEData = [...mappedOEE, ...Array.from({ length: 50 }, () => getEmptyOEE_F())];
      const finalDTData = [...mappedDT, ...Array.from({ length: 50 }, () => getEmptyDT())];

      if (oeeGrid.current && oeeGrid.current[0]) {
        oeeGrid.current[0].setData(finalOEEData);
      }
      if (dtGrid.current && dtGrid.current[0]) {
        dtGrid.current[0].setData(finalDTData);
      }

      toast.success("100% Data Zone F ditarik!", { id: toastId });
    } catch (error) { 
      toast.error("Gagal menarik data.");
      console.error(error); 
    }
  };

  useEffect(() => {
    const initialEmptyOEE = Array.from({ length: 20 }, () => getEmptyOEE_F());
    const initialEmptyDT = Array.from({ length: 20 }, () => getEmptyDT());

    if (oeeTableRef.current) {
      oeeTableRef.current.innerHTML = ''; 
      oeeGrid.current = jspreadsheet(oeeTableRef.current, {
        worksheets: [{
          data: initialEmptyOEE,
          columns: [
            // 0 - 5: Identitas Dasar
            { type: 'text', title: 'No. Batch', width: 90 },
            { type: 'text', title: 'Lot No', width: 90 },
            { type: 'calendar', title: 'Tanggal', width: 100, options: { format: 'YYYY-MM-DD' } },
            { type: 'dropdown', title: 'Shift', source: SHIFTS, width: 60 },
            { type: 'dropdown', title: 'Grup', source: GROUPS, width: 60 },
            { type: 'dropdown', title: 'Volume', source: VOLUMES, width: 90 },
            
            // 6 - 14: Output After Steril
            { type: 'numeric', title: 'Input (Botol chamber)', width: 100 },
            { type: 'numeric', title: 'Reject Bocor', width: 90 },
            { type: 'numeric', title: 'Reject Patah ring', width: 90 },
            { type: 'numeric', title: 'Reject Patah Lidah', width: 90 },
            { type: 'numeric', title: 'Reject Patah Lelehan', width: 90 },
            { type: 'numeric', title: 'Reject Tanpa Hanger', width: 90 },
            { type: 'numeric', title: 'TOTAL', width: 80, readOnly: true },
            { type: 'numeric', title: 'Sampel QC', width: 80 },
            { type: 'numeric', title: 'Output (TF to VI)', width: 120, readOnly: true },
            
            // 15 - 24: Output Visual Inspeksi
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
            
            // 25 - 32: Output Packaging
            { type: 'numeric', title: 'Reject', width: 80 },
            { type: 'numeric', title: 'Hasil Baik', width: 90, readOnly: true },
            { type: 'numeric', title: 'QC', width: 70 },
            { type: 'numeric', title: 'Others', width: 70 },
            { type: 'numeric', title: 'Finished Goods', width: 110, readOnly: true },
            { type: 'dropdown', title: 'Utuh ?', source: ['Y', 'N'], width: 70 },
            { type: 'numeric', title: 'Jumlah Batch', width: 100, readOnly: true },
            { type: 'numeric', title: 'Total per shift', width: 110, readOnly: true },
            
            // 33 - 34: Yield
            { type: 'percent', title: 'per Batch', width: 90, readOnly: true },
            { type: 'percent', title: 'AVERAGE per shift', width: 120, readOnly: true },
            
            // 35 - 40: Available Time
            { type: 'numeric', title: 'Start (Jam)', width: 80 },
            { type: 'numeric', title: 'Start (Menit)', width: 90 },
            { type: 'numeric', title: 'End (Jam)', width: 80 },
            { type: 'numeric', title: 'End (Menit)', width: 90 },
            { type: 'numeric', title: 'Sub Total', width: 90, readOnly: true },
            { type: 'numeric', title: 'TOTAL', width: 80, readOnly: true },
            
            // 41 - 51: Process Details (Run & Clearance)
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
            
            // 52 - 54: Prep & Jeda
            { type: 'numeric', title: 'Total Preparation + Clearance Time', width: 180, readOnly: true },
            { type: 'numeric', title: 'per batch', width: 80, readOnly: true },
            { type: 'numeric', title: 'per shift', width: 80, readOnly: true }
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
              { title: 'Total Preparation + Clearance Time', colspan: 1 },
              { title: 'jeda antar batch', colspan: 2 }
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
          freezeColumns: 3,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "700px",
          minDimensions: [55, 20]
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

          // 1. Steril Reject Total (Col 12) = Col 7 to 11
          if (c >= 7 && c <= 11) setV(12, v(7)+v(8)+v(9)+v(10)+v(11));
          
          // 2. Steril Out (Col 14) = Col 6 - Col 12 - Col 13
          if (c === 6 || (c >= 7 && c <= 11) || c === 13) {
            let sIn = v(6);
            if (sIn > 0) setV(14, sIn - v(12) - v(13));
            else setV(14, '');
          }

          // 3. VI Sub (Col 17) = Col 16 - Col 15
          if (c === 15 || c === 16) {
            let sub = v(16) - v(15); setV(17, sub > 0 ? sub : '');
          }

          // 4. VI Reject Total (Col 21) = Col 19 + Col 20
          if (c === 19 || c === 20) setV(21, v(19)+v(20));

          // 5. VI Hasil Baik (Col 22) = Col 17 - Col 21
          // 6. VI Transfer Packing (Col 24) = Col 22 - Col 23
          if (c === 15 || c === 16 || c === 19 || c === 20 || c === 23) {
            let vSub = v(17);
            if (vSub > 0) {
              let vBaik = vSub - v(21);
              setV(22, vBaik);
              setV(24, vBaik - v(23));
            } else { setV(22, ''); setV(24, ''); }
          }

          // 7. Pack Hasil Baik (Col 26) = Col 24 - Col 25
          // 8. Pack FG (Col 29) = Col 26 - Col 27 - Col 28
          if (c === 15 || c === 16 || c === 19 || c === 20 || c === 23 || c === 25 || c === 27 || c === 28) {
            let pTrf = v(24);
            if (pTrf > 0) {
              let pHasil = pTrf - v(25);
              setV(26, pHasil);
              setV(29, pHasil - v(27) - v(28));
            } else { setV(26, ''); setV(29, ''); }
          }

          // 9. Kalkulasi Jumlah Batch (Col 31) & Yield (Col 33)
          if (c === 5 || (c >= 15 && c <= 28)) { // Jika volume atau nilai FG berubah
            let volKey = sheet.getValueFromCoords(5, r) || "500 ML";
            let pFg = v(29);
            if (pFg > 0) {
              setV(31, (pFg / (TEORI_BATCH[volKey] || 23076)).toFixed(2));
              setV(33, ((pFg / TEORI_YIELD) * 100).toFixed(2));
            } else { setV(31, ''); setV(33, ''); }
          }

          // 10. Kalkulasi Waktu (Durasi Menit)
          const timeDiff = (sh, sm, eh, em) => {
              if (v(sh)===0 && v(sm)===0 && v(eh)===0 && v(em)===0 && sheet.getValueFromCoords(sh, r)==="") return '';
              let diff = (v(eh)*60 + v(em)) - (v(sh)*60 + v(sm));
              return diff < 0 ? diff + (24*60) : diff;
          };

          if (c >= 35 && c <= 38) setV(39, timeDiff(35, 36, 37, 38));
          if (c >= 41 && c <= 44) setV(45, timeDiff(41, 42, 43, 44));
          if (c >= 46 && c <= 49) {
              let lc = timeDiff(46, 47, 48, 49);
              setV(50, lc); setV(52, lc); setV(53, lc);
          }
          if ((c >= 41 && c <= 44) || (c >= 46 && c <= 49)) {
            let rSub = v(45); let lSub = v(50);
            if (rSub > 0 || lSub > 0) setV(51, rSub + lSub);
            else setV(51, '');
          }

          isCalculating.current = false;
        }
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
            { type: 'numeric', title: 'Start (jam)', width: 80 },
            { type: 'numeric', title: 'Start (menit)', width: 90 },
            { type: 'numeric', title: 'End (jam)', width: 80 },
            { type: 'numeric', title: 'End (menit)', width: 90 },
            { type: 'numeric', title: 'Durasi (m)', width: 100, readOnly: true },
            { type: 'dropdown', title: 'Planned / Unplanned', source: ['Planned', 'Unplanned'], width: 150 },
            { type: 'dropdown', title: 'Root Cause', source: ['Production', 'Mechanical', 'Electrical', 'Utility', 'QA', 'QC', 'Warehouse', 'PPIC', 'R&D'], width: 150 },
            { type: 'dropdown', title: 'Proses', source: ['All Team Packaging', 'Cartoning', 'Conveyor', 'Visual Inspeksi', 'Labelling', 'Robot', 'Unpacker'], width: 120 },
            { 
              type: 'dropdown', 
              title: 'Unit', 
              width: 120,
              source: ALL_UNITS, 
              filter: function(instance, cell, c, r, source) {
                let sheet = dtGrid.current[0];
                let prosesValue = sheet.getValueFromCoords(11, r);
                return UNIT_MAP[prosesValue] || [];
              }
            },
            { type: 'text', title: 'Kasus', width: 500 }
          ],
          freezeColumns: 1,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "700px",
          minDimensions: [14, 20]
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
          if (c === 11) {
              sheet.setValueFromCoords(12, r, '', true);
          }
        }
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
  }, [user]);

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