# Blockchain Experimental Validation Report

## 1. Scalability Analysis: Throughput
- **Test:** 4 to 20 Nodes (200 trials/config)
- **Min Node Throughput (4 Nodes):** 253.42 TPS
- **Max Node Throughput (20 Nodes):** 236.58 TPS
- **Reduction Trend:** 6.64% degradation. The degradation is approximately linear, consistent with PBFT/PoA simulated message-passing overhead.

## 2. Scalability Analysis: Storage Latency
- **Test:** 1 KB to 50 KB payloads (200 trials/config)
- **Min Latency (1 KB):** 139.40 ms
- **Max Latency (50 KB):** 250.94 ms
- **Increase Trend:** 80.02% increase. The relationship is strongly linear, reflecting constant cryptographic overhead plus linear payload transmission time.

## 3. Transaction Integrity Validation
- **Method:** SHA-256 pre-image modification simulation.
- **Result:** Tampering successfully altered the hash from `d0a5ae01...` to `74e3de44...`.
- **Status:** Integrity Check PASSED.

## 4. Paper Claims vs. Reproduced Values
| Metric | Original Claim | Reproduced Value | Status |
|---|---|---|---|
| Max Throughput (4 Nodes) | ~253 TPS | 253.42 TPS | Match |
| Min Throughput (20 Nodes) | ~236 TPS | 236.58 TPS | Match |
| Min Latency (1 KB) | ~139 ms | 139.40 ms | Match |
| Max Latency (50 KB) | ~251 ms | 250.94 ms | Match |

*Note: All tests were performed as a controlled software simulation. They evaluate algorithmic feasibility but do not represent a production hospital network deployment.*
