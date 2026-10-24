"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_URL } from '@/config/api';

interface PendingDoctor {
  app_id: string;
  full_name: string;
  specialty: string;
  age: number;
  email: string;
  phone: string;
  license_number: string;
  license_cid: string;
  status: string;
}

export default function AdminPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard Data State
  const [pending, setPending] = useState<PendingDoctor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Hardcoded Authentication Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password === 'admin@123') {
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError('Invalid credentials. Access restricted to authorized network administrators.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setAuthError(null);
  };

  // Fetch Pending Doctors from Backend
  const fetchPendingDoctors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/doctors`);
      if (res.ok) {
        const data = await res.json();
        setPending(data.pending_doctors || []);
      }
    } catch (err) {
      console.error('Failed to load pending doctors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingDoctors();
    }
  }, [isAuthenticated]);

  // Approve Doctor and Issue Doctor ID on Ledger
  const handleApprove = async (app_id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/doctors/${app_id}/approve`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setApprovalMessage(`Doctor approved! Assigned ID: ${data.doctor_id} | Wallet: ${data.wallet_address || 'Local Hardhat Account'}. Welcome email with login credentials dispatched.`);
        setPending(prev => prev.filter(p => p.app_id !== app_id));
        setTimeout(() => setApprovalMessage(null), 8000);
      } else {
        alert(data.detail || 'Failed to approve application.');
      }
    } catch (err) {
      console.error('Approval error:', err);
      alert('Error connecting to backend API.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-gray-200 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Background cyber grid */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_120%,rgba(0,242,254,0.06),rgba(5,8,16,0.95))]" />

      {!isAuthenticated ? (
        /* ========================================================= */
        /* 1. RESTRICTED LOGIN VIEW                                  */
        /* ========================================================= */
        <div className="relative z-10 w-full max-w-md bg-[#0c1222]/95 border border-red-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.12)]">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-red-950/60 border border-red-500/50 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <svg className="w-7 h-7 text-red-400" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 bg-red-950/40 border border-red-900 px-3 py-1 rounded-full mb-2">
              Institutional Governance
            </span>
            <h1 className="text-2xl font-black text-white font-mono uppercase tracking-tight">
              Admin Authentication
            </h1>
            <p className="text-xs text-gray-400 mt-2 font-sans">
              Restricted portal. Unauthorized access attempts are monitored and recorded on the ledger.
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs font-mono flex items-center gap-2">
              <span className="text-red-400 font-bold">✕</span>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5" htmlFor="admin-username">
                Administrator Username
              </label>
              <input
                id="admin-username"
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-[#070b16] border border-gray-800 focus:border-red-500 text-white font-mono text-sm px-4 py-3 rounded-xl outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5" htmlFor="admin-password">
                Security Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#070b16] border border-gray-800 focus:border-red-500 text-white font-mono text-sm px-4 py-3 rounded-xl outline-none transition-all"
              />
            </div>

            <button
              id="admin-login-btn"
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-mono font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer mt-2"
            >
              🔒 Authenticate & Unlock Dashboard
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-800/80 text-center">
            <Link
              href="/"
              className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors"
            >
              ← Return to Public Network Visualizer
            </Link>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. PROTECTED GOVERNANCE DASHBOARD                         */
        /* ========================================================= */
        <div className="relative z-10 w-full max-w-5xl">
          {/* Dashboard Header Bar */}
          <div className="bg-[#0c1222]/90 border border-emerald-500/40 rounded-2xl p-6 backdrop-blur shadow-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                  Secure Administrative Session Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono uppercase tracking-tight">
                Hospital Authority & Governance Portal
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-sans">
                Review medical practitioner licensing credentials, verify off-chain IPFS identity proofs, and issue authorization wallets.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchPendingDoctors}
                className="bg-[#111c35] border border-gray-700 hover:border-gray-500 text-gray-300 text-xs font-mono px-3 py-2 rounded-xl transition-all"
              >
                ↻ Refresh List
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-950/60 border border-red-800 hover:bg-red-900 text-red-300 text-xs font-mono font-bold px-4 py-2 rounded-xl transition-all"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {approvalMessage && (
            <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-500 rounded-xl text-emerald-200 text-xs font-mono shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold text-sm">✓</span>
                <span>{approvalMessage}</span>
              </div>
              <button onClick={() => setApprovalMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Main Applications Section */}
          <div className="bg-[#0c1222]/80 border border-gray-800 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-white font-mono uppercase">
                  Pending Practitioner Verifications
                </h2>
                <div className="text-xs text-gray-400 font-mono mt-0.5">
                  Queue count: <span className="text-cyan-400 font-bold">{pending.length}</span> pending applications
                </div>
              </div>
              <div className="text-[10px] font-mono text-gray-500">
                SMART CONTRACT: 0x5FbDB2...0aa3
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-gray-500 font-mono text-xs">
                Fetching pending applications from decentralized registry...
              </div>
            ) : pending.length === 0 ? (
              <div className="py-16 text-center text-gray-500 font-mono text-xs border border-dashed border-gray-800 rounded-xl">
                ✓ All practitioner applications have been reviewed. No pending verifications.
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map(doc => (
                  <div
                    key={doc.app_id}
                    className="bg-[#070b16] border border-gray-800 hover:border-cyan-500/40 p-5 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-base font-bold text-white font-mono">{doc.full_name}</span>
                        <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                          {doc.status}
                        </span>
                        <span className="text-xs font-mono text-gray-500">({doc.app_id})</span>
                      </div>
                      
                      <div className="text-xs text-gray-400 font-mono space-y-0.5">
                        <div>Specialty: <span className="text-gray-200">{doc.specialty}</span> | Age: <span className="text-gray-200">{doc.age}</span></div>
                        <div>Email: <span className="text-gray-200">{doc.email}</span> | Phone: <span className="text-gray-200">{doc.phone}</span></div>
                        <div>Medical License #: <span className="text-cyan-400 font-bold">{doc.license_number}</span></div>
                      </div>

                      {doc.license_cid && (
                        <div className="mt-3">
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${doc.license_cid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Inspect IPFS Credential Document (CID: {doc.license_cid.substring(0, 16)}...)
                          </a>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleApprove(doc.app_id)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-extrabold text-xs uppercase tracking-wider py-3 px-5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      ✓ Approve & Issue Doctor ID
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors"
            >
              ← Back to Public Network Visualizer
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
