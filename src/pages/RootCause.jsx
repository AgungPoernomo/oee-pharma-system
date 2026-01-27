import React, { useState, useEffect } from 'react';
import { fetchRootCauseStats } from '../services/api';
import { Layers, AlertTriangle, Loader2 } from 'lucide-react';

const RootCause = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: new Date().toISOString().split('T')[0],
    zone: 'All'
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchRootCauseStats(filter);
      if (res.status === 'success') setData(res.data);
      setLoading(false);
    };
    load();
  }, [filter]);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-8">
         <h1 className="text-3xl font-bold text-slate-800">Root Cause Analysis</h1>
         <p className="text-slate-500">Pemetaan detail masalah per proses produksi.</p>
      </div>

      {loading ? <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></div> :
       Object.keys(data).length === 0 ? <div className="p-10 bg-white rounded-xl text-center text-slate-400">Belum ada data downtime di periode ini.</div> :
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {Object.entries(data).map(([processName, problems], idx) => (
           <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Layers size={18} className="text-blue-600"/> {processName}
                 </h3>
              </div>
              <div className="p-4 space-y-4">
                 {Object.entries(problems)
                   .sort((a, b) => b[1].count - a[1].count) // Sort by frekuensi
                   .map(([problemName, stats], i) => (
                     <div key={i} className="relative">
                        <div className="flex justify-between text-sm mb-1">
                           <span className="font-medium text-slate-700">{problemName}</span>
                           <span className="font-bold text-red-600">{stats.count}x <span className="text-slate-400 text-xs font-normal">({stats.duration}m)</span></span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                           <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(stats.count * 10, 100)}%` }}></div>
                        </div>
                     </div>
                 ))}
              </div>
           </div>
         ))}
       </div>
      }
    </div>
  );
};
export default RootCause;