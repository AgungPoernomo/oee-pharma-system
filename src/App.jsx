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
         {/* Mobile Header */}
         <header className="lg:hidden bg-[#1e293b] text-white p-4 flex items-center justify-between shadow-md z-30 shrink-0 border-b border-white/5">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Hexagon size={20} className="text-white fill-current"/>
               </div>
               <span className="font-bold text-lg tracking-tight">OEE Input Data</span>
            </div>
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-white bg-slate-800 rounded-lg">
               <Menu size={24} />
            </button>
         </header>
         
         <main className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
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