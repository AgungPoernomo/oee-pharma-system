import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updatePassword } from '../services/api';
import { User, Shield, Key, Loader2, LogOut } from 'lucide-react';

const Profil = () => {
  const { user, logout } = useAuth();
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passData.new !== passData.confirm) return alert("Konfirmasi password baru tidak cocok!");
    
    setLoading(true);
    const res = await updatePassword(user.id, passData.old, passData.new);
    setLoading(false);
    
    if (res.status === 'success') {
      alert("✅ Password Berhasil Diubah!");
      setPassData({ old: '', new: '', confirm: '' });
    } else {
      alert("❌ Gagal: " + res.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Profil Pengguna</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         
         {/* KARTU PROFIL */}
         <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
               <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto flex items-center justify-center text-blue-600 mb-4">
                  <User size={48}/>
               </div>
               <h2 className="text-xl font-bold text-slate-800">{user?.nama}</h2>
               <p className="text-sm text-slate-500 mb-4">{user?.jabatan}</p>
               
               <div className="space-y-3 text-left bg-slate-50 p-4 rounded-xl text-sm">
                  <div className="flex justify-between">
                     <span className="text-slate-500">ID Karyawan</span>
                     <span className="font-bold text-slate-700">{user?.id}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-slate-500">Plant Zone</span>
                     <span className="font-bold text-slate-700">{user?.plant_zone || '-'}</span>
                  </div>
               </div>

               <button onClick={logout} className="mt-6 w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold flex items-center justify-center gap-2">
                  <LogOut size={16}/> Logout
               </button>
            </div>
         </div>

         {/* FORM GANTI PASSWORD */}
         <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Shield className="text-green-600"/> Keamanan Akun
               </h3>
               
               <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Password Lama</label>
                     <div className="relative">
                        <Key size={16} className="absolute top-3 left-3 text-slate-400"/>
                        <input type="password" value={passData.old} onChange={e => setPassData({...passData, old: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="••••••"/>
                     </div>
                  </div>
                  <hr className="border-slate-100 my-4"/>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Password Baru</label>
                     <input type="password" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="Minimal 6 karakter"/>
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
                     <input type="password" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="Ulangi password baru"/>
                  </div>

                  <div className="pt-4">
                     <button disabled={loading} type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition flex items-center gap-2">
                        {loading ? <Loader2 className="animate-spin"/> : "Simpan Password Baru"}
                     </button>
                  </div>
               </form>
            </div>
         </div>

      </div>
    </div>
  );
};
export default Profil;