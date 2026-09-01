"use client";
import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { LandingView } from '../components/LandingView';
import { PatientView } from '../components/PatientView';
import { DoctorView } from '../components/DoctorView';
import { AdminView } from '../components/AdminView';

export default function Home() {
  const [currentView, setCurrentView] = useState<'landing' | 'patient' | 'doctor' | 'admin'>('landing');

  // Global Session States
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [patientToken, setPatientToken] = useState<string | null>(null);
  
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [doctorToken, setDoctorToken] = useState<string | null>(null);

  const handleLogout = () => {
    setActivePatientId(null);
    setPatientToken(null);
    setActiveDoctorId(null);
    setDoctorToken(null);
    setCurrentView('landing');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-[#0a0f1d] text-gray-200">
      <Navbar 
        activePatientId={activePatientId} 
        activeDoctorId={activeDoctorId} 
        logout={handleLogout} 
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
        {currentView === 'admin' && <AdminView setCurrentView={setCurrentView} />}
      </div>
    </main>
  );
}
