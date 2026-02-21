import React, { useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Menu, Hexagon, Loader2 } from 'lucide-react';

// --- 1. LAYOUT COMPONENT ---
import SidebarForeman from "./components/layout/SidebarForeman";

// --- 2. LAZY LOAD PAGES (MVP CORE ONLY) ---
// Auth
const AccessPortal = React.lazy(() => import('./pages/AUTH/AccessPortal'));

// Foreman Data Entry
const TacticalInputHub = React.lazy(() => import('./pages/foreman/Inputdata/TacticalInputHub'));
const SmartDowntimeC = React.lazy(() => import('./pages/foreman/Inputdata/SmartDowntimeLoggerC'));
const SmartDowntimeF = React.lazy(() => import('./pages/foreman/Inputdata/SmartDowntimeLoggerF'));
const DefectCatcherC = React.lazy(() => import('./pages/foreman/Inputdata/DefectCatcherC'));
const DefectCatcherF = React.lazy(() => import('./pages/foreman/Inputdata/DefectCatcherF'));


// --- 3. LOADING SPINNER ---
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#0B1120]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={48} className="animate-spin text-blue-500" />
      <span className="text-sm font-bold text-slate-400 animate-pulse tracking-widest">MEMUAT SISTEM...</span>
    </div>
  </div>
);

// --- 4. FOREMAN LAYOUT (THE ONLY LAYOUT NOW) ---
const ForemanLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-[#0B1120] overflow-hidden text-slate-200">
      
      <SidebarForeman isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
         
         {/* Mobile Header - REDESIGNED */}
         <header className="lg:hidden bg-[#0f172a]/95 backdrop-blur-md text-white p-4 flex items-center justify-between shadow-lg z-30 shrink-0 border-b border-white/10 sticky top-0">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-md border border-white/10">
                  <Hexagon size={18} className="text-white fill-white/20"/>
               </div>
               <div className="flex flex-col">
                  <span className="font-black text-sm tracking-tight leading-none text-white">OEE PRO</span>
                  <span className="text-[9px] font-bold text-blue-400 tracking-widest uppercase mt-0.5">Foreman Mode</span>
               </div>
            </div>
            <button onClick={() => setSidebarOpen(true)} className="p-2.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-xl transition-all active:scale-95 shadow-md">
               <Menu size={20} />
            </button>
         </header>
         
         <main className="flex-1 overflow-y-auto p-0 custom-scrollbar relative bg-[#0B1120]">
            {children}
         </main>
      </div>
    </div>
  );
};

// --- 5. ROUTING CONFIGURATION ---
const App = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        
        {/* PUBLIC ROUTE: Login Page */}
        <Route 
            path="/access-portal" 
            element={!user ? <Suspense fallback={<PageLoader />}><AccessPortal /></Suspense> : <Navigate to="/foreman/tactical-input" replace />} 
        />
        <Route path="/login" element={<Navigate to="/access-portal" replace />} />

        {/* PROTECTED ROUTE: Forced directly to Input Hub */}
        <Route 
          path="/" 
          element={user ? <ForemanLayout><Suspense fallback={<PageLoader />}><Outlet /></Suspense></ForemanLayout> : <Navigate to="/access-portal" replace />}
        >
          <Route index element={<Navigate to="/foreman/tactical-input" replace />} />
          
          {/* === THE MVP ROUTES === */}
          <Route path="foreman/tactical-input" element={<TacticalInputHub />} />
          <Route path="foreman/input/reject/c" element={<DefectCatcherC />} />
          <Route path="foreman/input/reject/f" element={<DefectCatcherF />} />
          <Route path="foreman/input/downtime/c" element={<SmartDowntimeC />} />
          <Route path="foreman/input/downtime/f" element={<SmartDowntimeF />} />
          
        </Route>

        {/* FALLBACK ROUTE: Catch-all to prevent lost users */}
        <Route path="*" element={<Navigate to={user ? "/foreman/tactical-input" : "/access-portal"} replace />} />
        
      </Routes>
    </Router>
  );
};

export default App;