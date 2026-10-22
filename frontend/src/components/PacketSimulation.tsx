"use client";
import React, { useState, useEffect, useRef } from 'react';

interface Packet {
  id: number;
  seq: number;
  sizeBytes: number;
  hash: string;
  route: string;
  targetNode: string;
  status: 'pending' | 'hashing' | 'in_transit' | 'delivered';
  progress: number; // 0 to 100
  color: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  tag: 'INGEST' | 'TCP/IP' | 'SHA-256' | 'IPFS-SWARM' | 'CONSENSUS' | 'REASSEMBLY' | 'SUCCESS';
  message: string;
  highlight?: boolean;
}

export const PacketSimulation: React.FC = () => {
  const [selectedPayload, setSelectedPayload] = useState<'ehr' | 'ml' | 'dicom'>('ehr');
  const [simState, setSimState] = useState<'IDLE' | 'FRAGMENTING' | 'HASHING' | 'TRANSMITTING' | 'REASSEMBLED'>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [rtt, setRtt] = useState<number>(0);
  const [autoSpeed, setAutoSpeed] = useState<number>(1);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const payloadMeta = {
    ehr: {
      name: "Patient_EHR_Record_PAT-0042.json.enc",
      size: 4096,
      type: "Encrypted Health Profile (AES-256-CBC)",
      dataPreview: '{"patient_id":"PAT-0042","blood_group":"O+","allergies":["Penicillin"],"diagnosis":"Normal"}'
    },
    ml: {
      name: "Wisconsin_Cancer_Inference_Vector.bin",
      size: 1920,
      type: "Standardized 30-Feature Matrix",
      dataPreview: '[17.99, 10.38, 122.8, 1001.0, 0.1184, 0.2776, 0.3001, 0.1471, 0.2419, 0.07871, ...]'
    },
    dicom: {
      name: "Pathology_HighRes_DICOM_Slice.raw",
      size: 8192,
      type: "Microscopic Imaging Payload",
      dataPreview: '[0x44, 0x49, 0x43, 0x4D, 0x00, 0x28, 0x00, 0x10, 0x00, 0x02, 0x55, 0x53, 0x02, 0x00, ...]'
    }
  };

  const addLog = (tag: LogEntry['tag'], message: string, highlight = false) => {
    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        tag,
        message,
        highlight
      }
    ]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Reset simulation state
  const handleReset = () => {
    setSimState('IDLE');
    setPackets([]);
    setRtt(0);
    setLogs([]);
  };

  // Launch the packet transmission lifecycle
  const runSimulation = () => {
    handleReset();
    setSimState('FRAGMENTING');
    const meta = payloadMeta[selectedPayload];
    const packetCount = 4;
    const packetSize = meta.size / packetCount;

    addLog('INGEST', `Ingesting raw EHR payload "${meta.name}" (${meta.size} bytes).`, true);
    addLog('TCP/IP', `Initializing segmentation. Protocol: MPTCP/IP over Decentralized Mesh.`);
    addLog('TCP/IP', `Configured Maximum Segment Size (MSS) = ${packetSize} bytes. Splitting into ${packetCount} chunks.`);

    // Step 1: Fragmenting
    const initialPackets: Packet[] = [
      {
        id: 1,
        seq: 1001,
        sizeBytes: packetSize,
        hash: '2f81352dc07adc6b8dfca61c39bf8d389e7cb1bcba0774e717465430f1d7e70a',
        route: 'Peer-0x7099 (Primary IPFS)',
        targetNode: 'IPFS Cluster A',
        status: 'pending',
        progress: 0,
        color: '#38bdf8' // Cyan
      },
      {
        id: 2,
        seq: 1002,
        sizeBytes: packetSize,
        hash: '73d94e22179ef92abdc4906f9eba51ad9dba24c977423d48119e306f1f21ab3b',
        route: 'Peer-0x3C44 (Replica Node)',
        targetNode: 'IPFS Cluster B',
        status: 'pending',
        progress: 0,
        color: '#a855f7' // Purple
      },
      {
        id: 3,
        seq: 1003,
        sizeBytes: packetSize,
        hash: 'e871a2f64180aa3cb478cbed5efcae784d7bf4f2ff8014e4a8f75612f20a7972',
        route: 'Peer-0xf39F (Consensus Validator)',
        targetNode: 'Hardhat EVM BFT',
        status: 'pending',
        progress: 0,
        color: '#10b981' // Emerald
      },
      {
        id: 4,
        seq: 1004,
        sizeBytes: packetSize,
        hash: '0202f0915f98df9d21f8f705e0a610b1c550ca635964ce7141f452c550ca6359',
        route: 'Peer-0x90F7 (Relay Gateway)',
        targetNode: 'P2P Swarm Edge',
        status: 'pending',
        progress: 0,
        color: '#f59e0b' // Amber
      }
    ];

    setPackets(initialPackets);

    // Timeline execution
    setTimeout(() => {
      setSimState('HASHING');
      initialPackets.forEach((p, idx) => {
        setTimeout(() => {
          addLog('SHA-256', `PKT#${p.id} [SEQ: 0x0${p.seq.toString(16)}] -> Digest: ${p.hash.substring(0, 24)}...`);
        }, idx * 180);
      });
    }, 600 / autoSpeed);

    setTimeout(() => {
      setSimState('TRANSMITTING');
      addLog('IPFS-SWARM', `Dispersing packet shards into multipath decentralized topology.`);
      addLog('CONSENSUS', `Broadcasting merkle verification receipts to Hardhat Smart Contract.`);
      
      const startTime = Date.now();
      const interval = setInterval(() => {
        setPackets(prev => {
          const updated = prev.map(pkt => {
            const newProgress = Math.min(pkt.progress + 4 * autoSpeed, 100);
            return {
              ...pkt,
              progress: newProgress,
              status: (newProgress === 100 ? 'delivered' : 'in_transit') as Packet['status']
            };
          });

          const allDone = updated.every(p => p.progress >= 100);
          if (allDone) {
            clearInterval(interval);
            const duration = Date.now() - startTime;
            setRtt(duration);
            setSimState('REASSEMBLED');
            addLog('REASSEMBLY', `All 4/4 packet fragments reached Target Clinician Workstation.`, true);
            addLog('REASSEMBLY', `Validating TCP sequence numbers (1001 -> 1002 -> 1003 -> 1004). Zero packet loss.`);
            addLog('SUCCESS', `SHA-256 Integrity Verified. Payload successfully reassembled!`, true);
            addLog('CONSENSUS', `Transaction anchored to EHR_AccessControl at 0x5FbDB231... (Gas: 64,280)`, true);
          }
          return updated;
        });
      }, 50);
    }, 1600 / autoSpeed);
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-12 bg-[#0c1222]/90 border border-gray-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,242,254,0.08)]">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" />
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wider uppercase font-mono">
              Computer Network Packeting Simulation
            </h2>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Visualizing MTU Fragmentation, SHA-256 Sharding, Multi-Path IPFS Swarm & Cryptographic Ledger Anchoring
          </p>
        </div>

        {/* Global Live Network State Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-[#111c35] border border-cyan-500/30 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
            <span className="text-gray-400">STATE:</span>
            <span className={`font-bold ${
              simState === 'IDLE' ? 'text-gray-400' :
              simState === 'FRAGMENTING' ? 'text-amber-400 animate-pulse' :
              simState === 'HASHING' ? 'text-purple-400 animate-pulse' :
              simState === 'TRANSMITTING' ? 'text-cyan-400 animate-pulse' :
              'text-emerald-400'
            }`}>
              {simState}
            </span>
          </div>
          {rtt > 0 && (
            <div className="bg-[#111c35] border border-emerald-500/30 px-3 py-1.5 rounded-xl font-mono text-xs text-emerald-400">
              RTT: {rtt}ms
            </div>
          )}
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <div>
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 block">
            1. Select Electronic Health Payload:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['ehr', 'ml', 'dicom'] as const).map(key => (
              <button
                key={key}
                onClick={() => { setSelectedPayload(key); handleReset(); }}
                disabled={simState !== 'IDLE' && simState !== 'REASSEMBLED'}
                className={`text-xs font-mono py-2 px-3 rounded-xl border transition-all ${
                  selectedPayload === key
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                    : 'border-gray-800 bg-[#0a0f1d] text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 block">
            2. Network Protocol Pipeline:
          </label>
          <div className="bg-[#0a0f1d] border border-gray-800 p-2 rounded-xl text-xs font-mono text-gray-300 flex items-center justify-between">
            <span className="text-cyan-400">MPTCP + IPFS Swarm</span>
            <span className="text-gray-500">|</span>
            <span className="text-purple-400">SHA-256 Integrity</span>
            <span className="text-gray-500">|</span>
            <span className="text-emerald-400">BFT Ledger</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 block">
            3. Simulation Action:
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={runSimulation}
                disabled={simState === 'TRANSMITTING' || simState === 'HASHING' || simState === 'FRAGMENTING'}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all disabled:opacity-50"
              >
                ▶ Transmit Payload
              </button>
              <button
                onClick={handleReset}
                className="bg-[#111c35] border border-gray-700 hover:border-gray-500 text-gray-300 text-xs font-mono px-3 py-2.5 rounded-xl transition-all"
              >
                ↺ Reset
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 px-1">
              <span>SIM SPEED:</span>
              <div className="flex gap-1">
                {[0.5, 1, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setAutoSpeed(speed)}
                    className={`px-1.5 py-0.5 rounded border ${
                      autoSpeed === speed
                        ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/60'
                        : 'border-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Architectural Simulation Canvas */}
      <div className="relative bg-[#060a14] border border-gray-800 rounded-2xl p-6 overflow-hidden shadow-inner my-6">
        <div className="absolute top-3 right-4 text-[10px] font-mono text-gray-500 tracking-widest">
          TOPOLOGY: DECENTRALIZED MESH (MULTI-HOP)
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Source Node: Hospital EMR */}
          <div className="lg:col-span-3 bg-[#0d1527] border border-cyan-500/40 p-4 rounded-2xl flex flex-col justify-between h-72 shadow-[0_0_20px_rgba(0,242,254,0.1)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-cyan-400">SRC: HOSPITAL GATEWAY</span>
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <div className="text-[11px] font-mono text-gray-400">IP: 10.0.1.42:8000</div>
              <div className="text-[11px] font-mono text-gray-400">CID: QmEHR_Init...</div>
            </div>

            {/* Ingestion Payload Card */}
            <div className="bg-[#070b16] border border-cyan-900/60 p-2.5 rounded-xl text-[10px] font-mono">
              <div className="text-cyan-300 font-semibold truncate mb-1">
                {payloadMeta[selectedPayload].name}
              </div>
              <div className="text-gray-400 mb-1">
                Total Size: <span className="text-white font-bold">{payloadMeta[selectedPayload].size} Bytes</span>
              </div>
              <div className="text-gray-500 text-[9px] truncate">
                {payloadMeta[selectedPayload].dataPreview}
              </div>
            </div>

            <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between pt-2 border-t border-gray-800">
              <span>Fragmentation:</span>
              <span className="text-cyan-400 font-bold">4 Segments</span>
            </div>
          </div>

          {/* Dynamic Swarm & Transit Paths */}
          <div className="lg:col-span-6 flex flex-col justify-between h-72 py-1">
            <div className="text-center font-mono text-xs text-gray-400 mb-2 flex items-center justify-center gap-2">
              <span className="text-cyan-400">Decentralized Routing Swarm</span>
              <span className="text-gray-600">•</span>
              <span className="text-emerald-400">Multi-Path Traversal</span>
            </div>

            {/* Discrete 4 Packets Transit visualization */}
            <div className="space-y-3.5">
              {packets.length === 0 ? (
                <div className="h-44 border border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-500 font-mono text-xs">
                  <span>Network Standby. Click [Transmit Payload] to initiate packet fragmentation.</span>
                </div>
              ) : (
                packets.map(pkt => (
                  <div key={pkt.id} className="bg-[#0b1120] border border-gray-800 p-2.5 rounded-xl font-mono text-xs">
                    <div className="flex items-center justify-between mb-1.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${pkt.color}20`, color: pkt.color }}>
                          PKT #{pkt.id}
                        </span>
                        <span className="text-gray-400 text-[10px]">SEQ:{pkt.seq}</span>
                        <span className="text-gray-500 text-[10px] hidden sm:inline">[{pkt.sizeBytes} B]</span>
                      </div>
                      <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                        Via: {pkt.targetNode}
                      </span>
                    </div>

                    {/* Progress track */}
                    <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-75 relative"
                        style={{
                          width: `${pkt.progress}%`,
                          backgroundColor: pkt.color,
                          boxShadow: `0 0 10px ${pkt.color}`
                        }}
                      />
                    </div>

                    {/* Cryptographic Hash preview */}
                    <div className="mt-1 flex items-center justify-between text-[9px] text-gray-500">
                      <span className="truncate max-w-[200px]">SHA: {pkt.hash.substring(0, 16)}...</span>
                      <span className={pkt.progress === 100 ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
                        {pkt.progress === 100 ? '✓ DELIVERED' : `${pkt.progress}% IN TRANSIT`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Destination Node: Clinician Reassembly Target */}
          <div className="lg:col-span-3 bg-[#0d1527] border border-emerald-500/40 p-4 rounded-2xl flex flex-col justify-between h-72 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-emerald-400">DEST: CLINICIAN PORTAL</span>
                <span className={`h-2 w-2 rounded-full ${simState === 'REASSEMBLED' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              </div>
              <div className="text-[11px] font-mono text-gray-400">IP: 10.0.8.99:3000</div>
              <div className="text-[11px] font-mono text-gray-400">Target: Doctor Workstation</div>
            </div>

            {/* Reassembly Buffer State */}
            <div className="bg-[#070b16] border border-emerald-900/60 p-2.5 rounded-xl text-[10px] font-mono">
              <div className="text-emerald-400 font-bold mb-1">
                Reassembly Buffer:
              </div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4].map(idx => {
                  const pkt = packets.find(p => p.id === idx);
                  const isDone = pkt && pkt.progress === 100;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 py-1 text-center rounded border text-[9px] font-bold ${
                        isDone
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-gray-900 border-gray-800 text-gray-600'
                      }`}
                    >
                      S{idx}
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-gray-400">
                Integrity Status:{' '}
                <span className={simState === 'REASSEMBLED' ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
                  {simState === 'REASSEMBLED' ? 'PASSED (0x2f8135...)' : 'Awaiting Shards'}
                </span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between pt-2 border-t border-gray-800">
              <span>Smart Contract:</span>
              <span className="text-emerald-400 font-mono truncate max-w-[110px]">0x5FbDB2...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Terminal-Style Overlay */}
      <div className="mt-6 bg-[#040711] border border-emerald-500/30 rounded-2xl p-4 shadow-2xl font-mono text-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800 text-gray-400">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-bold text-gray-300 ml-2">
              DECENTRALIZED PACKET TELEMETRY OVERLAY // TCP-IPFS-LEDGER
            </span>
          </div>
          <button
            onClick={() => setLogs([])}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear Console
          </button>
        </div>

        {/* Scrollable logs box */}
        <div className="h-48 overflow-y-auto space-y-1.5 pr-2 select-text font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <div className="text-gray-600 italic py-6 text-center">
              [Telemetry Idle] Awaiting packet transmission trigger. Click &quot;Transmit Payload&quot; above to start live tracing.
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`flex items-start gap-2 ${
                  log.highlight ? 'text-emerald-300 font-bold bg-emerald-950/20 px-1 rounded' : 'text-gray-300'
                }`}
              >
                <span className="text-gray-600 select-none">[{log.timestamp}]</span>
                <span
                  className={`font-bold px-1 rounded text-[10px] ${
                    log.tag === 'INGEST' ? 'text-cyan-400' :
                    log.tag === 'TCP/IP' ? 'text-blue-400' :
                    log.tag === 'SHA-256' ? 'text-purple-400' :
                    log.tag === 'IPFS-SWARM' ? 'text-amber-400' :
                    log.tag === 'CONSENSUS' ? 'text-pink-400' :
                    log.tag === 'REASSEMBLY' ? 'text-emerald-400' :
                    'text-green-300'
                  }`}
                >
                  [{log.tag}]
                </span>
                <span className="flex-1">{log.message}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
