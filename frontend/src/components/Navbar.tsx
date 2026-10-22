import React from 'react';

interface NavbarProps {
  activePatientId: string | null;
  activeDoctorId: string | null;
  logout: () => void;
  currentView: 'landing' | 'patient' | 'doctor';
  setCurrentView: (view: 'landing' | 'patient' | 'doctor') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePatientId,
  activeDoctorId,
  logout,
  currentView,
  setCurrentView
}) => {
  return (
    <div className="fixed top-0 left-0 w-full bg-[#080d1a]/85 backdrop-blur-md border-b border-gray-800/80 px-6 py-3.5 flex flex-wrap justify-between items-center z-50">
      {/* Brand & Network State */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.4)] group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-black font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-base font-extrabold text-white tracking-wide font-mono flex items-center gap-2">
              MediPortal
              <span className="text-[10px] font-normal text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                SECURE MESH
              </span>
            </div>
            <div className="text-[10px] font-mono text-gray-400">Decentralized EHR Network</div>
          </div>
        </button>

        {/* Quick View Switcher */}
        <div className="hidden md:flex items-center gap-1.5 ml-6 bg-[#0c1322] border border-gray-800 p-1 rounded-xl font-mono text-xs">
          <button
            onClick={() => setCurrentView('landing')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              currentView === 'landing'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Network Visualizer
          </button>
          <button
            onClick={() => setCurrentView('patient')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              currentView === 'patient'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Patient Portal
          </button>
          <button
            onClick={() => setCurrentView('doctor')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              currentView === 'doctor'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Doctor Portal
          </button>
        </div>
      </div>

      {/* Right status & Session info */}
      <div className="flex items-center gap-4 text-xs font-mono text-gray-400 mt-2 sm:mt-0">
        <div className="hidden lg:flex items-center gap-2 bg-[#0c1322] border border-gray-800 px-3 py-1 rounded-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>Patient: <span className="text-[#00f2fe] font-semibold">{activePatientId || 'None'}</span></span>
          <span className="text-gray-600">|</span>
          <span>Doctor: <span className="text-[#38bdf8] font-semibold">{activeDoctorId || 'None'}</span></span>
        </div>
        {(activePatientId || activeDoctorId) && (
          <button
            onClick={logout}
            className="text-red-400 hover:text-red-300 border border-red-900/60 bg-red-950/20 px-2.5 py-1 rounded-lg text-xs transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
};
