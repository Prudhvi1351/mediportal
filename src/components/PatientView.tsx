import React, { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PatientViewProps {
  setCurrentView: (view: 'landing' | 'patient' | 'doctor' | 'admin') => void;
  activePatientId: string | null;
  setActivePatientId: (id: string | null) => void;
  patientToken: string | null;
  setPatientToken: (token: string | null) => void;
}

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
  const [regForm, setRegForm] = useState({full_name:'', email:'', password:'', age:'', dob:'', gender:'Male', blood_group:'A+', address:'', emergency_contact:''});
  const [loginForm, setLoginForm] = useState({patient_id:'', password:''});
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/v1/patient/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({...regForm, age: parseInt(regForm.age)||0})
    });
    const data = await res.json();
    if(res.ok) {
      setShowRegModal(false);
      alert(`Success! Generated ID: ${data.patient_id}. Please login now.`);
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
                <div><label className="text-sm text-gray-400">Age</label><input required type="number" className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, age: e.target.value})}/></div>
                <div><label className="text-sm text-gray-400">DOB</label><input required type="date" className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, dob: e.target.value})}/></div>
                <div><label className="text-sm text-gray-400">Blood Group</label><select className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, blood_group: e.target.value})}><option>A+</option><option>O-</option></select></div>
                <div className="col-span-2"><label className="text-sm text-gray-400">Emergency Contact</label><input required className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, emergency_contact: e.target.value})}/></div>
                <div className="col-span-2"><label className="text-sm text-gray-400">Address</label><textarea required className="input-dark w-full p-2 rounded" onChange={e=>setRegForm({...regForm, address: e.target.value})}></textarea></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={()=>setShowRegModal(false)} className="text-gray-400 hover:text-white px-4">Cancel</button>
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
              <input required placeholder="PAT-XXXXX" className="input-dark w-full p-2 rounded" onChange={e=>setLoginForm({...loginForm, patient_id: e.target.value})}/>
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
