import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updatePassword } from '../services/api';
import { 
  User, Shield, Key, Loader2, LogOut, 
  CreditCard, MapPin, Lock, Fingerprint, Activity 
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

// --- HELPER COMPONENT: AVATAR ---
const SmartAvatar = ({ foto, name }) => {
  const isValidBase64 = foto && foto.length > 100;
  const defaultPhoto = `https://i.pravatar.cc/300?u=${name}`;
  const [src, setSrc] = useState(isValidBase64 ? foto : defaultPhoto);

  useEffect(() => { setSrc((foto && foto.length > 100) ? foto : defaultPhoto); }, [foto, name]);

  return (
    <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto">
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-40 animate-pulse"></div>
        <div className="relative w-full h-full rounded-full p-1.5 bg-gradient-to-br from-white to-slate-200 shadow-2xl">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-900 bg-slate-800">
                <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setSrc(defaultPhoto)} />
            </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-green-500 p-1.5 rounded-full border-4 border-slate-900 shadow-sm z-10" title="Online">
            <Activity size={16} className="text-white"/>
        </div>
    </div>
  );
};

const Profil = () => {
  const { user, logout } = useAuth();
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passData.new !== passData.confirm) return toast.error("Konfirmasi password tidak cocok!");
    
    setLoading(true);
    const res = await updatePassword(user.id, passData.old, passData.new);
    setLoading(false);
    
    if (res.status === 'success') {
      toast.success("Password Berhasil Diubah!");
      setPassData({ old: '', new: '', confirm: '' });
    } else {
      toast.error("Gagal: " + res.message);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Akhiri sesi dan keluar?")) logout();
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 font-sans px-4 md:px-8">
      
      {/* HEADER SECTION */}
      <div className="mb-10 pt-6 border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Akun <span className="text-blue-600">Saya</span></h1>
            <p className="text-slate-500 font-medium mt-1">Kelola identitas dan keamanan akses Anda.</p>
         </div>
         <div className="hidden md:block">
            <span className="px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
                Secure Session Active
            </span>
         </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* 1. DIGITAL ID CARD (LEFT - 4 Columns) */}
         <div className="lg:col-span-4">
            <motion.div 
               initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
               className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center h-full min-h-[500px]"
            >
               {/* Background FX */}
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
               <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
               
               <div className="relative z-10 w-full flex-1 flex flex-col">
                   <div className="mb-6"><SmartAvatar foto={user?.foto} name={user?.nama}/></div>

                   <h2 className="text-2xl font-black tracking-tight mb-1">{user?.nama}</h2>
                   <div className="inline-block px-4 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-widest mb-8">
                      {user?.jabatan || 'Staff'}
                   </div>

                   <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 w-full text-left space-y-4 shadow-inner">
                      <div className="flex items-center gap-4 group">
                         <div className="p-2.5 bg-slate-800 rounded-xl text-slate-400 group-hover:text-white transition-colors"><CreditCard size={18}/></div>
                         <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Employee ID</p>
                            <p className="font-mono text-sm font-medium tracking-wide">{user?.id}</p>
                         </div>
                      </div>
                      <div className="w-full h-px bg-white/5"></div>
                      <div className="flex items-center gap-4 group">
                         <div className="p-2.5 bg-slate-800 rounded-xl text-slate-400 group-hover:text-white transition-colors"><MapPin size={18}/></div>
                         <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Work Zone</p>
                            <p className="font-mono text-sm font-medium tracking-wide">Zone {user?.plant_zone || '-'}</p>
                         </div>
                      </div>
                   </div>

                   <div className="mt-auto pt-8">
                      <button onClick={handleLogout} className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white font-bold transition-all duration-300 flex items-center justify-center gap-2 group">
                         <LogOut size={18} className="group-hover:-translate-x-1 transition-transform"/> Sign Out
                      </button>
                   </div>
               </div>
            </motion.div>
         </div>

         {/* 2. SECURITY CENTER (RIGHT - 8 Columns) */}
         <div className="lg:col-span-8">
            <motion.div 
               initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
               className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 h-full flex flex-col justify-center"
            >
               <div className="flex items-start gap-5 mb-8">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shrink-0"><Shield size={32}/></div>
                  <div>
                     <h3 className="text-xl md:text-2xl font-bold text-slate-800">Security Center</h3>
                     <p className="text-slate-500 mt-1 leading-relaxed">Update password Anda secara berkala untuk menjaga keamanan akun. Gunakan kombinasi huruf dan angka.</p>
                  </div>
               </div>
               
               <form onSubmit={handlePasswordChange} className="space-y-6 max-w-2xl">
                  {/* Old Password */}
                  <div className="group">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block group-focus-within:text-blue-500 transition-colors">Password Saat Ini</label>
                     <div className="relative">
                        <Lock size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                        <input type="password" value={passData.old} onChange={e => setPassData({...passData, old: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-300" required placeholder="••••••••"/>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="group">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block group-focus-within:text-blue-500 transition-colors">Password Baru</label>
                        <div className="relative">
                           <Key size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                           <input type="password" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-300" required placeholder="Min. 6 Karakter"/>
                        </div>
                     </div>
                     <div className="group">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block group-focus-within:text-blue-500 transition-colors">Konfirmasi</label>
                        <div className="relative">
                           <Fingerprint size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                           <input type="password" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-300" required placeholder="Ulangi Password"/>
                        </div>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
                     <button disabled={loading} type="submit" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all duration-300 shadow-xl shadow-slate-900/20 hover:shadow-blue-600/30 active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                        {loading ? <Loader2 className="animate-spin"/> : "Update Password"}
                     </button>
                  </div>
               </form>
            </motion.div>
         </div>
      </div>
    </div>
  );
};

export default Profil;