import React, { useState } from 'react';

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
  const [regForm, setRegForm] = useState({full_name:'', email:'', password:'', age:'', dob:'', gender:'Male', blood_group:'A+', address:'', emergency_contact_1:'', emergency_contact_2:''});
  const [loginForm, setLoginForm] = useState({patient_id:'', password:''});
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

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
      alert("Logged in successfully!");
    } else alert(data.detail || "Login failed");
  };

  const handleUpload = async () => {
    if(!activePatientId || !patientToken) return alert("Login first!");
    if(!fileToUpload) return alert("Select a file.");
    const formData = new FormData();
    formData.append("patient_id", activePatientId);
    formData.append("file", fileToUpload);
    const res = await fetch(`${API_URL}/api/v1/ehr/upload`, { 
      method: "POST", 
      headers: { "Authorization": `Bearer ${patientToken}` },
      body: formData 
    });
    const data = await res.json();
    if(res.ok) { alert(`EHR Encrypted & Uploaded. IPFS CID: ${data.ipfs_cid}`); setShowUploadModal(false); }
    else alert(data.detail || "Upload failed");
  };

  const handleGrantAccess = async () => {
    if(!activePatientId || !patientToken) return alert("Login first!");
    if(!grantDocId) return alert("Enter Doctor ID.");
    const formData = new FormData();
    formData.append("doctor_id", grantDocId);
    const res = await fetch(`${API_URL}/api/v1/patient/${activePatientId}/grant`, { 
      method: "POST", 
      headers: { "Authorization": `Bearer ${patientToken}` },
      body: formData 
    });
    const data = await res.json();
    if(res.ok) { alert(data.message); setShowGrantModal(false); }
    else alert(data.detail || "Failed to grant access");
  };

  return (
    <div className="w-full max-w-4xl mt-6 animate-fade-in">
      <button onClick={() => setCurrentView('landing')} className="text-gray-400 hover:text-white mb-6">← Back to Portal Select</button>
      <div className="card-bg p-8 rounded-2xl mb-8 border-t-4 border-t-[#00f2fe]">
        <h2 className="text-3xl font-bold text-white mb-2">Patient Dashboard</h2>
        <p className="text-gray-400 mb-6">Manage your health records securely on IPFS.</p>
        
        {!activePatientId ? (
          <div className="flex gap-4">
            <button onClick={() => setShowRegModal(true)} className="bg-[#00f2fe] text-[#0a0f1d] px-6 py-2 rounded-lg font-bold">Register New Account</button>
            <button onClick={() => setShowLoginModal(true)} className="border border-[#00f2fe] text-[#00f2fe] hover:bg-[#00f2fe]/10 px-6 py-2 rounded-lg font-bold">Patient Login</button>
          </div>
        ) : (
          <div className="flex gap-4">
            <button onClick={() => setShowUploadModal(true)} className="border border-[#00f2fe] text-[#00f2fe] hover:bg-[#00f2fe]/10 px-6 py-2 rounded-lg font-bold">Upload New EHR</button>
            <button onClick={() => setShowGrantModal(true)} className="border border-purple-500 text-purple-400 hover:bg-purple-500/10 px-6 py-2 rounded-lg font-bold">Grant Doctor Access</button>
          </div>
        )}
      </div>

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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Upload EHR to IPFS</h3>
            <input type="file" onChange={e => setFileToUpload(e.target.files?.[0]||null)} className="text-white w-full mb-6 p-2 border border-gray-600 rounded bg-gray-800"/>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowUploadModal(false)} className="text-gray-400">Cancel</button>
              <button onClick={handleUpload} className="bg-[#00f2fe] text-[#0a0f1d] px-4 py-2 rounded font-bold">Upload</button>
            </div>
          </div>
        </div>
      )}

      {showGrantModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Grant EHR Access (Blockchain)</h3>
            <input type="text" placeholder="Enter Doctor ID (e.g. DOC-12345)" value={grantDocId} onChange={e => setGrantDocId(e.target.value)} className="text-white input-dark w-full mb-6 p-2 border border-gray-600 rounded bg-gray-800"/>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowGrantModal(false)} className="text-gray-400">Cancel</button>
              <button onClick={handleGrantAccess} className="bg-purple-600 text-white px-4 py-2 rounded font-bold">Grant Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
