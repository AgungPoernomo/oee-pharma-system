import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchOnesheetData } from '../../../services/api';
import { Calendar, Package, Search, Download, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { toPng } from 'html-to-image';

const VOLUMES = ["25 ML"];

const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
const formatNum = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num || 0);

const highlightLabels = [
  "Plant Operating Time (POT)",
  "Unplanned DT",
  "Speed Blow",
  "Standart / batch (100%)",
  "Standart / batch (95%)",
  "TOTAL BATCH",
  "TOTAL BATCH \"FG\"",
  "TOTAL (Dalam bentuk Jam)"
];
const isHighlightRow = (label) => highlightLabels.includes(label);

const calculateZoneMetrics = (volume) => {
  let speed = 15000;
  let teoriBatch = 29412;

  if (volume === '25 ML') { speed = 15000; teoriBatch = 29412; }

  const targetRuntimeHours = teoriBatch / speed;
  const targetRuntimeMins = targetRuntimeHours * 60;
  return { speed, teoriBatch, targetRuntimeHours, targetRuntimeMins };
};

const useZoneCProcessor = (rawReject, rawDowntime, date, volume, headerMetrics) => {
  return useMemo(() => {
    const groups = ['A', 'B', 'C', 'D'];
    const data = {};
    groups.forEach(g => data[g] = { pot: 0, ps: {}, dt: {}, out_counter: 0, out_reject_blow: 0, rej_botol_isi: 0, rej_setting: 0, rej_vl: 0, bocor_seal: 0, bocor_cutting: 0, rej_lelehan: 0, q_samp_ipc: 0, q_samp_others: 0, dt_p: 0, dt_np: 0 });

    const plannedSet = new Set();
    const unplannedSet = new Set();

    const filteredReject = rawReject.filter(r => String(r.vol_botol || r.volume_botol || '').trim().toUpperCase() === String(volume).trim().toUpperCase());
    const filteredDowntime = rawDowntime;

    filteredReject.forEach(r => {
      const g = String(r.group).trim().toUpperCase();
      if (!groups.includes(g)) return;
      data[g].pot += (parseFloat(r.at_sub || r.av_sub) || 0) / 60; 
      data[g].out_counter += parseFloat(r.cnt_sub) || 0; 
      data[g].out_reject_blow += parseFloat(r.sub_fill_seal || r.reject_blow) || 0; 
      data[g].rej_botol_isi += parseFloat(r.rej_botol_isi) || 0; 
      data[g].rej_setting += parseFloat(r.rej_setting) || 0; 
      data[g].rej_vl += parseFloat(r.rej_vl) || 0;
      data[g].bocor_seal += parseFloat(r.bocor_seal) || 0; 
      data[g].bocor_cutting += parseFloat(r.bocor_cutting) || 0; 
      data[g].rej_lelehan += parseFloat(r.rej_lelehan) || 0;
      data[g].q_samp_ipc += parseFloat(r.samp_ipc) || 0;
      data[g].q_samp_others += parseFloat(r.samp_others) || 0;
    });

    filteredDowntime.forEach(r => {
      const g = String(r.group).trim().toUpperCase();
      if (!groups.includes(g)) return;
      const durasi = parseFloat(r.duration) || 0;
      const type = String(r.plan_unplan).trim().toUpperCase();
      const category = String(r.proses).trim().toUpperCase();
      const kasus = String(r.kasus).trim().toUpperCase();

      if (type === 'PLANNED') { plannedSet.add(kasus); data[g].ps[kasus] = (data[g].ps[kasus] || 0) + (durasi / 60); } 
      else if (type === 'UNPLANNED') { unplannedSet.add(kasus); data[g].dt[kasus] = (data[g].dt[kasus] || 0) + durasi; }
      if (category === 'PRODUCTION') data[g].dt_p += durasi; else data[g].dt_np += durasi;
    });

    const matrix = { A:{}, B:{}, C:{}, D:{}, TOTAL:{} };
    const dynamicLists = { planned: Array.from(plannedSet), unplanned: Array.from(unplannedSet) };
    const totals = { pot: 0, ps: {}, total_time: 0, dt: {}, dt_min: 0, dt_jam: 0, unplanned_dt_jam: 0, prod_run_time: 0, target_output: 0, out_counter: 0, out_reject_blow: 0, out_total: 0, ba_total: 0, q_rej: 0, q_samp_ipc: 0, q_samp_others: 0, q_samp_tot: 0, q_good: 0, dt_p: 0, dt_np: 0, rej_botol_isi: 0, rej_setting: 0, rej_vl: 0, bocor_seal: 0, bocor_cutting: 0, rej_lelehan: 0 };

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
      const q_rej_total = d.rej_botol_isi + d.rej_setting + d.rej_vl + d.bocor_seal + d.bocor_cutting + d.rej_lelehan;
      const q_samp_tot = d.q_samp_ipc + d.q_samp_others;
      const q_good = d.out_counter - q_rej_total;

      matrix[g].pot = d.pot; matrix[g].total_time = total_time; matrix[g].unplanned_dt = unplanned_dt_jam; matrix[g].prod_run_time = prod_run_time; matrix[g].avail_pct = total_time > 0 ? (prod_run_time / total_time) * 100 : 0;
      matrix[g].speed_blow = headerMetrics.speed; matrix[g].target_output = target_output; matrix[g].out_counter_fill = d.out_counter; matrix[g].out_speed_loss = d.out_reject_blow; matrix[g].out_total = out_total; matrix[g].ba_std = headerMetrics.teoriBatch; matrix[g].ba_total = ba_total; matrix[g].perf_pct = target_output > 0 ? (out_total / target_output) * 100 : 0;
      matrix[g].q_std_batch = headerMetrics.teoriBatch; matrix[g].q_out_counter = d.out_counter; matrix[g].q_out_rej = q_rej_total; matrix[g].q_out_samp = q_samp_tot; matrix[g].q_good_count = q_good; matrix[g].qual_pct = d.out_counter > 0 ? (q_good / d.out_counter) * 100 : 0;
      matrix[g].dt_tot_min = dt_total_min; matrix[g].dt_tot_jam = unplanned_dt_jam; matrix[g].jd_p = d.dt_p; matrix[g].jd_np = d.dt_np;
      matrix[g].qc_samp_ipc = d.q_samp_ipc; matrix[g].qc_samp_others = d.q_samp_others; matrix[g].qc_samp = q_samp_tot; matrix[g].qc_tot_dec = q_samp_tot; matrix[g].qc_tot_pct = d.out_counter > 0 ? ((q_samp_tot / d.out_counter) * 100).toFixed(2) : "0";
      matrix[g].rej_botol_isi = d.rej_botol_isi; matrix[g].rej_setting = d.rej_setting; matrix[g].rej_vl = d.rej_vl; matrix[g].bocor_seal = d.bocor_seal; matrix[g].bocor_cutting = d.bocor_cutting; matrix[g].rej_lelehan = d.rej_lelehan; matrix[g].rej_tot_dec = q_rej_total; matrix[g].rej_tot_pct = d.out_counter > 0 ? ((q_rej_total / d.out_counter) * 100).toFixed(2) : "0";

      totals.pot += d.pot; totals.total_time += total_time; totals.unplanned_dt_jam += unplanned_dt_jam; totals.prod_run_time += prod_run_time; totals.target_output += target_output; totals.out_counter += d.out_counter; totals.out_reject_blow += d.out_reject_blow; totals.out_total += out_total; totals.ba_total += ba_total; totals.q_rej += q_rej_total; totals.q_samp_ipc += d.q_samp_ipc; totals.q_samp_others += d.q_samp_others; totals.q_samp_tot += q_samp_tot; totals.q_good += q_good; totals.dt_min += dt_total_min; totals.dt_p += d.dt_p; totals.dt_np += d.dt_np; totals.rej_botol_isi += d.rej_botol_isi; totals.rej_setting += d.rej_setting; totals.rej_vl += d.rej_vl; totals.bocor_seal += d.bocor_seal; totals.bocor_cutting += d.bocor_cutting; totals.rej_lelehan += d.rej_lelehan;
    });

    matrix.TOTAL.pot = totals.pot; dynamicLists.planned.forEach(k => matrix.TOTAL[`ps_${k}`] = totals.ps[k]); matrix.TOTAL.total_time = totals.total_time; matrix.TOTAL.unplanned_dt = totals.unplanned_dt_jam; matrix.TOTAL.prod_run_time = totals.prod_run_time; matrix.TOTAL.avail_pct = totals.total_time > 0 ? (totals.prod_run_time / totals.total_time) * 100 : 0;
    matrix.TOTAL.speed_blow = "-"; matrix.TOTAL.target_output = totals.target_output; matrix.TOTAL.out_counter_fill = totals.out_counter; matrix.TOTAL.out_speed_loss = totals.out_reject_blow; matrix.TOTAL.out_total = totals.out_total; matrix.TOTAL.ba_std = "-"; matrix.TOTAL.ba_total = totals.ba_total; matrix.TOTAL.perf_pct = totals.target_output > 0 ? (totals.out_total / totals.target_output) * 100 : 0;
    matrix.TOTAL.q_std_batch = headerMetrics.teoriBatch * 3; matrix.TOTAL.q_out_counter = totals.out_counter; matrix.TOTAL.q_out_rej = totals.q_rej; matrix.TOTAL.q_out_samp = totals.q_samp_tot; matrix.TOTAL.q_good_count = totals.q_good; matrix.TOTAL.qual_pct = totals.out_counter > 0 ? (totals.q_good / totals.out_counter) * 100 : 0;
    dynamicLists.unplanned.forEach(k => matrix.TOTAL[`dt_${k}`] = totals.dt[k]); matrix.TOTAL.dt_tot_min = totals.dt_min; matrix.TOTAL.dt_tot_jam = totals.dt_min / 60; matrix.TOTAL.jd_p = totals.dt_p; matrix.TOTAL.jd_np = totals.dt_np;
    matrix.TOTAL.qc_samp_ipc = totals.q_samp_ipc; matrix.TOTAL.qc_samp_others = totals.q_samp_others; matrix.TOTAL.qc_samp = totals.q_samp_tot; matrix.TOTAL.qc_tot_dec = totals.q_samp_tot; matrix.TOTAL.qc_tot_pct = "-";
    matrix.TOTAL.rej_botol_isi = totals.rej_botol_isi; matrix.TOTAL.rej_setting = totals.rej_setting; matrix.TOTAL.rej_vl = totals.rej_vl; matrix.TOTAL.bocor_seal = totals.bocor_seal; matrix.TOTAL.bocor_cutting = totals.bocor_cutting; matrix.TOTAL.rej_lelehan = totals.rej_lelehan; matrix.TOTAL.rej_tot_dec = totals.q_rej; matrix.TOTAL.rej_tot_pct = totals.out_counter > 0 ? ((totals.q_rej / totals.out_counter) * 100).toFixed(2) : "0";

    const structure = [
      { section: "AVAILABILITY", key: "avail_pct", unit: "%", items: [ { label: "Plant Operating Time (POT)", key: "pot", unit: "hour" }, { label: "List Planned Shutdown", isGroupHeader: true }, ...dynamicLists.planned.map(k => ({ label: `Planned - ${k}`, key: `ps_${k}`, unit: "hour", isSubItem: true })), { label: "Total Time", key: "total_time", unit: "hour" }, { label: "Unplanned Downtime", isGroupHeader: true }, { label: "Unplanned DT", key: "unplanned_dt", unit: "hour", isSubItem: true }, { label: "Production Run Time", key: "prod_run_time", unit: "hour" } ] },
      { section: "PERFORMANCE", key: "perf_pct", unit: "%", items: [ { label: "Speed Blow", key: "speed_blow", unit: "bph" }, { label: "Target Output", key: "target_output", unit: "bottles" }, { label: "Output", isGroupHeader: true }, { label: "Counter Filling", key: "out_counter_fill", unit: "bottles", isSubItem: true }, { label: "Speed loss \"reject blow\"", key: "out_speed_loss", unit: "bottles", isSubItem: true }, { label: "TOTAL", key: "out_total", unit: "bottles", isSubItem: true }, { label: "Batch Achievement", isGroupHeader: true }, { label: "Standart / batch (100%)", key: "ba_std", unit: "bottles", isSubItem: true }, { label: "TOTAL BATCH", key: "ba_total", unit: "batch", isSubItem: true } ] },
      { section: "QUALITY", key: "qual_pct", unit: "%", items: [ { label: "Standart / batch (100%)", key: "q_std_batch", unit: "bottles" }, { label: "Output", isGroupHeader: true }, { label: "Counter Filling", key: "q_out_counter", unit: "bottles", isSubItem: true }, { label: "Reject", key: "q_out_rej", unit: "bottles", isSubItem: true }, { label: "Sample", key: "q_out_samp", unit: "bottles", isSubItem: true }, { label: "Good Count", key: "q_good_count", unit: "bottles" } ] },
      { section: "DETAIL DOWNTIME", key: "dt_header", unit: "-", items: [ { label: "List Detail Downtime", isGroupHeader: true }, ...dynamicLists.unplanned.map(k => ({ label: `${k}`, key: `dt_${k}`, unit: "minutes", isSubItem: true })), { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (Dalam bentuk menit)", key: "dt_tot_min", unit: "minutes", isSubItem: true }, { label: "TOTAL (Dalam bentuk Jam)", key: "dt_tot_jam", unit: "Jam", isSubItem: true } ] },
      { section: "JENIS DOWNTIME", key: "jd_header", unit: "-", items: [ { label: "Production (P)", key: "jd_p", unit: "minutes" }, { label: "Non-Production (NP)", key: "jd_np", unit: "minutes" } ] },
      { section: "DETAIL QC SAMPLE", key: "qc_header", unit: "-", items: [ { label: "Samples", isGroupHeader: true }, { label: "IPC", key: "qc_samp_ipc", unit: "-", isSubItem: true }, { label: "Others", key: "qc_samp_others", unit: "-", isSubItem: true }, { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (dalam bentuk decimal)", key: "qc_tot_dec", unit: "-", isSubItem: true }, { label: "TOTAL (Dalam bentuk persentase)", key: "qc_tot_pct", unit: "%", isSubItem: true } ] },
      { section: "DETAIL REJECT", key: "rej_header", unit: "-", items: [ { label: "List Detail Reject", isGroupHeader: true }, { label: "Botol Isi", key: "rej_botol_isi", unit: "-", isSubItem: true }, { label: "Setting", key: "rej_setting", unit: "-", isSubItem: true }, { label: "Volume Lebih", key: "rej_vl", unit: "-", isSubItem: true }, { label: "Bocor Seal", key: "bocor_seal", unit: "-", isSubItem: true }, { label: "Bocor Cutting", key: "bocor_cutting", unit: "-", isSubItem: true }, { label: "Lelehan", key: "rej_lelehan", unit: "-", isSubItem: true }, { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (Dalam bentuk desimal)", key: "rej_tot_dec", unit: "-", isSubItem: true }, { label: "TOTAL (Dalam bentuk persentase)", key: "rej_tot_pct", unit: "%", isSubItem: true } ] }
    ];

    const oeeC = (matrix.TOTAL.avail_pct * matrix.TOTAL.perf_pct * matrix.TOTAL.qual_pct) / 10000;
    return { matrix, structure, oee: oeeC || 0, avail: matrix.TOTAL.avail_pct, perf: matrix.TOTAL.perf_pct, qual: matrix.TOTAL.qual_pct };
  }, [rawReject, rawDowntime, date, volume, headerMetrics]);
};

const useZoneFProcessor = (rawReject, rawDowntime, date, volume, headerMetrics) => {
  return useMemo(() => {
    const groups = ['A', 'B', 'C', 'D'];
    const data = {};
    
    groups.forEach(g => data[g] = { 
      pot: 0, ps: {}, dt: {}, out_counter: 0, q_samp_as: 0, q_samp_ret: 0, 
      dt_p: 0, dt_np: 0, rej_partikel: 0, rej_kosmetik: 0, rej_bocor: 0, rej_lain: 0 
    });

    const plannedSet = new Set();
    const unplannedSet = new Set();
    
    const filteredReject = rawReject.filter(r => String(r.vol_botol || r.volume_botol || '').trim().toUpperCase() === String(volume).trim().toUpperCase()); 
    const filteredDowntime = rawDowntime;

    filteredReject.forEach(r => {
      const g = String(r.group).trim().toUpperCase();
      if (!groups.includes(g)) return;
      
      data[g].pot += (parseFloat(r.at_sub || r.av_sub) || 0) / 60; 
      data[g].out_counter += parseFloat(r.cnt_sub || r.vi_sub || r.input_botol_chamber) || 0; 
      data[g].q_samp_as += parseFloat(r.pack_reject || r.samp_as) || 0;  
      data[g].q_samp_ret += parseFloat(r.pack_fg || r.samp_ret) || 0; 
      data[g].rej_partikel += (parseFloat(r.vi_partikel || r.rej_partikel) || 0); 
      data[g].rej_kosmetik += (parseFloat(r.vi_kotik || r.rej_kosmetik) || 0); 
      data[g].rej_bocor += (parseFloat(r.vi_bocor || r.reject_bocor) || 0); 
      data[g].rej_lain += (parseFloat(r.vi_lain || r.reject_lain) || 0); 
    });

    filteredDowntime.forEach(r => {
      const g = String(r.group).trim().toUpperCase();
      if (!groups.includes(g)) return;
      
      const durasi = parseFloat(r.duration) || 0; 
      const type = String(r.plan_unplan).trim().toUpperCase(); 
      const category = String(r.proses).trim().toUpperCase(); 
      const kasus = String(r.kasus).trim().toUpperCase(); 

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
      dt_p: 0, dt_np: 0, rej_partikel: 0, rej_kosmetik: 0, rej_bocor: 0, rej_lain: 0 
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
      const total_rej = d.rej_partikel + d.rej_kosmetik + d.rej_bocor + d.rej_lain;
      
      const q_good = d.out_counter - total_rej;
      const std_fg_95 = headerMetrics.teoriBatch * 0.95;
      const ba_total = std_fg_95 > 0 ? (q_good / std_fg_95) : 0;

      matrix[g].pot = d.pot; matrix[g].total_time = total_time; matrix[g].unplanned_dt = unplanned_dt_jam; matrix[g].prod_run_time = prod_run_time; matrix[g].avail_pct = total_time > 0 ? (prod_run_time / total_time) * 100 : 0;
      matrix[g].speed_blow = headerMetrics.speed; matrix[g].target_output = target_output; matrix[g].out_counter_vi = d.out_counter; matrix[g].ba_std_fg = std_fg_95; matrix[g].ba_total_fg = ba_total; matrix[g].perf_pct = target_output > 0 ? (d.out_counter / target_output) * 100 : 0;
      matrix[g].q_std_batch = std_fg_95; matrix[g].q_out_counter = d.out_counter; matrix[g].q_out_rej = total_rej; matrix[g].q_out_samp = total_samp; matrix[g].q_good_count_fg = q_good; matrix[g].qual_pct = d.out_counter > 0 ? (q_good / d.out_counter) * 100 : 0;
      matrix[g].dt_tot_min = dt_total_min; matrix[g].dt_tot_jam = unplanned_dt_jam; matrix[g].jd_p = d.dt_p; matrix[g].jd_np = d.dt_np;
      matrix[g].qc_samp_as = d.q_samp_as; matrix[g].qc_samp_ret = d.q_samp_ret; matrix[g].qc_tot_dec = total_samp; matrix[g].qc_tot_pct = d.out_counter > 0 ? ((total_samp / d.out_counter) * 100).toFixed(2) : "0";
      matrix[g].rej_partikel = d.rej_partikel; matrix[g].rej_kosmetik = d.rej_kosmetik; matrix[g].rej_bocor = d.rej_bocor; matrix[g].rej_lain = d.rej_lain; matrix[g].rej_tot_dec = total_rej; matrix[g].rej_tot_pct = d.out_counter > 0 ? ((total_rej / d.out_counter) * 100).toFixed(2) : "0";

      totals.pot += d.pot; totals.total_time += total_time; totals.unplanned_dt_jam += unplanned_dt_jam; totals.prod_run_time += prod_run_time; totals.target_output += target_output; totals.out_counter += d.out_counter; totals.ba_total += ba_total; totals.q_rej += total_rej; totals.q_samp_as += d.q_samp_as; totals.q_samp_ret += d.q_samp_ret; totals.q_good += q_good; totals.dt_min += dt_total_min; totals.dt_p += d.dt_p; totals.dt_np += d.dt_np; totals.rej_partikel += d.rej_partikel; totals.rej_kosmetik += d.rej_kosmetik; totals.rej_bocor += d.rej_bocor; totals.rej_lain += d.rej_lain;
    });

    const total_samp_all = totals.q_samp_as + totals.q_samp_ret;
    matrix.TOTAL.pot = totals.pot; dynamicLists.planned.forEach(k => matrix.TOTAL[`ps_${k}`] = totals.ps[k]); matrix.TOTAL.total_time = totals.total_time; matrix.TOTAL.unplanned_dt = totals.unplanned_dt_jam; matrix.TOTAL.prod_run_time = totals.prod_run_time; matrix.TOTAL.avail_pct = totals.total_time > 0 ? (totals.prod_run_time / totals.total_time) * 100 : 0;
    matrix.TOTAL.speed_blow = "-"; matrix.TOTAL.target_output = totals.target_output; matrix.TOTAL.out_counter_vi = totals.out_counter; matrix.TOTAL.ba_std_fg = "-"; matrix.TOTAL.ba_total_fg = totals.ba_total; matrix.TOTAL.perf_pct = totals.target_output > 0 ? (totals.out_counter / totals.target_output) * 100 : 0;
    
    const std_fg_95_base = headerMetrics.teoriBatch * 0.95;
    matrix.TOTAL.q_std_batch = std_fg_95_base * 3; 
    
    matrix.TOTAL.q_out_counter = totals.out_counter; matrix.TOTAL.q_out_rej = totals.q_rej; matrix.TOTAL.q_out_samp = total_samp_all; matrix.TOTAL.q_good_count_fg = totals.q_good; matrix.TOTAL.qual_pct = totals.out_counter > 0 ? (totals.q_good / totals.out_counter) * 100 : 0;
    dynamicLists.unplanned.forEach(k => matrix.TOTAL[`dt_${k}`] = totals.dt[k]); matrix.TOTAL.dt_tot_min = totals.dt_min; matrix.TOTAL.dt_tot_jam = totals.dt_min / 60; matrix.TOTAL.jd_p = totals.dt_p; matrix.TOTAL.jd_np = totals.dt_np;
    matrix.TOTAL.qc_samp_as = totals.q_samp_as; matrix.TOTAL.qc_samp_ret = totals.q_samp_ret; matrix.TOTAL.qc_tot_dec = total_samp_all; matrix.TOTAL.qc_tot_pct = totals.out_counter > 0 ? ((total_samp_all / totals.out_counter) * 100).toFixed(2) : "0";
    matrix.TOTAL.rej_partikel = totals.rej_partikel; matrix.TOTAL.rej_kosmetik = totals.rej_kosmetik; matrix.TOTAL.rej_bocor = totals.rej_bocor; matrix.TOTAL.rej_lain = totals.rej_lain; matrix.TOTAL.rej_tot_dec = totals.q_rej; matrix.TOTAL.rej_tot_pct = totals.out_counter > 0 ? ((totals.q_rej / totals.out_counter) * 100).toFixed(2) : "0";

    const structure = [
      { section: "AVAILABILITY", key: "avail_pct", unit: "%", items: [ { label: "Plant Operating Time (POT)", key: "pot", unit: "hour" }, { label: "List Planned Shutdown", isGroupHeader: true }, ...dynamicLists.planned.map(k => ({ label: `Planned - ${k}`, key: `ps_${k}`, unit: "hour", isSubItem: true })), { label: "Total Time", key: "total_time", unit: "hour" }, { label: "Unplanned Downtime", isGroupHeader: true }, { label: "Unplanned DT", key: "unplanned_dt", unit: "hour", isSubItem: true }, { label: "Production Run Time", key: "prod_run_time", unit: "hour" } ] },
      { section: "PERFORMANCE", key: "perf_pct", unit: "%", items: [ { label: "Speed Blow", key: "speed_blow", unit: "bph" }, { label: "Target Output", key: "target_output", unit: "bottles" }, { label: "Output", isGroupHeader: true }, { label: "Counter (input VI)", key: "out_counter_vi", unit: "bottles", isSubItem: true }, { label: "Batch Achievement", isGroupHeader: true }, { label: "Standart FG 95%", key: "ba_std_fg", unit: "bottles", isSubItem: true }, { label: "TOTAL BATCH \"FG\"", key: "ba_total_fg", unit: "batch", isSubItem: true } ] },
      { section: "QUALITY", key: "qual_pct", unit: "%", items: [ { label: "Standart / batch (95%)", key: "q_std_batch", unit: "bottles" }, { label: "Output", isGroupHeader: true }, { label: "Counter (input VI)", key: "q_out_counter", unit: "bottles", isSubItem: true }, { label: "Reject", key: "q_out_rej", unit: "bottles", isSubItem: true }, { label: "Sample", key: "q_out_samp", unit: "bottles", isSubItem: true }, { label: "Good Count \"FG\"", key: "q_good_count_fg", unit: "bottles" } ] },
      { section: "DETAIL DOWNTIME", key: "dt_header", unit: "-", items: [ { label: "List Detail Downtime", isGroupHeader: true }, ...dynamicLists.unplanned.map(k => ({ label: `Unplanned - ${k}`, key: `dt_${k}`, unit: "minutes", isSubItem: true })), { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (Dalam bentuk menit)", key: "dt_tot_min", unit: "minutes", isSubItem: true }, { label: "TOTAL (Dalam bentuk Jam)", key: "dt_tot_jam", unit: "Jam", isSubItem: true } ] },
      { section: "JENIS DOWNTIME", key: "jd_header", unit: "-", items: [ { label: "Production (P)", key: "jd_p", unit: "minutes" }, { label: "Non-Production (NP)", key: "jd_np", unit: "minutes" } ] },
      { section: "DETAIL QC SAMPLE", key: "qc_header", unit: "-", items: [ { label: "Samples", isGroupHeader: true }, { label: "AS", key: "qc_samp_as", unit: "-", isSubItem: true }, { label: "Retained", key: "qc_samp_ret", unit: "-", isSubItem: true }, { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (dalam bentuk decimal)", key: "qc_tot_dec", unit: "-", isSubItem: true }, { label: "TOTAL (Dalam bentuk persentase)", key: "qc_tot_pct", unit: "%", isSubItem: true } ] },
      { section: "DETAIL REJECT", key: "rej_header", unit: "-", items: [ { label: "List Detail Reject", isGroupHeader: true }, { label: "Partikel", key: "rej_partikel", unit: "-", isSubItem: true }, { label: "Kosmetik", key: "rej_kosmetik", unit: "-", isSubItem: true }, { label: "Bocor", key: "rej_bocor", unit: "-", isSubItem: true }, { label: "Lain-lain", key: "rej_lain", unit: "-", isSubItem: true }, { label: "TOTAL", isGroupHeader: true }, { label: "TOTAL (Dalam bentuk desimal)", key: "rej_tot_dec", unit: "-", isSubItem: true }, { label: "TOTAL (Dalam bentuk persentase)", key: "rej_tot_pct", unit: "%", isSubItem: true } ] }
    ];

    const oeeF = (matrix.TOTAL.avail_pct * matrix.TOTAL.perf_pct * matrix.TOTAL.qual_pct) / 10000;
    return { matrix, structure, oee: oeeF || 0, avail: matrix.TOTAL.avail_pct, perf: matrix.TOTAL.perf_pct, qual: matrix.TOTAL.qual_pct };
  }, [rawReject, rawDowntime, date, volume, headerMetrics]);
};

const SummaryTable = ({ zoneTitle, structure, matrixData, oee, avail, perf, qual, metrics, dtJam, lossUnit, totalFinLoss }) => {
  return (
    <div className="border border-black shadow-sm bg-white mb-12 w-full h-full flex flex-col">
      <div className="bg-gray-100 p-4 border-b border-black flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-black uppercase tracking-widest text-black">{zoneTitle}</h2>
        <div className="flex gap-4 md:gap-6 text-sm font-bold text-gray-700">
          <div className="flex flex-col"><span className="text-[10px] text-gray-500 uppercase tracking-wider">OEE Score</span><span className="text-xl text-black">{oee.toFixed(1)}%</span></div>
          <div className="flex flex-col"><span className="text-[10px] text-gray-500 uppercase tracking-wider">Avail</span><span className="text-xl text-yellow-600">{avail.toFixed(1)}%</span></div>
          <div className="flex flex-col"><span className="text-[10px] text-gray-500 uppercase tracking-wider">Perf</span><span className="text-xl text-blue-600">{perf.toFixed(1)}%</span></div>
          <div className="flex flex-col"><span className="text-[10px] text-gray-500 uppercase tracking-wider">Qual</span><span className="text-xl text-emerald-600">{qual.toFixed(1)}%</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-black divide-x divide-black bg-gray-50">
        <div className="p-3 text-center">
          <span className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest">Speed</span>
          <span className="text-xl font-black text-black">{metrics.speed.toLocaleString('id-ID')} <span className="text-sm font-bold text-gray-500">bph</span></span>
        </div>
        <div className="p-3 text-center">
          <span className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest">Unplanned DT</span>
          <span className="text-xl font-black text-red-600">{formatNum(matrixData['TOTAL']?.['unplanned_dt'])} <span className="text-sm font-bold text-red-400">Jam</span></span>
        </div>
        <div className="p-3 text-center">
          <span className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest">Total Batch</span>
          <span className="text-xl font-black text-black">{formatNum(matrixData['TOTAL']?.[zoneTitle.includes('F') ? 'ba_total_fg' : 'ba_total'])} <span className="text-sm font-bold text-gray-500">Batch</span></span>
        </div>
      </div>

      <div className="flex-1 overflow-x-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-gray-100 border-b-2 border-black">
            <tr>
              <th className="py-2 px-3 border-r border-black font-bold uppercase tracking-wider text-black w-[40%]">Parameter</th>
              {['A', 'B', 'C', 'D'].map(g => <th key={g} className="py-2 px-2 border-r border-black font-bold text-center text-black w-[10%]">{g}</th>)}
              <th className="py-2 px-2 border-r border-black font-bold text-center bg-gray-200 text-black w-[10%]">TOTAL</th>
              <th className="py-2 px-2 font-bold text-center text-black w-[10%]">Satuan</th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            {structure.map((section, sIdx) => {
              const isMergedSection = ["DETAIL DOWNTIME", "JENIS DOWNTIME", "DETAIL QC SAMPLE", "DETAIL REJECT"].includes(section.section);
              return (
                <React.Fragment key={`sec-${sIdx}`}>
                  {isMergedSection ? (
                    <tr className="bg-gray-200 border-y border-black">
                      <td colSpan={7} className="py-2 px-3 font-bold text-black uppercase tracking-widest">{section.section}</td>
                    </tr>
                  ) : (
                    <tr className="bg-gray-100 border-y border-black">
                      <td className="py-2 px-3 border-r border-black font-bold text-black uppercase tracking-widest">{section.section}</td>
                      {['A', 'B', 'C', 'D'].map(g => <td key={`main-${g}`} className="py-2 px-2 border-r border-black text-center font-bold text-black">{formatNum(matrixData[g]?.[section.key]) || "-"}</td>)}
                      <td className="py-2 px-2 border-r border-black text-center font-bold bg-gray-200 text-black">{formatNum(matrixData['TOTAL']?.[section.key]) || "-"}</td>
                      <td className="py-2 px-2 text-center text-black">{section.unit}</td>
                    </tr>
                  )}
                  {section.items.map((item, iIdx) => {
                    if (item.isGroupHeader) return (
                      <tr key={`hdr-${iIdx}`} className="bg-gray-50 border-b border-gray-300">
                        <td colSpan={7} className="py-1 px-3 border-r border-black text-[10px] font-bold text-gray-500 italic uppercase pl-6">{item.label}</td>
                      </tr>
                    );
                    const isHl = isHighlightRow(item.label);
                    return (
                      <tr key={`item-${iIdx}`} className="border-b border-gray-300 hover:bg-gray-50">
                        <td className={`py-1.5 px-3 border-r border-black ${isHl ? 'font-bold text-black' : 'text-gray-700'} ${item.isSubItem ? 'pl-8' : 'pl-4'}`}>{item.label}</td>
                        {['A', 'B', 'C', 'D'].map(g => <td key={`val-${g}`} className="py-1.5 px-2 border-r border-gray-300 text-center text-black">{matrixData[g]?.[item.key] !== undefined && matrixData[g]?.[item.key] !== "-" ? formatNum(matrixData[g][item.key]) : "-"}</td>)}
                        <td className="py-1.5 px-2 border-r border-black text-center font-bold bg-gray-100 text-black">{matrixData['TOTAL']?.[item.key] !== undefined && matrixData['TOTAL']?.[item.key] !== "-" ? formatNum(matrixData['TOTAL'][item.key]) : "-"}</td>
                        <td className="py-1.5 px-2 text-center text-gray-500">{item.unit}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white border-t border-black p-4 mt-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-red-600">Potential Loss</h3>
          <span className="text-xl font-black text-red-600">{formatRp(totalFinLoss)}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="border border-gray-300 p-3 bg-gray-50 flex justify-between">
            <span className="font-bold text-gray-600">Downtime ({formatNum(lossUnit)} unit)</span>
            <span className="font-bold text-black">{formatRp(lossUnit * 6500)}</span>
          </div>
          <div className="border border-gray-300 p-3 bg-gray-50 flex justify-between">
            <span className="font-bold text-gray-600">Rejection ({formatNum(parseFloat(matrixData['TOTAL']?.['rej_tot_dec']) || 0)} unit)</span>
            <span className="font-bold text-black">{formatRp((parseFloat(matrixData['TOTAL']?.['rej_tot_dec']) || 0) * 6500)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DailyOnesheet = () => {
  const { user } = useAuth();
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]); 
  const [inputVolume, setInputVolume] = useState("25 ML"); 
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split('T')[0]); 
  const [activeVolume, setActiveVolume] = useState("25 ML"); 
  
  const [isFetching, setIsFetching] = useState(false); 
  const [isPrinting, setIsPrinting] = useState(false); // State untuk mengatur ukuran saat cetak
  const printRef = useRef(); 
  
  const [rawRejectC, setRawRejectC] = useState([]);
  const [rawDowntimeC, setRawDowntimeC] = useState([]);
  const [rawRejectF, setRawRejectF] = useState([]);
  const [rawDowntimeF, setRawDowntimeF] = useState([]);

  const executeSearch = async () => {
    setIsFetching(true);
    setActiveDate(inputDate);
    setActiveVolume(inputVolume);
    
    try {
      const res = await fetchOnesheetData(inputDate, user);
      if (res.status === 'success') {
        setRawRejectC(res.data.reject_c || []);
        setRawDowntimeC(res.data.downtime_c || []);
        setRawRejectF(res.data.reject_f || []);
        setRawDowntimeF(res.data.downtime_f || []);
        toast.success(`Data ${inputDate} dimuat!`);
      } else {
        toast.error("Gagal menarik data: " + res.message);
      }
    } catch (e) {
      toast.error("Koneksi terputus.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (user) executeSearch();
  }, []);

  const metrics = useMemo(() => calculateZoneMetrics(activeVolume), [activeVolume]);
  const { matrix: mockMatrixDataC, structure: zoneCMatrixStructure, oee: calculatedOEEC, avail: availC, perf: perfC, qual: qualC } = useZoneCProcessor(rawRejectC, rawDowntimeC, activeDate, activeVolume, metrics);
  const { matrix: mockMatrixDataF, structure: zoneFMatrixStructure, oee: calculatedOEEF, avail: availF, perf: perfF, qual: qualF } = useZoneFProcessor(rawRejectF, rawDowntimeF, activeDate, activeVolume, metrics);

  const dtJamC = parseFloat(mockMatrixDataC['TOTAL']?.['dt_tot_jam']) || 0;
  const lossUnitDtC = metrics.speed * dtJamC;
  const totalFinLossC = (lossUnitDtC * 6500) + ((parseFloat(mockMatrixDataC['TOTAL']?.['rej_tot_dec']) || 0) * 6500);

  const dtJamF = parseFloat(mockMatrixDataF['TOTAL']?.['dt_tot_jam']) || 0;
  const lossUnitDtF = metrics.speed * dtJamF;
  const totalFinLossF = (lossUnitDtF * 6500) + ((parseFloat(mockMatrixDataF['TOTAL']?.['rej_tot_dec']) || 0) * 6500);

  const handleDownloadJPG = () => {
    const element = printRef.current;
    if (!element) return;
    
    setIsPrinting(true); 
    const toastId = toast.loading("Mempersiapkan File");
    
    setTimeout(async () => {
      try {
        toast.loading("Mengunduh File", { id: toastId });
        const dataUrl = await toPng(element, { 
          quality: 1.0, 
          pixelRatio: 2, 
          backgroundColor: '#ffffff' 
        });
        const link = document.createElement('a');
        link.download = `ONESHEET_${activeDate}_${activeVolume}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Berhasil Diunduh", { id: toastId });
      } catch (err) {
        toast.error("Gagal Download.", { id: toastId });
      } finally {
        setIsPrinting(false); 
      }
    }, 800); 
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans p-4 md:p-8 pb-32">
      <Toaster position="top-center" />
      
      <div className="max-w-[1600px] mx-auto mb-8 bg-white border border-black shadow-sm p-4 flex flex-wrap justify-between items-center gap-4 rounded-md">
        <h1 className="text-xl font-black uppercase tracking-widest">Daily Onesheet</h1>
        <div className="flex gap-3 items-center">
          <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} className="border border-black p-2 text-sm outline-none" />
          <select value={inputVolume} onChange={(e) => setInputVolume(e.target.value)} className="border border-black p-2 font-bold text-sm outline-none">
            {VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <button onClick={executeSearch} disabled={isFetching} className="bg-black text-white px-4 py-2 font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors">
            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} CARI
          </button>
          <button onClick={handleDownloadJPG} className="border border-black px-4 py-2 font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors">
            <Download size={16} /> UNDUH
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-10">
        <div 
          ref={printRef} 
          className={`mx-auto bg-white p-8 border border-gray-200 transition-all ${isPrinting ? 'w-[1800px] min-w-[1800px]' : 'w-full min-w-[1200px] max-w-[1800px]'}`}
        >
          
          <div className="border-b-4 bg-purple-200 border-black pb-4 mb-8 text-center flex flex-col items-center">
            <h1 className="text-4xl font-black uppercase tracking-widest mb-4">Laporan Onesheet</h1>
            <div className="flex gap-12 text-sm font-bold">
              <div className="flex flex-col"><span className="text-black-500 uppercase tracking-widest text-[10px]">Line</span><span className="text-xl">{user?.line || 3}</span></div>
              <div className="flex flex-col"><span className="text-black-500 uppercase tracking-widest text-[10px]">Tanggal</span><span className="text-xl">{activeDate}</span></div>
              <div className="flex flex-col"><span className="text-black-500 uppercase tracking-widest text-[10px]">Volume</span><span className="text-xl">{activeVolume}</span></div>
            </div>
          </div>

          <div className={`grid gap-8 w-full ${isPrinting ? 'grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
            <SummaryTable 
              zoneTitle="OEE Zone C" 
              structure={zoneCMatrixStructure} 
              matrixData={mockMatrixDataC} 
              oee={calculatedOEEC} avail={availC} perf={perfC} qual={qualC} metrics={metrics} 
              lossUnit={lossUnitDtC} totalFinLoss={totalFinLossC} 
            />
            
            <SummaryTable 
              zoneTitle="OEE Zone F" 
              structure={zoneFMatrixStructure} 
              matrixData={mockMatrixDataF} 
              oee={calculatedOEEF} avail={availF} perf={perfF} qual={qualF} metrics={metrics} 
              lossUnit={lossUnitDtF} totalFinLoss={totalFinLossF} 
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default DailyOnesheet;