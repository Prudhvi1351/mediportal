"use client";
import React from 'react';
import { NetworkCanvas } from './NetworkCanvas';
import { PacketSimulation } from './PacketSimulation';

interface LandingViewProps {
  setCurrentView: (view: 'landing' | 'patient' | 'doctor') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ setCurrentView }) => {
  return (
    <div className="relative w-full flex flex-col items-center">
      {/* 1. Animated Decentralized Network Background Canvas */}
      <NetworkCanvas />

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl flex flex-col items-center px-4 sm:px-6 pt-16 sm:pt-20 pb-20">
        
        {/* Top Architectural Badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-mono text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(0,242,254,0.2)]">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Decentralized Health Mesh Architecture</span>
        </div>

        {/* STRICT HERO HEADLINE */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-center text-white tracking-tight font-mono uppercase drop-shadow-[0_0_35px_rgba(0,242,254,0.3)] mb-4">
          Secure Decentralized Network
        </h1>

        {/* Academic / Technical Subtitle */}
        <p className="text-gray-300 text-center max-w-3xl text-sm sm:text-base md:text-lg mb-8 font-sans leading-relaxed">
          High-assurance distributed ledger infrastructure for electronic health records. Demonstrating multi-path 
          packet fragmentation, content-addressed IPFS storage, SHA-256 cryptographic proof verification, 
          and Byzantine fault-tolerant smart contract access control.
        </p>

        {/* Active Telemetry Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-4xl mb-10 font-mono text-xs">
          <div className="bg-[#0b1224]/80 border border-cyan-500/20 p-3 rounded-2xl flex flex-col items-center text-center backdrop-blur shadow-sm">
            <span className="text-gray-400 text-[10px] uppercase">Consensus Protocol</span>
            <span className="text-cyan-300 font-bold mt-1">PBFT / Hardhat EVM</span>
          </div>
          <div className="bg-[#0b1224]/80 border border-purple-500/20 p-3 rounded-2xl flex flex-col items-center text-center backdrop-blur shadow-sm">
            <span className="text-gray-400 text-[10px] uppercase">Storage Network</span>
            <span className="text-purple-300 font-bold mt-1">IPFS BitSwap Swarm</span>
          </div>
          <div className="bg-[#0b1224]/80 border border-emerald-500/20 p-3 rounded-2xl flex flex-col items-center text-center backdrop-blur shadow-sm">
            <span className="text-gray-400 text-[10px] uppercase">Cryptography</span>
            <span className="text-emerald-300 font-bold mt-1">AES-256 + SHA-256</span>
          </div>
          <div className="bg-[#0b1224]/80 border border-amber-500/20 p-3 rounded-2xl flex flex-col items-center text-center backdrop-blur shadow-sm">
            <span className="text-gray-400 text-[10px] uppercase">Ledger Contract</span>
            <span className="text-amber-300 font-bold mt-1 font-mono truncate max-w-[140px]">0x5FbDB2...0aa3</span>
          </div>
        </div>

        {/* 3. COMPUTER NETWORK PACKETING INTERACTIVE DEMO */}
        <PacketSimulation />

        {/* 4. Decentralized Portals Navigation Grid */}
        <div className="w-full max-w-6xl mt-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px bg-gray-800 flex-1" />
            <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest px-4">
              Decentralized Role-Based Access Portals
            </span>
            <div className="h-px bg-gray-800 flex-1" />
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Patient Portal Card */}
            <div className="bg-[#0c1322]/80 border border-cyan-500/30 hover:border-cyan-400/60 p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(0,242,254,0.15)] flex flex-col justify-between backdrop-blur">
              <div>
                <div className="text-cyan-400 mb-3 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded">
                    MODULE 01
                  </span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-mono">Patient Sovereign Vault</h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-6">
                  Manage patient decentralized identifier (DID), upload AES-encrypted medical records to IPFS, and delegate or revoke doctor permissions on-chain.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('patient')}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,242,254,0.3)]"
              >
                Enter Patient Portal →
              </button>
            </div>

            {/* Doctor Portal Card */}
            <div className="bg-[#0c1322]/80 border border-purple-500/30 hover:border-purple-400/60 p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] flex flex-col justify-between backdrop-blur">
              <div>
                <div className="text-purple-400 mb-3 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded">
                    MODULE 02
                  </span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-mono">Clinical Doctor Station</h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-6">
                  Access patient records verified via smart contract access control. Includes Emergency Break-Glass override with immutable audit logging.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('doctor')}
                className="w-full bg-purple-500 hover:bg-purple-400 text-black font-extrabold py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                Enter Doctor Portal →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
