import React from 'react';

interface LandingViewProps {
  setCurrentView: (view: 'landing' | 'patient' | 'doctor' | 'admin') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ setCurrentView }) => (
  <div className="flex flex-col items-center w-full max-w-6xl animate-fade-in mt-10">
    <div className="text-center mb-16">
      <span className="bg-[#00f2fe]/20 text-[#00f2fe] px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-[#00f2fe]/30 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
        Healthcare Portal & Verification System
      </span>
      <h1 className="text-5xl font-extrabold mt-6 mb-4 text-white drop-shadow-md">
        Welcome to <span className="medi-gradient">MediPortal</span>
      </h1>
      <p className="text-gray-400 text-lg max-w-2xl mx-auto">
        Please select your portal option below to proceed with secure login or registration on the Blockchain EHR Network.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-8 w-full">
      <div className="card-bg p-8 rounded-2xl transition-transform hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(0,242,254,0.15)] flex flex-col">
        <div className="text-[#00f2fe] mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Option 01 - Patient Portal</h2>
        <p className="text-gray-400 mb-8 flex-grow">
          Access personalized health profile, view blood group details, track appointments, manage records securely via IPFS.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={() => setCurrentView('patient')} className="w-full bg-[#00f2fe] hover:bg-[#00c6ff] text-[#0a0f1d] font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)]">
            Enter Patient Portal →
          </button>
        </div>
      </div>

      <div className="card-bg p-8 rounded-2xl transition-transform hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(56,189,248,0.15)] flex flex-col">
        <div className="text-[#38bdf8] mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Option 02 - Doctor Login</h2>
        <p className="text-gray-400 mb-8 flex-grow">
          For licensed medical practitioners. Includes Medical License verification and admin approval workflow.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={() => setCurrentView('doctor')} className="w-full bg-[#38bdf8] hover:bg-[#0284c7] text-[#0a0f1d] font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(56,189,248,0.4)]">
            Enter Clinical Portal →
          </button>
        </div>
      </div>
    </div>

    <div className="mt-16 w-full border border-gray-800 bg-[#0a0f1d]/50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-xl backdrop-blur-sm">
      <div>
        <h3 className="text-xl font-bold text-gray-200">Hospital Administration & Verification Portal</h3>
        <p className="text-gray-500 text-sm mt-1">Review pending doctor registration certificates and issue unique Doctor IDs.</p>
      </div>
      <button onClick={() => setCurrentView('admin')} className="mt-4 md:mt-0 bg-transparent border border-gray-600 text-gray-300 hover:text-white hover:border-white font-semibold py-2 px-6 rounded-lg transition-colors">
        Open Admin Dashboard →
      </button>
    </div>
  </div>
);
