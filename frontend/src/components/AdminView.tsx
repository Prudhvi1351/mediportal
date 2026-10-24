import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';

interface AdminViewProps {
  setCurrentView: (view: 'landing' | 'patient' | 'doctor' | 'admin') => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ setCurrentView }) => {
  const [pending, setPending] = useState<any[]>([]);
  
  useEffect(() => {
    fetch(`${API_URL}/api/v1/admin/doctors`)
      .then(r => r.json())
      .then(d => setPending(d.pending_doctors))
      .catch(console.error);
  }, []);

  const approveDoctor = async (app_id: string) => {
    const res = await fetch(`${API_URL}/api/v1/admin/doctors/${app_id}/approve`, {method: "POST"});
    const data = await res.json();
    if(res.ok) {
      alert(`Approved! Doctor issued ID: ${data.doctor_id}`);
      setPending(pending.filter(p => p.app_id !== app_id));
    } else {
      alert(data.detail || "Failed to approve doctor.");
    }
  };

  return (
    <div className="w-full max-w-5xl mt-6 animate-fade-in">
      <button onClick={() => setCurrentView('landing')} className="text-gray-400 hover:text-white mb-6">← Back to Portal Select</button>
      <div className="card-bg p-8 rounded-2xl border-t-4 border-t-red-500">
        <h2 className="text-3xl font-bold text-white mb-6">Administration Dashboard</h2>
        <h3 className="text-lg text-gray-300 border-b border-gray-700 pb-2 mb-4">Pending Medical Verifications</h3>
        
        {pending.length === 0 ? (
          <p className="text-gray-500 italic">No pending applications.</p>
        ) : (
          <div className="grid gap-4">
            {pending.map(p => (
              <div key={p.app_id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white text-lg">{p.full_name} <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded ml-2">PENDING</span></div>
                  <div className="text-sm text-gray-400 mt-1">License: {p.license_number} | Spec: {p.specialty} | App ID: {p.app_id}</div>
                  <div 
                    className="text-xs text-blue-400 mt-1 cursor-pointer hover:underline"
                    onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${p.license_cid}`, "_blank")}
                  >
                    📄 View IPFS License Document (CID: {p.license_cid})
                  </div>
                </div>
                <button onClick={() => approveDoctor(p.app_id)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
                  Approve & Issue DOC ID
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
