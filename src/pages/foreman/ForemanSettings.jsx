import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { submitOEEData } from '../../services/api';
import { 
  User, Lock, MessageSquare, Camera, Sun, Moon, 
  ShieldCheck, Send, Bug, FileText, HelpCircle, Loader2, Save, KeyRound, ChevronDown, X, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// --- DATA PUSAT BANTUAN (FAQ) ---
const helpData = [
  {
    title: "Bagian 1 : AKUN",
    items: [
      { q: "a. Cara pendaftaran akun", a: "Hubungi Administrator atau kunjungi Portal Akses. Pilih 'Daftar' lalu isikan ID Karyawan dan biodata lengkap. Akun harus disetujui (Approved) oleh Admin sebelum dapat digunakan." },
      { q: "b. Cara Login akun", a: "Masuk ke halaman Portal Akses, masukkan ID Karyawan dan Password yang telah didaftarkan. Pastikan huruf besar/kecil sesuai." },
      { q: "c. Cara Penghapusan Akun", a: "Penghapusan akun hanya dapat dilakukan oleh Super Admin. Silakan ajukan permintaan melalui fitur 'Bantuan & Masukan' atau hubungi atasan Anda." }
    ]
  },
  {
    title: "Bagian 2 : INPUT DATA",
    items: [
      { q: "a. Cara menggunakan Sidebar", a: "Klik ikon garis tiga (Menu) di pojok kiri atas untuk membuka Sidebar. Anda dapat menavigasi ke Input Hub, Daily Onesheet, dan Pengaturan melalui menu tersebut." },
      { q: "b. Cara melakukan input data", a: "Masuk ke menu 'INPUT HUB'. Pilih kategori data yang ingin dimasukkan (Reject/Downtime) dan zona mesin (Zone C / Zone F)." },
      { q: "c. Cara melakukan Input data 'Reject'", a: "Pilih form Reject. Isi parameter utama seperti Shift, Batch, dan Counter. Kalkulator otomatis akan menghitung total akhir. Centang 'Akhir Shift' jika itu adalah batch terakhir, lalu klik 'Simpan'." },
      { q: "d. Cara melakukan input data 'Downtime'", a: "Pada form Downtime, masukkan parameter utama. Anda bisa memasukkan banyak baris waktu sekaligus (Multi-Waktu). Klik 'Gandakan ke Daftar' lalu klik 'Simpan ke Server' untuk mengirim semua data sekaligus." },
      { q: "e. Cara menggunakan tabel pada pages Input data 'Reject'", a: "Tabel berada di bawah form. Gunakan filter tanggal di pojok kanan atas tabel untuk melihat data terdahulu. Klik 'Full View' untuk tampilan layar penuh." },
      { q: "f. Cara mengedit data pada tabel pages Input data 'Reject'", a: "Cari data yang ingin diedit di tabel, lalu klik tombol kuning (Pena). Data akan masuk kembali ke form atas. Perbaiki data, lalu klik 'Update Data'." },
      { q: "g. Cara menghapus data pada tabel pages Input data 'Reject'", a: "Klik tombol merah (Tempat Sampah) pada baris data di tabel. Data yang berstatus 'Akhir Shift' dilindungi dan tidak dapat dihapus." },
      { q: "h. Cara menggunakan tabel pada pages Input data 'Downtime'", a: "Sama seperti Reject, tabel Downtime memiliki fitur Filter Tanggal dan mode Full View. Tabel ini memantau waktu kejadian dan durasi downtime." },
      { q: "i. Cara mengedit data pada tabel pages Input data 'Downtime'", a: "Klik ikon kuning (Pena) di tabel. Form Multi-Waktu akan berubah menjadi form Edit Tunggal. Sesuaikan data lalu klik 'Simpan Pembaruan'." },
      { q: "j. Cara menghapus data pada tabel pages Input data 'Downtime'", a: "Klik ikon merah (Tong Sampah) di baris data yang ingin dihapus. Tindakan ini akan menghapus data secara permanen dari server." }
    ]
  },
  {
    title: "Bagian 3 : DAILY ONESHEET",
    items: [
      { q: "a. Cara menggunakan menu DAILY ONESHEET secara general", a: "Daily Onesheet menyajikan visualisasi OEE, Availability, Performance, dan Quality. Ubah 'Tanggal' dan 'Volume' pada panel atas (Navbar), lalu klik tombol 'CARI DATA' untuk memuat laporan." },
      { q: "b. Cara mendownload file", a: "Pastikan data telah selesai dimuat. Klik tombol 'UNDUH PDF' di pojok kanan atas Navbar. Sistem akan menyesuaikan dengan tema Anda dan mengunduh gambar beresolusi tinggi." }
    ]
  },
  {
    title: "Bagian 4 : SETTING",
    items: [
      { q: "a. Cara menggunakan menu SETTING secara general", a: "Gunakan menu Setting untuk memperbarui profil (Ganti Foto), mengubah preferensi tema UI (Gelap/Terang), memperbarui Password, serta mengirimkan laporan Error/Bug langsung ke Developer." }
    ]
  }
];

// --- SUB-COMPONENT: ACCORDION ---
const AccordionItem = ({ item, isDark }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'} last:border-0`}>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex justify-between items-center py-3 text-left transition-colors ${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'}`}>
        <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.q}</span>
        <ChevronDown size={16} className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-500'}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className={`pb-4 text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ForemanSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [theme, setTheme] = useState(localStorage.getItem('appTheme') || 'dark');
  const isDark = theme === 'dark';

  // State Modals
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // State Password
  const [passData, setPassData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isPassLoading, setIsPassLoading] = useState(false);

  // State Photo
  const [photoPreview, setPhotoPreview] = useState(user?.foto || null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [isPhotoChanged, setIsPhotoChanged] = useState(false);

  // State Feedback
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState("masukan");
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  // Sinkronisasi Tema
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('appTheme', newTheme);
    window.dispatchEvent(new Event('themeChange')); 
    toast.success(`Tema ${newTheme === 'dark' ? 'Gelap' : 'Terang'} diaktifkan!`, { icon: newTheme === 'dark' ? '🌙' : '☀️' });
  };

  useEffect(() => {
    const handleThemeChange = () => setTheme(localStorage.getItem('appTheme') || 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Handler API Update Password
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) return toast.error("Password baru dan konfirmasi tidak cocok!");
    if (passData.newPassword.length < 4) return toast.error("Password baru terlalu pendek!");

    setIsPassLoading(true);
    try {
      const payload = { id: user.id, oldPassword: passData.oldPassword, newPassword: passData.newPassword };
      const res = await submitOEEData({ action: 'update_password', data: payload }, user);
      if (res.status === 'success') {
        toast.success("Password berhasil diperbarui!");
        setPassData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(res.message || "Gagal mengubah password.");
      }
    } catch (error) { toast.error("Terjadi kesalahan koneksi."); }
    setIsPassLoading(false);
  };

  // Handler API Upload Foto
// Helper: Kompresi Gambar sebelum dikirim (Mencegah Google Sheets Error Limit Teks)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Maksimal dimensi 400x400 untuk foto profil agar Base64 sangat ringan
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          // Kualitas 0.7 (70%) sudah cukup bagus untuk foto bulat kecil
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); 
          resolve(compressedBase64);
        };
      };
    });
  };

  // Handler API Upload Foto
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran foto maksimal 5MB!"); // Batas naik ke 5MB karena akan kita kompres
      
      const toastId = toast.loading("Memproses gambar...");
      try {
        const compressedData = await compressImage(file);
        setPhotoPreview(compressedData); // Set UI Preview dengan data terkompresi
        setIsPhotoChanged(true);
        toast.success("Gambar siap diunggah!", { id: toastId });
      } catch (err) {
        toast.error("Gagal memproses gambar.", { id: toastId });
      }
    }
  };

  const handleSavePhoto = async () => {
    if (!isPhotoChanged) return;
    setIsPhotoLoading(true);
    try {
      // Mengirim data Base64 yang sudah ringan ke backend
      const res = await submitOEEData({ action: 'update_foto', data: { id: user.id, foto: photoPreview } }, user);
      if (res.status === 'success') {
        // PENTING: Update context auth/local storage agar Sidebar ikut ganti foto
        // (Asumsi Anda menggunakan format ini di AuthContext)
        const updatedUser = { ...user, foto: res.foto || photoPreview };
        localStorage.setItem('oee_user', JSON.stringify(updatedUser)); 
        
        toast.success("Foto profil berhasil diperbarui! Silakan tekan F5/Refresh browser Anda untuk melihat perubahan di seluruh sistem.", { duration: 6000 });
        setIsPhotoChanged(false);
      } else {
        toast.error(res.message);
      }
    } catch (error) { 
      toast.error("Terjadi kesalahan koneksi."); 
    }
    setIsPhotoLoading(false);
  };
  
  // Handler API Kirim Email Feedback
  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return toast.error("Isi pesan terlebih dahulu!");
    setIsFeedbackLoading(true);
    try {
      const res = await submitOEEData({ action: 'send_feedback', data: { type: feedbackType, text: feedbackText } }, user);
      if (res.status === 'success') {
        toast.success("Laporan berhasil dikirim ke Developer (agungdwicahyo2001@gmail.com)!");
        setFeedbackText("");
      } else {
        toast.error(res.message);
      }
    } catch (e) { toast.error("Terjadi kesalahan jaringan."); }
    setIsFeedbackLoading(false);
  };

  // --- THEME CLASSES ---
  const bgMain = isDark ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-800';
  const cardBg = isDark ? 'bg-[#1e293b]/80 border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-xl';
  const inputBg = isDark ? 'bg-black/20 border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const tabActive = isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-blue-600 text-white shadow-lg';
  const tabInactive = isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600';

  return (
    <div className={`min-h-screen pt-8 pb-32 px-4 md:px-8 font-sans transition-colors duration-500 ${bgMain}`}>
      <Toaster position="top-center" toastOptions={{style: {background: isDark?'#1e293b':'#fff', color: isDark?'#fff':'#000'}}} />
      
      <div className="max-w-6xl mx-auto">
        {/* HEADER TITLE */}
        <div className="mb-10">
          <h1 className={`text-3xl md:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Pengaturan Sistem</h1>
          <p className={`text-sm mt-2 ${textMuted}`}>Kelola preferensi akun, keamanan, dan bantuan OEE V13 Anda.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="lg:col-span-3 space-y-2">
            <button onClick={() => setActiveTab('account')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'account' ? tabActive : tabInactive}`}>
              <User size={20} className={activeTab === 'account' ? 'animate-bounce' : ''}/> Akun
            </button>
            <button onClick={() => setActiveTab('privacy')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'privacy' ? tabActive : tabInactive}`}>
              <Lock size={20} className={activeTab === 'privacy' ? 'animate-bounce' : ''}/> Keamanan & Privasi
            </button>
            <button onClick={() => setActiveTab('feedback')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'feedback' ? tabActive : tabInactive}`}>
              <MessageSquare size={20} className={activeTab === 'feedback' ? 'animate-bounce' : ''}/> Bantuan & Masukan
            </button>
          </div>

          {/* CONTENT AREA */}
          <div className="lg:col-span-9 relative">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: AKUN & TEMA */}
              {activeTab === 'account' && (
                <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  {/* Foto & Identitas */}
                  <div className={`p-8 rounded-3xl border flex flex-col md:flex-row items-center md:items-start gap-8 backdrop-blur-md ${cardBg}`}>
                    <div className="relative group">
                      <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${isDark ? 'border-slate-700' : 'border-slate-200'} shadow-2xl`}>
                        {photoPreview ? (
                          <img src={photoPreview} alt="Profile" className="w-full h-full object-cover"/>
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <User size={48} className={textMuted}/>
                          </div>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-3 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-500 hover:scale-110 transition-all shadow-lg">
                        <Camera size={18} />
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                      </label>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                      <div>
                        <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.nama || 'Foreman Name'}</h2>
                        <p className={`font-mono text-sm ${textMuted} mt-1`}>ID: {user?.id || 'FRM-000'} | Jabatan: {user?.jabatan || 'Foreman'}</p>
                        <span className="inline-block mt-3 px-3 py-1 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest">Akun Aktif & Terverifikasi</span>
                      </div>
                      {isPhotoChanged && (
                        <button onClick={handleSavePhoto} disabled={isPhotoLoading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all mx-auto md:mx-0">
                          {isPhotoLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Upload ke Server
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pengaturan Tema */}
                  <div className={`p-8 rounded-3xl border backdrop-blur-md ${cardBg}`}>
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><Sun size={20} className="text-yellow-500"/> Personalisasi Tema Tampilan</h3>
                    <p className={`text-sm mb-6 ${textMuted}`}>Pilih mode tampilan yang paling nyaman untuk mata Anda selama bekerja di area produksi.</p>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                      <button onClick={() => changeTheme('dark')} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${isDark ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-900/20' : 'border-slate-200 hover:border-slate-300'}`}>
                        <Moon size={32} className={isDark ? 'text-blue-400' : 'text-slate-400'}/>
                        <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-slate-600'}`}>Mode Gelap</span>
                      </button>
                      <button onClick={() => changeTheme('light')} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${!isDark ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-white/10 hover:border-white/20'}`}>
                        <Sun size={32} className={!isDark ? 'text-blue-600' : 'text-slate-400'}/>
                        <span className={`font-bold ${!isDark ? 'text-blue-600' : 'text-slate-400'}`}>Mode Terang</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: PRIVASI & KEAMANAN */}
              {activeTab === 'privacy' && (
                <motion.div key="privacy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className={`p-6 rounded-3xl border flex items-center gap-4 ${isDark ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30"><ShieldCheck size={28}/></div>
                    <div>
                      <h4 className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Koneksi Anda Aman</h4>
                      <p className={`text-xs mt-1 ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/80'}`}>Sistem OEE V13 menggunakan enkripsi sesi standar untuk menjaga kerahasiaan data line produksi.</p>
                    </div>
                  </div>

                  <div className={`p-8 rounded-3xl border backdrop-blur-md ${cardBg}`}>
                    <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><KeyRound size={20} className="text-purple-500"/> Pembaruan Kata Sandi</h3>
                    <form onSubmit={handlePasswordUpdate} className="space-y-5 max-w-xl">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold tracking-widest uppercase ${textMuted}`}>Password Lama</label>
                        <input type="password" value={passData.oldPassword} onChange={e => setPassData({...passData, oldPassword: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-mono ${inputBg}`} placeholder="••••••••" required/>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold tracking-widest uppercase ${textMuted}`}>Password Baru</label>
                          <input type="password" value={passData.newPassword} onChange={e => setPassData({...passData, newPassword: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-mono ${inputBg}`} placeholder="••••••••" required/>
                        </div>
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold tracking-widest uppercase ${textMuted}`}>Konfirmasi Password</label>
                          <input type="password" value={passData.confirmPassword} onChange={e => setPassData({...passData, confirmPassword: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-mono ${inputBg}`} placeholder="••••••••" required/>
                        </div>
                      </div>
                      <button type="submit" disabled={isPassLoading} className="mt-4 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold w-full md:w-auto flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 active:scale-95">
                        {isPassLoading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Simpan Password Baru
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: FEEDBACK & BANTUAN */}
              {activeTab === 'feedback' && (
                <motion.div key="feedback" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  {/* PUSAT BANTUAN & PRIVASI */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => setShowHelp(true)} className={`p-6 rounded-2xl border flex items-center gap-4 text-left transition-all group ${isDark ? 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20' : 'bg-blue-50 border-blue-200 hover:bg-blue-100 shadow-md'}`}>
                      <div className="p-3 bg-blue-500 text-white rounded-xl group-hover:scale-110 transition-transform shadow-lg"><HelpCircle size={24}/></div>
                      <div>
                        <h4 className={`font-black ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>BUKA PUSAT BANTUAN</h4>
                        <p className={`text-xs mt-1 ${isDark ? 'text-blue-400/70' : 'text-blue-600/80'}`}>Panduan lengkap cara penggunaan sistem OEE</p>
                      </div>
                    </button>
                    <button onClick={() => setShowPrivacy(true)} className={`p-6 rounded-2xl border flex items-center gap-4 text-left transition-all group ${isDark ? 'bg-emerald-600/10 border-emerald-500/30 hover:bg-emerald-600/20' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 shadow-md'}`}>
                      <div className="p-3 bg-emerald-500 text-white rounded-xl group-hover:scale-110 transition-transform shadow-lg"><FileText size={24}/></div>
                      <div>
                        <h4 className={`font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>KEBIJAKAN PRIVASI</h4>
                        <p className={`text-xs mt-1 ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/80'}`}>Tata kelola informasi & jejak audit</p>
                      </div>
                    </button>
                  </div>

                  {/* FORM FEEDBACK */}
                  <div className={`p-8 rounded-3xl border backdrop-blur-md ${cardBg}`}>
                    <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><Bug size={20} className="text-orange-500"/> Kirim Masukan atau Lapor Bug</h3>
                    <p className={`text-sm mb-6 ${textMuted}`}>Laporan Anda akan langsung terkirim ke email Developer (agungdwicahyo2001@gmail.com).</p>
                    
                    <div className="space-y-4">
                      <div className="flex gap-6 mb-2">
                        <label className={`flex items-center gap-2 cursor-pointer text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <input type="radio" name="fb_type" checked={feedbackType === 'masukan'} onChange={() => setFeedbackType('masukan')} className="w-4 h-4 accent-blue-500"/> Ide/Masukan
                        </label>
                        <label className={`flex items-center gap-2 cursor-pointer text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <input type="radio" name="fb_type" checked={feedbackType === 'bug'} onChange={() => setFeedbackType('bug')} className="w-4 h-4 accent-orange-500"/> Lapor Bug
                        </label>
                      </div>
                      <textarea 
                        value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows="5" 
                        className={`w-full p-4 rounded-xl border outline-none text-sm resize-none ${inputBg}`} 
                        placeholder={feedbackType === 'bug' ? "Jelaskan kronologi error yang Anda alami..." : "Punya ide fitur baru untuk mempermudah kerja Foreman?"}
                      ></textarea>
                      <button onClick={handleSendFeedback} disabled={isFeedbackLoading} className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center w-full md:w-auto gap-2 transition-all shadow-lg active:scale-95">
                        {isFeedbackLoading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Kirim ke Developer
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* --- MODAL PUSAT BANTUAN (FAQ) --- */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHelp(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-3xl h-[85vh] flex flex-col rounded-3xl border shadow-2xl ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
              
              <div className={`p-5 md:p-6 border-b flex justify-between items-center shrink-0 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <h2 className={`text-xl font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}><HelpCircle className="text-blue-500"/> PUSAT BANTUAN OEE</h2>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Panduan operasional harian untuk Foreman</p>
                </div>
                <button onClick={() => setShowHelp(false)} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-300'}`}>
                  <X size={24}/>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar space-y-8">
                {helpData.map((category, idx) => (
                  <div key={idx}>
                    <h3 className={`text-xs font-black tracking-widest uppercase mb-4 px-3 py-1 inline-block rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-300'}`}>
                      {category.title}
                    </h3>
                    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                      {category.items.map((item, iIdx) => (
                        <div key={iIdx} className="px-4">
                          <AccordionItem item={item} isDark={isDark} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL KEBIJAKAN PRIVASI --- */}
      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrivacy(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
              
              <div className={`p-5 md:p-6 border-b flex justify-between items-center shrink-0 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <h2 className={`text-xl font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}><ShieldCheck className="text-emerald-500"/> KEBIJAKAN PRIVASI OEE SYSTEM V13</h2>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tata kelola informasi, kewajiban pengguna, dan jejak audit.</p>
                </div>
                <button onClick={() => setShowPrivacy(false)} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-300'}`}>
                  <X size={24}/>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar space-y-6">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                    <h3 className={`font-bold flex items-center gap-2 mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><CheckCircle size={16} className="text-emerald-500"/> 1. Pengumpulan Data (Data Collection)</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      Sistem ini secara otomatis merekam ID Karyawan, Nama, Jabatan, dan informasi stasiun kerja (Plant/Line/Zone) setiap kali pengguna melakukan *Login*. Selain itu, setiap tindakan *Input*, *Edit*, dan *Delete* data mesin akan terekam beserta stempel waktu (*Timestamp*).
                    </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                    <h3 className={`font-bold flex items-center gap-2 mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><CheckCircle size={16} className="text-emerald-500"/> 2. Penggunaan Data (Data Usage)</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      Data operasional yang dimasukkan semata-mata digunakan untuk kalkulasi OEE harian, analisis *Availability, Performance, Quality*, serta pelaporan kerugian potensial (*Potential Loss*) kepada manajemen pabrik.
                    </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                    <h3 className={`font-bold flex items-center gap-2 mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><CheckCircle size={16} className="text-emerald-500"/> 3. Jejak Audit & Pertanggungjawaban (Audit Trail)</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      Untuk menjaga integritas data, setiap perubahan pada *Database* (termasuk mengedit baris yang telah disubmit) akan mencantumkan label "Edited" beserta nama pengedit terakhir. Pemalsuan data metrik produksi merupakan pelanggaran berat terhadap peraturan perusahaan.
                    </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                    <h3 className={`font-bold flex items-center gap-2 mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}><CheckCircle size={16} className="text-emerald-500"/> 4. Keamanan Sistem (Security)</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      OEE System V13 berjalan di atas arsitektur tertutup. Kata sandi pengguna tidak disimpan dalam bentuk *plaintext* yang terlihat di UI. Pengguna diwajibkan untuk menekan tombol *Logout* apabila meninggalkan stasiun kerja (*workstation*) untuk mencegah penyalahgunaan sesi.
                    </p>
                </div>
              </div>
              <div className={`p-4 border-t text-center text-xs font-bold ${isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  Terakhir diperbarui: 09 Maret 2026 | OEE System V13
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ForemanSettings;