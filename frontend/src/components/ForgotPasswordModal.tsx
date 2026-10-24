"use client";
import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'PATIENT' | 'DOCTOR';
  initialIdentifier?: string;
  onOpenLogin?: (role: 'PATIENT' | 'DOCTOR') => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'PATIENT',
  initialIdentifier = '',
  onOpenLogin
}) => {
  const [step, setStep] = useState<'request_code' | 'verify_code' | 'success'>('request_code');
  const [role, setRole] = useState<'PATIENT' | 'DOCTOR'>(initialRole);
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [resolvedUserId, setResolvedUserId] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(0);

  // Sync initial props when modal opens
  useEffect(() => {
    if (isOpen) {
      setRole(initialRole);
      setIdentifier(initialIdentifier);
      setStep('request_code');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setMaskedEmail('');
      setResolvedUserId('');
      setResendTimer(0);
    }
  }, [isOpen, initialRole, initialIdentifier]);

  // Handle countdown timer for code resend
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  if (!isOpen) return null;

  // Step 1: Request 6-digit verification code via email
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMsg("Please enter your Patient ID, Doctor ID, or registered Email address.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_type: role,
          identifier: cleanId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMaskedEmail(data.masked_email || "your registered email");
        setResolvedUserId(data.user_id || cleanId);
        setStep('verify_code');
        setResendTimer(60); // 60 seconds cooldown for resend
        setSuccessMsg(data.message || `Verification code sent to ${data.masked_email}`);
      } else {
        setErrorMsg(data.detail || "Could not locate an active account with provided identifier.");
      }
    } catch {
      setErrorMsg("Network error connecting to authentication server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code and update password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (!cleanCode || cleanCode.length < 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-type your new password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_type: role,
          identifier: resolvedUserId || identifier.trim(),
          code: cleanCode,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStep('success');
        setSuccessMsg(data.message || "Password successfully reset!");
      } else {
        setErrorMsg(data.detail || "Invalid or expired verification code. Please check your inbox or request a new code.");
      }
    } catch {
      setErrorMsg("Network error updating password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishAndLogin = () => {
    onClose();
    if (onOpenLogin) {
      onOpenLogin(role);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" id="forgot-password-modal">
      <div className="bg-[#0b1220] border-2 border-cyan-500/30 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-[0_0_60px_rgba(0,242,254,0.18)] relative overflow-hidden">
        
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors cursor-pointer text-sm w-7 h-7 rounded-full bg-gray-800/50 flex items-center justify-center"
          title="Close"
        >
          ✕
        </button>

        {/* ========================================================================= */}
        {/* STEP 1: REQUEST VERIFICATION CODE */}
        {/* ========================================================================= */}
        {step === 'request_code' && (
          <div>
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono uppercase tracking-wider mb-2 font-bold">
                <span>🔐</span>
                <span>Account Recovery</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Forgot Your Password?
              </h3>
              <p className="text-xs text-gray-400 mt-1 font-mono leading-relaxed">
                Choose your account role and enter your Identifier or registered Email. We will dispatch a 6-digit verification code to your inbox.
              </p>
            </div>

            {/* Role Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-[#131b2e] p-1.5 rounded-xl border border-gray-800 mb-5">
              <button
                type="button"
                onClick={() => { setRole('PATIENT'); setErrorMsg(null); }}
                className={`py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'PATIENT'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🧑‍⚕️</span>
                <span>Patient Account</span>
              </button>
              <button
                type="button"
                onClick={() => { setRole('DOCTOR'); setErrorMsg(null); }}
                className={`py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'DOCTOR'
                    ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-black shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🩺</span>
                <span>Doctor Portal</span>
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2 animate-fade-in font-mono">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Request Code Form */}
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-300 block mb-1.5">
                  {role === 'PATIENT' ? 'Patient ID or Email' : 'Doctor ID or Email'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
                    {role === 'PATIENT' ? '🆔' : '🩺'}
                  </span>
                  <input
                    type="text"
                    required
                    id="forgot-password-identifier"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder={role === 'PATIENT' ? 'e.g. A02C0905I or patient@email.com' : 'e.g. DOC-13906 or doctor@hospital.org'}
                    className="w-full bg-[#131b2e] text-white pl-9 pr-3 py-2.5 rounded-xl border border-gray-700 font-mono text-xs focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="send-verification-code-btn"
                  disabled={isLoading || !identifier.trim()}
                  className="w-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold font-mono text-xs py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Generating Code & Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <span>📨</span>
                      <span>Send Verification Code to Email</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-3 border-t border-gray-800/80">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenLogin) onOpenLogin(role);
                  }}
                  className="text-xs font-mono text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  ← Remember your password? Back to Login
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: VERIFY CODE & UPDATE PASSWORD */}
        {/* ========================================================================= */}
        {step === 'verify_code' && (
          <div>
            {/* Header */}
            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono uppercase tracking-wider mb-2 font-bold">
                <span>📧</span>
                <span>Code Dispatched</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Enter Verification Code
              </h3>
              <p className="text-xs text-gray-300 mt-1 font-mono leading-relaxed">
                A 6-digit verification code was sent to <strong className="text-cyan-400 font-semibold">{maskedEmail}</strong>. Enter the code below to update your password.
              </p>
            </div>

            {/* Success info banner */}
            {successMsg && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in font-mono">
                <span>✓</span>
                <span className="truncate">{successMsg}</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2 animate-fade-in font-mono">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* 6-Digit Code Input */}
              <div>
                <label className="text-xs font-mono text-gray-300 block mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  id="reset-verification-code-input"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-[#131b2e] text-cyan-300 text-center font-mono text-2xl font-bold tracking-[0.5em] py-2.5 rounded-xl border border-cyan-500/50 focus:border-cyan-300 focus:outline-none"
                />
              </div>

              {/* New Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-mono text-gray-300">New Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="text-[11px] font-mono text-gray-400 hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  id="reset-new-password-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-[#131b2e] text-white px-3 py-2.5 rounded-xl border border-gray-700 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-xs font-mono text-gray-300 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  id="reset-confirm-password-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-[#131b2e] text-white px-3 py-2.5 rounded-xl border border-gray-700 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
                {confirmPassword && (
                  <div className="mt-1 text-[11px] font-mono">
                    {newPassword === confirmPassword ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span>✓</span> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <span>✕</span> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="confirm-password-reset-btn"
                  disabled={isLoading || code.length < 6 || !newPassword || newPassword !== confirmPassword}
                  className="w-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold font-mono text-xs py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Verifying Code & Updating...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>Verify Code & Reset Password</span>
                    </>
                  )}
                </button>
              </div>

              {/* Resend Code & Back actions */}
              <div className="flex justify-between items-center text-xs font-mono text-gray-400 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setStep('request_code')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  ← Change ID / Email
                </button>

                <button
                  type="button"
                  disabled={resendTimer > 0 || isLoading}
                  onClick={() => handleRequestCode()}
                  className={`transition-colors cursor-pointer ${
                    resendTimer > 0 ? 'text-gray-600 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code 🔄"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SUCCESS CONFIRMATION */}
        {/* ========================================================================= */}
        {step === 'success' && (
          <div className="text-center py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <span className="text-3xl">✓</span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">
              Password Reset Complete!
            </h3>

            <p className="text-xs text-gray-300 font-mono mb-6 leading-relaxed max-w-sm mx-auto">
              The password for your <strong className="text-cyan-400">{role === 'PATIENT' ? 'Patient' : 'Doctor'}</strong> account (<code className="text-emerald-300 font-bold">{resolvedUserId}</code>) has been securely updated. A confirmation has been emailed to you.
            </p>

            <button
              type="button"
              id="proceed-to-login-after-reset-btn"
              onClick={handleFinishAndLogin}
              className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-extrabold font-mono text-xs py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔑</span>
              <span>Proceed to {role === 'PATIENT' ? 'Patient' : 'Doctor'} Login →</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
