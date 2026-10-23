import React, { useState } from 'react';
import { ClinicalDiagnosisView } from './ClinicalDiagnosisView';
import { GeneralDiseaseAiView } from './GeneralDiseaseAiView';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DoctorViewProps {
  setCurrentView: (view: 'landing' | 'patient' | 'doctor') => void;
  activeDoctorId: string | null;
  setActiveDoctorId: (id: string | null) => void;
  doctorToken: string | null;
  setDoctorToken: (token: string | null) => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  setCurrentView,
  activeDoctorId,
  setActiveDoctorId,
  doctorToken,
  setDoctorToken
}) => {
  const [activeSection, setActiveSection] = useState<'records' | 'diagnosis' | 'general_ai'>('records');
  const [selectedRecordForAi, setSelectedRecordForAi] = useState<any>(null);
  const [showDocReg, setShowDocReg] = useState(false);
  const [showDocLogin, setShowDocLogin] = useState(false);
  const [showFetch, setShowFetch] = useState(false);
  const [showBreakGlass, setShowBreakGlass] = useState(false);
  const [fetchInput, setFetchInput] = useState("");
  const [breakGlassForm, setBreakGlassForm] = useState({ patient_id: '', proxy_phone_number: '' });
  const [patientData, setPatientData] = useState<any>(null);

  // Loading animation states
  const [isFetchingEHR, setIsFetchingEHR] = useState(false);
  const [downloadingCid, setDownloadingCid] = useState<string | null>(null);
  const [analyzingCid, setAnalyzingCid] = useState<string | null>(null);
  const [isBreakGlassLoading, setIsBreakGlassLoading] = useState(false);
  const [isDocRegistering, setIsDocRegistering] = useState(false);

  const [docForm, setDocForm] = useState({ full_name: '', specialty: '', age: '', email: '', phone: '', password: '', license_number: '' });
  const [docLicense, setDocLicense] = useState<File | null>(null);
  const [loginForm, setLoginForm] = useState({ doctor_id: '', password: '' });

  const handleDocRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docLicense) return alert("License Document required!");
    setIsDocRegistering(true);
    try {
      const fd = new FormData();
      Object.entries(docForm).forEach(([k, v]) => fd.append(k, v));
      fd.append("license_file", docLicense);

      const res = await fetch(`${API_URL}/api/v1/doctor/register`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        alert(`Application Submitted! Pending Admin Approval.\nApplication ID: ${data.app_id}\n\nA confirmation email has been sent to ${docForm.email}. Once hospital administration reviews and approves your credentials, you will receive your Doctor ID via email.`);
        setShowDocReg(false);
        setDocForm({ full_name: '', specialty: '', age: '', email: '', phone: '', password: '', license_number: '' });
        setDocLicense(null);
      } else alert(data.detail || "Registration Failed");
    } catch (err: any) {
      alert("Registration failed: " + (err.message || err));
    } finally {
      setIsDocRegistering(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("doctor_id", loginForm.doctor_id);
    fd.append("password", loginForm.password);

    const res = await fetch(`${API_URL}/api/v1/doctor/login`, { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setActiveDoctorId(data.doctor_id);
      setDoctorToken(data.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem("doctor_id", data.doctor_id);
        localStorage.setItem("doctor_token", data.access_token);
      }
      setShowDocLogin(false);
      alert("Logged in successfully!");
    } else alert(data.detail);
  };

  const handleFetchEHR = async (targetPatientId?: string) => {
    if (!activeDoctorId || !doctorToken) {
      alert("Please log in as Doctor first.");
      setLoginForm(prev => ({ ...prev, doctor_id: activeDoctorId || "" }));
      setShowDocLogin(true);
      return;
    }
    const pid = typeof targetPatientId === "string" ? targetPatientId : fetchInput;
    if (!pid.trim()) return alert("Please enter a Patient ID.");

    setIsFetchingEHR(true);
    setPatientData(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/ehr/${encodeURIComponent(pid.trim())}?doctor_id=${activeDoctorId}`, {
        headers: { "Authorization": `Bearer ${doctorToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPatientData(data);
        setShowFetch(false);
      } else {
        if (res.status === 401 || res.status === 403) {
          alert(`Doctor authentication session expired or invalid: ${data.detail || 'Please log in again.'}\nOpening login window to re-authenticate.`);
          setLoginForm(prev => ({ ...prev, doctor_id: activeDoctorId || "" }));
          setShowDocLogin(true);
        } else {
          alert(data.detail || "Failed to retrieve patient EHR records.");
        }
      }
    } catch (err: any) {
      alert("Error retrieving records: " + (err.message || err));
    } finally {
      setIsFetchingEHR(false);
    }
  };

  const handleDownloadRecord = async (r: any) => {
    try {
      setDownloadingCid(r.ipfs_cid);
      // Brief animated delay so doctor gets clear UX feedback during decryption
      await new Promise(resolve => setTimeout(resolve, 600));

      const binaryString = window.atob(r.content);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Download and decryption failed: " + (e.message || e));
    } finally {
      setDownloadingCid(null);
    }
  };

  const handleBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctorId || !doctorToken) return alert("Login as Doctor first.");

    setIsBreakGlassLoading(true);
    try {
      const fd = new FormData();
      fd.append("patient_id", breakGlassForm.patient_id.trim());
      fd.append("proxy_phone_number", breakGlassForm.proxy_phone_number.trim());

      const res = await fetch(`${API_URL}/api/v1/access/break-glass`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${doctorToken}` },
        body: fd
      });

      const data = await res.json();
      if (res.ok) {
        alert("Emergency Access Granted on Hardhat Blockchain! Fetching decrypted records...");
        setShowBreakGlass(false);
        await handleFetchEHR(breakGlassForm.patient_id.trim());
      } else {
        alert(data.detail || "Access Denied: Invalid Proxy Key");
      }
    } catch (err: any) {
      alert("Emergency override failed: " + (err.message || err));
    } finally {
      setIsBreakGlassLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mt-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button onClick={() => setCurrentView('landing')} className="text-gray-400 hover:text-white text-sm">
          ← Back to Portal Select
        </button>

        {/* Section Switcher Tabs */}
        <div className="flex flex-wrap bg-[#0c1322] border border-gray-800 p-1 rounded-xl font-mono text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveSection('records')}
            id="doctor-records-tab"
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'records'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Patient Records & Decryption
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRecordForAi(null);
              setActiveSection('general_ai');
            }}
            id="doctor-general-ai-tab"
            className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'general_ai'
                ? 'bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 text-emerald-300 font-bold border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'text-emerald-400 hover:text-emerald-200'
            }`}
          >
            <span>🩺</span> Universal Disease & Condition AI (XAI)
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('diagnosis')}
            id="doctor-diagnosis-tab"
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'diagnosis'
                ? 'bg-purple-500/25 text-purple-300 font-bold border border-purple-500/50'
                : 'text-purple-400 hover:text-purple-200'
            }`}
          >
            <span>🔬</span> Cell Biopsy Oncology AI
          </button>
        </div>
      </div>

      {activeSection === 'general_ai' ? (
        <GeneralDiseaseAiView 
          doctorToken={doctorToken}
          patientRecords={patientData?.records || []}
          initialRecord={selectedRecordForAi}
          onBackToPortal={() => {
            setSelectedRecordForAi(null);
            setActiveSection('records');
          }}
        />
      ) : activeSection === 'diagnosis' ? (
        <ClinicalDiagnosisView 
          initialDoctorId={activeDoctorId}
          initialDoctorToken={doctorToken}
          onBackToPortal={() => setActiveSection('records')}
        />
      ) : (
        <div className="card-bg p-8 rounded-2xl mb-8 border-t-4 border-t-[#38bdf8]">
          <h2 className="text-3xl font-bold text-white mb-2">Clinical Portal</h2>
          <p className="text-gray-400 mb-6">Requires verified Medical License and Admin Approval.</p>
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button 
              onClick={() => {
                setLoginForm(prev => ({ ...prev, doctor_id: activeDoctorId || "" }));
                setShowDocLogin(true);
              }} 
              id="doctor-relogin-action-btn"
              className="bg-cyan-500 hover:bg-cyan-400 text-[#0a0f1d] px-5 py-2 rounded-lg font-bold cursor-pointer font-mono text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>🔑</span>
              <span>{activeDoctorId ? `Re-Authenticate (${activeDoctorId})` : "Doctor Login"}</span>
            </button>

            {!activeDoctorId && (
              <button onClick={() => setShowDocReg(true)} className="bg-transparent border border-[#38bdf8] text-[#38bdf8] hover:bg-[#38bdf8]/10 px-5 py-2 rounded-lg font-bold font-mono text-xs cursor-pointer">Register (Upload License)</button>
            )}

            {activeDoctorId && (
              <>
                <button 
                  onClick={() => setShowFetch(true)} 
                  disabled={isFetchingEHR}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isFetchingEHR ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Querying Blockchain...</span>
                    </>
                  ) : (
                    <span>Fetch Patient EHR</span>
                  )}
                </button>
                
                <button onClick={() => setShowBreakGlass(true)} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold cursor-pointer">
                  Emergency Break-Glass
                </button>

                <button 
                  onClick={() => {
                    setSelectedRecordForAi(null);
                    setActiveSection('general_ai');
                  }} 
                  id="doctor-ask-ai-disease-btn"
                  className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-[#070b14] px-6 py-2 rounded-lg font-extrabold flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] font-mono transition-all transform hover:-translate-y-0.5"
                >
                  <span>🩺</span>
                  <span>Ask AI: Detect Any Disease (XAI)</span>
                </button>

                <button 
                  onClick={() => setActiveSection('diagnosis')} 
                  id="doctor-quick-ai-btn"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 cursor-pointer text-xs font-mono"
                >
                  <span>🔬</span> Biopsy Oncology AI
                </button>
              </>
            )}
          </div>

        {/* Animated Loading State while querying blockchain and IPFS */}
        {isFetchingEHR && (
          <div className="bg-[#0c1424] p-8 rounded-2xl border border-cyan-500/40 text-center my-6 shadow-2xl animate-fade-in" id="doctor-fetching-ehr-loader">
            <div className="relative w-14 h-14 mx-auto mb-3">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping" />
              <div className="w-14 h-14 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-purple-500 border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-lg">
                ⚡
              </div>
            </div>
            <div className="text-sm font-bold font-mono text-cyan-300">
              Querying Hardhat Smart Contract & Pinata IPFS...
            </div>
            <div className="text-xs text-gray-400 font-mono mt-1 animate-pulse">
              Verifying cryptographic permissions and decrypting AES-256 records in real-time...
            </div>
          </div>
        )}

        {patientData && (
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mt-6 animate-fade-in">
            <h3 className="text-xl font-bold text-[#00f2fe] mb-4">Patient Demographics: {patientData.patient_id}</h3>
            <div className="grid grid-cols-2 text-sm text-gray-300 gap-2 mb-6">
              <div>Name: <span className="text-white">{patientData.profile.full_name}</span></div>
              <div>Blood Group: <span className="text-red-400 font-bold">{patientData.profile.blood_group}</span></div>
              <div>Age: <span className="text-white">{patientData.profile.age}</span></div>
              <div>Proxy 1: <span className="text-white">{patientData.profile.emergency_contact_1}</span></div>
              <div>Proxy 2: <span className="text-white">{patientData.profile.emergency_contact_2 || "N/A"}</span></div>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Decrypted IPFS Records</h4>
            {patientData.records.map((r: any, i: number) => (
              <div key={i} className="bg-[#0a0f1d] p-4 rounded-xl border border-gray-700 mb-3 shadow-md">
                <div className="text-xs text-gray-400 font-mono">{r.timestamp}</div>
                <div className="font-bold text-white text-base mt-0.5">{r.filename}</div>
                <div className="text-xs text-[#38bdf8] font-mono truncate max-w-lg mb-3">CID: {r.ipfs_cid}</div>
                {r.content ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-800">
                    <button
                      disabled={downloadingCid === r.ipfs_cid}
                      onClick={() => handleDownloadRecord(r)}
                      id={`download-record-btn-${i}`}
                      className="text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-gray-300 text-white px-3.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 font-mono shadow-sm transition-all"
                    >
                      {downloadingCid === r.ipfs_cid ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Decrypting & Downloading...</span>
                        </>
                      ) : (
                        <>
                          <span>⬇️</span>
                          <span>Download {r.filename}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRecordForAi(r);
                        setActiveSection('general_ai');
                      }}
                      id={`analyze-record-btn-${i}`}
                      className="text-xs bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-[#070b14] font-extrabold px-4 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-0.5"
                    >
                      <span>🔬</span>
                      <span>Ask AI: Detect Disease & XAI</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-sm mt-1 text-red-400">{r.error || "Failed to decrypt"}</div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {showDocReg && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Clinical Verification Registration</h3>
            <form onSubmit={handleDocRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-gray-400 text-sm">Full Name</label><input required className="input-dark w-full p-2 rounded" onChange={e => setDocForm({ ...docForm, full_name: e.target.value })} /></div>
                <div><label className="text-gray-400 text-sm">Specialty</label><input required className="input-dark w-full p-2 rounded" onChange={e => setDocForm({ ...docForm, specialty: e.target.value })} /></div>
                <div><label className="text-gray-400 text-sm">Age</label><input required type="number" className="input-dark w-full p-2 rounded" onChange={e => setDocForm({ ...docForm, age: e.target.value })} /></div>
                <div><label className="text-gray-400 text-sm">Phone</label><input required type="tel" className="input-dark w-full p-2 rounded" onChange={e => setDocForm({ ...docForm, phone: e.target.value })} /></div>
                <div><label className="text-gray-400 text-sm">Email</label><input required type="email" className="input-dark w-full p-2 rounded" onChange={e => setDocForm({ ...docForm, email: e.target.value })} /></div>
                <div><label className="text-gray-400 text-sm">Password</label><input required type="password" className="input-dark w-full p-2 rounded" onChange={e => setDocForm({ ...docForm, password: e.target.value })} /></div>
                <div><label className="text-gray-400 text-sm">Medical License #</label><input required className="input-dark w-full p-2 rounded" onChange={e => setDocForm({ ...docForm, license_number: e.target.value })} /></div>
                <div className="col-span-2"><label className="text-gray-400 text-sm">Upload Certificate/License (PDF/Image)</label>
                  <input required type="file" className="text-white w-full p-2 border border-gray-600 rounded" onChange={e => setDocLicense(e.target.files?.[0] || null)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" disabled={isDocRegistering} onClick={() => setShowDocReg(false)} className="text-gray-400 hover:text-white px-4 cursor-pointer">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isDocRegistering}
                  className="bg-[#38bdf8] hover:bg-cyan-300 disabled:bg-gray-700 disabled:text-gray-400 text-[#0a0f1d] px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  {isDocRegistering ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#0a0f1d]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Uploading to IPFS...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDocLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-sm border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Doctor Login</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input required placeholder="DOC-XXXXX" className="input-dark w-full p-2 rounded" onChange={e => setLoginForm({ ...loginForm, doctor_id: e.target.value })} />
              <input required placeholder="Password" type="password" className="input-dark w-full p-2 rounded" onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowDocLogin(false)} className="text-gray-400">Cancel</button>
                <button type="submit" className="bg-[#38bdf8] text-[#0a0f1d] px-4 py-2 rounded font-bold">Login</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFetch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-sm border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Query Patient Records</h3>
            <input 
              value={fetchInput} 
              onChange={e => setFetchInput(e.target.value)} 
              placeholder="Patient ID (e.g. P20A0105I)" 
              className="input-dark w-full p-2.5 rounded-lg mb-4 font-mono text-sm" 
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFetch(false)} className="text-gray-400 hover:text-white px-3 text-xs font-mono">Cancel</button>
              <button 
                disabled={isFetchingEHR || !fetchInput.trim()}
                onClick={() => handleFetchEHR()} 
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-5 py-2 rounded-lg font-bold font-mono text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                {isFetchingEHR ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Fetching...</span>
                  </>
                ) : (
                  <span>Fetch EHR</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBreakGlass && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-sm border border-red-500/50">
            <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <span>🚨</span> Emergency Break-Glass
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Bypass patient consent using a registered proxy contact. This action is permanently audited on the blockchain.
            </p>
            <form onSubmit={handleBreakGlass} className="space-y-4">
              <input 
                required 
                value={breakGlassForm.patient_id} 
                onChange={e => setBreakGlassForm({ ...breakGlassForm, patient_id: e.target.value })} 
                placeholder="Patient ID (e.g. P20A0105I)" 
                className="input-dark w-full p-2.5 rounded-lg font-mono text-sm" 
              />
              <input 
                required 
                value={breakGlassForm.proxy_phone_number} 
                onChange={e => setBreakGlassForm({ ...breakGlassForm, proxy_phone_number: e.target.value })} 
                placeholder="Proxy Phone Number" 
                className="input-dark w-full p-2.5 rounded-lg font-mono text-sm" 
              />
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowBreakGlass(false)} className="text-gray-400 hover:text-white px-3 text-xs font-mono">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isBreakGlassLoading}
                  className="bg-red-600 hover:bg-red-500 disabled:bg-red-950 text-white px-5 py-2 rounded-lg font-bold font-mono text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {isBreakGlassLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Overriding...</span>
                    </>
                  ) : (
                    <span>Trigger Override</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
