import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser, verifyUser, fetchValidationData } from '../services/api';
import { User, Lock, Briefcase, MapPin, Upload, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'verify'
  const [loading, setLoading] = useState(false);
  const [dropdowns, setDropdowns] = useState({ jabatan: [], zone: [] });
  
  // State Form
  const [formData, setFormData] = useState({
    id_karyawan: '',
    password: '',
    nama: '',
    jabatan: '',
    plant_zone: '',
    foto: '', // Kita simpan Base64 string disini
    code: '' // Untuk verifikasi
  });

  // Ambil Data Dropdown dari Sheet saat halaman dibuka
  useEffect(() => {
    const loadData = async () => {
      const result = await fetchValidationData();
      if (result.status === 'success') {
        setDropdowns({
          jabatan: result.data.List_Jabatan || [],
          zone: result.data.List_Plant_Zone || []
        });
      }
    };
    loadData();
  }, []);

  // Handle Perubahan Input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Upload Foto (Konversi ke Base64)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) { // Limit 500KB agar Sheet tidak berat
        alert("Ukuran foto maksimal 500KB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, foto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- LOGIKA UTAMA ---

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await loginUser(formData.id_karyawan, formData.password);
    setLoading(false);
    
    if (res.status === 'success') {
      login(res.user); // Simpan ke Context
      // Redirect akan dihandle otomatis oleh App.jsx
    } else {
      alert(res.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Logika: Jika Manager/Asisten, kosongkan Zone
    const isManager = formData.jabatan.toLowerCase().includes('manager') || formData.jabatan.toLowerCase().includes('asisten');
    const dataToSend = {
      ...formData,
      plant_zone: isManager ? '-' : formData.plant_zone
    };

    const res = await registerUser(dataToSend);
    setLoading(false);

    if (res.status === 'success') {
      alert(res.message); // "Minta kode ke Admin"
      setMode('verify'); // Pindah ke layar verifikasi
    } else {
      alert("Registrasi Gagal: " + res.message);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await verifyUser(formData.id_karyawan, formData.code);
    setLoading(false);

    if (res.status === 'success') {
      alert("Verifikasi Berhasil! Silakan Login.");
      setMode('login');
    } else {
      alert(res.message);
    }
  };

  // --- LOGIKA TAMPILAN (UI) ---

  // Cek apakah jabatan yang dipilih adalah level Manager (untuk menyembunyikan Zone)
  const isManagerSelected = formData.jabatan.toLowerCase().includes('manager') || formData.jabatan.toLowerCase().includes('asisten');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">OEE System</h1>
          <p className="text-slate-500">
            {mode === 'login' && 'Masuk untuk memulai shift Anda'}
            {mode === 'register' && 'Pendaftaran Karyawan Baru'}
            {mode === 'verify' && 'Masukkan Kode Verifikasi'}
          </p>
        </div>

        {/* FORM LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Karyawan</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  name="id_karyawan" 
                  onChange={handleChange} 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Contoh: 12345" 
                  required 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password" 
                  name="password" 
                  onChange={handleChange} 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </div>

            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Masuk'}
            </button>
            
            <p className="text-center text-sm text-slate-600 mt-4">
              Belum punya akun? <button type="button" onClick={() => setMode('register')} className="text-blue-600 font-bold hover:underline">Daftar disini</button>
            </p>
          </form>
        )}

        {/* FORM REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
             <div className="grid grid-cols-2 gap-3">
                <input name="id_karyawan" onChange={handleChange} className="p-2 border rounded-lg text-sm" placeholder="ID Karyawan" required />
                <input name="nama" onChange={handleChange} className="p-2 border rounded-lg text-sm" placeholder="Nama Lengkap" required />
             </div>

             <div className="relative">
                <Briefcase className="absolute left-3 top-3 text-slate-400" size={18} />
                <select name="jabatan" onChange={handleChange} className="w-full pl-10 p-2 border rounded-lg text-sm bg-white" required>
                  <option value="">Pilih Jabatan</option>
                  {dropdowns.jabatan.map((jab, idx) => (
                    <option key={idx} value={jab}>{jab}</option>
                  ))}
                </select>
             </div>

             {/* Logic: Sembunyikan Zone jika Manager */}
             {!isManagerSelected && (
               <div className="relative animate-in fade-in slide-in-from-top-2">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                  <select name="plant_zone" onChange={handleChange} className="w-full pl-10 p-2 border rounded-lg text-sm bg-white" required>
                    <option value="">Pilih Plant Zone</option>
                    {dropdowns.zone.map((z, idx) => (
                      <option key={idx} value={z}>{z}</option>
                    ))}
                  </select>
               </div>
             )}

             <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="foto-upload" />
                <label htmlFor="foto-upload" className="cursor-pointer flex flex-col items-center gap-1">
                  <Upload size={20} className="text-slate-400" />
                  <span className="text-xs text-slate-500">{formData.foto ? "Foto Terpilih ✅" : "Upload Foto Diri (Max 500KB)"}</span>
                </label>
             </div>

             <input type="password" name="password" onChange={handleChange} className="w-full p-2 border rounded-lg text-sm" placeholder="Buat Password" required />

             <button disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Daftar Sekarang'}
             </button>

             <p className="text-center text-sm text-slate-600 mt-2">
              Sudah punya akun? <button type="button" onClick={() => setMode('login')} className="text-blue-600 font-bold hover:underline">Login</button>
            </p>
          </form>
        )}

        {/* FORM VERIFIKASI */}
        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-xs text-yellow-800">
              Silakan minta <b>Kode Verifikasi</b> kepada Admin/Manajer untuk mengaktifkan akun ID: <b>{formData.id_karyawan}</b>.
            </div>

            <div className="text-center">
              <input 
                name="code" 
                onChange={handleChange} 
                className="w-full text-center text-2xl tracking-widest font-bold p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none uppercase" 
                placeholder="XXXXXX" 
                maxLength={6}
                required 
              />
            </div>

            <button disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg font-medium transition flex justify-center items-center gap-2">
               {loading ? <Loader2 className="animate-spin" /> : <>Verifikasi <CheckCircle size={18}/></>}
            </button>
            
            <button type="button" onClick={() => setMode('login')} className="w-full text-slate-500 text-sm hover:underline">
              Batal / Kembali ke Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;