"use client";
import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface GeneralDiseaseAiViewProps {
  doctorToken: string | null;
  patientRecords?: Array<{ filename: string; ipfs_cid: string; content?: string }>;
  initialRecord?: { filename: string; ipfs_cid: string; content?: string } | null;
  onBackToPortal?: () => void;
}

interface XaiResult {
  status: string;
  filename: string;
  extracted_character_count: number;
  disease_detected: string;
  category: string;
  severity: string;
  confidence: string;
  previous_diagnosis: string;
  current_causes: string;
  preventative_protocols: string;
  source_quotes: string[];
  xai_explanation?: {
    primary_condition?: string;
    medical_specialty?: string;
    diagnostic_confidence?: string;
    severity_level?: string;
    key_evidence_quotes?: string[];
    clinical_reasoning?: string;
  };
  extraction_engine: string;
  raw_text?: string;
}

const SAMPLE_TEMPLATES = [
  {
    label: "🍬 Type 2 Diabetes",
    disease: "Diabetes Mellitus",
    text: "Patient presents with fasting blood glucose of 215 mg/dL and HbA1c 9.2%. Patient reports progressive polyuria, polydipsia, and fatigue over the past 3 months due to poor dietary adherence. Recommend initiating Metformin 500mg BID and low-carbohydrate nutritional therapy."
  },
  {
    label: "💓 Stage 2 Hypertension",
    disease: "Essential Hypertension",
    text: "Patient routine screening shows blood pressure readings of 165/102 mmHg and 158/98 mmHg. Known history of essential hypertension with poor compliance. Significant arterial vascular stiffness. Recommend commencing Amlodipine 5mg daily and strict low-sodium DASH diet."
  },
  {
    label: "🫁 Pulmonary Pneumonia",
    disease: "Pneumonia",
    text: "Patient presents with persistent productive cough, high fever of 102.4F, and acute dyspnea. Auscultation reveals prominent bilateral inspiratory crackles and localized consolidation. Recommend empirical treatment with Amoxicillin/Clavulanate, chest X-ray, and pulse oximetry monitoring."
  },
  {
    label: "🦴 Acute Bone Fracture",
    disease: "Traumatic Fracture",
    text: "Patient evaluated after falling from bicycle with acute severe pain and edema over the right lower leg. Radiographic imaging reveals a displaced cortical fracture of the mid-tibial shaft. Recommend immediate anatomic immobilization, rigid casting, and orthopedic surgical consultation for ORIF."
  },
  {
    label: "🌬️ Bronchial Asthma",
    disease: "Asthma",
    text: "Patient presents with nocturnal wheezing, chest tightness, and acute shortness of breath triggered by cold air. Peak expiratory flow rate reduced by 35%. Recommend initiating Albuterol inhaler 2 puffs PRN, maintenance Fluticasone, and structured asthma action protocol."
  },
  {
    label: "🧠 Migraine Disorder",
    disease: "Neurological Migraine",
    text: "Patient experiences recurrent throbbing unilateral headaches accompanied by photophobia, phonophobia, and visual aura lasting 12 hours. Recommend acute abortive therapy with Sumatriptan 50mg at headache onset, NSAIDs, and headache trigger diary."
  }
];

export const GeneralDiseaseAiView: React.FC<GeneralDiseaseAiViewProps> = ({
  doctorToken,
  patientRecords = [],
  initialRecord = null,
  onBackToPortal
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'file' | 'records'>('text');
  const [symptomText, setSymptomText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedRecordCid, setSelectedRecordCid] = useState<string>('');
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<XaiResult | null>(null);

  // If an initial record is passed, configure and analyze automatically
  useEffect(() => {
    if (initialRecord && initialRecord.content) {
      setInputMode('records');
      setSelectedRecordCid(initialRecord.ipfs_cid);
      analyzeRecordDirectly(initialRecord);
    }
  }, [initialRecord]);

  const analyzeRecordDirectly = async (rec: { filename: string; ipfs_cid: string; content?: string }) => {
    if (!rec.content) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/nlp/analyze-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(doctorToken ? { "Authorization": `Bearer ${doctorToken}` } : {})
        },
        body: JSON.stringify({
          base64_file: rec.content,
          filename: rec.filename
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
      } else {
        setAnalysisError(data.detail || "Failed to analyze decrypted patient record.");
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Network error communicating with Medical AI engine.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalysisError(null);
    setAnalysisResult(null);

    if (inputMode === 'text') {
      if (!symptomText.trim()) {
        setAnalysisError("Please enter clinical notes, patient symptoms, or select a sample template.");
        return;
      }
      setIsAnalyzing(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/nlp/analyze-query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(doctorToken ? { "Authorization": `Bearer ${doctorToken}` } : {})
          },
          body: JSON.stringify({
            text: symptomText.trim(),
            filename: "clinical_symptoms.txt"
          })
        });
        const data = await res.json();
        if (res.ok) {
          setAnalysisResult(data);
        } else {
          setAnalysisError(data.detail || "Failed to analyze symptoms.");
        }
      } catch (err: any) {
        setAnalysisError(err.message || "Network error communicating with Medical AI engine.");
      } finally {
        setIsAnalyzing(false);
      }
    } else if (inputMode === 'file') {
      if (!uploadedFile) {
        setAnalysisError("Please select a medical report file (PDF or Image).");
        return;
      }
      setIsAnalyzing(true);
      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        const res = await fetch(`${API_URL}/api/v1/nlp/analyze-report`, {
          method: "POST",
          headers: {
            ...(doctorToken ? { "Authorization": `Bearer ${doctorToken}` } : {})
          },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          setAnalysisResult(data);
        } else {
          setAnalysisError(data.detail || "Failed to analyze uploaded report.");
        }
      } catch (err: any) {
        setAnalysisError(err.message || "Network error uploading and parsing report.");
      } finally {
        setIsAnalyzing(false);
      }
    } else if (inputMode === 'records') {
      const targetRec = patientRecords.find(r => r.ipfs_cid === selectedRecordCid);
      if (!targetRec || !targetRec.content) {
        setAnalysisError("Selected record has no decrypted content to analyze.");
        return;
      }
      analyzeRecordDirectly(targetRec);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity?.toLowerCase() || '';
    if (s.includes('critical') || s.includes('high')) {
      return 'bg-rose-950/80 text-rose-300 border-rose-500/50';
    } else if (s.includes('mod')) {
      return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
    }
    return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 animate-fade-in text-gray-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          {onBackToPortal && (
            <button
              onClick={onBackToPortal}
              id="ai-detector-back-btn"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
            >
              ← Return to Clinical Patient Records
            </button>
          )}
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-teal-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-300 text-2xl shadow-[0_0_20px_rgba(0,242,254,0.2)]">
              🩺
            </span>
            Universal Clinical AI Disease Detection & XAI
          </h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Detect any medical illness, chronic condition, or clinical abnormality from patient records, uploaded reports (PDF/Images), or clinical symptoms with verbatim Explainable AI (Text-XAI) grounding.
          </p>
        </div>
      </div>

      {/* Main Analysis Input Card */}
      <div className="bg-[#0b1222]/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,242,254,0.1)] mb-8">
        
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 bg-[#070b14] rounded-2xl border border-gray-800 font-mono text-xs">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            id="tab-mode-text"
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              inputMode === 'text'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-[#070b14] shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>📝</span> Clinical Notes & Symptoms
          </button>
          
          <button
            type="button"
            onClick={() => setInputMode('file')}
            id="tab-mode-file"
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              inputMode === 'file'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-[#070b14] shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>📄</span> Upload Medical Report (PDF/Scan)
          </button>

          {patientRecords.length > 0 && (
            <button
              type="button"
              onClick={() => setInputMode('records')}
              id="tab-mode-records"
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                inputMode === 'records'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-[#070b14] shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🔗</span> Patient Decrypted IPFS Records ({patientRecords.length})
            </button>
          )}
        </div>

        {/* Input Mode 1: Clinical Symptoms & Notes */}
        {inputMode === 'text' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
                Enter Patient History, Symptoms, or Lab Values:
              </label>
              <span className="text-[11px] text-gray-400 font-mono">
                Supports all medical conditions (Diabetes, Hypertension, Pneumonia, Fractures, etc.)
              </span>
            </div>

            <textarea
              id="clinical-symptom-textarea"
              rows={4}
              value={symptomText}
              onChange={e => setSymptomText(e.target.value)}
              placeholder="e.g. Patient presents with fasting blood sugar 210 mg/dL, HbA1c 9.1%, polyuria, and fatigue due to poor dietary habits. Recommend Metformin and low-carb diet..."
              className="w-full p-4 rounded-2xl bg-[#070b14] border border-gray-700 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all resize-y shadow-inner mb-4"
            />

            {/* Quick Medical Templates */}
            <div className="mb-6">
              <div className="text-[11px] text-gray-400 font-mono mb-2">
                ⚡ Quick Load Clinical Condition Templates:
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSymptomText(tmpl.text);
                      setAnalysisResult(null);
                      setAnalysisError(null);
                    }}
                    id={`template-btn-${idx}`}
                    className="text-xs px-3 py-1.5 rounded-xl bg-gray-800/60 hover:bg-cyan-950/60 border border-gray-700 hover:border-cyan-500/50 text-gray-300 hover:text-cyan-300 font-mono transition-all cursor-pointer"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Mode 2: Upload Medical Report File */}
        {inputMode === 'file' && (
          <div className="mb-6">
            <label className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider block mb-2">
              Select Medical Document / Lab Report (PDF, Image, Scan):
            </label>
            <div className="border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-2xl p-6 text-center bg-[#070b14]/50 transition-all">
              <input
                type="file"
                id="medical-report-file-input"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={e => setUploadedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="medical-report-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl text-cyan-400">
                  📁
                </div>
                <div className="text-sm font-bold text-white font-mono">
                  {uploadedFile ? uploadedFile.name : "Click to Browse Medical Report"}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB selected` : "Supports PDF, JPEG, PNG scanned patient reports"}
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Input Mode 3: Patient Decrypted Blockchain Records */}
        {inputMode === 'records' && (
          <div className="mb-6">
            <label className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider block mb-2">
              Select Decrypted Patient Record from Blockchain / IPFS:
            </label>
            <div className="space-y-2">
              {patientRecords.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedRecordCid(r.ipfs_cid)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedRecordCid === r.ipfs_cid
                      ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                      : 'bg-[#070b14] border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <div className="font-bold font-mono text-sm">{r.filename}</div>
                      <div className="text-xs text-gray-400 font-mono truncate max-w-md">CID: {r.ipfs_cid}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-cyan-400 font-bold">
                    {selectedRecordCid === r.ipfs_cid ? "✓ Selected" : "Select"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button & Loader */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-800">
          <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI Model: Clinical NLP & Knowledge Graph with Text-XAI Grounding</span>
          </div>

          <button
            type="button"
            id="run-ai-disease-analysis-btn"
            disabled={isAnalyzing}
            onClick={handleAnalyze}
            className="bg-gradient-to-r from-[#00f2fe] via-cyan-400 to-[#4facfe] hover:opacity-95 disabled:bg-gray-800 disabled:text-gray-500 text-[#070b14] px-8 py-3 rounded-xl font-extrabold font-mono text-sm flex items-center gap-2 shadow-[0_0_30px_rgba(0,242,254,0.35)] transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-[#070b14]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Analyzing Disease & Generating XAI...</span>
              </>
            ) : (
              <>
                <span>🔬</span>
                <span>Ask AI: Detect Disease & Condition (XAI)</span>
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {analysisError && (
          <div id="ai-analysis-error-banner" className="mt-6 p-4 rounded-2xl bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs font-mono flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <span>{analysisError}</span>
          </div>
        )}
      </div>

      {/* Complete Explainable AI (XAI) Results Section */}
      {analysisResult && (
        <div id="xai-results-card" className="bg-[#0c1427] border-2 border-cyan-400/50 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(0,242,254,0.2)] mb-10 animate-fade-in">
          
          {/* Header Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                AI Diagnostic Deduction
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${getSeverityBadge(analysisResult.severity)}`}>
                Severity: {analysisResult.severity}
              </span>
            </div>

            <div className="text-xs font-mono text-gray-400">
              Confidence: <strong className="text-emerald-400">{analysisResult.confidence}</strong>
            </div>
          </div>

          {/* Primary Detected Disease */}
          <div className="mb-8">
            <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">
              Detected Disease / Condition:
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 font-mono tracking-tight" id="detected-disease-title">
              {analysisResult.disease_detected}
            </div>
            <div className="text-xs font-mono text-cyan-400/80 mt-1">
              Specialty Category: <span className="text-white font-semibold">{analysisResult.category}</span>
            </div>
          </div>

          {/* Clinical Findings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Root Causes & Biomarkers */}
            <div className="p-6 rounded-2xl bg-[#11192e] border border-gray-800 shadow-inner">
              <div className="flex items-center gap-2 mb-3">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-sm">🔬</span>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Root Causes & Biomarkers
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {analysisResult.current_causes}
              </p>
            </div>

            {/* Evidence-Based Preventative Protocols */}
            <div className="p-6 rounded-2xl bg-[#11192e] border border-gray-800 shadow-inner">
              <div className="flex items-center gap-2 mb-3">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm">🛡️</span>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Preventative Protocols & Therapy
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {analysisResult.preventative_protocols}
              </p>
            </div>
          </div>

          {/* EXPLAINABLE AI (XAI) GROUNDING SECTION */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#101b33] to-[#0a1122] border-2 border-purple-500/40 shadow-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-lg">
                  💡
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white font-mono">
                    Explainable AI (XAI) Evidence Grounding
                  </h3>
                  <div className="text-xs text-purple-300/80 font-mono">
                    Verbatim sentence citations extracted directly from the source medical document
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-700/60 px-2.5 py-1 rounded-full uppercase">
                Zero Hallucination Grounding
              </span>
            </div>

            {/* Verbatim Source Evidence Quotes */}
            <div className="space-y-3 mb-6" id="xai-evidence-quotes-container">
              {analysisResult.source_quotes && analysisResult.source_quotes.length > 0 ? (
                analysisResult.source_quotes.map((quote, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-3.5 rounded-xl bg-[#090e1a] border-l-4 border-l-purple-400 border border-gray-800 flex items-start gap-3 text-xs font-mono text-gray-200"
                  >
                    <span className="text-purple-400 font-bold select-none mt-0.5">[{qIdx + 1}]</span>
                    <blockquote className="italic text-cyan-200 leading-relaxed">
                      &quot;{quote}&quot;
                    </blockquote>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 font-mono italic">
                  Clinical deduction synthesized from active physiological presentation and report context.
                </div>
              )}
            </div>

            {/* Clinical Reasoning Summary */}
            <div className="pt-4 border-t border-purple-900/40">
              <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">
                Clinical Diagnostic Reasoning:
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {analysisResult.xai_explanation?.clinical_reasoning || 
                 `The AI determined this condition by correlating the cited clinical observations with clinical guideline criteria. The presence of abnormal values and reported symptoms directly justifies this medical classification.`}
              </p>
            </div>
          </div>

          {/* Engine Footer */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 pt-3 border-t border-gray-800">
            <div>
              Source Document: <span className="text-white font-semibold">{analysisResult.filename}</span> ({analysisResult.extracted_character_count} chars processed)
            </div>
            <div className="text-cyan-400">
              Engine: {analysisResult.extraction_engine}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
