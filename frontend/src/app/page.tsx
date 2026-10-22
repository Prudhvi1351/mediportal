"use client";
import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { LandingView } from '../components/LandingView';
import { PatientView } from '../components/PatientView';
import { DoctorView } from '../components/DoctorView';

export default function Home() {
  const [currentView, setCurrentView] = useState<'landing' | 'patient' | 'doctor'>('landing');

  // Global Session States
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [patientToken, setPatientToken] = useState<string | null>(null);
  
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [doctorToken, setDoctorToken] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Restore sessions from localStorage
    const savedPid = localStorage.getItem("patient_id");
    const savedPToken = localStorage.getItem("patient_token");
    if (savedPid && savedPToken) {
      setActivePatientId(savedPid);
      setPatientToken(savedPToken);
    }

    const savedDocId = localStorage.getItem("doctor_id");
    const savedDocToken = localStorage.getItem("doctor_token");
    if (savedDocId && savedDocToken) {
      setActiveDoctorId(savedDocId);
      setDoctorToken(savedDocToken);
    }

    // Check URL query parameters (e.g. ?view=patient from /welcome)
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view === "patient") {
      setCurrentView("patient");
    } else if (view === "doctor") {
      setCurrentView("doctor");
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("patient_id");
      localStorage.removeItem("patient_token");
      localStorage.removeItem("patient_name");
      localStorage.removeItem("doctor_id");
      localStorage.removeItem("doctor_token");
    }
    setActivePatientId(null);
    setPatientToken(null);
    setActiveDoctorId(null);
    setDoctorToken(null);
    setCurrentView('landing');
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-4 sm:px-8 py-6 bg-[#070b14] text-gray-200">
      <Navbar 
        activePatientId={activePatientId} 
        activeDoctorId={activeDoctorId} 
        logout={handleLogout} 
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      <div className="pt-12 w-full flex justify-center">
        {currentView === 'landing' && <LandingView setCurrentView={setCurrentView} />}
        {currentView === 'patient' && (
          <PatientView 
            setCurrentView={setCurrentView} 
            activePatientId={activePatientId}
            setActivePatientId={setActivePatientId}
            patientToken={patientToken}
            setPatientToken={setPatientToken}
          />
        )}
        {currentView === 'doctor' && (
          <DoctorView 
            setCurrentView={setCurrentView} 
            activeDoctorId={activeDoctorId}
            setActiveDoctorId={setActiveDoctorId}
            doctorToken={doctorToken}
            setDoctorToken={setDoctorToken}
          />
        )}
      </div>
    </main>
  );
}
