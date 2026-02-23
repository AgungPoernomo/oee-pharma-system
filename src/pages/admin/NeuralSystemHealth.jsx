import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, Database, Wifi, 
  Terminal, AlertCircle, CheckCircle2, 
  Cpu, HardDrive, ShieldCheck 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { motion } from 'framer-motion';

// --- MOCK DATA: LATENCY (PING) ---
const INITIAL_DATA = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  latency: 20 + Math.random() * 30 // 20-50ms
}));

// --- MOCK LOGS ---
const SYSTEM_LOGS = [
  { id: 1, time: '10:00:01', type: 'INFO', msg: 'System integrity check passed.' },
  { id: 2, time: '10:05:22', type: 'WARN', msg: 'High latency detected on IoT Gateway Node 3.' },
  { id: 3, time: '10:10:15', type: 'INFO', msg: 'Database backup completed successfully.' },
  { id: 4, time: '10:15:00', type: 'ERROR', msg: 'Connection timeout: Shift 2 Input Tablet.' },
  { id: 5, time: '10:20:45', type: 'INFO', msg: 'AI Model (Veo) retraining scheduled.' },
];

const NeuralSystemHealth = () => {
  const [data, setData] = useState(INITIAL_DATA);
  const [logs, setLogs] = useState(SYSTEM_LOGS);

  // Simulasi Live Data
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newPoint = { 
          time: prev[prev.length - 1].time + 1, 
          latency: 20 + Math.random() * (Math.random() > 0.9 ? 150 : 30) // Random spike
        };
        return [...prev.slice(1), newPoint];
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans p-6 pb-24">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
             <Activity className="text-emerald-500" size={28}/> NEURAL SYSTEM HEALTH
          </h1>
          <p className="text-sm text-slate-400 mt-1">Infrastructure Monitoring & Error Logs</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/50 rounded-xl">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-xs font-bold text-emerald-400">ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: STATUS GRIDS */}
        <div className="lg:col-span-8 space-y-6">
           
           {/* 1. SERVICE STATUS CARDS */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                 { name: 'Core API', icon: Server, status: 'Online', lat: '24ms' },
                 { name: 'Database', icon: Database, status: 'Online', lat: '12ms' },
                 { name: 'IoT Gateway', icon: Wifi, status: 'Online', lat: '45ms' },
                 { name: 'AI Engine', icon: Cpu, status: 'Idle', lat: 'N/A' },
              ].map((service, idx) => (
                 <div key={idx} className="bg-[#1e293b]/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 group hover:border-blue-500/30 transition-all">
                    <div className="flex justify-between items-start">
                       <service.icon className="text-slate-500 group-hover:text-blue-400 transition-colors" size={24}/>
                       <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-white">{service.name}</h3>
                       <div className="flex justify-between items-end mt-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest">{service.status}</span>
                          <span className="text-xs font-mono text-emerald-400">{service.lat}</span>
                       </div>
                    </div>
                 </div>
              ))}
           </div>

           {/* 2. LATENCY CHART */}
           <div className="bg-[#1e293b]/40 border border-white/5 p-6 rounded-3xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Activity size={14}/> Real-time Latency (ms)
              </h3>
              <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                       <defs>
                          <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                       <XAxis dataKey="time" hide />
                       <YAxis stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} domain={[0, 200]}/>
                       <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px'}} itemStyle={{color: '#10b981'}}/>
                       <Area type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLat)" isAnimationActive={false} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* 3. STORAGE HEALTH */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1e293b]/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                 <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><HardDrive size={24}/></div>
                 <div className="flex-1">
                    <div className="flex justify-between mb-1">
                       <span className="text-xs font-bold text-slate-400">SSD Storage</span>
                       <span className="text-xs font-bold text-white">45% Used</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-[45%] rounded-full"></div>
                    </div>
                 </div>
              </div>
              <div className="bg-[#1e293b]/40 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                 <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400"><ShieldCheck size={24}/></div>
                 <div>
                    <p className="text-xs font-bold text-slate-400">Last Backup</p>
                    <p className="text-sm font-bold text-white">Today, 03:00 AM</p>
                 </div>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: TERMINAL LOGS */}
        <div className="lg:col-span-4 bg-black border border-white/10 rounded-3xl p-6 font-mono text-xs overflow-hidden flex flex-col h-[600px] shadow-2xl relative">
           <div className="absolute top-0 left-0 right-0 bg-slate-900/90 border-b border-white/10 p-4 flex justify-between items-center z-10 backdrop-blur-sm">
              <span className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest">
                 <Terminal size={14}/> System Logs
              </span>
              <div className="flex gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
              </div>
           </div>
           
           <div className="mt-12 space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {logs.map((log, idx) => (
                 <div key={idx} className="border-b border-white/5 pb-2 last:border-0">
                    <span className="text-slate-500">[{log.time}]</span>{' '}
                    <span className={`font-bold ${log.type === 'ERROR' ? 'text-red-500' : log.type === 'WARN' ? 'text-yellow-500' : 'text-blue-400'}`}>
                       {log.type}
                    </span>{' '}
                    <span className="text-slate-300">{log.msg}</span>
                 </div>
              ))}
              <div className="animate-pulse text-emerald-500 font-bold">_</div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default NeuralSystemHealth;