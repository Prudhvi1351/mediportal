import React, { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DoctorViewProps {
  setCurrentView: (view: 'landing' | 'patient' | 'doctor' | 'admin') => void;
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
  const [showDocReg, setShowDocReg] = useState(false);
  const [showDocLogin, setShowDocLogin] = useState(false);
  const [showFetch, setShowFetch] = useState(false);
  const [fetchInput, setFetchInput] = useState("");
  const [patientData, setPatientData] = useState<any>(null);

  const [docForm, setDocForm] = useState({full_name:'', specialty:'', age:'', email:'', phone:'', password:'', license_number:''});
  const [docLicense, setDocLicense] = useState<File | null>(null);
  const [loginForm, setLoginForm] = useState({doctor_id:'', password:''});

  const handleDocRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!docLicense) return alert("License Document required!");
    const fd = new FormData();
    Object.entries(docForm).forEach(([k,v]) => fd.append(k,v));
    fd.append("license_file", docLicense);

    const res = await fetch(`${API_URL}/api/v1/doctor/register`, { method: "POST", body: fd });
    const data = await res.json();
    if(res.ok) {
      alert(`Application Submitted! Pending Admin Approval.\nApplication ID: ${data.app_id}`);
      setShowDocReg(false);
    } else alert(data.detail || "Registration Failed");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("doctor_id", loginForm.doctor_id);
    fd.append("password", loginForm.password);
    
    const res = await fetch(`${API_URL}/api/v1/doctor/login`, { method: "POST", body: fd });
    const data = await res.json();
    if(res.ok) {
      setActiveDoctorId(data.doctor_id);
      setDoctorToken(data.access_token);
      setShowDocLogin(false);
      alert("Logged in successfully!");
    } else alert(data.detail);
  };

  const handleFetchEHR = async () => {
    if(!activeDoctorId || !doctorToken) return alert("Login as Doctor first.");
    const res = await fetch(`${API_URL}/api/v1/ehr/${fetchInput}?doctor_id=${activeDoctorId}`, {
      headers: { "Authorization": `Bearer ${doctorToken}` }
    });
    const data = await res.json();
    if(res.ok) {
      setPatientData(data);
      setShowFetch(false);
    } else alert(data.detail);
  };

  return (
    <div className="w-full max-w-4xl mt-6 animate-fade-in">
      <button onClick={() => setCurrentView('landing')} className="text-gray-400 hover:text-white mb-6">← Back to Portal Select</button>
      <div className="card-bg p-8 rounded-2xl mb-8 border-t-4 border-t-[#38bdf8]">
        <h2 className="text-3xl font-bold text-white mb-2">Clinical Portal</h2>
        <p className="text-gray-400 mb-6">Requires verified Medical License and Admin Approval.</p>
        <div className="flex gap-4 mb-8">
          {!activeDoctorId && (
            <>
              <button onClick={() => setShowDocReg(true)} className="bg-transparent border border-[#38bdf8] text-[#38bdf8] hover:bg-[#38bdf8]/10 px-6 py-2 rounded-lg font-bold">Register (Upload License)</button>
              <button onClick={() => setShowDocLogin(true)} className="bg-[#38bdf8] text-[#0a0f1d] px-6 py-2 rounded-lg font-bold">Doctor Login</button>
            </>
          )}
          {activeDoctorId && (
            <button onClick={() => setShowFetch(true)} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">Fetch Patient EHR</button>
          )}
        </div>

        {patientData && (
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mt-6">
            <h3 className="text-xl font-bold text-[#00f2fe] mb-4">Patient Demographics: {patientData.patient_id}</h3>
            <div className="grid grid-cols-2 text-sm text-gray-300 gap-2 mb-6">
              <div>Name: <span className="text-white">{patientData.profile.full_name}</span></div>
              <div>Blood Group: <span className="text-red-400 font-bold">{patientData.profile.blood_group}</span></div>
              <div>Age: <span className="text-white">{patientData.profile.age}</span></div>
              <div>Emergency: <span className="text-white">{patientData.profile.emergency_contact}</span></div>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Decrypted IPFS Records</h4>
            {patientData.records.map((r:any, i:number) => (
              <div key={i} className="bg-[#0a0f1d] p-3 rounded border border-gray-600 mb-2">
                <div className="text-xs text-gray-400">{r.timestamp}</div>
                <div className="font-semibold text-white">{r.filename}</div>
                <div className="text-xs text-[#38bdf8] truncate">CID: {r.ipfs_cid}</div>
                {r.content ? (
                  <div className="mt-2">
                    <button 
                      onClick={() => {
                        try {
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
                        } catch (e) {
                          alert("Download failed: " + e);
                        }
                      }}
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded cursor-pointer"
                    >
                      Download {r.filename}
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

      {showDocReg && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Clinical Verification Registration</h3>
            <form onSubmit={handleDocRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-gray-400 text-sm">Full Name</label><input required className="input-dark w-full p-2 rounded" onChange={e=>setDocForm({...docForm, full_name: e.target.value})}/></div>
                <div><label className="text-gray-400 text-sm">Specialty</label><input required className="input-dark w-full p-2 rounded" onChange={e=>setDocForm({...docForm, specialty: e.target.value})}/></div>
                <div><label className="text-gray-400 text-sm">Age</label><input required type="number" className="input-dark w-full p-2 rounded" onChange={e=>setDocForm({...docForm, age: e.target.value})}/></div>
                <div><label className="text-gray-400 text-sm">Phone</label><input required type="tel" className="input-dark w-full p-2 rounded" onChange={e=>setDocForm({...docForm, phone: e.target.value})}/></div>
                <div><label className="text-gray-400 text-sm">Email</label><input required type="email" className="input-dark w-full p-2 rounded" onChange={e=>setDocForm({...docForm, email: e.target.value})}/></div>
                <div><label className="text-gray-400 text-sm">Password</label><input required type="password" className="input-dark w-full p-2 rounded" onChange={e=>setDocForm({...docForm, password: e.target.value})}/></div>
                <div><label className="text-gray-400 text-sm">Medical License #</label><input required className="input-dark w-full p-2 rounded" onChange={e=>setDocForm({...docForm, license_number: e.target.value})}/></div>
                <div className="col-span-2"><label className="text-gray-400 text-sm">Upload Certificate/License (PDF/Image)</label>
                  <input required type="file" className="text-white w-full p-2 border border-gray-600 rounded" onChange={e=>setDocLicense(e.target.files?.[0]||null)}/>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={()=>setShowDocReg(false)} className="text-gray-400 hover:text-white px-4">Cancel</button>
                <button type="submit" className="bg-[#38bdf8] text-[#0a0f1d] px-6 py-2 rounded font-bold">Submit Application</button>
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
              <input required placeholder="DOC-XXXXX" className="input-dark w-full p-2 rounded" onChange={e=>setLoginForm({...loginForm, doctor_id: e.target.value})}/>
              <input required placeholder="Password" type="password" className="input-dark w-full p-2 rounded" onChange={e=>setLoginForm({...loginForm, password: e.target.value})}/>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setShowDocLogin(false)} className="text-gray-400">Cancel</button>
                <button type="submit" className="bg-[#38bdf8] text-[#0a0f1d] px-4 py-2 rounded font-bold">Login</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFetch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-bg p-8 rounded-2xl w-full max-w-sm border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Query Patient</h3>
            <input value={fetchInput} onChange={e=>setFetchInput(e.target.value)} placeholder="PAT-0001" className="input-dark w-full p-2 rounded mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowFetch(false)} className="text-gray-400">Cancel</button>
              <button onClick={handleFetchEHR} className="bg-purple-600 text-white px-4 py-2 rounded font-bold">Fetch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
