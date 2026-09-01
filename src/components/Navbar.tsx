import React from 'react';

interface NavbarProps {
  activePatientId: string | null;
  activeDoctorId: string | null;
  logout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePatientId, activeDoctorId, logout }) => {
  return (
    <div className="fixed top-0 w-full bg-[#0a0f1d]/80 backdrop-blur border-b border-gray-800 p-4 flex justify-between items-center z-40">
      <div className="text-xl font-bold text-white tracking-wide">MediPortal</div>
      <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
        <div>
          Patient Session: {activePatientId ? <span className="text-[#00f2fe]">{activePatientId}</span> : 'None'} | 
          Doctor Session: {activeDoctorId ? <span className="text-[#38bdf8]">{activeDoctorId}</span> : 'None'}
        </div>
        {(activePatientId || activeDoctorId) && (
          <button onClick={logout} className="text-red-400 hover:text-red-300 border border-red-900 px-2 py-1 rounded">
            Logout
          </button>
        )}
      </div>
    </div>
  );
};
