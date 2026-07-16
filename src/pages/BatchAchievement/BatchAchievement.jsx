import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';

// 150 Kolom Metadata (Kolom A sampai Kolom ET)
export const BATCH_ACHIEVEMENT_COLS_META = [
  // Kolom A - C: Periode & Waktu
  { colLetter: 'A', field: 'bulan', title: 'Bulan', width: 100, type: 'text', stickyLeft: 60, group: 'Waktu & Periode' },
  { colLetter: 'B', field: 'tanggal', title: 'Tanggal', width: 110, type: 'date', stickyLeft: 160, group: 'Waktu & Periode' },
  { colLetter: 'C', field: 'week', title: 'Week', width: 80, type: 'text', stickyLeft: 270, group: 'Waktu & Periode' },

  // Kolom D - J: Target & Achievement Grup (Zone C / Umum)
  { colLetter: 'D', field: 'target_ppic_fg', title: 'Target PPIC (FG)', width: 130, type: 'number', group: 'Target & Ach Grup' },
  { colLetter: 'E', field: 'ach_grup_a', title: 'Ach Grup A', width: 110, type: 'number', group: 'Target & Ach Grup' },
  { colLetter: 'F', field: 'ach_grup_b', title: 'Ach Grup B', width: 110, type: 'number', group: 'Target & Ach Grup' },
  { colLetter: 'G', field: 'ach_grup_c', title: 'Ach Grup C', width: 110, type: 'number', group: 'Target & Ach Grup' },
  { colLetter: 'H', field: 'ach_grup_d', title: 'Ach Grup D', width: 110, type: 'number', group: 'Target & Ach Grup' },
  { colLetter: 'I', field: 'total_batch', title: 'Total Batch', width: 115, type: 'number', group: 'Target & Ach Grup', isTotal: true },
  { colLetter: 'J', field: 'volume', title: 'Volume', width: 110, type: 'number', group: 'Target & Ach Grup' },

  // Kolom K - O: Availability (Jam/Waktu Tersedia)
  { colLetter: 'K', field: 'avail_a', title: 'Avail A', width: 100, type: 'number', group: 'Availability (C)' },
  { colLetter: 'L', field: 'avail_b', title: 'Avail B', width: 100, type: 'number', group: 'Availability (C)' },
  { colLetter: 'M', field: 'avail_c', title: 'Avail C', width: 100, type: 'number', group: 'Availability (C)' },
  { colLetter: 'N', field: 'avail_d', title: 'Avail D', width: 100, type: 'number', group: 'Availability (C)' },
  { colLetter: 'O', field: 'total_availability', title: 'total Availability', width: 130, type: 'number', group: 'Availability (C)', isTotal: true },

  // Kolom P - T: Planned Downtime
  { colLetter: 'P', field: 'plan_a', title: 'Plan A', width: 100, type: 'number', group: 'Plan DT (C)' },
  { colLetter: 'Q', field: 'plan_b', title: 'Plan B', width: 100, type: 'number', group: 'Plan DT (C)' },
  { colLetter: 'R', field: 'plan_c', title: 'Plan C', width: 100, type: 'number', group: 'Plan DT (C)' },
  { colLetter: 'S', field: 'plan_d', title: 'Plan D', width: 100, type: 'number', group: 'Plan DT (C)' },
  { colLetter: 'T', field: 'total_plan_downtime', title: 'total Plan Downtime', width: 140, type: 'number', group: 'Plan DT (C)', isTotal: true },

  // Kolom U - Y: Total Time (Loading Time)
  { colLetter: 'U', field: 'total_time_a', title: 'Total Time A', width: 110, type: 'number', group: 'Total Time (C)' },
  { colLetter: 'V', field: 'total_time_b', title: 'Total Time B', width: 110, type: 'number', group: 'Total Time (C)' },
  { colLetter: 'W', field: 'total_time_c', title: 'Total Time C', width: 110, type: 'number', group: 'Total Time (C)' },
  { colLetter: 'X', field: 'total_time_d', title: 'Total Time D', width: 110, type: 'number', group: 'Total Time (C)' },
  { colLetter: 'Y', field: 'total_time', title: 'total time', width: 120, type: 'number', group: 'Total Time (C)', isTotal: true },

  // Kolom Z - AD: Unplanned Downtime
  { colLetter: 'Z', field: 'un_a', title: 'Un A', width: 100, type: 'number', group: 'Unplanned DT (C)' },
  { colLetter: 'AA', field: 'un_b', title: 'Un B', width: 100, type: 'number', group: 'Unplanned DT (C)' },
  { colLetter: 'AB', field: 'un_c', title: 'Un C', width: 100, type: 'number', group: 'Unplanned DT (C)' },
  { colLetter: 'AC', field: 'un_d', title: 'Un D', width: 100, type: 'number', group: 'Unplanned DT (C)' },
  { colLetter: 'AD', field: 'total_unplanned', title: 'total unplanned', width: 130, type: 'number', group: 'Unplanned DT (C)', isTotal: true },

  // Kolom AE - AI: Production Run (Operating Time)
  { colLetter: 'AE', field: 'run_a', title: 'Run A', width: 100, type: 'number', group: 'Production Run (C)' },
  { colLetter: 'AF', field: 'run_b', title: 'Run B', width: 100, type: 'number', group: 'Production Run (C)' },
  { colLetter: 'AG', field: 'run_c', title: 'Run C', width: 100, type: 'number', group: 'Production Run (C)' },
  { colLetter: 'AH', field: 'run_d', title: 'Run D', width: 100, type: 'number', group: 'Production Run (C)' },
  { colLetter: 'AI', field: 'total_production_run', title: 'total production run', width: 140, type: 'number', group: 'Production Run (C)', isTotal: true },

  // Kolom AJ - AM: % Availability Rate (Zone C)
  { colLetter: 'AJ', field: 'availability_a', title: 'Availability A', width: 110, type: 'number', group: 'Availability Rate (C)' },
  { colLetter: 'AK', field: 'availability_b', title: 'Availability B', width: 110, type: 'number', group: 'Availability Rate (C)' },
  { colLetter: 'AL', field: 'availability_c', title: 'Availability C', width: 110, type: 'number', group: 'Availability Rate (C)' },
  { colLetter: 'AM', field: 'availability_d', title: 'Availability D', width: 110, type: 'number', group: 'Availability Rate (C)' },

  // Kolom AN - AR: Counter + Reject Blow
  { colLetter: 'AN', field: 'counter_reject_blow_a', title: 'Counter + Reject blow A', width: 160, type: 'number', group: 'Counter + Reject Blow' },
  { colLetter: 'AO', field: 'counter_reject_blow_b', title: 'Counter + Reject blow B', width: 160, type: 'number', group: 'Counter + Reject Blow' },
  { colLetter: 'AP', field: 'counter_reject_blow_c', title: 'Counter + Reject blow C', width: 160, type: 'number', group: 'Counter + Reject Blow' },
  { colLetter: 'AQ', field: 'counter_reject_blow_d', title: 'Counter + Reject blow D', width: 160, type: 'number', group: 'Counter + Reject Blow' },
  { colLetter: 'AR', field: 'total_counter_reject_blow', title: 'total counter + reject blow', width: 170, type: 'number', group: 'Counter + Reject Blow', isTotal: true },

  // Kolom AS - AX: Speed & Target Output
  { colLetter: 'AS', field: 'speed', title: 'Speed', width: 100, type: 'number', group: 'Speed & Output (C)' },
  { colLetter: 'AT', field: 'target_output_a', title: 'Target output A', width: 120, type: 'number', group: 'Speed & Output (C)' },
  { colLetter: 'AU', field: 'target_output_b', title: 'Target output B', width: 120, type: 'number', group: 'Speed & Output (C)' },
  { colLetter: 'AV', field: 'target_output_c', title: 'Target output C', width: 120, type: 'number', group: 'Speed & Output (C)' },
  { colLetter: 'AW', field: 'target_output_d', title: 'Target output D', width: 120, type: 'number', group: 'Speed & Output (C)' },
  { colLetter: 'AX', field: 'total_target_output', title: 'Total target output', width: 140, type: 'number', group: 'Speed & Output (C)', isTotal: true },

  // Kolom AY - BB: Performance Rate (Zone C)
  { colLetter: 'AY', field: 'performance_a', title: 'Performance A', width: 120, type: 'number', group: 'Performance Rate (C)' },
  { colLetter: 'AZ', field: 'performance_b', title: 'Performance B', width: 120, type: 'number', group: 'Performance Rate (C)' },
  { colLetter: 'BA', field: 'performance_c', title: 'Performance C', width: 120, type: 'number', group: 'Performance Rate (C)' },
  { colLetter: 'BB', field: 'performance_d', title: 'Performance D', width: 120, type: 'number', group: 'Performance Rate (C)' },

  // Kolom BC - BG: Counter Fill (Zone C)
  { colLetter: 'BC', field: 'counter_a', title: 'Counter A', width: 110, type: 'number', group: 'Counter Fill (C)' },
  { colLetter: 'BD', field: 'counter_b', title: 'Counter B', width: 110, type: 'number', group: 'Counter Fill (C)' },
  { colLetter: 'BE', field: 'counter_c', title: 'Counter C', width: 110, type: 'number', group: 'Counter Fill (C)' },
  { colLetter: 'BF', field: 'counter_d', title: 'Counter D', width: 110, type: 'number', group: 'Counter Fill (C)' },
  { colLetter: 'BG', field: 'total_counter_fill', title: 'total counter fill', width: 130, type: 'number', group: 'Counter Fill (C)', isTotal: true },

  // Kolom BH - BL: Goodcount (Zone C)
  { colLetter: 'BH', field: 'goodcount_a', title: 'Goodcount A', width: 110, type: 'number', group: 'Goodcount (C)' },
  { colLetter: 'BI', field: 'goodcount_b', title: 'Goodcount B', width: 110, type: 'number', group: 'Goodcount (C)' },
  { colLetter: 'BJ', field: 'goodcount_c', title: 'Goodcount C', width: 110, type: 'number', group: 'Goodcount (C)' },
  { colLetter: 'BK', field: 'goodcount_d', title: 'Goodcount D', width: 110, type: 'number', group: 'Goodcount (C)' },
  { colLetter: 'BL', field: 'total_goodcount', title: 'total Goodcount', width: 130, type: 'number', group: 'Goodcount (C)', isTotal: true },

  // Kolom BM - BP: Quality Rate (Zone C)
  { colLetter: 'BM', field: 'quality_a', title: 'Quality A', width: 110, type: 'number', group: 'Quality Rate (C)' },
  { colLetter: 'BN', field: 'quality_b', title: 'Quality B', width: 110, type: 'number', group: 'Quality Rate (C)' },
  { colLetter: 'BO', field: 'quality_c', title: 'Quality C', width: 110, type: 'number', group: 'Quality Rate (C)' },
  { colLetter: 'BP', field: 'quality_d', title: 'Quality D', width: 110, type: 'number', group: 'Quality Rate (C)' },

  // Kolom BQ - BX: OEE & Summary Zone C
  { colLetter: 'BQ', field: 'oee_a', title: 'OEE A', width: 100, type: 'number', group: 'OEE Summary (C)' },
  { colLetter: 'BR', field: 'oee_b', title: 'OEE B', width: 100, type: 'number', group: 'OEE Summary (C)' },
  { colLetter: 'BS', field: 'oee_c', title: 'OEE C', width: 100, type: 'number', group: 'OEE Summary (C)' },
  { colLetter: 'BT', field: 'oee_d', title: 'OEE D', width: 100, type: 'number', group: 'OEE Summary (C)' },
  { colLetter: 'BU', field: 'pct_a', title: '%A', width: 90, type: 'number', group: 'OEE Summary (C)' },
  { colLetter: 'BV', field: 'pct_p', title: '%P', width: 90, type: 'number', group: 'OEE Summary (C)' },
  { colLetter: 'BW', field: 'pct_q', title: '%Q', width: 90, type: 'number', group: 'OEE Summary (C)' },
  { colLetter: 'BX', field: 'pct_oee', title: '%OEE', width: 100, type: 'number', group: 'OEE Summary (C)', isTotal: true },

  // Kolom BY - CB: Goodcount F (Awal)
  { colLetter: 'BY', field: 'goodcount_f_a', title: 'Goodcount F (A)', width: 130, type: 'number', group: 'Goodcount F (Awal)' },
  { colLetter: 'BZ', field: 'goodcount_f_b', title: 'Goodcount F (B)', width: 130, type: 'number', group: 'Goodcount F (Awal)' },
  { colLetter: 'CA', field: 'goodcount_f_c', title: 'Goodcount F (C)', width: 130, type: 'number', group: 'Goodcount F (Awal)' },
  { colLetter: 'CB', field: 'goodcount_f_d', title: 'Goodcount F (D)', width: 130, type: 'number', group: 'Goodcount F (Awal)' },

  // Kolom CC - CF: Available A (F)
  { colLetter: 'CC', field: 'available_f_a', title: 'Available A (F)', width: 125, type: 'number', group: 'Available Time (F)' },
  { colLetter: 'CD', field: 'available_f_b', title: 'Available B (F)', width: 125, type: 'number', group: 'Available Time (F)' },
  { colLetter: 'CE', field: 'available_f_c', title: 'Available C (F)', width: 125, type: 'number', group: 'Available Time (F)' },
  { colLetter: 'CF', field: 'available_f_d', title: 'Available D (F)', width: 125, type: 'number', group: 'Available Time (F)' },

  // Kolom CG - CJ: Plan DT (F)
  { colLetter: 'CG', field: 'plan_dt_f_a', title: 'Plan DT A (F)', width: 120, type: 'number', group: 'Plan DT (F)' },
  { colLetter: 'CH', field: 'plan_dt_f_b', title: 'Plan DT B (F)', width: 120, type: 'number', group: 'Plan DT (F)' },
  { colLetter: 'CI', field: 'plan_dt_f_c', title: 'Plan DT C (F)', width: 120, type: 'number', group: 'Plan DT (F)' },
  { colLetter: 'CJ', field: 'plan_dt_f_d', title: 'Plan DT D (F)', width: 120, type: 'number', group: 'Plan DT (F)' },

  // Kolom CK - CN: UnDT (F)
  { colLetter: 'CK', field: 'undt_f_a', title: 'UnDT A (F)', width: 110, type: 'number', group: 'Unplanned DT (F)' },
  { colLetter: 'CL', field: 'undt_f_b', title: 'UnDT B (F)', width: 110, type: 'number', group: 'Unplanned DT (F)' },
  { colLetter: 'CM', field: 'undt_f_c', title: 'UnDT C (F)', width: 110, type: 'number', group: 'Unplanned DT (F)' },
  { colLetter: 'CN', field: 'undt_f_d', title: 'UnDT D (F)', width: 110, type: 'number', group: 'Unplanned DT (F)' },

  // Kolom CO - CR: total run (F)
  { colLetter: 'CO', field: 'total_run_f_a', title: 'total run A (F)', width: 120, type: 'number', group: 'Total Run (F)' },
  { colLetter: 'CP', field: 'total_run_f_b', title: 'total run B (F)', width: 120, type: 'number', group: 'Total Run (F)' },
  { colLetter: 'CQ', field: 'total_run_f_c', title: 'total run C (F)', width: 120, type: 'number', group: 'Total Run (F)' },
  { colLetter: 'CR', field: 'total_run_f_d', title: 'total run D (F)', width: 120, type: 'number', group: 'Total Run (F)' },

  // Kolom CS - CV: Reject Blow
  { colLetter: 'CS', field: 'reject_blow_a', title: 'Reject Blow A', width: 115, type: 'number', group: 'Reject Blow' },
  { colLetter: 'CT', field: 'reject_blow_b', title: 'Reject Blow B', width: 115, type: 'number', group: 'Reject Blow' },
  { colLetter: 'CU', field: 'reject_blow_c', title: 'Reject Blow C', width: 115, type: 'number', group: 'Reject Blow' },
  { colLetter: 'CV', field: 'reject_blow_d', title: 'Reject Blow D', width: 115, type: 'number', group: 'Reject Blow' },

  // Kolom CW - CZ: Rincian Downtime / Activity
  { colLetter: 'CW', field: 'break_time', title: 'Break', width: 100, type: 'number', group: 'Activity & Cleaning' },
  { colLetter: 'CX', field: 'cip', title: 'CIP', width: 100, type: 'number', group: 'Activity & Cleaning' },
  { colLetter: 'CY', field: 'sip', title: 'SIP', width: 100, type: 'number', group: 'Activity & Cleaning' },
  { colLetter: 'CZ', field: 'line_clearance', title: 'Line Clearance', width: 120, type: 'number', group: 'Activity & Cleaning' },

  // Kolom DA - DE: Reject Rincian
  { colLetter: 'DA', field: 'total_reject_c', title: 'Total reject C', width: 120, type: 'number', group: 'Total Reject Details' },
  { colLetter: 'DB', field: 'total_reject_f', title: 'Total reject F', width: 120, type: 'number', group: 'Total Reject Details' },
  { colLetter: 'DC', field: 'reject_tanpa_cap', title: 'Reject Tanpa Cap', width: 130, type: 'number', group: 'Total Reject Details' },
  { colLetter: 'DD', field: 'reject_seal_not_ok', title: 'Reject Seal Not OK', width: 140, type: 'number', group: 'Total Reject Details' },
  { colLetter: 'DE', field: 'reject_bocor', title: 'Reject Bocor', width: 120, type: 'number', group: 'Total Reject Details' },

  // Kolom DF: Batch Size
  { colLetter: 'DF', field: 'batch_size', title: 'Batch Size', width: 110, type: 'number', group: 'Batch Size' },

  // Kolom DG - DK: Availability (F) Tahap 2
  { colLetter: 'DG', field: 'avail_f_a_2', title: 'Avail A (F)', width: 110, type: 'number', group: 'Avail Rate (F Final)' },
  { colLetter: 'DH', field: 'avail_f_b_2', title: 'Avail B (F)', width: 110, type: 'number', group: 'Avail Rate (F Final)' },
  { colLetter: 'DI', field: 'avail_f_c_2', title: 'Avail C (F)', width: 110, type: 'number', group: 'Avail Rate (F Final)' },
  { colLetter: 'DJ', field: 'avail_f_d_2', title: 'Avail D (F)', width: 110, type: 'number', group: 'Avail Rate (F Final)' },
  { colLetter: 'DK', field: 'total_availability_f_2', title: 'total Availability (F)', width: 145, type: 'number', group: 'Avail Rate (F Final)', isTotal: true },

  // Kolom DL - DP: Plan Downtime (F) Tahap 2
  { colLetter: 'DL', field: 'plan_f_a_2', title: 'Plan A (F)', width: 110, type: 'number', group: 'Plan DT (F Final)' },
  { colLetter: 'DM', field: 'plan_f_b_2', title: 'Plan B (F)', width: 110, type: 'number', group: 'Plan DT (F Final)' },
  { colLetter: 'DN', field: 'plan_f_c_2', title: 'Plan C (F)', width: 110, type: 'number', group: 'Plan DT (F Final)' },
  { colLetter: 'DO', field: 'plan_f_d_2', title: 'Plan D (F)', width: 110, type: 'number', group: 'Plan DT (F Final)' },
  { colLetter: 'DP', field: 'total_plan_downtime_f_2', title: 'total Plan Downtime (F)', width: 160, type: 'number', group: 'Plan DT (F Final)', isTotal: true },

  // Kolom DQ - DU: Production Run (F) Tahap 2
  { colLetter: 'DQ', field: 'run_f_a_2', title: 'Run A (F)', width: 110, type: 'number', group: 'Production Run (F Final)' },
  { colLetter: 'DR', field: 'run_f_b_2', title: 'Run B (F)', width: 110, type: 'number', group: 'Production Run (F Final)' },
  { colLetter: 'DS', field: 'run_f_c_2', title: 'Run C (F)', width: 110, type: 'number', group: 'Production Run (F Final)' },
  { colLetter: 'DT', field: 'run_f_d_2', title: 'Run D (F)', width: 110, type: 'number', group: 'Production Run (F Final)' },
  { colLetter: 'DU', field: 'total_production_run_f_2', title: 'total production run (F)', width: 160, type: 'number', group: 'Production Run (F Final)', isTotal: true },

  // Kolom DV - DY: % Availability (F) Tahap 2
  { colLetter: 'DV', field: 'availability_f_a_2', title: 'Availability A (F)', width: 125, type: 'number', group: 'Availability % (F Final)' },
  { colLetter: 'DW', field: 'availability_f_b_2', title: 'Availability B (F)', width: 125, type: 'number', group: 'Availability % (F Final)' },
  { colLetter: 'DX', field: 'availability_f_c_2', title: 'Availability C (F)', width: 125, type: 'number', group: 'Availability % (F Final)' },
  { colLetter: 'DY', field: 'availability_f_d_2', title: 'Availability D (F)', width: 125, type: 'number', group: 'Availability % (F Final)' },

  // Kolom DZ - ED: Counter (F) Tahap 2
  { colLetter: 'DZ', field: 'counter_f_a_2', title: 'Counter A (F)', width: 115, type: 'number', group: 'Counter (F Final)' },
  { colLetter: 'EA', field: 'counter_f_b_2', title: 'Counter B (F)', width: 115, type: 'number', group: 'Counter (F Final)' },
  { colLetter: 'EB', field: 'counter_f_c_2', title: 'Counter C (F)', width: 115, type: 'number', group: 'Counter (F Final)' },
  { colLetter: 'EC', field: 'counter_f_d_2', title: 'Counter D (F)', width: 115, type: 'number', group: 'Counter (F Final)' },
  { colLetter: 'ED', field: 'total_counter_f_2', title: 'total counter (F)', width: 135, type: 'number', group: 'Counter (F Final)', isTotal: true },

  // Kolom EE - EJ: Speed & Target Output (F) Tahap 2
  { colLetter: 'EE', field: 'speed_f_2', title: 'Speed (F)', width: 110, type: 'number', group: 'Speed & Target (F Final)' },
  { colLetter: 'EF', field: 'target_output_f_a_2', title: 'Target output A (F)', width: 135, type: 'number', group: 'Speed & Target (F Final)' },
  { colLetter: 'EG', field: 'target_output_f_b_2', title: 'Target output B (F)', width: 135, type: 'number', group: 'Speed & Target (F Final)' },
  { colLetter: 'EH', field: 'target_output_f_c_2', title: 'Target output C (F)', width: 135, type: 'number', group: 'Speed & Target (F Final)' },
  { colLetter: 'EI', field: 'target_output_f_d_2', title: 'Target output D (F)', width: 135, type: 'number', group: 'Speed & Target (F Final)' },
  { colLetter: 'EJ', field: 'total_target_output_f_2', title: 'Total target output (F)', width: 155, type: 'number', group: 'Speed & Target (F Final)', isTotal: true },

  // Kolom EK - EN: Performance (F) Tahap 2
  { colLetter: 'EK', field: 'performance_f_a_2', title: 'Performance A (F)', width: 130, type: 'number', group: 'Performance % (F Final)' },
  { colLetter: 'EL', field: 'performance_f_b_2', title: 'Performance B (F)', width: 130, type: 'number', group: 'Performance % (F Final)' },
  { colLetter: 'EM', field: 'performance_f_c_2', title: 'Performance C (F)', width: 130, type: 'number', group: 'Performance % (F Final)' },
  { colLetter: 'EN', field: 'performance_f_d_2', title: 'Performance D (F)', width: 130, type: 'number', group: 'Performance % (F Final)' },

  // Kolom EO - ER: Quality (F) Tahap 2
  { colLetter: 'EO', field: 'quality_f_a_2', title: 'Quality A (F)', width: 120, type: 'number', group: 'Quality % (F Final)' },
  { colLetter: 'EP', field: 'quality_f_b_2', title: 'Quality B (F)', width: 120, type: 'number', group: 'Quality % (F Final)' },
  { colLetter: 'EQ', field: 'quality_f_c_2', title: 'Quality C (F)', width: 120, type: 'number', group: 'Quality % (F Final)' },
  { colLetter: 'ER', field: 'quality_f_d_2', title: 'Quality D (F)', width: 120, type: 'number', group: 'Quality % (F Final)' },

  // Kolom ES - ET: Output Akhir
  { colLetter: 'ES', field: 'finished_goods', title: 'Finished Goods', width: 130, type: 'number', group: 'Output Akhir' },
  { colLetter: 'ET', field: 'sampel', title: 'Sampel', width: 110, type: 'number', group: 'Output Akhir' }
];

const ROW_HEIGHT = 29;
const VISIBLE_ROWS = Math.ceil(700 / ROW_HEIGHT); // ~25 baris di viewport (optimal INP & CLS)
const BUFFER_ROWS = 15;
const MAX_ROWS_PER_LINE = 500;

const createInitialRows = () => {
  return Array.from({ length: MAX_ROWS_PER_LINE }, (_, i) => {
    const rowObj = { id: `ROW-${i + 1}`, _rowIdx: i + 1 };
    BATCH_ACHIEVEMENT_COLS_META.forEach(col => {
      rowObj[col.field] = '';
    });
    return rowObj;
  });
};

// Komponen Baris Memoized untuk performa optimal (60 FPS & rendah INP)
const BatchRow = React.memo(({ rowData, rowIdx, colsMeta, onCellChange }) => {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {/* Kolom ID (Sticky Kiri) */}
      <td className="py-1 px-2 bg-slate-100 text-slate-700 font-mono text-[10px] text-center sticky left-0 z-30 w-[60px] min-w-[60px] max-w-[60px] border-r border-b border-slate-300 shadow-[1px_0_0_0_#cbd5e1] font-bold">
        {rowIdx + 1}
      </td>

      {/* Sel Data (View Only) */}
      {colsMeta.map((col) => {
        const isSticky = col.stickyLeft !== undefined;
        const val = rowData[col.field] !== undefined && rowData[col.field] !== null ? rowData[col.field] : '';
        return (
          <td
            key={col.field}
            style={{
              width: col.width,
              minWidth: col.width,
              maxWidth: col.width,
              position: isSticky ? 'sticky' : 'static',
              left: isSticky ? col.stickyLeft : 'auto',
              zIndex: isSticky ? 30 : 10,
            }}
            className={`border-r border-b border-slate-300 p-0 text-xs font-semibold select-text ${isSticky ? 'bg-slate-50 shadow-[1px_0_0_0_#cbd5e1]' : 'bg-white hover:bg-slate-50'
              }`}
          >
            <input
              type="text"
              value={val}
              readOnly={true}
              placeholder=""
              className={`w-full h-7 px-1.5 text-xs font-semibold border-none outline-none bg-transparent transition-all cursor-default select-text truncate ${col.isTotal
                ? 'text-amber-800 font-extrabold bg-amber-50/40'
                : 'text-slate-800'
                }`}
            />
          </td>
        );
      })}
    </tr>
  );
}, (prev, next) => {
  return prev.rowData === next.rowData && prev.rowIdx === next.rowIdx;
});

BatchRow.displayName = 'BatchRow';

const BatchAchievement = () => {
  const { user } = useAuth();
  const [selectedLine] = useState(() => {
    const raw = user?.line || "1";
    const num = String(raw).match(/\d+/) ? String(raw).match(/\d+/)[0] : "1";
    return num;
  });

  // Data per Line
  const [lineDataMap, setLineDataMap] = useState(() => ({
    "1": createInitialRows(),
    "2": createInitialRows(),
    "3": createInitialRows(),
    "4": createInitialRows()
  }));

  const rows = lineDataMap[selectedLine] || lineDataMap["1"];
  const [scrollTop, setScrollTop] = useState(0);
  const gridRef = useRef(null);

  // Perhitungan Grup Header
  const headerGroups = useMemo(() => {
    const groups = [];
    let currentGroup = null;
    let currentSpan = 0;

    BATCH_ACHIEVEMENT_COLS_META.forEach((col, idx) => {
      if (!currentGroup || currentGroup.name !== col.group) {
        if (currentGroup) {
          groups.push({ ...currentGroup, span: currentSpan });
        }
        currentGroup = { name: col.group, startIndex: idx };
        currentSpan = 1;
      } else {
        currentSpan++;
      }
    });
    if (currentGroup) {
      groups.push({ ...currentGroup, span: currentSpan });
    }
    return groups;
  }, []);

  const handleCellChange = useCallback((rowIndex, field, value) => {
    setLineDataMap(prevMap => {
      const currentLineRows = [...(prevMap[selectedLine] || prevMap["1"])];
      currentLineRows[rowIndex] = { ...currentLineRows[rowIndex], [field]: value };
      return {
        ...prevMap,
        [selectedLine]: currentLineRows
      };
    });
  }, [selectedLine]);

  // Tombol Download Excel dengan konsep persis seperti INPUTC.jsx dan INPUTF.jsx
  const handleDownloadExcel = useCallback(() => {
    const toastId = toast.loading("Mengunduh data ...");
    try {
      // 1. Array dari nama header langsung (tanpa istilah kolom)
      const headers = BATCH_ACHIEVEMENT_COLS_META.map(col => col.title);

      // 2. Map data baris ke array of array
      const exportRows = rows.map((row) => {
        return BATCH_ACHIEVEMENT_COLS_META.map(col => {
          const val = row[col.field];
          return val !== undefined && val !== null ? val : '';
        });
      });

      // 3. Konversi menjadi Sheet dan Workbook menggunakan XLSX utils
      const ws = XLSX.utils.aoa_to_sheet([headers, ...exportRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Batch Achievement Line ${selectedLine}`);

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Batch_Achievement_Line_${selectedLine}_${today}.xlsx`);
      toast.success("Download Excel Batch Achievement berhasil!", { id: toastId });
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengunduh Excel", { id: toastId });
    }
  }, [rows, selectedLine]);

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Toaster position="top-right" />

      {/* HEADER CARD / TITLE BAR */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-wider uppercase text-Black-800 flex items-center gap-2">
            <span>Batch Achievement Line {selectedLine}</span>
          </h1>
        </div>

        {/* EXCEL DOWNLOAD BUTTON (Konsep persis INPUTC.jsx & INPUTF.jsx) */}
        <button
          type="button"
          onClick={handleDownloadExcel}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm border border-emerald-500 w-fit active:scale-95"
        >
          <Download size={16} />
          <span>Download</span>
        </button>
      </div>

      {/* SPREADSHEET CONTAINER (Style & Performa persis INPUTC.jsx & INPUTF.jsx) */}
      <div className="bg-white border-2 border-slate-300 shadow-xl rounded overflow-hidden p-1 contain-content" style={{ contain: 'content', contentVisibility: 'auto', containIntrinsicSize: '700px' }}>
        <div
          ref={gridRef}
          onScroll={(e) => setScrollTop(e.target.scrollTop)}
          className="w-full h-[700px] overflow-auto select-none outline-none scrollbar-thin"
          tabIndex={0}
        >
          <table className="w-max min-w-full border-collapse text-xs table-fixed text-left">
            {/* STICKY HEADERS */}
            <thead className="bg-slate-100 text-slate-700 font-semibold shadow-sm sticky top-0 z-40 will-change-transform">
              {/* ROW 1: GROUP HEADERS */}
              <tr className="border-b border-slate-300 text-center uppercase text-[10px]">
                <th rowSpan={2} className="py-1.5 px-2 bg-slate-200 text-slate-800 font-mono text-center sticky top-0 left-0 z-50 w-[60px] min-w-[60px] max-w-[60px] shadow-[1px_0_0_0_#cbd5e1] font-bold">
                  ID
                </th>
                {headerGroups.map((grp, idx) => (
                  <th
                    key={idx}
                    colSpan={grp.span}
                    className="border-r border-b border-slate-300 px-2 py-1.5 text-center bg-slate-200 font-bold text-slate-800"
                  >
                    {grp.name}
                  </th>
                ))}
              </tr>

              {/* ROW 2: COLUMN TITLES LANGSUNG (TANPA KATA KOLOM ATAPUN HURUF ABJAD) */}
              <tr className="border-b border-slate-300 text-center uppercase text-[10px]">
                {BATCH_ACHIEVEMENT_COLS_META.map((col) => {
                  const isSticky = col.stickyLeft !== undefined;
                  return (
                    <th
                      key={col.field}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                        position: isSticky ? 'sticky' : 'static',
                        left: isSticky ? col.stickyLeft : 'auto',
                        zIndex: isSticky ? 41 : 40,
                      }}
                      className={`border-r border-b border-slate-300 px-1 py-2 text-center text-[10px] uppercase tracking-wide ${isSticky ? 'bg-slate-200 shadow-[1px_0_0_0_#cbd5e1]' : 'bg-slate-100'
                        } ${col.isTotal ? 'font-black text-amber-800 bg-amber-50/50' : 'font-bold text-slate-800'}`}
                    >
                      {col.title}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* VIRTUALIZED TABLE BODY */}
            <tbody>
              {(() => {
                const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
                const endIdx = Math.min(rows.length - 1, startIdx + VISIBLE_ROWS + (BUFFER_ROWS * 2));

                return (
                  <>
                    {startIdx > 0 && (
                      <tr style={{ height: `${startIdx * ROW_HEIGHT}px` }}>
                        <td colSpan={BATCH_ACHIEVEMENT_COLS_META.length + 1} className="p-0 border-none"></td>
                      </tr>
                    )}
                    {rows.slice(startIdx, endIdx + 1).map((row, index) => {
                      const rowIdx = startIdx + index;
                      return (
                        <BatchRow
                          key={rowIdx}
                          rowData={row}
                          rowIdx={rowIdx}
                          colsMeta={BATCH_ACHIEVEMENT_COLS_META}
                          onCellChange={handleCellChange}
                        />
                      );
                    })}
                    {endIdx < rows.length - 1 && (
                      <tr style={{ height: `${(rows.length - 1 - endIdx) * ROW_HEIGHT}px` }}>
                        <td colSpan={BATCH_ACHIEVEMENT_COLS_META.length + 1} className="p-0 border-none"></td>
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default BatchAchievement;
