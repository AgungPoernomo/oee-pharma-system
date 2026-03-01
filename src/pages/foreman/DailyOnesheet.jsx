import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchOnesheetData } from '../../services/api';
import { 
  Calendar, Package, Activity, Zap, Target, 
  Clock, Database, AlertTriangle, TrendingDown, Loader2,
  Sun, Moon, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { toPng } from 'html-to-image';

// --- FORMATTER HELPER ---
const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
const formatNum = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num || 0);

// --- COMPONENT: PROGRESS BAR ---
const ProgressBar = ({ label, value, colorClass, isDark }) => {
  const safeValue = isNaN(value) || value === Infinity ? 0 : Math.min(Math.max(value, 0), 100);
  const bgTrack = isDark ? "bg-slate-800" : "bg-slate-200";
  const textColor = isDark ? "text-slate-300" : "text-slate-700";
  
  let barColor = "bg-blue-500";
  if (colorClass === 'purple') barColor = "bg-purple-500";
  if (colorClass === 'emerald') barColor = "bg-emerald-500";
  if (colorClass === 'yellow') barColor = "bg-yellow-500";
  if (colorClass === 'red') barColor = "bg-red-500";

  return (
    <div className="w-full mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${textColor}`}>{label}</span>
        <span className={`text-[10px] font-black font-mono ${textColor}`}>{safeValue.toFixed(1)}%</span>
      </div>
      <div className={`h-2 w-full rounded-full overflow-hidden ${bgTrack}`}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${safeValue}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${barColor}`}
        />
      </div>
    </div>
  );
};

// --- HELPER COMPONENT: OEE CIRCLE + APQ BARS ---
const OEEDisplay = ({ oee, avail, perf, qual, colorClass, isDark }) => {
  const safePercentage = isNaN(oee) || oee === Infinity ? 0 : Math.min(Math.max(oee, 0), 100);
  const strokeDasharray = 440; 
  const strokeDashoffset = strokeDasharray - (strokeDasharray * safePercentage) / 100;
  const trackColor = isDark ? "text-slate-800" : "text-slate-200";

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 mb-4">
      {/* OEE CIRCLE */}
      <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
        <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${colorClass === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className={trackColor} />
          <motion.circle 
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" 
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className={colorClass === 'blue' ? 'text-blue-500' : 'text-purple-500'}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{safePercentage.toFixed(1)}%</span>
          <span className={`text-1xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>OEE Score</span>
        </div>
      </div>

      {/* APQ BARS */}
      <div className="flex-1 w-full flex flex-col justify-center">
        <ProgressBar label="Availability" value={avail} colorClass="yellow" isDark={isDark} />
        <ProgressBar label="Performance" value={perf} colorClass={colorClass} isDark={isDark} />
        <ProgressBar label="Quality" value={qual} colorClass="emerald" isDark={isDark} />
      </div>
    </div>
  );
};

// ==========================================
// ENGINE 1: HEADER CALCULATOR
// ==========================================
const calculateZoneMetrics = (volume) => {
  let speed = 11500;
  let teoriBatch = 23076;

  if (volume === '25 ML') { speed = 12000; teoriBatch = 29412; }
  else if (volume === '100 ML') { speed = 11500; teoriBatch = 56880; }
  else if (volume === '250 ML') { speed = 12000; teoriBatch = 21509; }
  else if (volume === '500 ML') { speed = 12000; teoriBatch = 23076; }
  else if (volume === '1000 ML') { speed = 6000; teoriBatch = 60194; }

  const targetRuntimeHours = teoriBatch / speed;
  const targetRuntimeMins = targetRuntimeHours * 60;
  return { speed, teoriBatch, targetRuntimeHours, targetRuntimeMins };
};

// ==========================================
// ENGINE 2: DATA PROCESSOR ZONE C
// ==========================================
const useZoneCProcessor = (rawReject, rawDowntime, date, volume, headerMetrics) => {
  return useMemo(() => {
    const groups = ['A', 'B', 'C', 'D'];
    const data = {};
    groups.forEach(g => data[g] = { pot: 0, ps: {}, dt: {}, out_counter: 0, out_reject_blow: 0, q_wash: 0, q_vk: 0, q_vl: 0, q_nocap: 0, q_seal: 0, q_bocor: 0, q_samp: 0, dt_p: 0, dt_np: 0 });

    const plannedSet = new Set();
    const unplannedSet = new Set();

    const filteredReject = rawReject.filter(r => String(r[7]).trim().toUpperCase() === String(volume).trim().toUpperCase());
    const filteredDowntime = rawDowntime;

    filteredReject.forEach(r => {
      const g = String(r[5]).trim().toUpperCase();
      if (!groups.includes(g)) return;
      data[g].pot += (parseFloat(r[41]) || 0) / 60; 
      data[g].out_counter += parseFloat(r[10]) || 0; 
      data[g].out_reject_blow += parseFloat(r[6]) || 0; 
      data[g].q_wash += parseFloat(r[14]) || 0; data[g].q_vk += parseFloat(r[15]) || 0; data[g].q_vl += parseFloat(r[16]) || 0;
      data[g].q_nocap += parseFloat(r[17]) || 0; data[g].q_seal += parseFloat(r[18]) || 0; data[g].q_bocor += parseFloat(r[19]) || 0;
      data[g].q_samp += parseFloat(r[23]) || 0;
    });

    filteredDowntime.forEach(r => {
      const g = String(r[4]).trim().toUpperCase();
      if (!groups.includes(g)) return;
      const durasi = parseFloat(r[10]) || 0;
      const type = String(r[11]).trim().toUpperCase();
      const category = String(r[12]).trim().toUpperCase();
      const kasus = String(r[15]).trim().toUpperCase();

      if (type === 'PLANNED') { plannedSet.add(kasus); data[g].ps[kasus] = (data[g].ps[kasus] || 0) + (durasi / 60); } 
      else if (type === 'UNPLANNED') { unplannedSet.add(kasus); data[g].dt[kasus] = (data[g].dt[kasus] || 0) + durasi; }
      if (category === 'PRODUCTION') data[g].dt_p += durasi; else data[g].dt_np += durasi;
    });

    const matrix = { A:{}, B:{}, C:{}, D:{}, TOTAL:{} };
    const dynamicLists = { planned: Array.from(plannedSet), unplanned: Array.from(unplannedSet) };
    const totals = { pot: 0, ps: {}, total_time: 0, dt: {}, dt_min: 0, dt_jam: 0, unplanned_dt_jam: 0, prod_run_time: 0, target_output: 0, out_counter: 0, out_reject_blow: 0, out_total: 0, ba_total: 0, q_rej: 0, q_samp: 0, q_good: 0, dt_p: 0, dt_np: 0, rej_wash: 0, rej_vk: 0, rej_vl: 0, rej_nocap: 0, rej_seal: 0, rej_bocor: 0 };

    groups.forEach(g => {
      const d = data[g];
      let ps_total = 0; dynamicLists.planned.forEach(k => { matrix[g][`ps_${k}`] = d.ps[k] || 0; ps_total += (d.ps[k] || 0); totals.ps[k] = (totals.ps[k] || 0) + (d.ps[k] || 0); });
      let dt_total_min = 0; dynamicLists.unplanned.forEach(k => { matrix[g][`dt_${k}`] = d.dt[k] || 0; dt_total_min += (d.dt[k] || 0); totals.dt[k] = (totals.dt[k] || 0) + (d.dt[k] || 0); });

      const total_time = d.pot - ps_total;
      const unplanned_dt_jam = dt_total_min / 60;
      const prod_run_time = total_time - unplanned_dt_jam;
      const target_output = prod_run_time * headerMetrics.speed;
      const out_total = d.out_counter + d.out_reject_blow;
      const ba_total = headerMetrics.teoriBatch > 0 ? (d.out_counter / headerMetrics.teoriBatch) : 0;
      const q_rej_total = d.q_wash + d.q_vk + d.q_vl + d.q_nocap + d.q_seal + d.q_bocor;
      const q_good = d.out_counter - q_rej_total;

      matrix[g].pot = d.pot; matrix[g].total_time = total_time; matrix[g].unplanned_dt = unplanned_dt_jam; matrix[g].prod_run_time = prod_run_time; matrix[g].avail_pct = total_time > 0 ? (prod_run_time / total_time) * 100 : 0;
      matrix[g].speed_blow = headerMetrics.speed; matrix[g].target_output = target_output; matrix[g].out_counter_fill = d.out_counter; matrix[g].out_speed_loss = d.out_reject_blow; matrix[g].out_total = out_total; matrix[g].ba_std = headerMetrics.teoriBatch; matrix[g].ba_total = ba_total; matrix[g].perf_pct = target_output > 0 ? (out_total / target_output) * 100 : 0;
      matrix[g].q_std_batch = headerMetrics.teoriBatch; matrix[g].q_out_counter = d.out_counter; matrix[g].q_out_rej = q_rej_total; matrix[g].q_out_samp = d.q_samp; matrix[g].q_good_count = q_good; matrix[g].qual_pct = d.out_counter > 0 ? (q_good / d.out_counter) * 100 : 0;
      matrix[g].dt_tot_min = dt_total_min; matrix[g].dt_tot_jam = unplanned_dt_jam; matrix[g].jd_p = d.dt_p; matrix[g].jd_np = d.dt_np;
      matrix[g].qc_samp = d.q_samp; matrix[g].qc_tot_dec = d.q_samp; matrix[g].qc_tot_pct = d.out_counter > 0 ? ((d.q_samp / d.out_counter) * 100).toFixed(2) : "0";
      matrix[g].rej_wash = d.q_wash; matrix[g].rej_volk = d.q_vk; matrix[g].rej_voll = d.q_vl; matrix[g].rej_nocap = d.q_nocap; matrix[g].rej_seal = d.q_seal; matrix[g].rej_bocor = d.q_bocor; matrix[g].rej_tot_dec = q_rej_total; matrix[g].rej_tot_pct = d.out_counter > 0 ? ((q_rej_total / d.out_counter) * 100).toFixed(2) : "0";

      totals.pot += d.pot; totals.total_time += total_time; totals.unplanned_dt_jam += unplanned_dt_jam; totals.prod_run_time += prod_run_time; totals.target_output += target_output; totals.out_counter += d.out_counter; totals.out_reject_blow += d.out_reject_blow; totals.out_total += out_total; totals.ba_total += ba_total; totals.q_rej += q_rej_total; totals.q_samp += d.q_samp; totals.q_good += q_good; totals.dt_min += dt_total_min; totals.dt_p += d.dt_p; totals.dt_np += d.dt_np; totals.rej_wash += d.q_wash; totals.rej_vk += d.q_vk; totals.rej_vl += d.q_vl; totals.rej_nocap += d.q_nocap; totals.rej_seal += d.q_seal; totals.rej_bocor += d.q_bocor;
    });

    matrix.TOTAL.pot = totals.pot; dynamicLists.planned.forEach(k => matrix.TOTAL[`ps_${k}`] = totals.ps[k]); matrix.TOTAL.total_time = totals.total_time; matrix.TOTAL.unplanned_dt = totals.unplanned_dt_jam; matrix.TOTAL.prod_run_time = totals.prod_run_time; matrix.TOTAL.avail_pct = totals.total_time > 0 ? (totals.prod_run_time / totals.total_time) * 100 : 0;
    matrix.TOTAL.speed_blow = "-"; matrix.TOTAL.target_output = totals.target_output; matrix.TOTAL.out_counter_fill = totals.out_counter; matrix.TOTAL.out_speed_loss = totals.out_reject_blow; matrix.TOTAL.out_total = totals.out_total; matrix.TOTAL.ba_std = "-"; matrix.TOTAL.ba_total = totals.ba_total; matrix.TOTAL.perf_pct = totals.target_output > 0 ? (totals.out_total / totals.target_output) * 100 : 0;
    matrix.TOTAL.q_std_batch = headerMetrics.teoriBatch * 3; matrix.TOTAL.q_out_counter = totals.out_counter; matrix.TOTAL.q_out_rej = totals.q_rej; matrix.TOTAL.q_out_samp = totals.q_samp; matrix.TOTAL.q_good_count = totals.q_good; matrix.TOTAL.qual_pct = totals.out_counter > 0 ? (totals.q_good / totals.out_counter) * 100 : 0;
    dynamicLists.unplanned.forEach(k => matrix.TOTAL[`dt_${k}`] = totals.dt[k]); matrix.TOTAL.dt_tot_min = totals.dt_min; matrix.TOTAL.dt_tot_jam = totals.dt_min / 60; matrix.TOTAL.jd_p = totals.dt_p; matrix.TOTAL.jd_np = totals.dt_np;
    matrix.TOTAL.qc_samp = totals.q_samp; matrix.TOTAL.qc_tot_dec = totals.q_samp; matrix.TOTAL.qc_tot_pct = "-";
    matrix.TOTAL.rej_wash = totals.rej_wash; matrix.TOTAL.rej_volk = totals.rej_vk; matrix.TOTAL.rej_voll = totals.rej_vl; matrix.TOTAL.rej_nocap = totals.rej_nocap; matrix.TOTAL.rej_seal = totals.rej_seal; matrix.TOTAL.rej_bocor = totals.rej_bocor; matrix.TOTAL.rej_tot_dec = totals.q_rej; matrix.TOTAL.rej_tot_pct = totals.out_counter > 0 ? ((totals.q_rej / totals.out_counter) * 100).toFixed(2) : "0";

    const structure = [
      { section: "AVAILABILITY", key: "avail_pct", unit: "%", items: [ { label: "Plant Operating Time (POT)", key: "pot", unit: "hour" }, { label: "List Planned Shutdown", isGroupHeader: true }, ...dynamicLists.planned.map(k => ({ label: `Planned - ${k}`, key: `ps_${k}`, unit: "hour", isSubItem: true })), { label: "Total Time", key: "total_time", unit: "hour" }, { label: "Unplanned Downtime", isGroupHeader: true }, { label: "Unplanned DT", key: "unplanned_dt", unit: "hour", isSubItem: true }, { label: "Production Run Time", key: "prod_run_time", unit: "hour" } ] },
      { section: "PERFORMANCE", key: "perf_pct", unit: "%", items: [ { label: "Speed Blow", key: "speed_blow", unit: "bph" }, { label: "Target Output", key: "target_output", unit: "bottles" }, { label: "Output", isGroupHeader: true }, { label: "Counter Filling", key: "out_counter_fill", unit: "bottles", isSubItem: true }, { label: "Speed loss \"reject blow\"", key: "out_speed_loss", unit: "bottles", isSubItem: true }, { label: "TOTAL", key: "out_total", unit: "bottles", isSubItem: true }, { label: "Batch Achievement", isGroupHeader: true }, { label: "Standart / batch (100%)", key: "ba_std", unit: "bottles", isSubItem: true }, { label: "TOTAL BATCH", key: "ba_total", unit: "batch", isSubItem: true } ] },
      { section: "QUALITY", key: "qual_pct", unit: "%", items: [ { label: "Standart / batch (100%)", key: "q_std_batch", unit: "bottles" }, { label: "Output", isGroupHeader: true }, { label: "Counter Filling", key: "q_out_counter", unit: "bottles", isSubItem: true }, { label: "Reject", key: "q_out_rej", unit: "bottles", isSubItem: true }, { label: "Sample", key: "q_out_samp", unit: "bottles", isSubItem: true }, { label: "Good Count", key: "q_good_count", unit: "bottles" } ] },
      { section: "DETAIL DOWNTIME", key: "dt_header", unit: "-", items: [ { label: "List Detail Downtime", isGroupHeader: true }, ...dynamicLists.unplanned.map(k => ({ label: `${k}`, key: `dt_${k}`, unit: "minutes", isSubItem: true })), { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (Dalam bentuk menit)", key: "dt_tot_min", unit: "minutes", isSubItem: true }, { label: "TOTAL (Dalam bentuk Jam)", key: "dt_tot_jam", unit: "Jam", isSubItem: true } ] },
      { section: "JENIS DOWNTIME", key: "jd_header", unit: "-", items: [ { label: "Production (P)", key: "jd_p", unit: "minutes" }, { label: "Non-Production (NP)", key: "jd_np", unit: "minutes" } ] },
      { section: "DETAIL QC SAMPLE", key: "qc_header", unit: "-", items: [ { label: "Samples", key: "qc_samp", unit: "-" }, { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (dalam bentuk decimal)", key: "qc_tot_dec", unit: "-", isSubItem: true }, { label: "TOTAL (Dalam bentuk persentase)", key: "qc_tot_pct", unit: "%", isSubItem: true } ] },
      { section: "DETAIL REJECT", key: "rej_header", unit: "-", items: [ { label: "List Detail Reject", isGroupHeader: true }, { label: "Washing", key: "rej_wash", unit: "-", isSubItem: true }, { label: "Vol Kurang", key: "rej_volk", unit: "-", isSubItem: true }, { label: "Vol Lebih", key: "rej_voll", unit: "-", isSubItem: true }, { label: "Tanpa Cap", key: "rej_nocap", unit: "-", isSubItem: true }, { label: "Sealing", key: "rej_seal", unit: "-", isSubItem: true }, { label: "Bocor", key: "rej_bocor", unit: "-", isSubItem: true }, { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (Dalam bentuk desimal)", key: "rej_tot_dec", unit: "-", isSubItem: true }, { label: "TOTAL (Dalam bentuk persentase)", key: "rej_tot_pct", unit: "%", isSubItem: true } ] }
    ];

    const oeeC = (matrix.TOTAL.avail_pct * matrix.TOTAL.perf_pct * matrix.TOTAL.qual_pct) / 10000;
    return { matrix, structure, oee: oeeC || 0, avail: matrix.TOTAL.avail_pct, perf: matrix.TOTAL.perf_pct, qual: matrix.TOTAL.qual_pct };
  }, [rawReject, rawDowntime, date, volume, headerMetrics]);
};

// ==========================================
// ENGINE 3: DATA PROCESSOR ZONE F 
// ==========================================
const useZoneFProcessor = (rawReject, rawDowntime, date, volume, headerMetrics) => {
  return useMemo(() => {
    const groups = ['A', 'B', 'C', 'D'];
    const data = {};
    
    groups.forEach(g => data[g] = { 
      pot: 0, ps: {}, dt: {}, out_counter: 0, q_samp_as: 0, q_samp_ret: 0, 
      dt_p: 0, dt_np: 0, rej_partikel: 0, rej_kosmetik: 0 
    });

    const plannedSet = new Set();
    const unplannedSet = new Set();
    const filteredReject = rawReject; 
    const filteredDowntime = rawDowntime;

    filteredReject.forEach(r => {
      const g = String(r[6]).trim().toUpperCase();
      if (!groups.includes(g)) return;
      
      data[g].pot += (parseFloat(r[87]) || 0) / 60; // CJ
      data[g].out_counter += parseFloat(r[7]) || 0; // H
      data[g].q_samp_as += parseFloat(r[14]) || 0; // O
      data[g].q_samp_ret += parseFloat(r[74]) || 0; // BW
      data[g].rej_partikel += (parseFloat(r[66]) || 0); // BO
      data[g].rej_kosmetik += (parseFloat(r[67]) || 0); // BP
    });

    filteredDowntime.forEach(r => {
      const g = String(r[4]).trim().toUpperCase();
      if (!groups.includes(g)) return;
      
      const durasi = parseFloat(r[11]) || 0; // L
      const type = String(r[12]).trim().toUpperCase(); // M
      const category = String(r[13]).trim().toUpperCase(); // N
      const kasus = String(r[16]).trim().toUpperCase(); // Q

      if (type === 'PLANNED') { 
        plannedSet.add(kasus); 
        data[g].ps[kasus] = (data[g].ps[kasus] || 0) + (durasi / 60); 
      } 
      else if (type === 'UNPLANNED') { 
        unplannedSet.add(kasus); 
        data[g].dt[kasus] = (data[g].dt[kasus] || 0) + durasi; 
      }
      
      if (category === 'PRODUCTION') data[g].dt_p += durasi;
      else data[g].dt_np += durasi;
    });

    const matrix = { A:{}, B:{}, C:{}, D:{}, TOTAL:{} };
    const dynamicLists = { planned: Array.from(plannedSet), unplanned: Array.from(unplannedSet) };
    const totals = { 
      pot: 0, ps: {}, total_time: 0, dt: {}, dt_min: 0, dt_jam: 0, 
      unplanned_dt_jam: 0, prod_run_time: 0, target_output: 0, out_counter: 0, 
      ba_total: 0, q_rej: 0, q_samp_as: 0, q_samp_ret: 0, q_good: 0, 
      dt_p: 0, dt_np: 0, rej_partikel: 0, rej_kosmetik: 0 
    };

    groups.forEach(g => {
      const d = data[g];
      let ps_total = 0;
      dynamicLists.planned.forEach(k => { matrix[g][`ps_${k}`] = d.ps[k] || 0; ps_total += (d.ps[k] || 0); totals.ps[k] = (totals.ps[k] || 0) + (d.ps[k] || 0); });
      let dt_total_min = 0;
      dynamicLists.unplanned.forEach(k => { matrix[g][`dt_${k}`] = d.dt[k] || 0; dt_total_min += (d.dt[k] || 0); totals.dt[k] = (totals.dt[k] || 0) + (d.dt[k] || 0); });

      const total_time = d.pot - ps_total;
      const unplanned_dt_jam = dt_total_min / 60;
      const prod_run_time = total_time - unplanned_dt_jam;
      const target_output = prod_run_time * headerMetrics.speed;
      
      const total_samp = d.q_samp_as + d.q_samp_ret;
      const total_rej = d.rej_partikel + d.rej_kosmetik;
      
      const q_good = d.out_counter - total_rej;
      const std_fg_95 = headerMetrics.teoriBatch * 0.95;
      const ba_total = std_fg_95 > 0 ? (q_good / std_fg_95) : 0;

      matrix[g].pot = d.pot; matrix[g].total_time = total_time; matrix[g].unplanned_dt = unplanned_dt_jam; matrix[g].prod_run_time = prod_run_time; matrix[g].avail_pct = total_time > 0 ? (prod_run_time / total_time) * 100 : 0;
      matrix[g].speed_blow = headerMetrics.speed; matrix[g].target_output = target_output; matrix[g].out_counter_vi = d.out_counter; matrix[g].ba_std_fg = std_fg_95; matrix[g].ba_total_fg = ba_total; matrix[g].perf_pct = target_output > 0 ? (d.out_counter / target_output) * 100 : 0;
      matrix[g].q_std_batch = std_fg_95; matrix[g].q_out_counter = d.out_counter; matrix[g].q_out_rej = total_rej; matrix[g].q_out_samp = total_samp; matrix[g].q_good_count_fg = q_good; matrix[g].qual_pct = d.out_counter > 0 ? (q_good / d.out_counter) * 100 : 0;
      matrix[g].dt_tot_min = dt_total_min; matrix[g].dt_tot_jam = unplanned_dt_jam; matrix[g].jd_p = d.dt_p; matrix[g].jd_np = d.dt_np;
      matrix[g].qc_samp_as = d.q_samp_as; matrix[g].qc_samp_ret = d.q_samp_ret; matrix[g].qc_tot_dec = total_samp; matrix[g].qc_tot_pct = d.out_counter > 0 ? ((total_samp / d.out_counter) * 100).toFixed(2) : "0";
      matrix[g].rej_partikel = d.rej_partikel; matrix[g].rej_kosmetik = d.rej_kosmetik; matrix[g].rej_tot_dec = total_rej; matrix[g].rej_tot_pct = d.out_counter > 0 ? ((total_rej / d.out_counter) * 100).toFixed(2) : "0";

      totals.pot += d.pot; totals.total_time += total_time; totals.unplanned_dt_jam += unplanned_dt_jam; totals.prod_run_time += prod_run_time; totals.target_output += target_output; totals.out_counter += d.out_counter; totals.ba_total += ba_total; totals.q_rej += total_rej; totals.q_samp_as += d.q_samp_as; totals.q_samp_ret += d.q_samp_ret; totals.q_good += q_good; totals.dt_min += dt_total_min; totals.dt_p += d.dt_p; totals.dt_np += d.dt_np; totals.rej_partikel += d.rej_partikel; totals.rej_kosmetik += d.rej_kosmetik;
    });

    const total_samp_all = totals.q_samp_as + totals.q_samp_ret;
    matrix.TOTAL.pot = totals.pot; dynamicLists.planned.forEach(k => matrix.TOTAL[`ps_${k}`] = totals.ps[k]); matrix.TOTAL.total_time = totals.total_time; matrix.TOTAL.unplanned_dt = totals.unplanned_dt_jam; matrix.TOTAL.prod_run_time = totals.prod_run_time; matrix.TOTAL.avail_pct = totals.total_time > 0 ? (totals.prod_run_time / totals.total_time) * 100 : 0;
    matrix.TOTAL.speed_blow = "-"; matrix.TOTAL.target_output = totals.target_output; matrix.TOTAL.out_counter_vi = totals.out_counter; matrix.TOTAL.ba_std_fg = "-"; matrix.TOTAL.ba_total_fg = totals.ba_total; matrix.TOTAL.perf_pct = totals.target_output > 0 ? (totals.out_counter / totals.target_output) * 100 : 0;
    
    const std_fg_95_base = headerMetrics.teoriBatch * 0.95;
    matrix.TOTAL.q_std_batch = std_fg_95_base * 3; 
    
    matrix.TOTAL.q_out_counter = totals.out_counter; matrix.TOTAL.q_out_rej = totals.q_rej; matrix.TOTAL.q_out_samp = total_samp_all; matrix.TOTAL.q_good_count_fg = totals.q_good; matrix.TOTAL.qual_pct = totals.out_counter > 0 ? (totals.q_good / totals.out_counter) * 100 : 0;
    dynamicLists.unplanned.forEach(k => matrix.TOTAL[`dt_${k}`] = totals.dt[k]); matrix.TOTAL.dt_tot_min = totals.dt_min; matrix.TOTAL.dt_tot_jam = totals.dt_min / 60; matrix.TOTAL.jd_p = totals.dt_p; matrix.TOTAL.jd_np = totals.dt_np;
    matrix.TOTAL.qc_samp_as = totals.q_samp_as; matrix.TOTAL.qc_samp_ret = totals.q_samp_ret; matrix.TOTAL.qc_tot_dec = total_samp_all; matrix.TOTAL.qc_tot_pct = totals.out_counter > 0 ? ((total_samp_all / totals.out_counter) * 100).toFixed(2) : "0";
    matrix.TOTAL.rej_partikel = totals.rej_partikel; matrix.TOTAL.rej_kosmetik = totals.rej_kosmetik; matrix.TOTAL.rej_tot_dec = totals.q_rej; matrix.TOTAL.rej_tot_pct = totals.out_counter > 0 ? ((totals.q_rej / totals.out_counter) * 100).toFixed(2) : "0";

    const structure = [
      { section: "AVAILABILITY", key: "avail_pct", unit: "%", items: [ { label: "Plant Operating Time (POT)", key: "pot", unit: "hour" }, { label: "List Planned Shutdown", isGroupHeader: true }, ...dynamicLists.planned.map(k => ({ label: `Planned - ${k}`, key: `ps_${k}`, unit: "hour", isSubItem: true })), { label: "Total Time", key: "total_time", unit: "hour" }, { label: "Unplanned Downtime", isGroupHeader: true }, { label: "Unplanned DT", key: "unplanned_dt", unit: "hour", isSubItem: true }, { label: "Production Run Time", key: "prod_run_time", unit: "hour" } ] },
      { section: "PERFORMANCE", key: "perf_pct", unit: "%", items: [ { label: "Speed Blow", key: "speed_blow", unit: "bph" }, { label: "Target Output", key: "target_output", unit: "bottles" }, { label: "Output", isGroupHeader: true }, { label: "Counter (input VI)", key: "out_counter_vi", unit: "bottles", isSubItem: true }, { label: "Batch Achievement", isGroupHeader: true }, { label: "Standart FG 95%", key: "ba_std_fg", unit: "bottles", isSubItem: true }, { label: "TOTAL BATCH \"FG\"", key: "ba_total_fg", unit: "batch", isSubItem: true } ] },
      { section: "QUALITY", key: "qual_pct", unit: "%", items: [ { label: "Standart / batch (95%)", key: "q_std_batch", unit: "bottles" }, { label: "Output", isGroupHeader: true }, { label: "Counter (input VI)", key: "q_out_counter", unit: "bottles", isSubItem: true }, { label: "Reject", key: "q_out_rej", unit: "bottles", isSubItem: true }, { label: "Sample", key: "q_out_samp", unit: "bottles", isSubItem: true }, { label: "Good Count \"FG\"", key: "q_good_count_fg", unit: "bottles" } ] },
      { section: "DETAIL DOWNTIME", key: "dt_header", unit: "-", items: [ { label: "List Detail Downtime", isGroupHeader: true }, ...dynamicLists.unplanned.map(k => ({ label: `Unplanned - ${k}`, key: `dt_${k}`, unit: "minutes", isSubItem: true })), { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (Dalam bentuk menit)", key: "dt_tot_min", unit: "minutes", isSubItem: true }, { label: "TOTAL (Dalam bentuk Jam)", key: "dt_tot_jam", unit: "Jam", isSubItem: true } ] },
      { section: "JENIS DOWNTIME", key: "jd_header", unit: "-", items: [ { label: "Production (P)", key: "jd_p", unit: "minutes" }, { label: "Non-Production (NP)", key: "jd_np", unit: "minutes" } ] },
      { section: "DETAIL QC SAMPLE", key: "qc_header", unit: "-", items: [ { label: "Samples", isGroupHeader: true }, { label: "AS", key: "qc_samp_as", unit: "-", isSubItem: true }, { label: "Retained", key: "qc_samp_ret", unit: "-", isSubItem: true }, { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (dalam bentuk decimal)", key: "qc_tot_dec", unit: "-", isSubItem: true }, { label: "TOTAL (Dalam bentuk persentase)", key: "qc_tot_pct", unit: "%", isSubItem: true } ] },
      { section: "DETAIL REJECT", key: "rej_header", unit: "-", items: [ { label: "List Detail Reject", isGroupHeader: true }, { label: "Partikel", key: "rej_partikel", unit: "-", isSubItem: true }, { label: "Kosmetik", key: "rej_kosmetik", unit: "-", isSubItem: true }, { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (Dalam bentuk desimal)", key: "rej_tot_dec", unit: "-", isSubItem: true }, { label: "TOTAL (Dalam bentuk persentase)", key: "rej_tot_pct", unit: "%", isSubItem: true } ] }
    ];

    const oeeF = (matrix.TOTAL.avail_pct * matrix.TOTAL.perf_pct * matrix.TOTAL.qual_pct) / 10000;
    return { matrix, structure, oee: oeeF || 0, avail: matrix.TOTAL.avail_pct, perf: matrix.TOTAL.perf_pct, qual: matrix.TOTAL.qual_pct };
  }, [rawReject, rawDowntime, date, volume, headerMetrics]);
};

// --- MAIN COMPONENT ---
const DailyOnesheet = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [product, setProduct] = useState("500 ML");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFetching, setIsFetching] = useState(false); 
  const [isPrinting, setIsPrinting] = useState(false); // STATE FIX UNTUK FORCE DESKTOP
  const printRef = useRef(); 
  
  const [rawRejectC, setRawRejectC] = useState([]);
  const [rawDowntimeC, setRawDowntimeC] = useState([]);
  const [rawRejectF, setRawRejectF] = useState([]);
  const [rawDowntimeF, setRawDowntimeF] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setIsFetching(true);
      try {
        const res = await fetchOnesheetData(date, user);
        if (res.status === 'success') {
          setRawRejectC(res.data.reject_c || []);
          setRawDowntimeC(res.data.downtime_c || []);
          setRawRejectF(res.data.reject_f || []);
          setRawDowntimeF(res.data.downtime_f || []);
        } else {
          toast.error("Gagal menarik data: " + res.message);
        }
      } catch (e) {
        toast.error("Koneksi terputus.");
      } finally {
        setIsFetching(false);
      }
    };
    if (user) loadData();
  }, [date, user]);

  const metrics = useMemo(() => calculateZoneMetrics(product), [product]);
  const { matrix: mockMatrixDataC, structure: zoneCMatrixStructure, oee: calculatedOEEC, avail: availC, perf: perfC, qual: qualC } = useZoneCProcessor(rawRejectC, rawDowntimeC, date, product, metrics);
  const { matrix: mockMatrixDataF, structure: zoneFMatrixStructure, oee: calculatedOEEF, avail: availF, perf: perfF, qual: qualF } = useZoneFProcessor(rawRejectF, rawDowntimeF, date, product, metrics);

  const dtJamC = parseFloat(mockMatrixDataC['TOTAL']?.['dt_tot_jam']) || 0;
  const lossUnitDtC = metrics.speed * dtJamC;
  const totalFinLossC = (lossUnitDtC * 6500) + ((parseFloat(mockMatrixDataC['TOTAL']?.['rej_tot_dec']) || 0) * 6500);

  const dtJamF = parseFloat(mockMatrixDataF['TOTAL']?.['dt_tot_jam']) || 0;
  const lossUnitDtF = metrics.speed * dtJamF;
  const totalFinLossF = (lossUnitDtF * 6500) + ((parseFloat(mockMatrixDataF['TOTAL']?.['rej_tot_dec']) || 0) * 6500);

  // --- THEME CLASSES ---
  const bgClass = isDarkMode ? 'bg-[#0B1120]' : 'bg-white';
  const textClass = isDarkMode ? 'text-slate-200' : 'text-black';
  const cardClass = isDarkMode ? 'bg-[#1e293b]/60 border-blue-500/20' : 'bg-white border-slate-300 shadow-none border-2';
  const cardClassPurple = isDarkMode ? 'bg-[#1e293b]/60 border-purple-500/20' : 'bg-white border-slate-300 shadow-none border-2';
  const tableHeaderClass = isDarkMode ? 'bg-slate-800' : 'bg-slate-100 border-b-2 border-slate-400';
  const tableRowClass = isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50';
  const tableRowClassPurple = isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-purple-50/50';
  const tableBorderClass = isDarkMode ? 'border-slate-700/50' : 'border-slate-300';
  const subTextClass = isDarkMode ? 'text-slate-500' : 'text-slate-600 font-bold';

  // --- DOWNLOAD JPG ENGINE (FULL HD DESKTOP VIEW) ---
  const handleDownloadJPG = () => {
    const element = printRef.current;
    if (!element) return;

    // 1. Simpan mode awal
    const prevMode = isDarkMode;
    if (isDarkMode) setIsDarkMode(false);
    
    // 2. Aktifkan State isPrinting (Trik Sakti memaksa Tailwind Desktop)
    setIsPrinting(true);

    const toastId = toast.loading("Mempersiapkan File");

    // 3. Beri jeda 1 detik agar React DOM mengubah struktur CSS (Mobile ke Desktop Grid)
    setTimeout(async () => {
      try {
        toast.loading("Mengunduh File", { id: toastId });
        
        // Eksekusi foto setelah Grid siap
        const dataUrl = await toPng(element, {
          quality: 1.0,
          pixelRatio: 2, // 2x Resolusi
          backgroundColor: '#ffffff',
          skipAutoScale: true
        });

        // Download file
        const link = document.createElement('a');
        link.download = `OEE_ONESHEET_${date}_${product}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Berhasil Diunduh", { id: toastId });
      } catch (err) {
        console.error("Print Error:", err);
        toast.error("Gagal! Coba gunakan Chrome/Edge.", { id: toastId });
      } finally {
        // 4. Kembalikan State ke semula
        setIsDarkMode(prevMode);
        setIsPrinting(false);
      }
    }, 1000); 
  };

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} font-sans p-4 md:p-6 pb-32 overflow-hidden relative transition-colors duration-300`}>
      <Toaster position="top-center" toastOptions={{style: {background: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#000', fontWeight: 'bold'}}} />
      
      {isDarkMode && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none"></div>
        </>
      )}

      {/* --- NAVIGATION BAR --- */}
      <div className="max-w-[1600px] mx-auto mb-6 relative z-10 print-no-margin">
        <div className={`${isDarkMode ? 'bg-[#1e293b]/60 backdrop-blur-xl border-white/10' : 'bg-slate-100 border-slate-300 border'} rounded-full py-3 px-6 shadow-lg flex justify-between items-center transition-colors duration-300`}>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Zap size={16} className="text-white"/>
             </div>
             <span className={`font-black tracking-widest uppercase text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Foreman Dashboard</span>
             
             <AnimatePresence>
               {isFetching && (
                 <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} exit={{opacity:0}} className="flex items-center gap-2 ml-4">
                    <Loader2 size={14} className="text-blue-500 animate-spin"/>
                    <span className="text-xs font-bold text-blue-500 animate-pulse uppercase tracking-widest">Mengambil Data</span>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleDownloadJPG} className={`p-2 rounded-full border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-white border-slate-300 text-blue-600'} hover:scale-105 transition-all shadow`} title="Download Onesheet">
              <Download size={18} />
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-slate-300 text-slate-800'} hover:scale-105 transition-all shadow`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* --- AREA PRINT / DOWNLOAD --- */}
      {/* Penggunaan isPrinting untuk memanipulasi container utama menjadi width 1600px absolut saat di print */}
      <div ref={printRef} className={`mx-auto relative z-10 ${!isDarkMode || isPrinting ? 'bg-white' : ''} ${isPrinting ? 'w-[1600px] min-w-[1600px] p-8' : 'max-w-[1600px]'}`}>
        
        {/* HEADER IDENTITAS */}
        <div className="flex flex-col items-center justify-center mb-8 border-b border-dashed border-slate-500/30 pb-6">
           <h1 className={`text-4xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} tracking-widest mb-4`}>DAILY ONESHEET</h1>
           <div className="flex flex-wrap justify-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode && !isPrinting ? 'bg-slate-800/80 border border-slate-700' : 'bg-slate-100 border border-slate-300'}`}>
                <Target size={16} className={isDarkMode && !isPrinting ? 'text-blue-400' : 'text-blue-600'}/>
                <span className={`text-sm font-bold uppercase tracking-widest ${isDarkMode && !isPrinting ? 'text-white' : 'text-slate-800'}`}>{user?.line || 2}</span>
              </div>
              
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode && !isPrinting ? 'bg-slate-800/80 border border-slate-700' : 'bg-slate-100 border border-slate-300'}`}>
                <Calendar size={16} className={isDarkMode && !isPrinting ? 'text-blue-400' : 'text-blue-600'}/>
                {isPrinting ? (
                  <span className={`font-mono text-sm font-bold leading-none ${isDarkMode && !isPrinting ? 'text-white' : 'text-slate-800'}`}>{date}</span>
                ) : (
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`bg-transparent font-mono text-sm font-bold outline-none cursor-pointer ${isDarkMode && !isPrinting ? 'text-white' : 'text-slate-800'}`}/>
                )}
              </div>

              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode && !isPrinting ? 'bg-slate-800/80 border border-slate-700' : 'bg-slate-100 border border-slate-300'}`}>
                <Package size={16} className={isDarkMode && !isPrinting ? 'text-blue-400' : 'text-blue-600'}/>
                {isPrinting ? (
                  <span className={`text-sm font-bold leading-none ${isDarkMode && !isPrinting ? 'text-white' : 'text-slate-800'}`}>{product}</span>
                ) : (
                  <select value={product} onChange={(e) => setProduct(e.target.value)} className={`bg-transparent font-bold text-sm outline-none cursor-pointer appearance-none ${isDarkMode && !isPrinting ? 'text-white' : 'text-slate-800'}`}>
                    <option value="25 ML" className={isDarkMode && !isPrinting ? "bg-slate-800 text-white" : "bg-white text-black"}>25 ML</option>
                    <option value="100 ML" className={isDarkMode && !isPrinting ? "bg-slate-800 text-white" : "bg-white text-black"}>100 ML</option>
                    <option value="250 ML" className={isDarkMode && !isPrinting ? "bg-slate-800 text-white" : "bg-white text-black"}>250 ML</option>
                    <option value="500 ML" className={isDarkMode && !isPrinting ? "bg-slate-800 text-white" : "bg-white text-black"}>500 ML</option>
                    <option value="1000 ML" className={isDarkMode && !isPrinting ? "bg-slate-800 text-white" : "bg-white text-black"}>1000 ML</option>
                  </select>
                )}
              </div>
           </div>
        </div>

        {/* DUAL GRID: Penggunaan isPrinting untuk memaksa grid 2 kolom */}
        <div className={`grid gap-8 ${isPrinting ? 'grid-cols-2' : 'grid-cols-1 xl:grid-cols-2'}`}>
          
          {/* =========================================
              ZONE C
          ========================================= */}
          <div className={`${cardClass} rounded-3xl overflow-hidden flex flex-col h-full`}>
            <div className={`bg-gradient-to-r ${isDarkMode && !isPrinting ? 'from-blue-900/50' : 'from-blue-100'} to-transparent p-4 border-b ${isDarkMode && !isPrinting ? 'border-blue-500/20' : 'border-slate-300'} flex items-center justify-between`}>
              <h2 className={`text-xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} flex items-center gap-2`}><div className="w-3 h-3 rounded-full bg-blue-500"></div> OEE ZONE C</h2>
            </div>
            
            <div className="p-4 md:p-6 flex flex-col gap-6">
              
              <OEEDisplay oee={calculatedOEEC} avail={availC} perf={perfC} qual={qualC} colorClass="blue" isDark={isDarkMode && !isPrinting} />

              {/* Penggunaan isPrinting untuk memaksa grid 3 kolom */}
              <div className={`grid gap-4 print-no-margin ${isPrinting ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
                <div className={`${isDarkMode && !isPrinting ? 'bg-slate-800/50 border-blue-500/20' : 'bg-slate-50 border-slate-300 border-2'} rounded-xl p-4 flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                  <span className={`text-[10px] font-bold ${subTextClass} uppercase tracking-widest mb-1`}>Speed</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} font-mono`}>{metrics.speed.toLocaleString('id-ID')}</span>
                    <span className="text-sm font-bold text-blue-500">bph</span>
                  </div>
                </div>
                <div className={`${isDarkMode && !isPrinting ? 'bg-slate-800/50 border-blue-500/20' : 'bg-slate-50 border-slate-300 border-2'} rounded-xl p-4 flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                  <span className={`text-[10px] font-bold ${subTextClass} uppercase tracking-widest mb-1`}>Teori Batch</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} font-mono`}>{metrics.teoriBatch.toLocaleString('id-ID')}</span>
                    <span className="text-sm font-bold text-blue-500">btl/batch</span>
                  </div>
                </div>
                <div className={`${isDarkMode && !isPrinting ? 'bg-slate-800/50 border-blue-500/20' : 'bg-slate-50 border-slate-300 border-2'} rounded-xl p-4 flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                  <span className={`text-[10px] font-bold ${subTextClass} uppercase tracking-widest mb-1`}>Runtime</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} font-mono`}>{metrics.targetRuntimeHours.toFixed(2)}</span>
                    <span className="text-sm font-bold text-emerald-600">Jam</span>
                  </div>
                </div>
              </div>

              <div className={`border ${isDarkMode && !isPrinting ? 'border-white/10 bg-[#0f172a]' : 'border-slate-400 bg-white border-2'} rounded-xl overflow-hidden`}>
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className={`py-3 px-3 align-middle border-b border-r ${tableBorderClass} text-[11px] font-black ${isDarkMode && !isPrinting ? 'text-blue-500' : 'text-black'} uppercase tracking-widest w-[34%]`}>Parameter</th>
                      {['A', 'B', 'C', 'D'].map((group) => (
                        <th key={group} className={`py-3 px-1 align-middle border-b border-r ${tableBorderClass} text-center text-[11px] font-black ${isDarkMode && !isPrinting ? 'text-slate-300' : 'text-black'} uppercase w-[8.5%]`}>{group}</th>
                      ))}
                      <th className={`py-3 px-1 align-middle border-b border-r ${tableBorderClass} text-center text-[11px] font-black ${isDarkMode && !isPrinting ? 'text-yellow-400 bg-yellow-900/10' : 'text-black bg-slate-200'} uppercase w-[12%]`}>TOTAL</th>
                      <th className={`py-3 px-2 align-middle border-b ${tableBorderClass} text-center text-[11px] font-black ${isDarkMode && !isPrinting ? 'text-emerald-400 bg-emerald-900/10' : 'text-black bg-slate-100'} uppercase w-[20%]`}>Satuan</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px]">
                    {zoneCMatrixStructure.map((section, sIdx) => {
                      const isMergedSection = ["DETAIL DOWNTIME", "JENIS DOWNTIME", "DETAIL QC SAMPLE", "DETAIL REJECT"].includes(section.section);
                      return (
                        <React.Fragment key={`c-sec-${sIdx}`}>
                          {isMergedSection ? (
                            <tr className={`${isDarkMode && !isPrinting ? 'bg-slate-800' : 'bg-slate-200'} border-b ${tableBorderClass}`}>
                              <td colSpan={7} className={`py-2 px-3 align-middle font-bold ${isDarkMode && !isPrinting ? 'text-slate-300' : 'text-black'} text-[12px] tracking-widest uppercase`}>{section.section}</td>
                            </tr>
                          ) : (
                            <tr className={`${isDarkMode && !isPrinting ? 'bg-blue-900/30' : 'bg-blue-50'} border-b ${tableBorderClass}`}>
                              <td className={`py-2 px-3 align-middle font-bold ${isDarkMode && !isPrinting ? 'text-blue-500' : 'text-blue-800'} text-[12px] tracking-widest uppercase border-r ${tableBorderClass}`}>{section.section}</td>
                              {['A', 'B', 'C', 'D'].map((group) => (
                                <td key={`c-main-${group}`} className={`py-2 px-1 align-middle border-r ${tableBorderClass} text-center font-bold ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} text-[12px]`}>{formatNum(mockMatrixDataC[group]?.[section.key]) || "-"}</td>
                              ))}
                              <td className={`py-2 px-1 align-middle border-r ${tableBorderClass} text-center font-black ${isDarkMode && !isPrinting ? 'text-yellow-400 bg-yellow-900/10' : 'text-black bg-slate-200'} text-[12px]`}>{formatNum(mockMatrixDataC['TOTAL']?.[section.key]) || "-"}</td>
                              <td className={`py-2 px-2 align-middle text-center font-bold ${isDarkMode && !isPrinting ? 'text-emerald-400 bg-emerald-900/10' : 'text-black bg-slate-100'} text-[11px]`}>{section.unit}</td>
                            </tr>
                          )}
                          {section.items.map((item, iIdx) => {
                            if (item.isGroupHeader) return (
                              <tr key={`c-hdr-${iIdx}`} className={`${isDarkMode && !isPrinting ? 'bg-slate-800/30' : 'bg-slate-100'}`}>
                                <td colSpan={7} className={`py-1.5 px-3 align-middle border-b ${tableBorderClass} ${isDarkMode && !isPrinting ? 'text-blue-400' : 'text-black'} text-[11px] font-bold italic pl-6`}>{item.label}</td>
                              </tr>
                            );
                            return (
                              <tr key={`c-item-${iIdx}`} className={`${tableRowClass} transition-colors`}>
                                <td className={`py-2 px-3 align-middle border-b border-r ${tableBorderClass} ${isDarkMode && !isPrinting ? 'text-slate-300' : 'text-black font-medium'} text-[11px] leading-tight truncate ${item.isSubItem ? 'pl-8' : 'pl-4'}`}>{item.label}</td>
                                {['A', 'B', 'C', 'D'].map((group) => (
                                  <td key={`c-${item.key}-${group}`} className={`py-2 px-1 align-middle border-b border-r ${tableBorderClass} text-center font-mono text-[11px] ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} overflow-hidden`}>{mockMatrixDataC[group]?.[item.key] !== undefined && mockMatrixDataC[group]?.[item.key] !== "-" ? formatNum(mockMatrixDataC[group][item.key]) : "-"}</td>
                                ))}
                                <td className={`py-2 px-1 align-middle border-b border-r ${tableBorderClass} text-center font-mono text-[11px] font-bold ${isDarkMode && !isPrinting ? 'text-yellow-400 bg-yellow-900/5' : 'text-black bg-slate-200'} overflow-hidden`}>{mockMatrixDataC['TOTAL']?.[item.key] !== undefined && mockMatrixDataC['TOTAL']?.[item.key] !== "-" ? formatNum(mockMatrixDataC['TOTAL'][item.key]) : "-"}</td>
                                <td className={`py-2 px-2 align-middle border-b ${tableBorderClass} text-center font-mono text-[10px] ${isDarkMode && !isPrinting ? 'text-emerald-400/80 bg-emerald-900/5' : 'text-black bg-slate-100'} overflow-hidden truncate`}>{item.unit}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Penggunaan isPrinting untuk memaksa grid 2 kolom */}
              <div className={`mt-4 ${isDarkMode && !isPrinting ? 'bg-red-900/10 border-red-500/30' : 'bg-red-50 border-red-500 border-2'} rounded-2xl overflow-hidden print-no-margin`}>
                <div className={`bg-gradient-to-r ${isDarkMode && !isPrinting ? 'from-red-600/20' : 'from-red-200'} to-transparent px-5 py-3 border-b ${isDarkMode && !isPrinting ? 'border-red-500/20' : 'border-red-300'} flex items-center gap-3`}>
                  <h3 className={`text-sm font-black ${isDarkMode && !isPrinting ? 'text-red-500' : 'text-red-700'} uppercase tracking-widest`}>Potential Loss - Kelas C</h3>
                </div>
                <div className={`p-5 grid gap-5 ${isPrinting ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className={`${isDarkMode && !isPrinting ? 'bg-[#0f172a]/80 border-red-500/10' : 'bg-white border-red-300 border-2'} rounded-xl p-4 shadow-inner relative overflow-hidden`}>
                    <span className={`text-[11px] ${isDarkMode && !isPrinting ? 'text-red-400' : 'text-red-700'} uppercase tracking-wider font-bold mb-3 block border-b border-red-200/20 pb-1`}>Downtime</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end"><span className={`text-[12px] ${subTextClass}`}>Jumlah Unit</span><span className={`text-sm font-mono font-bold ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'}`}>{formatNum(lossUnitDtC)}</span></div>
                      <div className="flex justify-between items-end"><span className={`text-[12px] ${subTextClass}`}>Finansial</span><span className={`text-base font-mono font-black ${isDarkMode && !isPrinting ? 'text-red-500' : 'text-red-700'}`}>{formatRp(lossUnitDtC * 6500)}</span></div>
                    </div>
                  </div>
                  <div className={`${isDarkMode && !isPrinting ? 'bg-[#0f172a]/80 border-red-500/10' : 'bg-white border-red-300 border-2'} rounded-xl p-4 shadow-inner relative overflow-hidden`}>
                    <span className={`text-[11px] ${isDarkMode && !isPrinting ? 'text-red-400' : 'text-red-700'} uppercase tracking-wider font-bold mb-3 block border-b border-red-200/20 pb-1`}>Rejection</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end"><span className={`text-[12px] ${subTextClass}`}>Jumlah Unit</span><span className={`text-sm font-mono font-bold ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'}`}>{formatNum(parseFloat(mockMatrixDataC['TOTAL']?.['rej_tot_dec']) || 0)}</span></div>
                      <div className="flex justify-between items-end"><span className={`text-[12px] ${subTextClass}`}>Finansial</span><span className={`text-base font-mono font-black ${isDarkMode && !isPrinting ? 'text-red-500' : 'text-red-700'}`}>{formatRp((parseFloat(mockMatrixDataC['TOTAL']?.['rej_tot_dec']) || 0) * 6500)}</span></div>
                    </div>
                  </div>
                </div>
                <div className={`${isDarkMode && !isPrinting ? 'bg-red-950/40 border-red-500/30' : 'bg-red-100 border-red-300 border-t-2'} px-6 py-4 flex justify-between items-center`}>
                   <span className={`text-[13px] font-black ${isDarkMode && !isPrinting ? 'text-red-400' : 'text-red-800'} uppercase tracking-widest`}>Total Potential Loss (C)</span>
                   <span className={`text-2xl font-black font-mono ${isDarkMode && !isPrinting ? 'text-red-500' : 'text-red-800'}`}>{formatRp(totalFinLossC)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================
              ZONE F
          ========================================= */}
          <div className={`${cardClassPurple} rounded-3xl overflow-hidden flex flex-col h-full`}>
            <div className={`bg-gradient-to-r ${isDarkMode && !isPrinting ? 'from-purple-900/50' : 'from-purple-100'} to-transparent p-4 border-b ${isDarkMode && !isPrinting ? 'border-purple-500/20' : 'border-slate-300'} flex items-center justify-between`}>
              <h2 className={`text-xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} flex items-center gap-2`}><div className="w-3 h-3 rounded-full bg-purple-500"></div> OEE ZONE F</h2>
            </div>
            
            <div className="p-4 md:p-6 flex flex-col gap-6 h-full">
              
              <OEEDisplay oee={calculatedOEEF} avail={availF} perf={perfF} qual={qualF} colorClass="purple" isDark={isDarkMode && !isPrinting} />

              <div className={`grid gap-4 print-no-margin ${isPrinting ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
                <div className={`${isDarkMode && !isPrinting ? 'bg-slate-800/50 border-purple-500/20' : 'bg-slate-50 border-slate-300 border-2'} rounded-xl p-4 flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                  <span className={`text-[10px] font-bold ${subTextClass} uppercase tracking-widest mb-1`}>Speed</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} font-mono`}>{metrics.speed.toLocaleString('id-ID')}</span>
                    <span className="text-sm font-bold text-purple-500">bph</span>
                  </div>
                </div>
                <div className={`${isDarkMode && !isPrinting ? 'bg-slate-800/50 border-purple-500/20' : 'bg-slate-50 border-slate-300 border-2'} rounded-xl p-4 flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                  <span className={`text-[10px] font-bold ${subTextClass} uppercase tracking-widest mb-1`}>Teori Batch</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} font-mono`}>{metrics.teoriBatch.toLocaleString('id-ID')}</span>
                    <span className="text-sm font-bold text-purple-500">btl/batch</span>
                  </div>
                </div>
                <div className={`${isDarkMode && !isPrinting ? 'bg-slate-800/50 border-purple-500/20' : 'bg-slate-50 border-slate-300 border-2'} rounded-xl p-4 flex flex-col justify-center items-center text-center relative overflow-hidden`}>
                  <span className={`text-[10px] font-bold ${subTextClass} uppercase tracking-widest mb-1`}>Runtime</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} font-mono`}>{metrics.targetRuntimeHours.toFixed(2)}</span>
                    <span className="text-sm font-bold text-emerald-600">Jam</span>
                  </div>
                </div>
              </div>

              <div className={`border ${isDarkMode && !isPrinting ? 'border-white/10 bg-[#0f172a]' : 'border-slate-400 bg-white border-2'} rounded-xl overflow-hidden`}>
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className={tableHeaderClass}>
                      <th className={`py-3 px-3 align-middle border-b border-r ${tableBorderClass} text-[11px] font-black ${isDarkMode && !isPrinting ? 'text-purple-500' : 'text-black'} uppercase tracking-widest w-[34%]`}>Parameter</th>
                      {['A', 'B', 'C', 'D'].map((group) => (
                        <th key={group} className={`py-3 px-1 align-middle border-b border-r ${tableBorderClass} text-center text-[11px] font-black ${isDarkMode && !isPrinting ? 'text-slate-300' : 'text-black'} uppercase w-[8.5%]`}>{group}</th>
                      ))}
                      <th className={`py-3 px-1 align-middle border-b border-r ${tableBorderClass} text-center text-[11px] font-black ${isDarkMode && !isPrinting ? 'text-yellow-400 bg-yellow-900/10' : 'text-black bg-slate-200'} uppercase w-[12%]`}>TOTAL</th>
                      <th className={`py-3 px-2 align-middle border-b ${tableBorderClass} text-center text-[11px] font-black ${isDarkMode && !isPrinting ? 'text-emerald-400 bg-emerald-900/10' : 'text-black bg-slate-100'} uppercase w-[20%]`}>Satuan</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px]">
                    {zoneFMatrixStructure.map((section, sIdx) => {
                      const isMergedSection = ["DETAIL DOWNTIME", "JENIS DOWNTIME", "DETAIL QC SAMPLE", "DETAIL REJECT"].includes(section.section);
                      return (
                        <React.Fragment key={`f-sec-${sIdx}`}>
                          {isMergedSection ? (
                            <tr className={`${isDarkMode && !isPrinting ? 'bg-slate-800' : 'bg-slate-200'} border-b ${tableBorderClass}`}>
                              <td colSpan={7} className={`py-2 px-3 align-middle font-bold ${isDarkMode && !isPrinting ? 'text-slate-300' : 'text-black'} text-[12px] tracking-widest uppercase`}>{section.section}</td>
                            </tr>
                          ) : (
                            <tr className={`${isDarkMode && !isPrinting ? 'bg-purple-900/30' : 'bg-purple-50'} border-b ${tableBorderClass}`}>
                              <td className={`py-2 px-3 align-middle font-bold ${isDarkMode && !isPrinting ? 'text-purple-500' : 'text-purple-800'} text-[12px] tracking-widest uppercase border-r ${tableBorderClass}`}>{section.section}</td>
                              {['A', 'B', 'C', 'D'].map((group) => (
                                <td key={`f-main-${group}`} className={`py-2 px-1 align-middle border-r ${tableBorderClass} text-center font-bold ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} text-[12px]`}>{formatNum(mockMatrixDataF[group]?.[section.key]) || "-"}</td>
                              ))}
                              <td className={`py-2 px-1 align-middle border-r ${tableBorderClass} text-center font-black ${isDarkMode && !isPrinting ? 'text-yellow-400 bg-yellow-900/10' : 'text-black bg-slate-200'} text-[12px]`}>{formatNum(mockMatrixDataF['TOTAL']?.[section.key]) || "-"}</td>
                              <td className={`py-2 px-2 align-middle text-center font-bold ${isDarkMode && !isPrinting ? 'text-emerald-400 bg-emerald-900/10' : 'text-black bg-slate-100'} text-[11px]`}>{section.unit}</td>
                            </tr>
                          )}
                          {section.items.map((item, iIdx) => {
                            if (item.isGroupHeader) return (
                              <tr key={`f-hdr-${iIdx}`} className={`${isDarkMode && !isPrinting ? 'bg-slate-800/30' : 'bg-slate-100'}`}>
                                <td colSpan={7} className={`py-1.5 px-3 align-middle border-b ${tableBorderClass} ${isDarkMode && !isPrinting ? 'text-purple-400' : 'text-black'} text-[11px] font-bold italic pl-6`}>{item.label}</td>
                              </tr>
                            );
                            return (
                              <tr key={`f-item-${iIdx}`} className={`${tableRowClassPurple} transition-colors`}>
                                <td className={`py-2 px-3 align-middle border-b border-r ${tableBorderClass} ${isDarkMode && !isPrinting ? 'text-slate-300' : 'text-black font-medium'} text-[11px] leading-tight truncate ${item.isSubItem ? 'pl-8' : 'pl-4'}`}>{item.label}</td>
                                {['A', 'B', 'C', 'D'].map((group) => (
                                  <td key={`f-${item.key}-${group}`} className={`py-2 px-1 align-middle border-b border-r ${tableBorderClass} text-center font-mono text-[11px] ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'} overflow-hidden`}>{mockMatrixDataF[group]?.[item.key] !== undefined && mockMatrixDataF[group]?.[item.key] !== "-" ? formatNum(mockMatrixDataF[group][item.key]) : "-"}</td>
                                ))}
                                <td className={`py-2 px-1 align-middle border-b border-r ${tableBorderClass} text-center font-mono text-[11px] font-bold ${isDarkMode && !isPrinting ? 'text-yellow-400 bg-yellow-900/5' : 'text-black bg-slate-200'} overflow-hidden`}>{mockMatrixDataF['TOTAL']?.[item.key] !== undefined && mockMatrixDataF['TOTAL']?.[item.key] !== "-" ? formatNum(mockMatrixDataF['TOTAL'][item.key]) : "-"}</td>
                                <td className={`py-2 px-2 align-middle border-b ${tableBorderClass} text-center font-mono text-[10px] ${isDarkMode && !isPrinting ? 'text-emerald-400/80 bg-emerald-900/5' : 'text-black bg-slate-100'} overflow-hidden truncate`}>{item.unit}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={`mt-4 ${isDarkMode && !isPrinting ? 'bg-red-900/10 border-red-500/30' : 'bg-red-50 border-red-500 border-2'} rounded-2xl overflow-hidden print-no-margin`}>
                <div className={`bg-gradient-to-r ${isDarkMode && !isPrinting ? 'from-red-600/20' : 'from-red-200'} to-transparent px-5 py-3 border-b ${isDarkMode && !isPrinting ? 'border-red-500/20' : 'border-red-300'} flex items-center gap-3`}>
                  <h3 className={`text-sm font-black ${isDarkMode && !isPrinting ? 'text-red-500' : 'text-red-700'} uppercase tracking-widest`}>Potential Loss - Kelas F</h3>
                </div>
                <div className={`p-5 grid gap-5 ${isPrinting ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className={`${isDarkMode && !isPrinting ? 'bg-[#0f172a]/80 border-red-500/10' : 'bg-white border-red-300 border-2'} rounded-xl p-4 shadow-inner relative overflow-hidden`}>
                    <span className={`text-[11px] ${isDarkMode && !isPrinting ? 'text-red-400' : 'text-red-700'} uppercase tracking-wider font-bold mb-3 block border-b border-red-200/20 pb-1`}>Downtime</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end"><span className={`text-[12px] ${subTextClass}`}>Jumlah Unit</span><span className={`text-sm font-mono font-bold ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'}`}>{formatNum(lossUnitDtF)}</span></div>
                      <div className="flex justify-between items-end"><span className={`text-[12px] ${subTextClass}`}>Finansial</span><span className={`text-base font-mono font-black ${isDarkMode && !isPrinting ? 'text-red-500' : 'text-red-700'}`}>{formatRp(lossUnitDtF * 6500)}</span></div>
                    </div>
                  </div>
                  <div className={`${isDarkMode && !isPrinting ? 'bg-[#0f172a]/80 border-red-500/10' : 'bg-white border-red-300 border-2'} rounded-xl p-4 shadow-inner relative overflow-hidden`}>
                    <span className={`text-[11px] ${isDarkMode && !isPrinting ? 'text-red-400' : 'text-red-700'} uppercase tracking-wider font-bold mb-3 block border-b border-red-200/20 pb-1`}>Rejection</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end"><span className={`text-[12px] ${subTextClass}`}>Jumlah Unit</span><span className={`text-sm font-mono font-bold ${isDarkMode && !isPrinting ? 'text-white' : 'text-black'}`}>{formatNum(parseFloat(mockMatrixDataF['TOTAL']?.['rej_tot_dec']) || 0)}</span></div>
                      <div className="flex justify-between items-end"><span className={`text-[12px] ${subTextClass}`}>Finansial</span><span className={`text-base font-mono font-black ${isDarkMode && !isPrinting ? 'text-red-500' : 'text-red-700'}`}>{formatRp((parseFloat(mockMatrixDataF['TOTAL']?.['rej_tot_dec']) || 0) * 6500)}</span></div>
                    </div>
                  </div>
                </div>
                <div className={`${isDarkMode && !isPrinting ? 'bg-red-950/40 border-red-500/30' : 'bg-red-100 border-red-300 border-t-2'} px-6 py-4 flex justify-between items-center`}>
                   <span className={`text-[13px] font-black ${isDarkMode && !isPrinting ? 'text-red-400' : 'text-red-800'} uppercase tracking-widest`}>Total Potential Loss (F)</span>
                   <span className={`text-2xl font-black font-mono ${isDarkMode && !isPrinting ? 'text-red-500' : 'text-red-800'}`}>{formatRp(totalFinLossF)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DailyOnesheet;