import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserPlus, CheckCircle, Clock, 
  Activity, Fingerprint, MapPin, Send, Loader2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { getPendingApprovals, approveUserRequest } from '../../services/api';

const AccessControl = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

const fetchPending = async () => {
    setLoading(true);
    try {
      // 1. Cek apakah file api.js sudah benar
      if (typeof getPendingApprovals !== 'function') {
         throw new Error("Fungsi getPendingApprovals tidak ditemukan di api.js!");
      }

      const res = await getPendingApprovals();
      
      if (res && res.status === 'success') {
        setPendingUsers(res.data || []);
      } else {
        // 2. Jika backend menolak request
        toast.error("Radar Backend Error: " + (res?.message || "Unknown Action"));
      }
    } catch (error) {
      // 3. Menampilkan error aslinya ke layar Anda
      toast.error("Sistem Crash: " + error.message, { duration: 5000 });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Polling data setiap 10 detik agar radar selalu update
  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000); 
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id_karyawan, nama) => {
    setApprovingId(id_karyawan);
    try {
      const res = await approveUserRequest(id_karyawan);
      if (res.status === 'success') {
        toast.success(`Akses Disetujui! Kode ditransmisikan ke layar ${nama}.`, { icon: '🚀' });
        // Hapus user dari list UI secara instan
        setPendingUsers(prev => prev.filter(u => u.id_karyawan !== id_karyawan));
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Gagal mengirim otorisasi.");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans p-6 pb-24 relative overflow-hidden">
      <Toaster position="top-center" toastOptions={{style: {background: '#1e293b', color: '#fff'}}} />
      
      {/* Background Radar Effect */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6 relative z-10">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
             <ShieldCheck className="text-blue-500" size={28}/> ACCESS CONTROL
          </h1>
          <p className="text-sm text-slate-400 mt-1">Identity & Authorization Management</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={fetchPending} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
              <RefreshCw size={18} className={loading && pendingUsers.length === 0 ? "animate-spin" : ""}/>
           </button>
           <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/50 rounded-xl">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
              <span className="text-xs font-bold text-blue-400 tracking-widest">RADAR ACTIVE</span>
           </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 max-w-5xl mx-auto">
         
         <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
               <UserPlus size={16} className="text-emerald-500"/> Pending Authorizations
            </h3>
            <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold">
               {pendingUsers.length} Requests
            </span>
         </div>

         {loading && pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
               <Activity size={48} className="text-blue-500 animate-pulse mb-4"/>
               <p className="font-mono text-xs tracking-widest text-blue-400">SCANNING INCOMING CONNECTIONS...</p>
            </div>
         ) : pendingUsers.length === 0 ? (
            <div className="bg-[#1e293b]/40 border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-inner">
               <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                  <CheckCircle size={32} className="text-slate-500"/>
               </div>
               <h4 className="text-lg font-bold text-white mb-1">Clear Horizon</h4>
               <p className="text-sm text-slate-500">Tidak ada antrean pendaftaran saat ini.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <AnimatePresence>
                  {pendingUsers.map((user) => (
                     <motion.div 
                        key={user.id_karyawan}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: -20 }}
                        className="bg-gradient-to-br from-[#1e293b]/80 to-[#0f172a]/90 border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden group"
                     >
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        
                        <div className="flex gap-5">
                           {/* FOTO PROFILE */}
                           <div className="w-20 h-20 rounded-xl bg-black/50 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {user.foto && user.foto.length > 20 ? (
                                 <img src={user.foto} alt="ID" className="w-full h-full object-cover"/>
                              ) : (
                                 <Fingerprint size={28} className="text-slate-600"/>
                              )}
                           </div>
                           
                           {/* DATA USER */}
                           <div className="flex-1">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <h3 className="text-lg font-black text-white leading-tight">{user.nama}</h3>
                                    <p className="text-xs font-mono text-blue-400 tracking-wider mb-2">{user.id_karyawan}</p>
                                 </div>
                                 <span className="flex items-center gap-1 text-[9px] text-slate-500 uppercase font-bold bg-black/30 px-2 py-1 rounded border border-white/5">
                                    <Clock size={10}/> Pending
                                 </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                 <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                    <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Jabatan</span>
                                    <span className="text-xs font-bold text-slate-300">{user.jabatan}</span>
                                 </div>
                                 <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                    <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Area</span>
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                                       <MapPin size={10} className="text-purple-400"/> {user.plant === '-' ? 'HQ' : `${user.plant} - ${user.zone}`}
                                    </span>
                                 </div>
                              </div>

                              {/* TOMBOL ACTION */}
                              <button 
                                 onClick={() => handleApprove(user.id_karyawan, user.nama)}
                                 disabled={approvingId === user.id_karyawan}
                                 className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-95 border border-blue-400/50"
                              >
                                 {approvingId === user.id_karyawan ? (
                                    <><Loader2 size={16} className="animate-spin"/> Transmitting...</>
                                 ) : (
                                    <><Send size={16}/> APPROVE & TRANSMIT CODE</>
                                 )}
                              </button>
                           </div>
                        </div>
                     </motion.div>
                  ))}
               </AnimatePresence>
            </div>
         )}
      </div>
    </div>
  );
};

export default AccessControl;