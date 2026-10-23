"use client";
import React, { useState, useEffect } from 'react';
import { GeneralDiseaseAiView } from './GeneralDiseaseAiView';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const FEATURE_NAMES = [
  "mean radius",
  "mean texture",
  "mean perimeter",
  "mean area",
  "mean smoothness",
  "mean compactness",
  "mean concavity",
  "mean concave points",
  "mean symmetry",
  "mean fractal dimension",
  "radius error",
  "texture error",
  "perimeter error",
  "area error",
  "smoothness error",
  "compactness error",
  "concavity error",
  "concave points error",
  "symmetry error",
  "fractal dimension error",
  "worst radius",
  "worst texture",
  "worst perimeter",
  "worst area",
  "worst smoothness",
  "worst compactness",
  "worst concavity",
  "worst concave points",
  "worst symmetry",
  "worst fractal dimension"
];

export const MOCK_BENIGN: Record<string, number> = {
  "mean radius": 11.41,
  "mean texture": 10.82,
  "mean perimeter": 73.34,
  "mean area": 403.3,
  "mean smoothness": 0.0937,
  "mean compactness": 0.0669,
  "mean concavity": 0.0351,
  "mean concave points": 0.0262,
  "mean symmetry": 0.1667,
  "mean fractal dimension": 0.0611,
  "radius error": 0.1408,
  "texture error": 0.4607,
  "perimeter error": 1.103,
  "area error": 10.5,
  "smoothness error": 0.006,
  "compactness error": 0.0153,
  "concavity error": 0.0151,
  "concave points error": 0.0065,
  "symmetry error": 0.0134,
  "fractal dimension error": 0.0022,
  "worst radius": 12.82,
  "worst texture": 15.97,
  "worst perimeter": 83.74,
  "worst area": 510.5,
  "worst smoothness": 0.1548,
  "worst compactness": 0.239,
  "worst concavity": 0.2102,
  "worst concave points": 0.0896,
  "worst symmetry": 0.3016,
  "worst fractal dimension": 0.0852
};

export const MOCK_MALIGNANT: Record<string, number> = {
  "mean radius": 20.94,
  "mean texture": 23.56,
  "mean perimeter": 138.9,
  "mean area": 1364.0,
  "mean smoothness": 0.1007,
  "mean compactness": 0.1606,
  "mean concavity": 0.2712,
  "mean concave points": 0.131,
  "mean symmetry": 0.2205,
  "mean fractal dimension": 0.059,
  "radius error": 1.004,
  "texture error": 0.8208,
  "perimeter error": 6.372,
  "area error": 137.9,
  "smoothness error": 0.0053,
  "compactness error": 0.0391,
  "concavity error": 0.0952,
  "concave points error": 0.0186,
  "symmetry error": 0.024,
  "fractal dimension error": 0.005,
  "worst radius": 25.58,
  "worst texture": 27.0,
  "worst perimeter": 165.3,
  "worst area": 2010.0,
  "worst smoothness": 0.1211,
  "worst compactness": 0.3172,
  "worst concavity": 0.6991,
  "worst concave points": 0.2105,
  "worst symmetry": 0.3126,
  "worst fractal dimension": 0.0785
};

export const MOCK_ANOMALY: Record<string, number> = Object.fromEntries(
  Object.entries(MOCK_MALIGNANT).map(([k, v]) => [k, Number((v * 28.5).toFixed(4))])
);

interface ShapReason {
  rank: number;
  feature: string;
  patient_value: number;
  shap_impact: number;
  direction: string;
  description: string;
}

interface DiagnosisResult {
  status: string;
  risk_score: string;
  risk_probability: number;
  diagnosis: string;
  confidence: string;
  anomaly_status: string;
  anomaly_score: number;
  top_3_shap_reasons: ShapReason[];
}

interface AnomalyError {
  status: string;
  error: string;
  anomaly_detected: boolean;
  anomaly_score?: number;
  message: string;
}

interface ClinicalDiagnosisViewProps {
  initialDoctorId?: string | null;
  initialDoctorToken?: string | null;
  onBackToPortal?: () => void;
}

export const ClinicalDiagnosisView: React.FC<ClinicalDiagnosisViewProps> = ({
  initialDoctorId,
  initialDoctorToken,
  onBackToPortal
}) => {
  const [doctorId, setDoctorId] = useState<string | null>(initialDoctorId || null);
  const [doctorToken, setDoctorToken] = useState<string | null>(initialDoctorToken || null);
  const [aiMode, setAiMode] = useState<'general' | 'biopsy'>('general');

  // Doctor login modal state if not logged in
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginId, setLoginId] = useState("DOC-14288");
  const [loginPassword, setLoginPassword] = useState("Doctor@123");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form values for the 30 continuous features
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    FEATURE_NAMES.forEach(fn => { init[fn] = ""; });
    return init;
  });

  const [activeTab, setActiveTab] = useState<'mean' | 'error' | 'worst'>('mean');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<DiagnosisResult | null>(null);
  const [anomalyError, setAnomalyError] = useState<AnomalyError | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sync token from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDocId = localStorage.getItem("doctor_id");
      const savedToken = localStorage.getItem("doctor_token");
      if (savedDocId && savedToken) {
        setDoctorId(savedDocId);
        setDoctorToken(savedToken);
      }
    }
  }, []);

  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const fd = new FormData();
      fd.append("doctor_id", loginId);
      fd.append("password", loginPassword);

      const res = await fetch(`${API_URL}/api/v1/doctor/login`, {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (res.ok) {
        setDoctorId(data.doctor_id);
        setDoctorToken(data.access_token);
        if (typeof window !== 'undefined') {
          localStorage.setItem("doctor_id", data.doctor_id);
          localStorage.setItem("doctor_token", data.access_token);
        }
        setShowLoginModal(false);
      } else {
        setLoginError(data.detail || "Authentication failed");
      }
    } catch (err: any) {
      setLoginError(err.message || "Network error logging in");
    }
  };

  const fillMock = (type: 'benign' | 'malignant' | 'anomaly') => {
    setPredictionResult(null);
    setAnomalyError(null);
    setGeneralError(null);

    let source = MOCK_BENIGN;
    if (type === 'malignant') source = MOCK_MALIGNANT;
    if (type === 'anomaly') source = MOCK_ANOMALY;

    const populated: Record<string, string> = {};
    FEATURE_NAMES.forEach(fn => {
      populated[fn] = source[fn] !== undefined ? String(source[fn]) : "0.0";
    });
    setFormValues(populated);
  };

  const handleClear = () => {
    const empty: Record<string, string> = {};
    FEATURE_NAMES.forEach(fn => { empty[fn] = ""; });
    setFormValues(empty);
    setPredictionResult(null);
    setAnomalyError(null);
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setAnomalyError(null);
    setPredictionResult(null);

    if (!doctorToken) {
      setShowLoginModal(true);
      return;
    }

    // Verify all 30 features have numerical values
    const missing: string[] = [];
    const numericalPayload: Record<string, number> = {};

    FEATURE_NAMES.forEach(fn => {
      const v = formValues[fn]?.trim();
      if (!v || isNaN(Number(v))) {
        missing.push(fn);
      } else {
        numericalPayload[fn] = parseFloat(v);
      }
    });

    if (missing.length > 0) {
      setGeneralError(`Please enter valid numbers for all 30 features (${missing.length} missing or invalid). You can also click "Fill Mock Data".`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${doctorToken}`
        },
        body: JSON.stringify(numericalPayload)
      });

      const data = await response.json();

      if (response.status === 400 && (data.anomaly_detected || data.error?.includes("Anomaly"))) {
        // Isolation Forest Anomaly Triggered
        setAnomalyError(data);
      } else if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setGeneralError("Doctor authentication expired or unauthorized. Please re-authenticate.");
          setShowLoginModal(true);
        } else {
          setGeneralError(data.detail || data.message || "Failed to process diagnostic inference.");
        }
      } else {
        // Normal Diagnosis Success
        setPredictionResult(data);
      }
    } catch (err: any) {
      setGeneralError(err.message || "Network error contacting inference engine.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const meanFeatures = FEATURE_NAMES.filter(f => f.startsWith("mean"));
  const errorFeatures = FEATURE_NAMES.filter(f => f.includes("error"));
  const worstFeatures = FEATURE_NAMES.filter(f => f.startsWith("worst"));

  const currentFeatures = activeTab === 'mean' 
    ? meanFeatures 
    : activeTab === 'error' 
    ? errorFeatures 
    : worstFeatures;

  return (
    <div className="w-full max-w-5xl mx-auto py-6 animate-fade-in text-gray-100">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          {onBackToPortal && (
            <button 
              onClick={onBackToPortal}
              id="back-to-portal-btn"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
            >
              ← Return to Clinical Records
            </button>
          )}
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 text-xl">
              🔬
            </span>
            Clinical Diagnostic AI & XAI Engine
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Wisconsin Diagnostic Biopsy Morphometry • Isolation Forest Anomaly Filter • SHAP Explainability
          </p>
        </div>

        {/* Doctor Status Badge */}
        <div className="flex items-center gap-3 bg-[#0d1527] border border-cyan-500/20 p-2.5 px-4 rounded-xl shadow-lg">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${doctorId ? 'bg-emerald-400' : 'bg-amber-400'} animate-ping absolute`} />
            <div className={`w-3 h-3 rounded-full ${doctorId ? 'bg-emerald-500' : 'bg-amber-500'} relative`} />
          </div>
          <div className="text-xs font-mono">
            <div className="text-gray-400 uppercase text-[10px] tracking-wider">Practitioner</div>
            <div className="font-bold text-white flex items-center gap-2">
              {doctorId || "Unauthenticated Doctor"}
              {!doctorId && (
                <button
                  onClick={() => setShowLoginModal(true)}
                  id="doctor-auth-btn"
                  className="text-cyan-400 underline hover:text-cyan-300 ml-1 text-xs"
                >
                  (Authenticate)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI ENGINE MODE SELECTOR */}
      <div className="flex flex-wrap items-center gap-2 mb-8 p-1.5 bg-[#070b14] rounded-2xl border border-gray-800 font-mono text-xs">
        <button
          type="button"
          onClick={() => setAiMode('general')}
          id="switch-general-ai-tab"
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            aiMode === 'general'
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-[#070b14] shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-base">🩺</span>
          <span>Universal Disease & Condition AI (All Illnesses + Text-XAI)</span>
        </button>
        <button
          type="button"
          onClick={() => setAiMode('biopsy')}
          id="switch-biopsy-ai-tab"
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            aiMode === 'biopsy'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-base">🔬</span>
          <span>Cell Biopsy Oncology Predictor (30-Feature ML + SHAP XAI)</span>
        </button>
      </div>

      {aiMode === 'general' ? (
        <GeneralDiseaseAiView 
          doctorToken={doctorToken}
          onBackToPortal={onBackToPortal}
        />
      ) : (
        <>
          {/* QUICK PRESET CONTROLS */}
          <div className="bg-[#0f172a]/90 backdrop-blur border border-gray-800 rounded-2xl p-5 mb-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-1 rounded-md">
              ⚡ FAST TESTING PRESETS
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              Auto-populate verified biopsy measurements:
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              id="fill-mock-benign-btn"
              onClick={() => fillMock('benign')}
              className="bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 hover:border-emerald-500 text-xs font-mono font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Fill Mock Benign
            </button>

            <button
              type="button"
              id="fill-mock-malignant-btn"
              onClick={() => fillMock('malignant')}
              className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-600/40 hover:border-rose-500 text-xs font-mono font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Fill Mock Malignant
            </button>

            <button
              type="button"
              id="inject-anomaly-btn"
              onClick={() => fillMock('anomaly')}
              className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-600/40 hover:border-amber-500 text-xs font-mono font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Inject Outlier Anomaly
            </button>

            <button
              type="button"
              id="clear-form-btn"
              onClick={handleClear}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-mono px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ANOMALY REJECTION ALERT BANNER */}
      {anomalyError && (
        <div id="anomaly-alert-banner" className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/50 to-red-950/80 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.25)] animate-pulse">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-600/30 rounded-xl border border-red-500/50 text-red-300 text-2xl flex-shrink-0">
              🚨
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-red-200 bg-red-600/40 px-2.5 py-0.5 rounded-md border border-red-400/50">
                  SECURITY & INTEGRITY PROTOCOL
                </span>
                <span className="font-mono text-xs text-red-300">
                  Isolation Forest Decision Score: {anomalyError.anomaly_score ?? "Outlier (-1)"}
                </span>
              </div>
              <h2 className="text-2xl font-black text-red-200 tracking-wide">
                {anomalyError.error || "Data Rejected: Anomaly Detected"}
              </h2>
              <p className="text-red-300 text-sm mt-2 leading-relaxed font-sans">
                {anomalyError.message || "Incoming clinical biomarkers deviate significantly from the normal physiological distribution. Verification aborted for safety."}
              </p>
              <div className="mt-4 p-3 bg-red-950/60 rounded-xl border border-red-800/60 text-xs font-mono text-red-200/90">
                ⚠️ <strong>Diagnostic Lockout Activated:</strong> Downstream classification and probability models have been halted to prevent erroneous medical decision-making from corrupted, sensor-faulted, or adversarial data.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERAL ERROR BANNER */}
      {generalError && (
        <div id="general-error-banner" className="mb-8 p-4 rounded-xl bg-amber-950/50 border border-amber-600/60 text-amber-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{generalError}</span>
          </div>
          <button onClick={() => setGeneralError(null)} className="text-amber-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {/* XAI RESULTS DASHBOARD */}
      {predictionResult && (
        <div id="prediction-results-card" className="mb-10 p-8 rounded-3xl bg-gradient-to-b from-[#0e172a] via-[#0b1329] to-[#070b14] border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-fade-in">
          {/* Top Status & Confidence */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-full uppercase tracking-wider">
                ✓ Physiological Inlier Verified
              </span>
              <span className="text-xs font-mono text-gray-400">
                Anomaly Score: +{predictionResult.anomaly_score}
              </span>
            </div>
            <div className="text-xs font-mono text-gray-300">
              Model: <span className="text-cyan-300 font-bold">Random Forest + TreeExplainer</span>
            </div>
          </div>

          {/* Primary Diagnosis & Risk Gauge Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-center">
            {/* Diagnosis Card */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${
              predictionResult.diagnosis === 'Malignant'
                ? 'bg-rose-950/40 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
                : 'bg-emerald-950/40 border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
            }`}>
              <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">
                Diagnostic Assessment
              </div>
              <div className="flex items-center gap-4">
                <span className="text-4xl">
                  {predictionResult.diagnosis === 'Malignant' ? '🛑' : '🛡️'}
                </span>
                <div>
                  <div className={`text-4xl font-black tracking-tight ${
                    predictionResult.diagnosis === 'Malignant' ? 'text-rose-400' : 'text-emerald-400'
                  }`} id="diagnosis-text">
                    {predictionResult.diagnosis}
                  </div>
                  <div className="text-xs text-gray-300 mt-1 font-mono">
                    Diagnostic Confidence: <strong className="text-white">{predictionResult.confidence}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Probability Score Card */}
            <div className="p-6 rounded-2xl bg-[#0b1329] border border-cyan-500/30">
              <div className="flex justify-between items-baseline mb-2">
                <div className="text-xs font-mono uppercase tracking-widest text-cyan-300">
                  Malignancy Risk Score
                </div>
                <div className="text-3xl font-black font-mono text-white" id="risk-score-text">
                  {predictionResult.risk_score}
                </div>
              </div>

              {/* Visual Risk Gauge Meter */}
              <div className="w-full h-3.5 bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-700">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    predictionResult.diagnosis === 'Malignant'
                      ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600'
                      : 'bg-gradient-to-r from-teal-500 via-emerald-400 to-green-500'
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, predictionResult.risk_probability * 100))}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-gray-400 mt-2">
                <span>0.0% (Benign)</span>
                <span>Threshold: 50.0%</span>
                <span>100.0% (High Malignancy)</span>
              </div>
            </div>
          </div>

          {/* TOP 3 SHAP CONTRIBUTING REASONS */}
          <div className="mt-8 pt-6 border-t border-gray-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">✨</span>
                Explainable AI: Top 3 Biomarker Contributing Factors
              </h3>
              <span className="text-xs font-mono text-gray-400 bg-gray-800/70 px-2.5 py-1 rounded-md border border-gray-700">
                SHAP (SHapley Additive exPlanations)
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-5">
              The clinical decision tree identified the following primary cellular nuclei anomalies that drove this specific patient&apos;s risk calculation:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="shap-reasons-list">
              {predictionResult.top_3_shap_reasons.map((reason) => (
                <div
                  key={reason.rank}
                  className="p-5 rounded-2xl bg-[#0c1424] border border-cyan-500/20 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header with Rank & Direction Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                        Rank #{reason.rank}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          reason.shap_impact > 0
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                        }`}
                      >
                        {reason.shap_impact > 0 ? '+ Risk Indicator' : '- Benign Indicator'}
                      </span>
                    </div>

                    {/* Feature Title & Measured Value */}
                    <div className="text-base font-bold text-white capitalize mb-1">
                      {reason.feature}
                    </div>
                    <div className="text-xs font-mono text-cyan-400 mb-3">
                      Patient Measured Value: <span className="font-bold text-white">{reason.patient_value}</span>
                    </div>

                    {/* Plain Language Clinical Explanation */}
                    <div className="text-xs text-gray-300 bg-[#070b14] p-3 rounded-xl border border-gray-800/80 leading-relaxed font-sans">
                      &ldquo;{reason.description}&rdquo;
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-800/60 flex justify-between items-center text-[10px] font-mono text-gray-400">
                    <span>SHAP Weight:</span>
                    <span className={reason.shap_impact > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {reason.shap_impact > 0 ? `+${reason.shap_impact}` : reason.shap_impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 30 CLINICAL FEATURES INPUT FORM */}
      <form onSubmit={handleSubmit} className="bg-[#0f172a]/95 backdrop-blur border border-gray-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">Fine-Needle Aspirate (FNA) Nuclear Morphometry</h2>
            <p className="text-xs text-gray-400 mt-0.5">30 continuous attributes digitized from cell nuclei images</p>
          </div>

          {/* Category Tabs */}
          <div className="flex bg-[#070b14] p-1 rounded-xl border border-gray-800 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('mean')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'mean' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mean (10)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('error')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'error' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Standard Error (10)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('worst')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'worst' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Worst / Extreme (10)
            </button>
          </div>
        </div>

        {/* Dynamic Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {currentFeatures.map((fn) => (
            <div key={fn} className="bg-[#0a0f1d] p-3.5 rounded-xl border border-gray-800 focus-within:border-cyan-500 transition-colors">
              <label className="block text-[11px] font-mono text-cyan-300 capitalize mb-1 truncate" title={fn}>
                {fn}
              </label>
              <input
                type="number"
                step="any"
                required
                id={`input-${fn.replace(/\s+/g, '-')}`}
                value={formValues[fn] ?? ""}
                onChange={(e) => setFormValues({ ...formValues, [fn]: e.target.value })}
                placeholder="e.g. 14.5"
                className="w-full bg-[#111827] text-white font-mono text-sm px-3 py-2 rounded-lg border border-gray-700 focus:border-cyan-400 focus:outline-none transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Form Submission Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-800">
          <div className="text-xs text-gray-400 font-mono">
            {Object.values(formValues).filter(v => v !== "").length} of 30 parameters specified
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              id="submit-prediction-btn"
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-xl font-bold font-mono text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isSubmitting
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running Anomaly Filter & SHAP TreeExplainer...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Execute Diagnostic Inference
                </>
              )}
            </button>
          </div>
        </div>
      </form>
        </>
      )}

      {/* Doctor Login Modal (if unauthenticated) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-cyan-500/30 p-8 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🔐</span> Doctor Authorization
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              The Diagnostic AI endpoint requires an authorized clinical doctor token.
            </p>

            {loginError && (
              <div className="mb-4 p-2.5 rounded bg-red-950/60 border border-red-700 text-red-200 text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleDoctorLogin} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-mono">Doctor ID</label>
                <input
                  type="text"
                  required
                  id="modal-doctor-id"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder="DOC-XXXXX"
                  className="w-full bg-[#1e293b] text-white p-2.5 rounded-lg border border-gray-700 mt-1 font-mono text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-mono">Password</label>
                <input
                  type="password"
                  required
                  id="modal-doctor-password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-[#1e293b] text-white p-2.5 rounded-lg border border-gray-700 mt-1 font-mono text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="text-xs font-mono text-gray-400 hover:text-white px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="modal-doctor-login-btn"
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs px-5 py-2 rounded-lg transition-colors"
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
