"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = searchParams.get('patient_id') || (typeof window !== 'undefined' ? localStorage.getItem('patient_id') : '') || 'P-NEW';
  const patientName = searchParams.get('name') || (typeof window !== 'undefined' ? localStorage.getItem('patient_name') : '') || 'Valued Patient';
  const patientEmail = searchParams.get('email') || '';

  const [countdown, setCountdown] = useState<number>(3);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/?view=patient');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleCopyId = () => {
    if (patientId) {
      navigator.clipboard.writeText(patientId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/?view=patient');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-gray-200 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background radial glowing mesh */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,rgba(0,242,254,0.12),rgba(5,8,16,0.98))]" />
      
      {/* Decorative cyber grid lines */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative z-10 w-full max-w-lg bg-[#0c1222]/95 border border-cyan-500/30 rounded-3xl p-8 sm:p-10 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,242,254,0.15)] text-center animate-in fade-in zoom-in-95 duration-500">
        
        {/* Animated Success Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,242,254,0.3)] animate-pulse">
          <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Status Badges */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Account Activated & Auto-Logged In
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Welcome, {patientName}!
        </h1>
        <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
          Your deterministic decentralized patient profile is registered and authenticated on MediPortal.
        </p>

        {/* Generated Patient ID Display */}
        <div className="bg-[#131b2e] border border-cyan-500/40 rounded-2xl p-5 mb-6 shadow-inner relative group">
          <div className="text-xs text-gray-400 font-mono uppercase tracking-wider mb-1">
            Your Assigned Patient ID
          </div>
          <div className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 tracking-wider">
            {patientId}
          </div>
          <button
            onClick={handleCopyId}
            className="mt-2 text-xs text-cyan-400/80 hover:text-cyan-300 font-mono transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            {copied ? (
              <span className="text-emerald-400 font-bold">✓ Copied to clipboard!</span>
            ) : (
              <span>Click to copy ID</span>
            )}
          </button>
        </div>

        {/* Email Notification Notice */}
        <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 mb-6 text-left flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-xs text-gray-300">
            <div className="font-semibold text-white mb-0.5">Onboarding Email Dispatched</div>
            <div>
              A registration confirmation and cryptographic credentials summary have been sent{patientEmail ? ` to ${patientEmail}` : ' to your email address'}.
            </div>
          </div>
        </div>

        {/* Countdown & Redirect Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-2 font-mono">
            <span>Entering Patient Dashboard...</span>
            <span className="text-cyan-400 font-bold">{countdown}s</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((3 - countdown) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Direct Action Button */}
        <button
          onClick={handleGoToDashboard}
          className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-[#070b14] hover:opacity-95 shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all transform hover:-translate-y-0.5"
        >
          Go to Patient Dashboard Now →
        </button>

      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070b14] text-cyan-400 flex items-center justify-center font-mono">
        Loading MediPortal Secure Session...
      </div>
    }>
      <WelcomeContent />
    </Suspense>
  );
}
