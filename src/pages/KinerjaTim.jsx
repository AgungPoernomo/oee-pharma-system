import React, { useState, useEffect } from 'react';
import { fetchTeamStats } from '../services/api';
import { Users, Award, AlertCircle, Filter, Loader2 } from 'lucide-react';

const KinerjaTim = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: new Date().toISOString().split('T')[0], 
    zone: 'All' 
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchTeamStats(filter);
      if (res.status === 'success') setData(res.data);
      setLoading(false);
    };
    load();
  }, [filter]);

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-3xl font-bold text-slate-800">Kinerja Tim</h1>
           <p className="text-slate-500">Evaluasi performa Foreman & Operator.</p>
        </div>
        <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border">
           <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} className="text-sm font-bold text-slate-700 outline-none bg-transparent"/>
           <span className="text-slate-400">-</span>
           <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} className="text-sm font-bold text-slate-700 outline-none bg-transparent"/>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-50 p-4 font-bold text-slate-500 text-sm uppercase tracking-wider">
           <div className="col-span-1 text-center">Rank</div>
           <div className="col-span-4">Nama Personil</div>
           <div className="col-span-2 text-center">Total Input</div>
           <div className="col-span-2 text-center">Kejadian Downtime</div>
           <div className="col-span-3 text-right">Total Durasi Lost</div>
        </div>
        
        {loading ? <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></div> : 
         data.length === 0 ? <div className="p-10 text-center text-slate-400">Data tidak ditemukan.</div> :
         data.map((item, idx) => (
           <div key={idx} className="grid grid-cols-12 p-4 border-b border-slate-100 items-center hover:bg-slate-50 transition">
              <div className="col-span-1 flex justify-center">
                 {idx === 0 ? <Award className="text-yellow-500" size={24}/> : 
                  idx === 1 ? <Award className="text-slate-400" size={24}/> : 
                  idx === 2 ? <Award className="text-orange-700" size={24}/> : 
                  <span className="font-bold text-slate-400">#{idx+1}</span>}
              </div>
              <div className="col-span-4 font-bold text-slate-800 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                    {item.name.charAt(0)}
                 </div>
                 {item.name}
              </div>
              <div className="col-span-2 text-center">
                 <span className="bg-green-100 text-green-700 py-1 px-3 rounded-full text-xs font-bold">{item.input_count}</span>
              </div>
              <div className="col-span-2 text-center font-bold text-slate-600">
                 {item.downtime_events} x
              </div>
              <div className="col-span-3 text-right font-bold text-red-600">
                 {item.total_downtime} Menit
              </div>
           </div>
         ))
        }
      </div>
    </div>
  );
};
export default KinerjaTim;