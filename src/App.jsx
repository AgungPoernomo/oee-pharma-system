import React, { useState, Suspense, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Menu, Loader2 } from 'lucide-react';

import SidebarForeman from "./components/layout/SidebarForeman";
import SidebarAdmin from "./components/layout/SidebarAdmin";

const AccessPortal = React.lazy(() => import('./pages/AUTH/AccessPortal'));
const TacticalInputHub = React.lazy(() => import('./pages/foreman/Inputdata/TacticalInputHub'));
const SmartDowntimeC = React.lazy(() => import('./pages/foreman/Inputdata/SmartDowntimeLoggerC'));
const SmartDowntimeF = React.lazy(() => import('./pages/foreman/Inputdata/SmartDowntimeLoggerF'));
const DefectCatcherC = React.lazy(() => import('./pages/foreman/Inputdata/DefectCatcherC'));
const DefectCatcherF = React.lazy(() => import('./pages/foreman/Inputdata/DefectCatcherF'));
const ForemanSettings = React.lazy(() => import('./pages/foreman/ForemanSettings')); 

const AccessControl = React.lazy(() => import('./pages/admin/AccessControl'));
const NeuralSystemHealth = React.lazy(() => import('./pages/admin/NeuralSystemHealth'));
const MasterDataEditor = React.lazy(() => import('./pages/admin/MasterData_GeneEditor'));

const getCleanLineNumber = (line) => {
  const numOnly = String(line || "1").replace(/\D/g, ""); 
  return numOnly || "1"; 
};

const DynamicOnesheetRoute = () => {
  const { user } = useAuth();
  const lineNum = getCleanLineNumber(user?.line);
  
  const Component = useMemo(() => {
    return React.lazy(() => import(`./pages/DailyOneSheet/OnesheetLine${lineNum}/DailyOnesheet.jsx`));
  }, [lineNum]);

  return <Suspense fallback={<PageLoader />}><Component /></Suspense>;
};

const DynamicInputCRoute = () => {
  const { user } = useAuth();
  const lineNum = getCleanLineNumber(user?.line);
  
  const Component = useMemo(() => {
    return React.lazy(() => import(`./pages/Inputdata/DataLine${lineNum}/INPUTC.jsx`));
  }, [lineNum]);

  return <Suspense fallback={<PageLoader />}><Component /></Suspense>;
};

const DynamicInputFRoute = () => {
  const { user } = useAuth();
  const lineNum = getCleanLineNumber(user?.line);
  
  const Component = useMemo(() => {
    return React.lazy(() => import(`./pages/Inputdata/DataLine${lineNum}/INPUTF.jsx`));
  }, [lineNum]);

  return <Suspense fallback={<PageLoader />}><Component /></Suspense>;
};

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#0B1120]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={48} className="animate-spin text-blue-500" />
      <span className="text-sm font-bold text-slate-400 animate-pulse tracking-widest">MEMUAT SISTEM...</span>
    </div>
  </div>
);

const ForemanLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-[#0B1120] overflow-hidden text-slate-200">
      <SidebarForeman isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
         <header className="lg:hidden bg-[#0f172a]/95 backdrop-blur-md text-white p-4 flex items-center justify-between shadow-lg z-30 shrink-0 border-b border-white/10 sticky top-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md border border-white/10 bg-white overflow-hidden shrink-0">
                <img src="/logo-perusahaan.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
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

const RequireAdmin = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/access-portal" replace />;
  const role = String(user.jabatan || '').toLowerCase();
  const isAdmin = role.includes('admin') || role.includes('manager') || role.includes('root') || role.includes('system');
  return isAdmin ? children : <Navigate to="/foreman/tactical-input" replace />;
};

const SessionGuard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const idleTimerRef = useRef(null);

  const IDLE_TIMEOUT = 15 * 60 * 1000; 

  useEffect(() => {
    if (!user) return; 

    const forceLogout = () => {
      logout();
      navigate('/access-portal', { replace: true });
      alert("⚠️ SESI BERAKHIR\n\nSistem mengamankan akun Anda karena tidak ada aktivitas selama 15 menit. Silakan Login kembali.");
    };

    let lastActivity = Date.now();

    const resetTimer = () => {
      const now = Date.now();
      if (now - lastActivity < 1000) return; 
      lastActivity = now;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(forceLogout, IDLE_TIMEOUT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, logout, navigate]);

  return null;
};

const JSpreadsheetScrollFix = () => {
  useEffect(() => {
    // Cache live HTMLCollections outside high-frequency event listeners (O(1) property access)
    const jssSheets = document.getElementsByClassName('jss_worksheet');
    const jexcels = document.getElementsByClassName('jexcel');

    let ticking = false;
    let rAfId = null;
    let timeoutId = null;

    const fixScroll = () => {
      if (jssSheets.length === 0 && jexcels.length === 0) return;
      if (ticking) return;
      ticking = true;
      rAfId = requestAnimationFrame(() => {
        ticking = false;
        const activeCell = document.querySelector('.jss_worksheet tbody td.highlight, .jexcel tbody td.highlight');
        if (activeCell && !activeCell.classList.contains('jss_freezed')) {
          const container = activeCell.closest('.jss_content, .jexcel_content');
          if (container) {
            const freezeCols = container.querySelectorAll('tbody tr:first-child .jss_freezed');
            if (freezeCols.length > 0) {
              const lastFrozenCol = freezeCols[freezeCols.length - 1];
              const frozenRect = lastFrozenCol.getBoundingClientRect();
              const cellRect = activeCell.getBoundingClientRect();
              if (cellRect.left < (frozenRect.right - 1)) {
                 const overlap = frozenRect.right - cellRect.left;
                 container.scrollLeft = Math.max(0, container.scrollLeft - overlap);
              }
            }
          }
        }
      });
    };

    const handleJSpreadsheetScrollBug = (e) => {
      // O(1) check using cached live collection instead of expensive querySelector on every keystroke
      if (jssSheets.length === 0 && jexcels.length === 0) return;
      
      const isKey = e.type === 'keydown' || e.type === 'keyup';
      if (isKey && !['ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;

      // Throttle updates to prevent excessive rAF and setTimeout calls during rapid typing/interaction
      if (!ticking) {
        rAfId = requestAnimationFrame(() => {
          fixScroll();
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(fixScroll, 50);
        });
      }
    };

    window.addEventListener('keydown', handleJSpreadsheetScrollBug, true);
    window.addEventListener('keyup', handleJSpreadsheetScrollBug, true);
    window.addEventListener('mousedown', handleJSpreadsheetScrollBug, true);
    window.addEventListener('scroll', fixScroll, { capture: true, passive: true });
    return () => {
      if (rAfId) cancelAnimationFrame(rAfId);
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleJSpreadsheetScrollBug, true);
      window.removeEventListener('keyup', handleJSpreadsheetScrollBug, true);
      window.removeEventListener('mousedown', handleJSpreadsheetScrollBug, true);
      window.removeEventListener('scroll', fixScroll, { capture: true });
    };
  }, []);
  return null;
};

const App = () => {
  const { user } = useAuth();

  const getDefaultRoute = () => {
    if (!user) return "/access-portal";
    const role = String(user.jabatan || '').toLowerCase();
    return (role.includes('admin') || role.includes('manager') || role.includes('root') || role.includes('system')) 
           ? "/admin/access-control" 
           : "/foreman/tactical-input";
  };

  return (
    <Router>
      <JSpreadsheetScrollFix />
      <SessionGuard /> 
      <Routes>
        
        <Route 
            path="/access-portal" 
            element={!user ? <Suspense fallback={<PageLoader />}><AccessPortal /></Suspense> : <Navigate to={getDefaultRoute()} replace />} 
        />
        <Route path="/login" element={<Navigate to="/access-portal" replace />} />

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
          <Route path="foreman/settings" element={<ForemanSettings />} />

          <Route path="foreman/onesheet" element={<DynamicOnesheetRoute />} />
          <Route path="foreman/input-c" element={<DynamicInputCRoute />} />
          <Route path="foreman/input-f" element={<DynamicInputFRoute />} />
        </Route>

        <Route 
          path="/admin" 
          element={<RequireAdmin><AdminLayout><Suspense fallback={<PageLoader />}><Outlet /></Suspense></AdminLayout></RequireAdmin>}
        >
          <Route index element={<Navigate to="access-control" replace />} />
          <Route path="access-control" element={<AccessControl />} />
          <Route path="system-health" element={<NeuralSystemHealth />} />
          <Route path="master-data" element={<MasterDataEditor />} />
        </Route>

        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        
      </Routes>
    </Router>
  );
};

export default App;