# Analisa Lengkap Tombol Save / Update / Delete
## INPUTC.jsx & INPUTF.jsx — Data Line 2
*Referensi implementasi untuk penerapan di Line 1*

---

## I. Arsitektur Umum

Kedua file (INPUTC & INPUTF) menggunakan **arsitektur dual-database**:

```
User klik tombol
     │
     ▼
[FRONTEND — INPUTC.jsx / INPUTF.jsx]
     │
     ├──► [1] TiDB via Backend Vercel (/api/autosave-c.js atau autosave-f.js)
     │        Menggunakan: sendAutoSave({ action, data, user })
     │
     └──► [2] Google Spreadsheet via GAS webhook langsung
              Menggunakan: fetch(GAS_URL, { method: 'POST', body: gasPayload })
```

Kedua proses dijalankan **secara paralel** menggunakan `Promise.allSettled()`.

---

## II. Dua Sistem Delete (PENTING — Sering Membingungkan)

> [!IMPORTANT]
> Ada DUA fungsi delete yang BERBEDA tujuannya. Ini poin paling kritis.

### A. `handleActionOEE` / `handleActionDT` (Tombol di UI per baris)
- Dipanggil saat user menekan tombol **Delete** yang ada di setiap baris tabel.
- Menghapus ke **TiDB** dan **GAS/GSheets** secara paralel.
- `gas_id` digunakan sebagai referensi untuk menemukan baris yang tepat di GSheets.

### B. `handleDeleteRow` (Shortcut Keyboard atau Context Menu)
- Dipanggil saat user menekan tombol `Delete`/`Backspace` di keyboard **saat seluruh baris terseleksi**, atau klik kanan → "Delete OEE/Downtime Row".
- Hanya menghapus ke **TiDB saja** (tidak menyentuh GSheets).
- Tidak memanggil GAS sama sekali.

---

## III. State & LocalStorage — Kunci Referensi ID

| Variabel | Tipe | Kegunaan |
|---|---|---|
| `oeeIds.current` | `useRef` (array) | Menyimpan `id` dari TiDB per baris OEE |
| `dtIds.current` | `useRef` (array) | Menyimpan `id` dari TiDB per baris Downtime |
| `gasOeeIds.current` | `useRef` (array) | Menyimpan `gas_id` untuk GSheets per baris OEE |
| `gasDtIds.current` | `useRef` (array) | Menyimpan `gas_id` untuk GSheets per baris DT |

### Kunci LocalStorage yang digunakan:

| File | Kunci LS | Konten |
|---|---|---|
| **INPUTC.jsx** | `C_DATA_OEE_L2` | Array data OEE |
| **INPUTC.jsx** | `C_DATA_DT_L2` | Array data Downtime |
| **INPUTC.jsx** | `C_IDS_OEE_L2` | Array TiDB ID untuk OEE |
| **INPUTC.jsx** | `C_IDS_DT_L2` | Array TiDB ID untuk DT |
| **INPUTC.jsx** | `C_GAS_IDS_OEE_L2` | Array gas_id untuk OEE |
| **INPUTC.jsx** | `C_GAS_IDS_DT_L2` | Array gas_id untuk DT |
| **INPUTF.jsx** | `F_DATA_OEE_L2` | Array data OEE |
| **INPUTF.jsx** | `F_DATA_DT_L2` | Array data Downtime |
| **INPUTF.jsx** | `F_IDS_OEE_L2` | Array TiDB ID untuk OEE |
| **INPUTF.jsx** | `F_IDS_DT_L2` | Array TiDB ID untuk DT |
| **INPUTF.jsx** | `F_GAS_IDS_OEE_L2` | Array gas_id untuk OEE |
| **INPUTF.jsx** | `F_GAS_IDS_DT_L2` | Array gas_id untuk DT |

> [!NOTE]
> Indeks array di `oeeIds`, `dtIds`, `gasOeeIds`, `gasDtIds` selalu **sejajar** dengan indeks baris di `oeeData` / `dtData`. Baris ke-0 di tabel = indeks ke-0 di semua array ID.

---

## IV. Alur Tombol Save (handleActionOEE — actionType: 'save')

### Kondisi Aktif
Baris belum pernah disimpan → `oeeIds.current[rowIdx] === null`

### Flow Lengkap

```
1. Ambil rowData[targetRowIdx] dari state
2. Validasi kunci wajib:
   INPUTC: Tanggal, No Batch, Shift, AT_SH, AT_SM, AT_EH, AT_EM
   INPUTF: rowData[2], rowData[0], rowData[3], rowData[35..38]
   → Jika tidak lengkap: toast.error, BERHENTI.

3. Susun payloadData (objek field-per-field dari rowData)
   INPUTC: menggunakan konstanta C.TANGGAL, C.NO_BATCH, dst.
   INPUTF: menggunakan indeks langsung rowData[0], rowData[1], dst.

4. Tentukan apiAction = 'submit_reject_c' (atau 'submit_reject_f')

5. Generate gas_id baru:
   gas_id = `GAS_${Date.now()}_${Math.floor(Math.random() * 10000)}`
   → Simpan ke gasOeeIds.current[targetRowIdx]
   → Simpan ke localStorage (LS_GAS_IDS_OEE)

6. Jalankan PARALEL (Promise.allSettled):
   Promise[0]: sendAutoSave ke TiDB
               → /api/autosave-c.js action: 'submit_reject_c'
   Promise[1]: fetch() langsung ke GAS URL
               → action: 'direct_append_c' (atau 'direct_append_f')
               → payload: { rowData: [...rowData], gas_id }
               → GAS menyimpan data di baris baru spreadsheet
               → GAS juga menulis gas_id ke kolom BC (kolom 55)

7. Tunggu Promise.allSettled()

8. Cek hasil Promise[0] (TiDB):
   ✅ Sukses (res.status === 'success' && res.original_id):
      - Simpan res.original_id ke oeeIds.current[targetRowIdx]
      - Simpan ke localStorage
      - Force re-render baris → tombol berubah dari [Save] menjadi [Update] & [Delete]
      - toast.success
   ❌ Gagal:
      - toast.error
      - gas_id tetap tersimpan (data sudah masuk GSheets tapi TiDB gagal)
```

---

## V. Alur Tombol Update (handleActionOEE — actionType: 'update')

### Kondisi Aktif
Baris sudah tersimpan → `oeeIds.current[rowIdx] !== null`

### Flow Lengkap

```
1. Ambil rowData[targetRowIdx] dari state
2. original_id = oeeIds.current[targetRowIdx]  ← ID TiDB yang sudah ada
3. Validasi kunci wajib (sama dengan Save)

4. Susun payloadData dengan original_id yang sudah ada

5. Tentukan apiAction = 'update_reject_c' (atau 'update_reject_f')

6. Ambil gas_id lama dari gasOeeIds.current[targetRowIdx]
   CATATAN: Tidak generate gas_id baru. Reuse gas_id lama.

7. Jalankan PARALEL (Promise.allSettled):
   Promise[0]: sendAutoSave ke TiDB
               → action: 'update_reject_c'
               → Mencari baris di DB berdasarkan original_id, lalu UPDATE
   Promise[1]: fetch() langsung ke GAS URL
               → action: 'direct_update_c' (atau 'direct_update_f')
               → payload: { rowData: [...rowData], gas_id }
               → GAS mencari baris di spreadsheet berdasarkan gas_id
               → GAS menimpa baris tersebut dengan data baru

8. Tunggu Promise.allSettled()

9. Cek hasil Promise[0] (TiDB):
   ✅ Sukses:
      - oeeIds.current TIDAK diupdate (ID tidak berubah)
      - Force re-render baris
      - toast.success
   ❌ Gagal: toast.error
```

> [!NOTE]
> Berbeda dengan analisa lama (newupdate.txt), **Update SEKARANG SUDAH mengirim ke GSheets** via `direct_update_c` / `direct_update_f`. Ini sudah diperbaiki di INPUTC dan INPUTF.

---

## VI. Alur Tombol Delete (handleActionOEE — actionType: 'delete')

### Kondisi Aktif
Baris sudah tersimpan → `oeeIds.current[rowIdx] !== null`

### Flow Lengkap

```
1. Ambil original_id dari oeeIds.current[targetRowIdx]
2. Ambil gas_id dari gasOeeIds.current[targetRowIdx]

3. Siapkan array promises:
   if (original_id):
     Promise[0]: sendAutoSave ke TiDB
                 → action: 'delete_reject_c'
                 → TiDB hapus baris berdasarkan original_id
   if (gas_id):
     Promise[1]: fetch() langsung ke GAS URL
                 → action: 'direct_delete_c' (atau 'direct_delete_f')
                 → payload: { gas_id }
                 → GAS mencari baris berdasarkan gas_id di kolom BC
                 → GAS hapus baris tersebut dari spreadsheet

4. Await Promise.allSettled()

5. Bersihkan state lokal:
   oeeIds.current[targetRowIdx] = null
   gasOeeIds.current[targetRowIdx] = null
   Simpan ke localStorage

6. Update UI (setOeeData):
   - Filter (hapus) baris targetRowIdx dari array
   - Geser semua baris ke atas
   - Tambah 1 baris kosong di akhir
   - Lakukan hal yang sama untuk oeeIds.current & gasOeeIds.current

7. toast.success
```

---

## VII. Perbedaan INPUTC vs INPUTF

| Aspek | INPUTC.jsx (Zone C) | INPUTF.jsx (Zone F) |
|---|---|---|
| **Kolom OEE** | 52 kolom, pakai konstanta C.FIELD_NAME | 52 kolom, pakai indeks angsung (rowData[0], rowData[1]) |
| **Kolom DT** | 14 kolom, pakai konstanta DC.FIELD_NAME | 15 kolom (+lot_no), pakai indeks langsung |
| **TiDB tabel OEE** | `oee_line2_zonec` | `oee_line2_zonef` |
| **TiDB tabel DT** | `downtime_line2_zonec` | `downtime_line2_zonef` |
| **GAS action OEE Save** | `direct_append_c` | `direct_append_f` |
| **GAS action OEE Update** | `direct_update_c` | `direct_update_f` |
| **GAS action OEE Delete** | `direct_delete_c` | `direct_delete_f` |
| **GAS action DT Save** | `direct_append_dt_c` | `direct_append_dt_f` |
| **GAS action DT Update** | `direct_update_dt_c` | `direct_update_dt_f` |
| **GAS action DT Delete** | `direct_delete_dt_c` | `direct_delete_dt_f` |
| **LS Key Prefix** | `C_` | `F_` |
| **Line di GAS payload** | `line: '2'` | `line: '2'` |
| **Validasi kunci OEE** | Menggunakan `C.TANGGAL`, dll. | Menggunakan indeks: `rowData[2]`, `rowData[0]`, dll. |
| **Validasi kunci DT** | Menggunakan `DC.TANGGAL`, dll. | Menggunakan indeks: `rowData[0]`, `rowData[3]`, dll. |

---

## VIII. Autosave (triggerAutosaveOEE / triggerAutosaveDT)

Selain tombol manual, ada mekanisme **autosave** yang berjalan saat user mengedit sel:

```
User edit sel → handleFinishEdit dipanggil
                      │
                      ▼ (debounce 1000ms)
              triggerAutosaveOEE(rIdx, rowData)
                      │
                      ├── Cek kelengkapan data kunci
                      │   Jika tidak lengkap DAN baris sudah ada di DB:
                      │   → delete dari TiDB (bersihkan DB dari data tidak lengkap)
                      │
                      └── Jika lengkap:
                          → sendAutoSave ke TiDB saja
                          → TIDAK mengirim ke GAS
```

> [!WARNING]
> Autosave HANYA menyentuh TiDB. GAS/GSheets TIDAK diupdate oleh autosave. Sinkronisasi ke GSheets hanya terjadi saat user menekan tombol Save/Update/Delete secara manual.

---

## IX. Template untuk Line 1

Berikut adalah **checklist perubahan** yang dibutuhkan saat mengimplementasi di Line 1:

### A. Constants yang harus diubah
```javascript
// Line 2:
const LS_OEE = 'C_DATA_OEE_L2'
const LS_DT  = 'C_DATA_DT_L2'
// dll.

// Line 1 (contoh untuk Zone C):
const LS_OEE = 'C_DATA_OEE_L1'
const LS_DT  = 'C_DATA_DT_L1'
// dll.
```

### B. GAS payload line yang harus diubah
```javascript
// Line 2:
user: { ...(user || {}), line: '2' }

// Line 1:
user: { ...(user || {}), line: '1' }
```

### C. Backend API action names
Action name di TiDB (autosave-c.js / autosave-f.js) perlu dipastikan sudah mendukung Line 1, atau perlu dibuat endpoint baru.

### D. GAS action names
GAS di `APP script.txt` perlu menambahkan fungsi-fungsi baru untuk Line 1 (misalnya `directAppendC_L1`, dll.) ATAU cukup gunakan `userLine` yang sudah ada sebagai parameter untuk memilih sheet yang tepat.

### E. TiDB tabel
Pastikan tabel `oee_line1_zonec`, `downtime_line1_zonec`, dst. sudah dibuat di TiDB.

---

## X. Masalah yang Teridentifikasi & Status

| No | Masalah | Status |
|---|---|---|
| 1 | Tombol Update tidak update GSheets | ✅ Sudah diperbaiki (sudah pakai `direct_update_c/f`) |
| 2 | gasId ditulis di kolom CG (bukan BC) untuk INPUTF | ✅ Sudah diperbaiki (kolom 55 = BC) |
| 3 | `calculateOEERow` mengexpand array ke 54 elemen | ✅ Sudah diperbaiki (hapus `setV(52,lc); setV(53,lc)`) |
| 4 | Array(55) di `loadDataServer` mapping | ✅ Sudah diperbaiki → Array(52) |
| 5 | `handleDeleteRow` (keyboard) tidak menyentuh GSheets | ⚠️ By design, tapi perlu dipertimbangkan |
| 6 | Tidak ada lot_no di payload INPUTC Downtime | ℹ️ Memang kolom DT Zone C tidak punya lot_no |
