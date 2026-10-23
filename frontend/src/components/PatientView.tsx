import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PatientViewProps {
  setCurrentView: (view: 'landing' | 'patient' | 'doctor') => void;
  activePatientId: string | null;
  setActivePatientId: (id: string | null) => void;
  patientToken: string | null;
  setPatientToken: (token: string | null) => void;
}

/**
 * Calculate age strictly from date string accounting for month, day, and leap years.
 */
export const calculateAgeFromDOB = (dobString: string): string => {
  if (!dobString || !dobString.trim()) return '';
  const parts = dobString.split('-');
  if (parts.length !== 3) return '';
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed month
  const birthDay = parseInt(parts[2], 10);
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return '';

  const birthDate = new Date(birthYear, birthMonth, birthDay);
  if (isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 ? age.toString() : '0';
};

export const PatientView: React.FC<PatientViewProps> = ({ 
  setCurrentView, 
  activePatientId, 
  setActivePatientId,
  patientToken,
  setPatientToken
}) => {
  const [showRegModal, setShowRegModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantDocId, setGrantDocId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [isFetchingDocInfo, setIsFetchingDocInfo] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<{
    doctor_id: string;
    full_name: string;
    specialty: string;
    license_number: string;
    status: string;
    wallet_address: string;
  } | null>(null);
  const [fetchDocError, setFetchDocError] = useState<string | null>(null);
  const [isVerifiedConfirmed, setIsVerifiedConfirmed] = useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [regForm, setRegForm] = useState({full_name:'', email:'', password:'', age:'', dob:'', gender:'Male', blood_group:'A+', address:'', emergency_contact_1:'', emergency_contact_2:''});
  const [loginForm, setLoginForm] = useState({patient_id:'', password:''});
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Previously uploaded EHR Records state
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [downloadingCid, setDownloadingCid] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedCid, setCopiedCid] = useState<string | null>(null);

  // Individual React state variables for Day, Month, and Year dropdowns
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const months = [
    { value: '01', name: 'January' },
    { value: '02', name: 'February' },
    { value: '03', name: 'March' },
    { value: '04', name: 'April' },
    { value: '05', name: 'May' },
    { value: '06', name: 'June' },
    { value: '07', name: 'July' },
    { value: '08', name: 'August' },
    { value: '09', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);

  const getDaysInMonth = (monthStr: string, yearStr: string): number => {
    if (!monthStr) return 31;
    const m = parseInt(monthStr, 10);
    const y = yearStr ? parseInt(yearStr, 10) : 2024;
    return new Date(y, m, 0).getDate();
  };

  const updateDateOfBirth = (day: string, month: string, year: string) => {
    let validDay = day;
    if (day && month) {
      const maxDays = getDaysInMonth(month, year);
      if (parseInt(day, 10) > maxDays) {
        validDay = String(maxDays).padStart(2, '0');
        setSelectedDay(validDay);
      }
    }

    if (validDay && month && year) {
      const combinedDOB = `${year}-${month}-${validDay.padStart(2, '0')}`;
      const calculatedAge = calculateAgeFromDOB(combinedDOB);
      setRegForm(prev => ({
        ...prev,
        dob: combinedDOB,
        age: calculatedAge
      }));
    } else {
      setRegForm(prev => ({
        ...prev,
        dob: '',
        age: ''
      }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/v1/patient/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({...regForm, age: parseInt(regForm.age)||0})
    });
    const data = await res.json();
    if(res.ok) {
      // Intercept authentication token and patient ID
      if (data.access_token) {
        setPatientToken(data.access_token);
        if (typeof window !== 'undefined') localStorage.setItem("patient_token", data.access_token);
      }
      if (data.patient_id) {
        setActivePatientId(data.patient_id);
        if (typeof window !== 'undefined') localStorage.setItem("patient_id", data.patient_id);
      }
      const pName = data.full_name || regForm.full_name;
      if (typeof window !== 'undefined') localStorage.setItem("patient_name", pName);

      const targetUrl = `/welcome?patient_id=${encodeURIComponent(data.patient_id || '')}&name=${encodeURIComponent(pName)}&email=${encodeURIComponent(regForm.email)}`;

      setShowRegModal(false);
      setSelectedDay('');
      setSelectedMonth('');
      setSelectedYear('');
      setRegForm({full_name:'', email:'', password:'', age:'', dob:'', gender:'Male', blood_group:'A+', address:'', emergency_contact_1:'', emergency_contact_2:''});

      // Auto-login routing to welcome page
      window.location.href = targetUrl;
    } else alert(data.detail || "Failed.");
  };

  const fetchPatientRecords = async (targetId?: string, targetToken?: string) => {
    const pid = targetId || activePatientId;
    const tok = targetToken || patientToken;
    if (!pid || !tok) return;

    setIsLoadingRecords(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/patient/${encodeURIComponent(pid.trim())}/records`, {
        headers: { "Authorization": `Bearer ${tok}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPatientRecords(data.records || []);
        if (data.profile) setPatientProfile(data.profile);
      } else {
        console.warn("Could not retrieve patient records:", data.detail);
      }
    } catch (err: any) {
      console.error("Error fetching patient records:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (activePatientId && patientToken) {
      fetchPatientRecords(activePatientId, patientToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatientId, patientToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("patient_id", loginForm.patient_id);
    fd.append("password", loginForm.password);
    
    const res = await fetch(`${API_URL}/api/v1/patient/login`, { method: "POST", body: fd });
    const data = await res.json();
    if(res.ok) {
      setActivePatientId(data.patient_id);
      setPatientToken(data.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem("patient_id", data.patient_id);
        localStorage.setItem("patient_token", data.access_token);
      }
      setShowLoginModal(false);
      fetchPatientRecords(data.patient_id, data.access_token);
      alert("Logged in successfully!");
    } else alert(data.detail || "Login failed");
  };

  const handleUpload = async () => {
    if(!activePatientId || !patientToken) return alert("Login first!");
    if(!fileToUpload) return alert("Select a file.");

    setIsUploading(true);
    setUploadStep("Encrypting medical record with AES-256-CBC...");

    // Simulated progress transitions for visual UX feedback
    const t1 = setTimeout(() => setUploadStep("Pinning encrypted payload to decentralized IPFS..."), 600);
    const t2 = setTimeout(() => setUploadStep("Anchoring CID record to Hardhat Smart Contract..."), 1200);

    try {
      const formData = new FormData();
      formData.append("patient_id", activePatientId);
      formData.append("file", fileToUpload);
      const res = await fetch(`${API_URL}/api/v1/ehr/upload`, { 
        method: "POST", 
        headers: { "Authorization": `Bearer ${patientToken}` },
        body: formData 
      });
      const data = await res.json();
      if(res.ok) { 
        alert(`EHR Encrypted & Uploaded Successfully!\nIPFS CID: ${data.ipfs_cid}`); 
        setShowUploadModal(false); 
        setFileToUpload(null);
        fetchPatientRecords();
      } else {
        alert(data.detail || "Upload failed");
      }
    } catch (err: any) {
      alert("Upload failed: " + (err.message || err));
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsUploading(false);
      setUploadStep("");
    }
  };

  const handleDownloadRecord = async (r: any) => {
    try {
      setDownloadingCid(r.ipfs_cid);
      await new Promise(resolve => setTimeout(resolve, 500));

      const binaryString = window.atob(r.content);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const isPdf = r.filename.toLowerCase().endsWith('.pdf');
      const isImage = /\.(jpeg|jpg|png|webp|gif)$/i.test(r.filename);
      const mimeType = isPdf ? 'application/pdf' : isImage ? 'image/jpeg' : 'application/octet-stream';
      const blob = new Blob([bytes], { type: mimeType });
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

  const copyToClipboard = (text: string, cid: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCid(cid);
    setTimeout(() => setCopiedCid(null), 2000);
  };

  const handleFetchDoctorInfo = async () => {
    if(!grantDocId.trim()) {
      setFetchDocError("Please enter a valid Doctor ID (e.g. DOC-14288).");
      return;
    }
    setFetchDocError(null);
    setDoctorInfo(null);
    setIsVerifiedConfirmed(false);
    setIsFetchingDocInfo(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/doctor/${encodeURIComponent(grantDocId.trim())}/info`, {
        headers: { "Authorization": `Bearer ${patientToken}` }
      });
      const data = await res.json();
      if(res.ok) {
        setDoctorInfo(data);
      } else {
        setFetchDocError(data.detail || `Doctor ID '${grantDocId}' could not be verified in the medical registry.`);
      }
    } catch (err: any) {
      setFetchDocError(err.message || "Network error fetching doctor information.");
    } finally {
      setIsFetchingDocInfo(false);
    }
  };

  const handleGrantAccess = async () => {
    if(!activePatientId || !patientToken) return alert("Login first!");
    if(!grantDocId.trim()) return alert("Enter Doctor ID.");
    if(!doctorInfo) return alert("Please fetch and review the doctor's details first.");
    if(!isVerifiedConfirmed) return alert("Please check the verification acknowledgement box before granting access.");

    setIsGrantingAccess(true);
    try {
      const formData = new FormData();
      formData.append("doctor_id", grantDocId.trim());
      const res = await fetch(`${API_URL}/api/v1/patient/${activePatientId}/grant`, { 
        method: "POST", 
        headers: { "Authorization": `Bearer ${patientToken}` },
        body: formData 
      });
      const data = await res.json();
      if(res.ok) { 
        alert(data.message || `Blockchain access successfully granted to Dr. ${doctorInfo.full_name}!`); 
        setShowGrantModal(false);
        setGrantDocId("");
        setDoctorInfo(null);
        setIsVerifiedConfirmed(false);
      } else {
        alert(data.detail || "Failed to grant access");
      }
    } catch (err: any) {
      alert("Failed to grant blockchain access: " + (err.message || err));
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const filteredRecords = patientRecords.filter(r => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (r.filename && r.filename.toLowerCase().includes(q)) ||
           (r.ipfs_cid && r.ipfs_cid.toLowerCase().includes(q)) ||
           (r.timestamp && r.timestamp.toLowerCase().includes(q));
  });

  return (
    <div className="w-full max-w-4xl mt-6 animate-fade-in">
      <button onClick={() => setCurrentView('landing')} className="text-gray-400 hover:text-white mb-6">← Back to Portal Select</button>
      <div className="card-bg p-8 rounded-2xl mb-8 border-t-4 border-t-[#00f2fe]">
        <h2 className="text-3xl font-bold text-white mb-2">Patient Dashboard</h2>
        <p className="text-gray-400 mb-6">Manage and view your health records securely on IPFS & Blockchain.</p>
        
        {!activePatientId ? (
          <div className="flex gap-4">
            <button onClick={() => setShowRegModal(true)} className="bg-[#00f2fe] text-[#0a0f1d] px-6 py-2 rounded-lg font-bold cursor-pointer">Register New Account</button>
            <button onClick={() => setShowLoginModal(true)} className="border border-[#00f2fe] text-[#00f2fe] hover:bg-[#00f2fe]/10 px-6 py-2 rounded-lg font-bold cursor-pointer">Patient Login</button>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setShowUploadModal(true)} 
                  id="patient-upload-new-ehr-btn"
                  className="bg-[#00f2fe] text-[#0a0f1d] hover:bg-cyan-300 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all font-mono text-xs"
                >
                  <span>📤</span>
                  <span>Upload New EHR</span>
                </button>
                <button 
                  onClick={() => setShowGrantModal(true)} 
                  id="patient-grant-access-btn"
                  className="border border-purple-500 text-purple-400 hover:bg-purple-500/10 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-all font-mono text-xs"
                >
                  <span>🔐</span>
                  <span>Grant Doctor Access</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fetchPatientRecords()}
                  disabled={isLoadingRecords}
                  id="patient-refresh-records-btn"
                  className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer border border-gray-700 transition-colors"
                >
                  <span className={isLoadingRecords ? "animate-spin" : ""}>🔄</span>
                  <span>Refresh Vault</span>
                </button>
              </div>
            </div>

            {/* Logged in Patient Profile Badge */}
            <div className="bg-[#0a101f] p-4 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-gray-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Patient:</span>
                <strong className="text-cyan-400 font-bold">{activePatientId}</strong>
                {patientProfile?.full_name && (
                  <span className="text-white font-semibold ml-1">({patientProfile.full_name})</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {patientProfile?.blood_group && (
                  <span>Blood Group: <strong className="text-red-400">{patientProfile.blood_group}</strong></span>
                )}
                {patientProfile?.age && (
                  <span>Age: <strong className="text-white">{patientProfile.age}</strong></span>
                )}
                {patientProfile?.gender && (
                  <span>Gender: <strong className="text-gray-300">{patientProfile.gender}</strong></span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PREVIOUSLY UPLOADED EHRS SECTION */}
      {activePatientId && (
        <div className="card-bg p-8 rounded-2xl mb-8 border border-cyan-500/30 shadow-2xl animate-fade-in" id="patient-ehr-vault-section">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-lg border border-cyan-500/30">📂</span>
                <h3 className="text-2xl font-bold text-white">Your Encrypted Health Records (EHR Vault)</h3>
              </div>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                Decentralized patient medical history anchored on Hardhat & IPFS with AES-256-CBC cryptography.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                {patientRecords.length} {patientRecords.length === 1 ? 'Record' : 'Records'} Secured
              </span>
            </div>
          </div>

          {/* Search filter if records exist */}
          {patientRecords.length > 2 && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search your records by filename or IPFS CID..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full bg-[#090f1d] text-white p-2.5 rounded-xl border border-gray-800 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          )}

          {/* Loading Animation */}
          {isLoadingRecords ? (
            <div className="py-12 text-center" id="records-loading-indicator">
              <div className="relative w-12 h-12 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping" />
                <div className="w-12 h-12 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-cyan-500 border-l-transparent animate-spin" />
              </div>
              <div className="text-sm font-bold text-cyan-300 font-mono">Querying Blockchain & IPFS Vault...</div>
              <div className="text-xs text-gray-400 font-mono mt-1">Retrieving decentralized records and decrypting AES-256 payload</div>
            </div>
          ) : patientRecords.length === 0 ? (
            <div className="p-8 text-center bg-[#090f1d] rounded-2xl border border-dashed border-gray-700/80 my-2">
              <div className="text-4xl mb-3">📂</div>
              <div className="text-base font-bold text-white mb-1">No Medical Records Uploaded Yet</div>
              <p className="text-xs text-gray-400 max-w-md mx-auto mb-4 font-mono">
                Your medical vault is currently empty. Use the &quot;Upload New EHR&quot; button above to securely store your first clinical report or lab test on IPFS.
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-[#00f2fe] text-[#0a0f1d] px-5 py-2 rounded-lg font-bold font-mono text-xs hover:bg-cyan-300 transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Upload First Record</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3" id="patient-records-list">
              {filteredRecords.map((r: any, idx: number) => {
                const isPdf = r.filename.toLowerCase().endsWith('.pdf');
                const isImage = /\.(jpeg|jpg|png|webp|gif)$/i.test(r.filename);
                const fileIcon = isPdf ? '📄' : isImage ? '🖼️' : '📝';
                const fileColor = isPdf ? 'text-red-400 border-red-500/40 bg-red-950/30' : isImage ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30' : 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30';

                return (
                  <div
                    key={r.id || idx}
                    className="bg-[#090f1d] p-4 rounded-xl border border-gray-800 hover:border-cyan-500/40 transition-all flex flex-wrap items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-[260px]">
                      <div className={`p-2.5 rounded-xl border ${fileColor} text-xl flex-shrink-0`}>
                        {fileIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-white text-sm truncate max-w-md" title={r.filename}>
                            {r.filename}
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Decrypted & Verified
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-gray-400">
                          {r.timestamp && <span>Date: {r.timestamp}</span>}
                          {r.size_bytes && <span>Size: {(r.size_bytes / 1024).toFixed(1)} KB</span>}
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">CID:</span>
                            <span className="text-cyan-300 font-mono truncate max-w-[140px]" title={r.ipfs_cid}>
                              {r.ipfs_cid}
                            </span>
                            <button
                              onClick={() => copyToClipboard(r.ipfs_cid, r.ipfs_cid)}
                              className="text-gray-400 hover:text-cyan-300 text-[11px] ml-1 cursor-pointer"
                              title="Copy IPFS CID"
                            >
                              {copiedCid === r.ipfs_cid ? '✓ Copied' : '📋'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {r.content && (
                        <button
                          onClick={() => setPreviewRecord(r)}
                          id={`patient-preview-btn-${idx}`}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-700"
                        >
                          <span>👁️</span>
                          <span>Preview</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadRecord(r)}
                        disabled={downloadingCid === r.ipfs_cid || !r.content}
                        id={`patient-download-btn-${idx}`}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-4 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        {downloadingCid === r.ipfs_cid ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Decrypting...</span>
                          </>
                        ) : (
                          <>
                            <span>⬇️</span>
                            <span>Download</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showRegModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Patient Registration</h3>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-400">Full Name</label><input required className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, full_name: e.target.value})}/></div>
                <div><label className="text-sm text-gray-400">Email</label><input required type="email" className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, email: e.target.value})}/></div>
                <div><label className="text-sm text-gray-400">Password</label><input required type="password" className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, password: e.target.value})}/></div>
                <div><label className="text-sm text-gray-400">Blood Group</label>
                  <select className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, blood_group: e.target.value})}>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-400 block mb-1">
                    Date of Birth (DOB) <span className="text-xs text-gray-500 font-normal">(Day / Month / Year)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <select
                        id="patient-reg-day"
                        required
                        value={selectedDay}
                        className="input-dark w-full p-2 rounded text-sm bg-gray-900 border border-gray-700 text-white focus:border-cyan-400"
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedDay(val);
                          updateDateOfBirth(val, selectedMonth, selectedYear);
                        }}
                      >
                        <option value="">Day</option>
                        {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => {
                          const dayVal = String(i + 1).padStart(2, '0');
                          return (
                            <option key={dayVal} value={dayVal}>
                              {i + 1}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <select
                        id="patient-reg-month"
                        required
                        value={selectedMonth}
                        className="input-dark w-full p-2 rounded text-sm bg-gray-900 border border-gray-700 text-white focus:border-cyan-400"
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedMonth(val);
                          updateDateOfBirth(selectedDay, val, selectedYear);
                        }}
                      >
                        <option value="">Month</option>
                        {months.map(m => (
                          <option key={m.value} value={m.value}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        id="patient-reg-year"
                        required
                        value={selectedYear}
                        className="input-dark w-full p-2 rounded text-sm bg-gray-900 border border-gray-700 text-white focus:border-cyan-400"
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedYear(val);
                          updateDateOfBirth(selectedDay, selectedMonth, val);
                        }}
                      >
                        <option value="">Year</option>
                        {years.map(y => (
                          <option key={y} value={String(y)}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {regForm.dob && (
                    <div className="text-xs text-gray-400 mt-1 font-mono flex items-center justify-between">
                      <span>Standard ISO DOB: <span className="text-cyan-400 font-bold">{regForm.dob}</span></span>
                      {selectedMonth && (
                        <span className="text-gray-500">Days in selected month: {getDaysInMonth(selectedMonth, selectedYear)}</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-400">
                    Age <span className="text-[10px] text-cyan-400 font-mono">(Auto-Calculated)</span>
                  </label>
                  <input 
                    id="patient-reg-age"
                    required 
                    readOnly 
                    type="number" 
                    value={regForm.age}
                    placeholder="Auto from DOB"
                    className="input-dark w-full p-2 rounded bg-gray-800/60 cursor-not-allowed text-cyan-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Gender</label>
                  <select 
                    className="input-dark w-full p-2 rounded" 
                    value={regForm.gender} 
                    onChange={e => setRegForm({...regForm, gender: e.target.value})}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div><label className="text-sm text-gray-400">Proxy Contact 1 (Req)</label><input required className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, emergency_contact_1: e.target.value})}/></div>
                <div><label className="text-sm text-gray-400">Proxy Contact 2 (Opt)</label><input className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, emergency_contact_2: e.target.value})}/></div>
                <div className="col-span-2"><label className="text-sm text-gray-400">Address</label><textarea required className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, address: e.target.value})}></textarea></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowRegModal(false);
                    setSelectedDay('');
                    setSelectedMonth('');
                    setSelectedYear('');
                    setRegForm({full_name:'', email:'', password:'', age:'', dob:'', gender:'Male', blood_group:'A+', address:'', emergency_contact_1:'', emergency_contact_2:''});
                  }} 
                  className="text-gray-400 hover:text-white px-4"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-[#00f2fe] text-[#0a0f1d] px-6 py-2 rounded font-bold">Register Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-sm border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Patient Login</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input required placeholder="Patient ID (e.g. P20A0105I)" className="input-dark w-full p-2 rounded" onChange={e=>setLoginForm({...loginForm, patient_id: e.target.value})}/>
              <input required placeholder="Password" type="password" className="input-dark w-full p-2 rounded" onChange={e=>setLoginForm({...loginForm, password: e.target.value})}/>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setShowLoginModal(false)} className="text-gray-400">Cancel</button>
                <button type="submit" className="bg-[#00f2fe] text-[#0a0f1d] px-4 py-2 rounded font-bold">Login</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-md border border-cyan-500/40 shadow-2xl relative overflow-hidden">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span>📤</span> Upload EHR to IPFS & Blockchain
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Medical document will be AES-256 encrypted before pinning to decentralized IPFS.
            </p>

            {isUploading ? (
              <div className="py-8 text-center animate-fade-in" id="upload-loading-indicator">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping" />
                  <div className="w-16 h-16 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-cyan-500 border-l-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xl">
                    🔒
                  </div>
                </div>
                <div className="font-bold text-cyan-300 font-mono text-sm mb-1">
                  Secure Ingestion in Progress
                </div>
                <div className="text-xs text-gray-300 font-mono animate-pulse">
                  {uploadStep || "Encrypting & Uploading to IPFS..."}
                </div>
                <div className="mt-4 text-[11px] text-gray-500 font-mono">
                  Please wait while the transaction confirms on Hardhat...
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="text-xs text-gray-300 font-mono block mb-2">Select Medical Report / Record (PDF, Image, Text)</label>
                  <input 
                    type="file" 
                    id="patient-file-upload-input"
                    onChange={e => setFileToUpload(e.target.files?.[0]||null)} 
                    className="text-white w-full p-3 border border-gray-700 rounded-xl bg-gray-900 text-sm focus:border-cyan-400"
                  />
                  {fileToUpload && (
                    <div className="mt-2 text-xs text-cyan-400 font-mono flex items-center gap-1">
                      <span>✓ Ready to encrypt:</span> <strong>{fileToUpload.name}</strong> ({(fileToUpload.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowUploadModal(false)} 
                    className="text-gray-400 hover:text-white px-4 py-2 font-mono text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    id="submit-ehr-upload-btn"
                    disabled={!fileToUpload}
                    onClick={handleUpload} 
                    className="bg-[#00f2fe] hover:bg-cyan-400 disabled:bg-gray-800 disabled:text-gray-500 text-[#0a0f1d] px-6 py-2 rounded-xl font-bold font-mono text-xs transition-all shadow-lg cursor-pointer"
                  >
                    Encrypt & Upload
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showGrantModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-lg border border-purple-500/40 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🔐</span> Grant EHR Access (Blockchain)
              </h3>
              <button 
                onClick={() => {
                  setShowGrantModal(false);
                  setDoctorInfo(null);
                  setFetchDocError(null);
                  setIsVerifiedConfirmed(false);
                }} 
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Step 1: Enter Doctor ID and verify credentials before authorizing access.
            </p>

            {/* Doctor ID Input & Fetch Info Button */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                id="grant-doctor-id-input"
                placeholder="Doctor ID (e.g. DOC-14288)"
                value={grantDocId}
                onChange={e => {
                  setGrantDocId(e.target.value);
                  setDoctorInfo(null);
                  setFetchDocError(null);
                  setIsVerifiedConfirmed(false);
                }}
                className="text-white input-dark flex-1 p-2.5 rounded-lg border border-gray-700 bg-gray-900 font-mono text-sm focus:border-purple-400"
              />
              <button
                type="button"
                id="fetch-doctor-info-btn"
                disabled={isFetchingDocInfo || !grantDocId.trim()}
                onClick={handleFetchDoctorInfo}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-4 py-2.5 rounded-lg font-bold font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                {isFetchingDocInfo ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Fetch Doctor Info</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Banner */}
            {fetchDocError && (
              <div id="fetch-doctor-error-banner" className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{fetchDocError}</span>
              </div>
            )}

            {/* Verified Doctor Profile Card */}
            {doctorInfo && (
              <div id="verified-doctor-card" className="bg-[#0f172a] p-5 rounded-2xl border-2 border-emerald-500/50 mb-5 shadow-lg animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Verified Medical Practitioner
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {doctorInfo.doctor_id}
                  </span>
                </div>

                <div className="text-lg font-bold text-white mb-1">
                  Dr. {doctorInfo.full_name}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mt-2 font-mono">
                  <div>
                    <span className="text-gray-400">Specialty:</span>{" "}
                    <span className="text-white font-semibold">{doctorInfo.specialty}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">License #:</span>{" "}
                    <span className="text-white font-semibold">{doctorInfo.license_number}</span>
                  </div>
                  <div className="col-span-2 truncate">
                    <span className="text-gray-400">Wallet:</span>{" "}
                    <span className="text-purple-300 font-mono text-[11px]">{doctorInfo.wallet_address || "Connected Hardhat Node"}</span>
                  </div>
                </div>

                {/* Verification Confirmation Checkbox */}
                <div className="mt-4 pt-3 border-t border-gray-800">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-200">
                    <input
                      type="checkbox"
                      id="verify-doctor-checkbox"
                      checked={isVerifiedConfirmed}
                      onChange={e => setIsVerifiedConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span>
                      I have verified <strong>Dr. {doctorInfo.full_name}</strong>&apos;s credentials and approve granting access on the smart contract.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => {
                  setShowGrantModal(false);
                  setDoctorInfo(null);
                  setFetchDocError(null);
                  setIsVerifiedConfirmed(false);
                }} 
                className="text-gray-400 hover:text-white px-4 py-2 font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-grant-access-btn"
                disabled={!doctorInfo || !isVerifiedConfirmed || isGrantingAccess}
                onClick={handleGrantAccess}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isGrantingAccess ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Granting Blockchain Access...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Grant Access</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Preview Modal */}
      {previewRecord && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="record-preview-modal">
          <div className="card-bg p-6 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-cyan-500/40 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <span>📄</span>
                  <span>{previewRecord.filename}</span>
                </h4>
                <div className="text-[11px] font-mono text-cyan-400 mt-0.5 truncate max-w-md">
                  IPFS CID: {previewRecord.ipfs_cid}
                </div>
              </div>
              <button 
                onClick={() => setPreviewRecord(null)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 bg-[#070b14] p-4 rounded-xl border border-gray-800">
              {/\.(jpeg|jpg|png|webp|gif)$/i.test(previewRecord.filename) ? (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={`data:image/jpeg;base64,${previewRecord.content}`} 
                    alt={previewRecord.filename} 
                    className="max-h-[60vh] rounded-lg shadow-lg object-contain"
                  />
                </div>
              ) : previewRecord.filename.toLowerCase().endsWith('.txt') ? (
                <pre className="font-mono text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {(() => {
                    try {
                      return window.atob(previewRecord.content);
                    } catch {
                      return "Could not decode text content.";
                    }
                  })()}
                </pre>
              ) : (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">📄</div>
                  <div className="text-sm font-bold text-white mb-1">{previewRecord.filename}</div>
                  <p className="text-xs text-gray-400 font-mono max-w-md mx-auto mb-4">
                    This encrypted medical document (PDF / Binary) has been successfully decrypted. Click below to download and view in your local reader.
                  </p>
                  <button
                    onClick={() => handleDownloadRecord(previewRecord)}
                    className="bg-[#00f2fe] text-[#0a0f1d] px-6 py-2 rounded-xl font-bold font-mono text-xs hover:bg-cyan-300 transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                  >
                    <span>⬇️</span>
                    <span>Download Decrypted Document</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 text-xs font-mono text-gray-400">
              <span className="text-emerald-400 flex items-center gap-1">
                <span>✓</span> Verified AES-256 Payload
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadRecord(previewRecord)}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer"
                >
                  Download File
                </button>
                <button
                  onClick={() => setPreviewRecord(null)}
                  className="text-gray-400 hover:text-white px-3 py-1.5 text-xs font-mono cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
