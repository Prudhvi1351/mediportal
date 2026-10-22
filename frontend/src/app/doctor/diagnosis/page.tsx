"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { ClinicalDiagnosisView } from '../../../components/ClinicalDiagnosisView';

export default function DoctorDiagnosisPage() {
  const router = useRouter();
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [doctorToken, setDoctorToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedPid = localStorage.getItem("patient_id");
    const savedDocId = localStorage.getItem("doctor_id");
    const savedDocToken = localStorage.getItem("doctor_token");

    if (savedPid) setActivePatientId(savedPid);
    if (savedDocId) setActiveDoctorId(savedDocId);
    if (savedDocToken) setDoctorToken(savedDocToken);
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("patient_id");
      localStorage.removeItem("patient_token");
      localStorage.removeItem("doctor_id");
      localStorage.removeItem("doctor_token");
    }
    setActivePatientId(null);
    setActiveDoctorId(null);
    setDoctorToken(null);
    router.push('/');
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-4 sm:px-8 py-6 bg-[#070b14] text-gray-200">
      <Navbar 
        activePatientId={activePatientId} 
        activeDoctorId={activeDoctorId} 
        logout={handleLogout} 
        currentView="doctor"
        setCurrentView={(view) => {
          if (view === 'landing') router.push('/');
          else if (view === 'patient') router.push('/?view=patient');
          else if (view === 'doctor') router.push('/?view=doctor');
        }}
      />

      <div className="pt-16 w-full flex justify-center">
        <ClinicalDiagnosisView 
          initialDoctorId={activeDoctorId}
          initialDoctorToken={doctorToken}
          onBackToPortal={() => router.push('/?view=doctor')}
        />
      </div>
    </main>
  );
}
