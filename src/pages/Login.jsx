import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser, verifyUser, fetchValidationData } from '../services/api';
import { 
  User, Lock, Briefcase, MapPin, ArrowRight, 
  CheckCircle, Loader2, Hexagon, Eye, EyeOff, Activity, X, 
  Factory, Camera, Crop, ZoomIn, Server, Wifi, ShieldCheck, Clock,
  Cpu, Github, Code2, Database // Import yang dibutuhkan
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import { TypeAnimation } from 'react-type-animation';     

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState('login'); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // State dropdown & cropper
  const [dropdowns, setDropdowns] = useState({ jabatan: [], zone: [], plant: [] });
  const [showCropper, setShowCropper] = useState(false);
  const [tempImg, setTempImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  // --- CONFIG GITHUB & LOGO ---
  const GITHUB_URL = "https://github.com/AgungPoernomo";
  const COMPANY_LOGO_URL = "/logo-perusahaan.png";

  const initialFormState = {
    id_karyawan: '', password: '', nama: '', jabatan: '',
    plant: '', plant_zone: '', foto: '', code: '' 
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- UTILITY: CLOCK ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getShift = () => {
      const h = currentTime.getHours();
      if (h >= 6 && h < 14) return 'Shift 1';
      if (h >= 14 && h < 22) return 'Shift 2';
      return 'Shift 3';
  };

  // --- SECURITY CHECK & LOAD DATA ---
  useEffect(() => {
    if (user) {
      const isManager = user.jabatan?.toLowerCase().includes('manager') || 
                        user.jabatan?.toLowerCase().includes('admin');
      navigate(isManager ? '/dashboard' : '/input-data');
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchValidationData();
        if (result.status === 'success') {
          const data = result.data;
          const keys = Object.keys(data); 
          const findHeader = (keyword, exclude = null) => {
             return keys.find(k => {
                const keyLow = k.toLowerCase();
                if (exclude && keyLow.includes(exclude)) return false;
                return keyLow.includes(keyword);
             });
          };
          const keyJabatan = findHeader('jabatan');
          const keyPlant = findHeader('plant', 'zone'); 
          const keyZone = findHeader('zone');

          setDropdowns({
            jabatan: data[keyJabatan] || [],
            plant: data[keyPlant] || [],
            zone: data[keyZone] || []
          });
        }
      } catch (e) { toast.error("Gagal memuat data validasi."); }
    };
    loadData();
  }, []);

  // --- HANDLERS ---
  const handleChange = (e) => {
      const { name, value } = e.target;
      if (name === 'jabatan') {
          setFormData({ ...formData, jabatan: value, plant: '', plant_zone: '' });
      } else {
          setFormData({ ...formData, [name]: value });
      }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { setTempImg(reader.result); setShowCropper(true); setZoom(1); };
      reader.readAsDataURL(file);
    }
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = imgRef.current;
    const size = 150; 
    canvas.width = size; canvas.height = size;
    const minDim = Math.min(image.naturalWidth, image.naturalHeight);
    const sWidth = minDim / zoom; const sHeight = minDim / zoom;
    const sx = (image.naturalWidth - sWidth) / 2; const sy = (image.naturalHeight - sHeight) / 2;
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2, true); ctx.closePath(); ctx.clip();
    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, size, size);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setFormData({ ...formData, foto: base64 }); setShowCropper(false); setTempImg(null); toast.success("ID Photo captured!");
  };

  const handleRemovePhoto = (e) => { e.preventDefault(); setFormData({ ...formData, foto: '' }); };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await loginUser({ id_karyawan: formData.id_karyawan, password: formData.password });
      if (res.status === 'success') { login(res.user); toast.success(`Access Granted: ${res.user.nama}`); } 
      else { toast.error(res.message || "Access Denied"); }
    } catch (err) { toast.error("Connection Refused"); } 
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true);
    const jabatanLower = formData.jabatan.toLowerCase();
    const isManager = jabatanLower.includes('manager') || jabatanLower.includes('asisten');
    const dataToSend = { ...formData, plant: isManager ? '-' : formData.plant, plant_zone: isManager ? '-' : formData.plant_zone };
    try {
      const res = await registerUser(dataToSend);
      if (res.status === 'success') {
        toast.success("Registration Sent.", { duration: 5000 });
        setFormData({ ...initialFormState, id_karyawan: formData.id_karyawan }); setMode('verify');
      } else { toast.error("Registration Failed: " + res.message); }
    } catch (err) { toast.error("System Error"); } 
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await verifyUser(formData.id_karyawan, formData.code);
      if (res.status === 'success') {
        toast.success("Verified."); setFormData(initialFormState); setMode('login');
      } else { toast.error(res.message); }
    } catch (err) { toast.error("Verification Error"); } 
    finally { setLoading(false); }
  };

  const selectedJabatan = formData.jabatan.toLowerCase();
  const isJabatanSelected = formData.jabatan !== "";
  const isManager = selectedJabatan.includes('manager') || selectedJabatan.includes('asisten');
  const showPlantInput = isJabatanSelected && !isManager;
  const showZoneInput = isJabatanSelected && !isManager && selectedJabatan.includes('foreman');

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 font-sans overflow-hidden flex relative selection:bg-blue-500 selection:text-white">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      </div>

      {/* MODAL CROPPER */}
      {showCropper && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
              <h3 className="text-xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2"><Crop size={20}/> Adjust ID Photo</h3>
              <div className="relative w-full h-72 bg-black rounded-2xl overflow-hidden flex items-center justify-center mb-6 border border-slate-700">
                 <img ref={imgRef} src={tempImg} alt="Original" className="absolute transition-transform duration-100" style={{ transform: `scale(${zoom})` }} />
              </div>
              <div className="flex items-center gap-4 mb-6 px-2">
                 <ZoomIn size={20} className="text-slate-400"/>
                 <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => {setShowCropper(false); setTempImg(null);}} className="py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition">Cancel</button>
                 <button onClick={handleCrop} className="py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-900/50">Confirm Crop</button>
              </div>
              <canvas ref={canvasRef} className="hidden"></canvas>
           </div>
        </div>
      )}

      {/* --- LEFT SIDE: THE SPECTACULAR SHOWCASE --- */}
      <div className="hidden lg:flex w-7/12 relative z-10 flex-col h-full p-12 xl:p-20">
         
         {/* 1. TOP SECTION: HEADER & TEXT */}
         <div className="flex-none">
            {/* Collaboration Header */}
            <motion.div 
               initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
               className="flex items-center gap-6 opacity-90 mb-12"
            >
               {/* Logo Agung Project */}
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)]">
                     <Hexagon className="text-white" size={20} strokeWidth={3}/>
                  </div>
                  <div className="hidden xl:block">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Powered By</p>
                     <p className="text-sm font-bold text-white leading-tight">Agung Project</p>
                  </div>
               </div>

               <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-500 to-transparent"></div>
               <X size={16} className="text-slate-500"/>
               <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-500 to-transparent"></div>

               {/* Logo Perusahaan */}
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center shadow-lg p-1">
                     <img 
                       src={COMPANY_LOGO_URL} 
                       alt="Company" 
                       className="w-full h-full object-contain"
                       onError={(e) => {e.target.src = "https://via.placeholder.com/40?text=CO"}} 
                     />
                  </div>
                  <div className="hidden xl:block">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">In Alliance With</p>
                     <p className="text-sm font-bold text-white leading-tight">CI Team</p>
                  </div>
               </div>
            </motion.div>

            {/* Main Title & Origin Statement */}
            <div className="max-w-4xl">
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                  <h1 className="text-7xl xl:text-8xl font-black tracking-tighter text-silver mb-2 leading-[0.9]">
                     OEE PRO <br/>
                  </h1>
                  <h2 className="text-3xl font-bold text-white mb-2">
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">The Industrial Intelligence System.</span>
                  </h2>

                  <div className="relative pl-8 border-l-4 border-blue-500/50 mt-10">
                     <Cpu size={32} className="text-blue-500 absolute -left-[18px] top-0 bg-[#0f172a] p-1"/>
                     <h1 className="text-5xl font-black tracking-tight leading-tight text-white drop-shadow-lg">
                        <TypeAnimation 
                           sequence={[ 
                             'Monitoring Real-time.', 2000, 
                             'Analisa Data Akurat.', 2000, 
                             'Efisiensi Maksimal.', 2000 
                           ]} 
                           wrapper="span" speed={50} repeat={Infinity} className="block" 
                        />
                     </h1>
                     <div className="min-h-[20px] flex flex-col justify-end mb-2"> 
                        <span className="text-blue-400 text-3xl block mt-4 font-medium tracking-wide">Zero Downtime Target.</span>
                     </div>
                     
                     <p className="text-lg xl:text-xl text-slate-300 leading-relaxed font-light mt-4">
                        Platform manajemen OEE terintegrasi. Memantau, menganalisis, dan mengoptimalkan performa mesin secara real-time. Sebuah dedikasi murni untuk keunggulan operasional dan kemandirian teknologi.
                     </p>
                     
                     <div className="flex gap-2 mt-6">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded border border-blue-500/20">In-House Built</span>
                        <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-widest rounded border border-purple-500/20">Zero Proprietary Lock</span>
                     </div>
                  </div>
               </motion.div>
            </div>
         </div>

         {/* 2. MIDDLE SECTION: GITHUB CARD (Simetris di Tengah Ruang Kosong) */}
         <div className="flex-1 flex flex-col justify-center items-start py-8">
            <motion.div 
               initial={{ y: 30, opacity: 0 }} 
               animate={{ y: 0, opacity: 1 }} 
               transition={{ delay: 0.8 }}
               className="relative group w-fit"
            >
               {/* Glow Effect */}
               <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
               
               {/* Card Link */}
               <a 
                  href={GITHUB_URL} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="relative flex items-center gap-5 bg-[#0B1221] border border-white/10 p-5 rounded-2xl backdrop-blur-md hover:bg-[#0f182b] transition-colors cursor-pointer"
               >
                  <div className="bg-white text-[#0B1221] p-3 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                     <Github size={32} strokeWidth={2}/>
                  </div>
                  
                  <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Code2 size={12}/> Lead Engineer
                     </p>
                     <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-white tracking-tight">AgungPoernomo</h3>
                        <CheckCircle size={18} className="text-blue-500 fill-blue-500/20" />
                     </div>
                     <p className="text-xs text-slate-500 font-mono mt-1">
                        Source Code Verified • Native Architecture
                     </p>
                  </div>
               </a>
            </motion.div>
         </div>

         {/* 3. BOTTOM SECTION: FOOTER */}
         <div className="flex-none flex items-center justify-between text-xs font-medium text-slate-500 pt-4 border-t border-white/5">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-emerald-500">
                   <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                   </span>
                   SYSTEM ONLINE
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                   <Wifi size={14} className="text-blue-400"/> 
                   <span>Latency: 24ms</span>
                </div>
                <div className="flex items-center gap-2">
                   <Activity size={14} className="text-emerald-500"/>
                   <span>Stable</span>
                </div>
                <div className="flex items-center gap-2">
                   <Database size={14} className="text-blue-500"/>
                   <span>DB: Connected</span>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
               <span className="flex items-center gap-2"><ShieldCheck size={14}/> Secure Connection</span>
               <span className="flex items-center gap-2"><Clock size={14}/> {currentTime.toLocaleTimeString()} ({getShift()})</span>
            </div>
         </div>
      </div>

      {/* RIGHT: THE FORM PORTAL */}
      <div className="w-full lg:w-5/12 bg-white/5 backdrop-blur-3xl border-l border-white/10 relative z-20 flex flex-col justify-center items-center p-6 md:p-12 shadow-2xl">
         
         {/* Mobile Collaboration Badge */}
         <div className="lg:hidden mb-8 text-center opacity-80">
            <div className="flex justify-center items-center gap-3 mb-2">
               <Hexagon size={18} className="text-blue-400"/> 
               <span className="text-slate-500 text-xs">✕</span>
               <img src={COMPANY_LOGO_URL} alt="CI" className="w-5 h-5 object-contain bg-white rounded p-0.5" onError={(e) => {e.target.style.display='none'}}/>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Agung Project & CI Team</p>
         </div>

         <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
               {/* LOGIN MODE */}
               {mode === 'login' && (
                  <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                     <div className="mb-10">
                        <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Authenticate.</h2>
                        <p className="text-slate-400 flex items-center gap-2">
                           <ShieldCheck size={16} className="text-emerald-500"/> Secure Access Point
                        </p>
                     </div>

                     <form onSubmit={handleLogin} className="space-y-6">
                        <div className="group">
                           <label className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 block pl-1">ID Number</label>
                           <div className="relative">
                              <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"/>
                              <input name="id_karyawan" value={formData.id_karyawan} onChange={handleChange} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono" placeholder="ex: 2024001" required />
                           </div>
                        </div>

                        <div className="group">
                           <label className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 block pl-1">Passcode</label>
                           <div className="relative">
                              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"/>
                              <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono" placeholder="••••••••" required />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                                 {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                              </button>
                           </div>
                        </div>

                        <motion.button 
                           whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} 
                           className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 flex justify-center items-center gap-3 hover:shadow-blue-600/40 transition-all border border-white/10"
                        >
                           {loading ? <Loader2 className="animate-spin" /> : <>Access Dashboard <ArrowRight size={20}/></>}
                        </motion.button>

                        <div className="pt-6 text-center">
                           <button type="button" onClick={() => {setFormData(initialFormState); setMode('register');}} className="text-sm text-slate-400 hover:text-white transition border-b border-dashed border-slate-600 hover:border-white pb-0.5">
                              Apply for Access ID
                           </button>
                        </div>
                     </form>
                  </motion.div>
               )}

               {/* REGISTER MODE */}
               {mode === 'register' && (
                  <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                     <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">New Entry.</h2>
                        <p className="text-slate-400 text-sm">Registrasi untuk validasi HRD & Admin.</p>
                     </div>
                     <form onSubmit={handleRegister} className="space-y-4">
                        <div className="flex justify-center mb-6">
                           <div className="relative group cursor-pointer w-24 h-24">
                              <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"/>
                              <div className={`w-full h-full rounded-2xl border-2 ${formData.foto ? 'border-green-500' : 'border-dashed border-slate-600 group-hover:border-blue-500'} flex flex-col items-center justify-center bg-slate-900/50 overflow-hidden transition-colors`}>
                                 {formData.foto ? <img src={formData.foto} alt="Preview" className="w-full h-full object-cover" /> : <Camera size={24} className="text-slate-400"/>}
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <input name="id_karyawan" value={formData.id_karyawan} onChange={handleChange} className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500" placeholder="ID Number" required />
                           <input name="nama" value={formData.nama} onChange={handleChange} className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500" placeholder="Full Name" required />
                        </div>
                        <select name="jabatan" value={formData.jabatan} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500" required>
                           <option value="" className="text-slate-500">Select Position</option>
                           {dropdowns.jabatan.map((j, i) => <option key={i} value={j} className="text-black">{j}</option>)}
                        </select>
                        {showPlantInput && (
                           <div className="grid grid-cols-2 gap-3">
                              <select name="plant" value={formData.plant} onChange={handleChange} className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500" required>
                                 <option value="">Plant</option>
                                 {dropdowns.plant.map((p, i) => <option key={i} value={p} className="text-black">{p}</option>)}
                              </select>
                              {showZoneInput && (
                                 <select name="plant_zone" value={formData.plant_zone} onChange={handleChange} className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500" required>
                                    <option value="">Zone</option>
                                    {dropdowns.zone.map((z, i) => <option key={i} value={z} className="text-black">{z}</option>)}
                                 </select>
                              )}
                           </div>
                        )}
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500" placeholder="Create Passcode" required />
                        <div className="flex gap-3 mt-6">
                           <button type="button" onClick={() => setMode('login')} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold text-sm hover:bg-white/5 transition">Cancel</button>
                           <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition shadow-lg shadow-blue-900/30">
                              {loading ? <Loader2 className="animate-spin mx-auto"/> : 'Submit Data'}
                           </button>
                        </div>
                     </form>
                  </motion.div>
               )}

               {/* VERIFY MODE */}
               {mode === 'verify' && (
                  <motion.div key="verify" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
                     <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/50 animate-pulse"><Lock size={32} className="text-emerald-400"/></div>
                     <h2 className="text-2xl font-bold text-white">Security Check</h2>
                     <p className="text-slate-400 text-sm mb-8 mt-2">Masukkan kode OTP 6-digit untuk verifikasi.</p>
                     <form onSubmit={handleVerify}>
                        <input name="code" value={formData.code} onChange={handleChange} className="w-full bg-slate-900 text-center text-3xl font-mono tracking-[0.5em] text-white py-4 rounded-xl border border-slate-600 focus:border-emerald-500 outline-none mb-8" maxLength={6} placeholder="••••••" required />
                        <div className="flex gap-3">
                           <button type="button" onClick={() => setMode('login')} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold hover:bg-white/5">Back</button>
                           <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-lg">Verify</button>
                        </div>
                     </form>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};

export default Login;