import React, { useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Menu, Hexagon, Loader2 } from 'lucide-react';

// --- 1. LAYOUT COMPONENTS ---
import SidebarForeman from "./components/layout/SidebarForeman";
import SidebarAdmin from "./components/layout/SidebarAdmin";

// --- 2. LAZY LOAD PAGES ---
// Auth
const AccessPortal = React.lazy(() => import('./pages/AUTH/AccessPortal')); 
// (Sesuaikan nama folder AUTH dan file AccessPortal-nya, huruf besar-kecilnya harus sama persis dengan yang ada di komputer Anda)
// Foreman Data Entry
const TacticalInputHub = React.lazy(() => import('./pages/foreman/Inputdata/TacticalInputHub'));
const SmartDowntimeC = React.lazy(() => import('./pages/foreman/Inputdata/SmartDowntimeLoggerC'));
const SmartDowntimeF = React.lazy(() => import('./pages/foreman/Inputdata/SmartDowntimeLoggerF'));
const DefectCatcherC = React.lazy(() => import('./pages/foreman/Inputdata/DefectCatcherC'));
const DefectCatcherF = React.lazy(() => import('./pages/foreman/Inputdata/DefectCatcherF'));

// Admin Pages
const AccessControl = React.lazy(() => import('./pages/admin/AccessControl'));
const NeuralSystemHealth = React.lazy(() => import('./pages/admin/NeuralSystemHealth'));
const MasterDataEditor = React.lazy(() => import('./pages/admin/MasterData_GeneEditor'));

// --- 3. LOADING SPINNER ---
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#0B1120]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={48} className="animate-spin text-blue-500" />
      <span className="text-sm font-bold text-slate-400 animate-pulse tracking-widest">MEMUAT SISTEM...</span>
    </div>
  </div>
);

// --- 4. LAYOUTS ---
const ForemanLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-[#0B1120] overflow-hidden text-slate-200">
      <SidebarForeman isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
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

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-black overflow-hidden text-slate-200">
      <SidebarAdmin isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
         <header className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-30">
            <span className="font-mono text-sm font-bold text-emerald-500 tracking-widest">ROOT_ACCESS</span>
            <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white"><Menu size={24}/></button>
         </header>
         <main className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
            {children}
         </main>
      </div>
    </div>
  );
};

// --- ROUTE GUARD (Role Checker) ---
const RequireAdmin = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/access-portal" replace />;
  const role = String(user.jabatan || '').toLowerCase();
  const isAdmin = role.includes('admin') || role.includes('manager') || role.includes('root') || role.includes('system');
  return isAdmin ? children : <Navigate to="/foreman/tactical-input" replace />;
};

// --- 5. ROUTING CONFIGURATION ---
const App = () => {
  const { user } = useAuth();

  // Helper untuk menentukan redirect default setelah login
  const getDefaultRoute = () => {
    if (!user) return "/access-portal";
    const role = String(user.jabatan || '').toLowerCase();
    return (role.includes('admin') || role.includes('manager') || role.includes('root') || role.includes('system')) 
           ? "/admin/access-control" 
           : "/foreman/tactical-input";
  };

  return (
    <Router>
      <Routes>
        
        {/* PUBLIC ROUTE: Login Page */}
        <Route 
            path="/access-portal" 
            element={!user ? <Suspense fallback={<PageLoader />}><AccessPortal /></Suspense> : <Navigate to={getDefaultRoute()} replace />} 
        />
        <Route path="/login" element={<Navigate to="/access-portal" replace />} />

        {/* PROTECTED ROUTE: FOREMAN */}
        <Route 
          path="/" 
          element={user ? <ForemanLayout><Suspense fallback={<PageLoader />}><Outlet /></Suspense></ForemanLayout> : <Navigate to="/access-portal" replace />}
        >
          <Route index element={<Navigate to={getDefaultRoute()} replace />} />
          <Route path="foreman/tactical-input" element={<TacticalInputHub />} />
          <Route path="foreman/input/reject/c" element={<DefectCatcherC />} />
          <Route path="foreman/input/reject/f" element={<DefectCatcherF />} />
          <Route path="foreman/input/downtime/c" element={<SmartDowntimeC />} />
          <Route path="foreman/input/downtime/f" element={<SmartDowntimeF />} />
        </Route>

        {/* PROTECTED ROUTE: ADMIN (BARU DITAMBAHKAN) */}
        <Route 
          path="/admin" 
          element={<RequireAdmin><AdminLayout><Suspense fallback={<PageLoader />}><Outlet /></Suspense></AdminLayout></RequireAdmin>}
        >
          <Route index element={<Navigate to="access-control" replace />} />
          <Route path="access-control" element={<AccessControl />} />
          <Route path="system-health" element={<NeuralSystemHealth />} />
          <Route path="master-data" element={<MasterDataEditor />} />
        </Route>

        {/* FALLBACK ROUTE: Catch-all */}
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        
      </Routes>
    </Router>
  );
};

export default App;