import React, { useState } from 'react';
import { 
  Database, Edit3, Save, Lock, Unlock, 
  AlertTriangle, RotateCcw, CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK MASTER DATA ---
const INITIAL_MACHINES = [
  { id: 'M001', name: 'Filling Liquid A', cycleTime: 1.2, targetOEE: 85, active: true },
  { id: 'M002', name: 'Capping Machine B', cycleTime: 0.8, targetOEE: 90, active: true },
  { id: 'M003', name: 'Labeling Station', cycleTime: 0.5, targetOEE: 88, active: true },
  { id: 'M004', name: 'Cartoner Auto', cycleTime: 2.5, targetOEE: 80, active: false }, // Inactive
];

const MasterDataEditor = () => {
  const [machines, setMachines] = useState(INITIAL_MACHINES);
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState(INITIAL_MACHINES);
  const [showWarning, setShowWarning] = useState(false);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit
      setTempData(machines);
      setIsEditing(false);
    } else {
      // Start edit
      setIsEditing(true);
    }
  };

  const handleChange = (id, field, value) => {
    const updated = tempData.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    );
    setTempData(updated);
  };

  const handleSaveRequest = () => {
    setShowWarning(true);
  };

  const confirmSave = () => {
    setMachines(tempData);
    setIsEditing(false);
    setShowWarning(false);
    // Di sini nanti ada API Call untuk update DB
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans p-6 pb-24">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
             <Database className="text-blue-500" size={28}/> MASTER DATA EDITOR
          </h1>
          <p className="text-sm text-slate-400 mt-1">"Factory DNA" - Cycle Times & Targets Configuration</p>
        </div>
        
        <div className="flex gap-3">
           {isEditing ? (
              <>
                 <button onClick={handleEditToggle} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2">
                    <X size={16}/> Cancel
                 </button>
                 <button onClick={handleSaveRequest} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 animate-pulse">
                    <Save size={16}/> Save Changes
                 </button>
              </>
           ) : (
              <button onClick={handleEditToggle} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2">
                 <Unlock size={16}/> Unlock to Edit
              </button>
           )}
        </div>
      </div>

      {/* WARNING MODAL */}
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
               className="bg-[#1e293b] border border-red-500 rounded-2xl p-8 max-w-md w-full relative"
             >
                <div className="flex items-center gap-4 mb-4 text-red-500">
                   <AlertTriangle size={32}/>
                   <h2 className="text-xl font-black uppercase">Critical Warning</h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                   Anda akan mengubah <strong>Parameter Inti (DNA)</strong> sistem. 
                   Perubahan pada <em>Cycle Time</em> atau <em>OEE Target</em> akan merubah kalkulasi laporan historis dan prediksi masa depan.
                   <br/><br/>
                   Apakah Anda yakin data ini sudah diverifikasi oleh Engineering Manager?
                </p>
                <div className="flex gap-3">
                   <button onClick={() => setShowWarning(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400 hover:text-white">Cancel</button>
                   <button onClick={confirmSave} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white shadow-lg">Yes, Deploy Changes</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDITOR TABLE */}
      <div className="bg-[#1e293b]/40 border border-white/5 rounded-3xl overflow-hidden relative">
         {!isEditing && (
            <div className="absolute inset-0 z-10 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center">
               <div className="bg-black/50 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-2 text-slate-400 font-bold backdrop-blur-md">
                  <Lock size={16}/> Read-Only Mode
               </div>
            </div>
         )}

         <table className="w-full text-left">
            <thead>
               <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                  <th className="p-6">Machine ID</th>
                  <th className="p-6">Machine Name</th>
                  <th className="p-6 text-center">Cycle Time (s)</th>
                  <th className="p-6 text-center">Target OEE (%)</th>
                  <th className="p-6 text-center">Status</th>
               </tr>
            </thead>
            <tbody className="text-sm">
               {tempData.map((machine) => (
                  <tr key={machine.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                     <td className="p-6 font-mono text-slate-400">{machine.id}</td>
                     <td className="p-6">
                        {isEditing ? (
                           <input 
                              type="text" 
                              value={machine.name}
                              onChange={(e) => handleChange(machine.id, 'name', e.target.value)}
                              className="bg-slate-900 border border-white/20 rounded-lg px-3 py-2 w-full text-white focus:border-blue-500 outline-none"
                           />
                        ) : (
                           <span className="font-bold text-white">{machine.name}</span>
                        )}
                     </td>
                     <td className="p-6 text-center">
                        {isEditing ? (
                           <input 
                              type="number" step="0.1"
                              value={machine.cycleTime}
                              onChange={(e) => handleChange(machine.id, 'cycleTime', parseFloat(e.target.value))}
                              className="bg-slate-900 border border-white/20 rounded-lg px-3 py-2 w-24 text-center text-emerald-400 font-bold focus:border-emerald-500 outline-none"
                           />
                        ) : (
                           <span className="font-mono text-emerald-400 font-bold">{machine.cycleTime}s</span>
                        )}
                     </td>
                     <td className="p-6 text-center">
                         {isEditing ? (
                           <input 
                              type="number"
                              value={machine.targetOEE}
                              onChange={(e) => handleChange(machine.id, 'targetOEE', parseInt(e.target.value))}
                              className="bg-slate-900 border border-white/20 rounded-lg px-3 py-2 w-24 text-center text-blue-400 font-bold focus:border-blue-500 outline-none"
                           />
                        ) : (
                           <span className="font-mono text-blue-400 font-bold">{machine.targetOEE}%</span>
                        )}
                     </td>
                     <td className="p-6 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${machine.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                           {machine.active ? 'Active' : 'Inactive'}
                        </span>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

    </div>
  );
};

export default MasterDataEditor;