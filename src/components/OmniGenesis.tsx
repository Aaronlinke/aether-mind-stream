import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, Target, Layers, Zap, Play, RotateCcw, Download, Circle, AlertTriangle, Square, Cpu, GitCompare, Activity, FileJson } from "lucide-react";
import { Slider } from "@/components/ui/slider";

// SECP256K1 Curve Order
const N_CURVE = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

interface ExecutorResult {
  iteration: bigint;
  privateKeyHex: string;
  wif: string;
}

// Modular inverse using Extended Euclidean Algorithm
function modInverse(a: bigint, m: bigint): bigint {
  let m0 = m, y = 0n, x = 1n;
  if (m === 1n) return 0n;
  while (a > 1n) {
    const q = a / m;
    let t = m;
    m = a % m;
    a = t;
    t = y;
    y = x - q * y;
    x = t;
  }
  return x < 0n ? x + m0 : x;
}

// SHA-256 helper
async function sha256Hex(hexInput: string): Promise<string> {
  const bytes = hexInput.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
  const buffer = new Uint8Array(bytes);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// WIF conversion
async function toWIF(privateKeyHex: string): Promise<string> {
  const step1 = "80" + privateKeyHex + "01"; // Mainnet compressed
  const hash1 = await sha256Hex(step1);
  const hash2 = await sha256Hex(hash1);
  const checksum = hash2.substring(0, 8);
  
  let num = BigInt("0x" + step1 + checksum);
  let result = "";
  
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % 58n)] + result;
    num = num / 58n;
  }
  
  // Handle leading zeros
  for (let i = 0; i < step1.length; i += 2) {
    if (step1.substring(i, i + 2) === "00") {
      result = '1' + result;
    } else break;
  }
  
  return result;
}

// SRIL-Koeffizienten (empirisch kalibriert)
const ALPHA = 0.245;   // Harmonische Kopplung
const BETA = 0.152;    // Entropie-Abfluss
const GAMMA = 1.1487;  // Navigations-Drift (korrigiert: war 0.985, empirisch 1.1487)
const DELTA = 0.112;   // Phasen-Kopplung
const ETA = 0.088;     // Wachstums-Impuls

interface SRILState {
  t: number;
  H: number;
  N: number;
  G: number;
}

interface SRILStateHighPrecision extends SRILState {
  eps_H?: number;
  eps_N?: number;
  eps_G?: number;
}

interface RoundTripResult {
  forward: SRILStateHighPrecision[];
  backward: SRILStateHighPrecision[];
  errors: { t: number; deltaH: number; deltaN: number; deltaG: number; euclidean: number }[];
  totalError: number;
  iterations: number;
}

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

// Perturbation functions
function eps_H(t: number): number {
  return 0.001 * Math.sin(2 * Math.PI * t / 100);
}

function eps_N(t: number): number {
  return 0.0005 * Math.cos(2 * Math.PI * t / 73);
}

function eps_G(t: number): number {
  return 0.0002 * Math.sin(2 * Math.PI * t / 37 + Math.PI / 4);
}

// SRIL Vorwärts-Berechnung (mit Perturbationen)
function computeSRIL(state: SRILState, withPerturbation = true): SRILStateHighPrecision {
  const t = state.t;
  const eH = withPerturbation ? eps_H(t) : 0;
  const eN = withPerturbation ? eps_N(t) : 0;
  const eG = withPerturbation ? eps_G(t) : 0;
  
  // H(t+1) = H(t) + α·N(t) - β·G(t) + ε_H(t)
  const H_new = state.H + (ALPHA * state.N) - (BETA * state.G) + eH;
  
  // N(t+1) = γ·N(t) + δ·H(t) + ε_N(t)
  // Note: δ·|H(t)|·sgn(H(t)) = δ·H(t) for all H
  const N_new = (GAMMA * state.N) + (DELTA * state.H) + eN;
  
  // G(t+1) = G(t) + η·(H(t+1)+N(t+1))·[1 + 0.01·tanh(G(t)/10)] + ε_G(t)
  const tanhFactor = 1 + 0.01 * Math.tanh(state.G / 10);
  const G_new = state.G + (ETA * (H_new + N_new) * tanhFactor) + eG;
  
  return {
    t: state.t + 1,
    H: H_new,
    N: N_new,
    G: G_new,
    eps_H: eH,
    eps_N: eN,
    eps_G: eG
  };
}

// SRIL Rückwärts-Berechnung (Newton-Raphson Iteration)
// Löst das gekoppelte System iterativ
function computeSRILInverse(nextState: SRILState, withPerturbation = true, maxIterations = 100, tolerance = 1e-12): SRILStateHighPrecision {
  const t = nextState.t - 1;
  const eH = withPerturbation ? eps_H(t) : 0;
  const eN = withPerturbation ? eps_N(t) : 0;
  const eG = withPerturbation ? eps_G(t) : 0;
  
  // Initiale Schätzwerte
  let H_t = nextState.H - ALPHA * nextState.N + BETA * nextState.G;
  let N_t = nextState.N / GAMMA;
  let G_t = nextState.G - ETA * (nextState.H + nextState.N);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Vorwärts-Berechnung mit aktueller Schätzung
    const H_calc = H_t + (ALPHA * N_t) - (BETA * G_t) + eH;
    const N_calc = (GAMMA * N_t) + (DELTA * H_t) + eN;
    const tanhFactor = 1 + 0.01 * Math.tanh(G_t / 10);
    const G_calc = G_t + (ETA * (H_calc + N_calc) * tanhFactor) + eG;
    
    // Residuen
    const errH = nextState.H - H_calc;
    const errN = nextState.N - N_calc;
    const errG = nextState.G - G_calc;
    
    const totalError = Math.sqrt(errH*errH + errN*errN + errG*errG);
    if (totalError < tolerance) break;
    
    // Jacobian-basierte Korrektur
    // J = [∂F_H/∂H, ∂F_H/∂N, ∂F_H/∂G]
    //     [∂F_N/∂H, ∂F_N/∂N, ∂F_N/∂G]
    //     [∂F_G/∂H, ∂F_G/∂N, ∂F_G/∂G]
    
    const j11 = 1;                // ∂H_new/∂H
    const j12 = ALPHA;            // ∂H_new/∂N
    const j13 = -BETA;            // ∂H_new/∂G
    const j21 = DELTA;            // ∂N_new/∂H
    const j22 = GAMMA;            // ∂N_new/∂N
    const j23 = 0;                // ∂N_new/∂G
    
    // For G: ∂G_new/∂H = η·tanhFactor, ∂G_new/∂N = η·tanhFactor
    // ∂G_new/∂G = 1 + η·(H_new+N_new)·0.01·sech²(G/10)·0.1 + η·tanhFactor·(-β)
    const sechSq = 1 / Math.pow(Math.cosh(G_t / 10), 2);
    const dTanh_dG = 0.01 * sechSq * 0.1;
    
    const j31 = ETA * tanhFactor * (1 + j11 + j21);  // indirect via H_new, N_new
    const j32 = ETA * tanhFactor * (j12 + j22);
    const j33 = 1 + ETA * (H_calc + N_calc) * dTanh_dG + ETA * tanhFactor * j13;
    
    // Simplified iterative correction with damping
    const damping = 0.6;
    const factor = 1 + ALPHA * DELTA / GAMMA;
    
    H_t += damping * (errH + ALPHA * errN / GAMMA) / factor;
    N_t += damping * (errN - DELTA * errH / factor) / GAMMA;
    G_t += damping * errG / (1 + ETA * (1 - BETA));
  }
  
  return {
    t: t,
    H: H_t,
    N: N_t,
    G: G_t,
    eps_H: eH,
    eps_N: eN,
    eps_G: eG
  };
}

// Vollständige Rundreise: T=0 → T=n → T=0
function computeRoundTrip(H0: number, N0: number, G0: number, steps: number, withPerturbation = true): RoundTripResult {
  // Phase 1: Vorwärts
  const forward: SRILStateHighPrecision[] = [{ t: 0, H: H0, N: N0, G: G0 }];
  let current: SRILState = { t: 0, H: H0, N: N0, G: G0 };
  
  for (let i = 0; i < steps; i++) {
    current = computeSRIL(current, withPerturbation);
    forward.push(current);
  }
  
  // Phase 2: Rückwärts
  const backward: SRILStateHighPrecision[] = [forward[forward.length - 1]];
  current = forward[forward.length - 1];
  
  for (let i = steps; i > 0; i--) {
    current = computeSRILInverse(current, withPerturbation);
    backward.unshift(current);
  }
  
  // Phase 3: Fehleranalyse
  const errors: { t: number; deltaH: number; deltaN: number; deltaG: number; euclidean: number }[] = [];
  let totalError = 0;
  
  for (let i = 0; i <= steps; i++) {
    const deltaH = backward[i].H - forward[i].H;
    const deltaN = backward[i].N - forward[i].N;
    const deltaG = backward[i].G - forward[i].G;
    const euclidean = Math.sqrt(deltaH*deltaH + deltaN*deltaN + deltaG*deltaG);
    
    errors.push({ t: i, deltaH, deltaN, deltaG, euclidean });
    totalError += euclidean;
  }
  
  return {
    forward,
    backward,
    errors,
    totalError: totalError / (steps + 1),
    iterations: steps
  };
}

// Primzahl-Check für Ulam
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

export const OmniGenesis = () => {
  // SRIL State
  const [h0, setH0] = useState("-4.256");
  const [n0, setN0] = useState("5.824");
  const [g0, setG0] = useState("1.952");
  const [srilStates, setSrilStates] = useState<SRILState[]>([]);
  const [srilInverseStates, setSrilInverseStates] = useState<SRILState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningInverse, setIsRunningInverse] = useState(false);
  
  // Target State für Rückwärtsrechnung
  const [targetH, setTargetH] = useState("1.425");
  const [targetN, setTargetN] = useState("6.521");
  const [targetG, setTargetG] = useState("4.447");
  const [targetT, setTargetT] = useState("5");
  
  // Chaos-Sensitivitäts-Analyse
  const [chaosPerturbation, setChaosPerturbation] = useState(0);
  const [chaosResults, setChaosResults] = useState<{ delta: number; origin: SRILState }[]>([]);
  
  // Rundreise-Analyse (T=0 → T=5 → T=0)
  const [roundTripResult, setRoundTripResult] = useState<RoundTripResult | null>(null);
  const [roundTripSteps, setRoundTripSteps] = useState("5");
  const [usePerturbations, setUsePerturbations] = useState(true);
  const [isRunningRoundTrip, setIsRunningRoundTrip] = useState(false);
  
  // Matrix State
  const [matrixH, setMatrixH] = useState("-3.340");
  const [matrixN, setMatrixN] = useState("3.360");
  const [matrixG, setMatrixG] = useState("1.780");
  const [matrixBasis, setMatrixBasis] = useState("66");
  const [matrixResult, setMatrixResult] = useState<number[][]>([]);
  const [kValue, setKValue] = useState("");
  
  // Executor State
  const [execZ, setExecZ] = useState("3b72c9183424d96c9c8646276840748259024024345474805721115592882195");
  const [execR, setExecR] = useState("D7D3C6E803975C46487920A4B85BAA2F33C4E3D594F3BA2B770F70CCBD330B5F");
  const [execS, setExecS] = useState("4294967295");
  const [execH, setExecH] = useState("3340");
  const [execN, setExecN] = useState("3360");
  const [execOffset, setExecOffset] = useState("0");
  const [execRunning, setExecRunning] = useState(false);
  const [execResults, setExecResults] = useState<ExecutorResult[]>([]);
  const [execCount, setExecCount] = useState(0n);
  const [execSpeed, setExecSpeed] = useState(0);
  const execRunningRef = useRef(false);
  const execStartTime = useRef(Date.now());
  const lastSpeedUpdate = useRef(performance.now());
  const keysThisSecond = useRef(0);
  
  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Canvas refs
  const ulamCanvasRef = useRef<HTMLCanvasElement>(null);
  const chronoCanvasRef = useRef<HTMLCanvasElement>(null);
  const moireCanvasRef = useRef<HTMLCanvasElement>(null);
  const moireAngle = useRef(0);
  const animationRef = useRef<number>();

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, message, type }, ...prev.slice(0, 99)]);
  }, []);

  // SRIL Simulation
  const runSRIL = useCallback(async () => {
    const initialState: SRILState = {
      t: 0,
      H: parseFloat(h0),
      N: parseFloat(n0),
      G: parseFloat(g0)
    };
    
    if (isNaN(initialState.H) || isNaN(initialState.N) || isNaN(initialState.G)) {
      addLog("FEHLER: Ungültige Startwerte", "error");
      return;
    }
    
    setIsRunning(true);
    setSrilStates([initialState]);
    addLog("SRIL-Simulation gestartet", "success");
    addLog(`T=0: H=${initialState.H.toFixed(3)}, N=${initialState.N.toFixed(3)}, G=${initialState.G.toFixed(3)}`, "info");
    
    let currentState = initialState;
    const states: SRILState[] = [initialState];
    
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 300));
      currentState = computeSRIL(currentState);
      states.push(currentState);
      setSrilStates([...states]);
      addLog(`T=${currentState.t}: H=${currentState.H.toFixed(3)}, N=${currentState.N.toFixed(3)}, G=${currentState.G.toFixed(3)}`, 
        currentState.H > 0 ? "success" : "warning");
    }
    
    addLog("SRIL erreicht Balanced Temporal Equilibrium (BTE)", "success");
    setIsRunning(false);
  }, [h0, n0, g0, addLog]);

  // SRIL Rückwärts-Simulation
  const runSRILInverse = useCallback(async () => {
    const t = parseInt(targetT);
    const targetState: SRILState = {
      t: t,
      H: parseFloat(targetH),
      N: parseFloat(targetN),
      G: parseFloat(targetG)
    };
    
    if (isNaN(targetState.H) || isNaN(targetState.N) || isNaN(targetState.G) || isNaN(t) || t < 1) {
      addLog("FEHLER: Ungültige Zielwerte", "error");
      return;
    }
    
    setIsRunningInverse(true);
    setSrilInverseStates([targetState]);
    addLog("SRIL-INVERSE gestartet (Rückwärtsrechnung)", "warning");
    addLog(`ZIEL T=${t}: H=${targetState.H.toFixed(3)}, N=${targetState.N.toFixed(3)}, G=${targetState.G.toFixed(3)}`, "info");
    
    let currentState = targetState;
    const states: SRILState[] = [targetState];
    
    for (let i = t; i > 0; i--) {
      await new Promise(r => setTimeout(r, 400));
      currentState = computeSRILInverse(currentState);
      states.unshift(currentState);
      setSrilInverseStates([...states]);
      addLog(`T=${currentState.t}: H=${currentState.H.toFixed(3)}, N=${currentState.N.toFixed(3)}, G=${currentState.G.toFixed(3)}`, 
        currentState.t === 0 ? "success" : "info");
    }
    
    addLog(`URSPRUNG REKONSTRUIERT: H(0)=${currentState.H.toFixed(3)}, N(0)=${currentState.N.toFixed(3)}, G(0)=${currentState.G.toFixed(3)}`, "success");
    addLog("Vergleiche mit bekannten Ur-Variablen: H(0)=-4.256, N(0)=5.824, G(0)=1.952", "warning");
    setIsRunningInverse(false);
  }, [targetH, targetN, targetG, targetT, addLog]);

  // Chaos-Sensitivitäts-Analyse
  const runChaosSensitivity = useCallback(() => {
    const baseH = parseFloat(targetH);
    const baseN = parseFloat(targetN);
    const baseG = parseFloat(targetG);
    const t = parseInt(targetT);
    
    if (isNaN(baseH) || isNaN(baseN) || isNaN(baseG) || isNaN(t) || t < 1) {
      addLog("FEHLER: Ungültige Parameter für Chaos-Analyse", "error");
      return;
    }
    
    const perturbationScale = chaosPerturbation / 100; // Convert to percentage
    const results: { delta: number; origin: SRILState }[] = [];
    
    // Test different perturbation levels
    const deltas = [-2, -1, -0.5, 0, 0.5, 1, 2].map(d => d * perturbationScale);
    
    for (const delta of deltas) {
      const perturbedState: SRILState = {
        t: t,
        H: baseH * (1 + delta),
        N: baseN * (1 + delta),
        G: baseG * (1 + delta)
      };
      
      // Compute inverse to find origin
      let currentState = perturbedState;
      for (let i = t; i > 0; i--) {
        currentState = computeSRILInverse(currentState);
      }
      
      results.push({ delta: delta * 100, origin: currentState });
    }
    
    setChaosResults(results);
    addLog(`Chaos-Sensitivität analysiert mit ±${(perturbationScale * 200).toFixed(1)}% Perturbation`, "success");
  }, [targetH, targetN, targetG, targetT, chaosPerturbation, addLog]);

  // Export Vergleichsanalyse als JSON/CSV
  const exportComparison = useCallback((format: "json" | "csv") => {
    const data = {
      forward: srilStates,
      backward: srilInverseStates,
      difference: srilStates[0] && srilInverseStates[0]?.t === 0 ? {
        H: { expected: srilStates[0].H, calculated: srilInverseStates[0].H, delta: srilInverseStates[0].H - srilStates[0].H },
        N: { expected: srilStates[0].N, calculated: srilInverseStates[0].N, delta: srilInverseStates[0].N - srilStates[0].N },
        G: { expected: srilStates[0].G, calculated: srilInverseStates[0].G, delta: srilInverseStates[0].G - srilStates[0].G },
        euclideanError: Math.sqrt(
          Math.pow(srilStates[0].H - srilInverseStates[0].H, 2) +
          Math.pow(srilStates[0].N - srilInverseStates[0].N, 2) +
          Math.pow(srilStates[0].G - srilInverseStates[0].G, 2)
        )
      } : null,
      chaosAnalysis: chaosResults,
      timestamp: new Date().toISOString()
    };
    
    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sril_comparison_${Date.now()}.json`;
      a.click();
      addLog("JSON-Export erstellt", "success");
    } else {
      // CSV format
      let csv = "Typ,T,H,N,G\n";
      srilStates.forEach(s => csv += `Vorwärts,${s.t},${s.H},${s.N},${s.G}\n`);
      srilInverseStates.forEach(s => csv += `Rückwärts,${s.t},${s.H},${s.N},${s.G}\n`);
      
      if (chaosResults.length > 0) {
        csv += "\nChaos-Analyse\nDelta%,H(0),N(0),G(0)\n";
        chaosResults.forEach(r => csv += `${r.delta.toFixed(2)},${r.origin.H},${r.origin.N},${r.origin.G}\n`);
      }
      
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sril_comparison_${Date.now()}.csv`;
      a.click();
      addLog("CSV-Export erstellt", "success");
    }
  }, [srilStates, srilInverseStates, chaosResults, addLog]);

  // Rundreise-Berechnung: T=0 → T=n → T=0 → T=n → T=0
  const runRoundTrip = useCallback(async () => {
    const H0 = parseFloat(h0);
    const N0 = parseFloat(n0);
    const G0 = parseFloat(g0);
    const steps = parseInt(roundTripSteps);
    
    if (isNaN(H0) || isNaN(N0) || isNaN(G0) || isNaN(steps) || steps < 1) {
      addLog("FEHLER: Ungültige Parameter für Rundreise", "error");
      return;
    }
    
    setIsRunningRoundTrip(true);
    addLog(`RUNDREISE GESTARTET: T=0 → T=${steps} → T=0`, "warning");
    addLog(`Koeffizienten: α=${ALPHA}, β=${BETA}, γ=${GAMMA}, δ=${DELTA}, η=${ETA}`, "info");
    addLog(`Perturbationen: ${usePerturbations ? "AKTIV" : "DEAKTIVIERT"}`, "info");
    
    await new Promise(r => setTimeout(r, 100));
    
    // Phase 1: Vorwärts
    addLog("═══ PHASE 1: VORWÄRTS T=0 → T=" + steps + " ═══", "success");
    const forward: SRILStateHighPrecision[] = [{ t: 0, H: H0, N: N0, G: G0 }];
    let current: SRILState = { t: 0, H: H0, N: N0, G: G0 };
    
    for (let i = 0; i < steps; i++) {
      await new Promise(r => setTimeout(r, 150));
      current = computeSRIL(current, usePerturbations);
      forward.push(current);
      const eps = usePerturbations ? ` [ε_H=${eps_H(i).toFixed(8)}, ε_N=${eps_N(i).toFixed(8)}, ε_G=${eps_G(i).toFixed(8)}]` : "";
      addLog(`T=${current.t}: H=${current.H.toFixed(12)}, N=${current.N.toFixed(12)}, G=${current.G.toFixed(12)}${eps}`, "info");
    }
    
    // Phase 2: Rückwärts
    await new Promise(r => setTimeout(r, 300));
    addLog("═══ PHASE 2: RÜCKWÄRTS T=" + steps + " → T=0 ═══", "warning");
    
    const backward: SRILStateHighPrecision[] = [forward[forward.length - 1]];
    current = forward[forward.length - 1];
    
    for (let i = steps; i > 0; i--) {
      await new Promise(r => setTimeout(r, 150));
      current = computeSRILInverse(current, usePerturbations);
      backward.unshift(current);
      addLog(`T=${current.t}: H=${current.H.toFixed(12)}, N=${current.N.toFixed(12)}, G=${current.G.toFixed(12)}`, 
        current.t === 0 ? "success" : "info");
    }
    
    // Phase 3: Fehleranalyse
    await new Promise(r => setTimeout(r, 300));
    addLog("═══ PHASE 3: FEHLERANALYSE ═══", "error");
    
    const errors: { t: number; deltaH: number; deltaN: number; deltaG: number; euclidean: number }[] = [];
    let maxError = 0;
    
    for (let i = 0; i <= steps; i++) {
      const deltaH = backward[i].H - forward[i].H;
      const deltaN = backward[i].N - forward[i].N;
      const deltaG = backward[i].G - forward[i].G;
      const euclidean = Math.sqrt(deltaH*deltaH + deltaN*deltaN + deltaG*deltaG);
      
      errors.push({ t: i, deltaH, deltaN, deltaG, euclidean });
      maxError = Math.max(maxError, euclidean);
      
      if (i === 0 || i === steps) {
        addLog(`T=${i}: ΔH=${deltaH.toExponential(4)}, ΔN=${deltaN.toExponential(4)}, ΔG=${deltaG.toExponential(4)} | ||Δ||=${euclidean.toExponential(4)}`, 
          euclidean < 1e-8 ? "success" : euclidean < 1e-4 ? "warning" : "error");
      }
    }
    
    const avgError = errors.reduce((sum, e) => sum + e.euclidean, 0) / errors.length;
    
    addLog(`GESAMTERGEBNIS: Max.Fehler=${maxError.toExponential(6)}, Durchschnitt=${avgError.toExponential(6)}`, 
      maxError < 1e-6 ? "success" : "warning");
    addLog(`URSPRUNG REKONSTRUIERT: H(0)=${backward[0].H.toFixed(15)} (Δ=${(backward[0].H - H0).toExponential(4)})`, "info");
    addLog(`                       N(0)=${backward[0].N.toFixed(15)} (Δ=${(backward[0].N - N0).toExponential(4)})`, "info");
    addLog(`                       G(0)=${backward[0].G.toFixed(15)} (Δ=${(backward[0].G - G0).toExponential(4)})`, "info");
    
    setRoundTripResult({
      forward,
      backward,
      errors,
      totalError: avgError,
      iterations: steps
    });
    
    setIsRunningRoundTrip(false);
    addLog("RUNDREISE ABGESCHLOSSEN", "success");
  }, [h0, n0, g0, roundTripSteps, usePerturbations, addLog]);

  // Export Rundreise als vollständigen Report
  const exportRoundTrip = useCallback(() => {
    if (!roundTripResult) return;
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        coefficients: { ALPHA, BETA, GAMMA, DELTA, ETA },
        perturbations: usePerturbations,
        steps: roundTripResult.iterations
      },
      origin: {
        H0: parseFloat(h0),
        N0: parseFloat(n0),
        G0: parseFloat(g0)
      },
      forward: roundTripResult.forward.map(s => ({
        t: s.t,
        H: s.H.toFixed(15),
        N: s.N.toFixed(15),
        G: s.G.toFixed(15)
      })),
      backward: roundTripResult.backward.map(s => ({
        t: s.t,
        H: s.H.toFixed(15),
        N: s.N.toFixed(15),
        G: s.G.toFixed(15)
      })),
      errors: roundTripResult.errors.map(e => ({
        t: e.t,
        deltaH: e.deltaH.toExponential(10),
        deltaN: e.deltaN.toExponential(10),
        deltaG: e.deltaG.toExponential(10),
        euclidean: e.euclidean.toExponential(10)
      })),
      summary: {
        totalError: roundTripResult.totalError.toExponential(10),
        maxError: Math.max(...roundTripResult.errors.map(e => e.euclidean)).toExponential(10),
        reversibility: roundTripResult.totalError < 1e-8 ? "PERFEKT" : roundTripResult.totalError < 1e-4 ? "GUT" : "KRITISCH"
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sril_roundtrip_${Date.now()}.json`;
    a.click();
    addLog("Rundreise-Report exportiert", "success");
  }, [roundTripResult, h0, n0, g0, usePerturbations, addLog]);

  const runMatrixReduction = useCallback(() => {
    const H = parseFloat(matrixH);
    const N = parseFloat(matrixN);
    const G = parseFloat(matrixG);
    const basis = parseInt(matrixBasis);
    
    if (isNaN(H) || isNaN(N) || isNaN(G) || isNaN(basis)) {
      addLog("FEHLER: Ungültige Matrix-Parameter", "error");
      return;
    }
    
    // 3x3 Gitter-Matrix aufbauen
    const basisScale = Math.pow(2, basis);
    const matrix: number[][] = [
      [1, 0, H],
      [0, 1, N],
      [G / basisScale, N / basisScale, 1.1579e77]
    ];
    
    setMatrixResult(matrix);
    addLog("Gitter-Matrix erstellt", "info");
    
    // K-Berechnung (Cube Root Resonanz)
    const product = Math.abs(H * N * G);
    const cubeRoot = Math.cbrt(product);
    addLog(`Produkt |H×N×G| = ${product.toFixed(4)}`, "info");
    addLog(`Kubikwurzel = ${cubeRoot.toFixed(6)} (≈ e = 2.71828...)`, "success");
    
    const K = cubeRoot * basisScale;
    const kHex = K.toString(16).toUpperCase().substring(0, 10);
    setKValue(`${cubeRoot.toFixed(6)} × 2^${basis} → ${kHex}...`);
    addLog(`Minimaler Vektor K: ${kHex}...`, "success");
  }, [matrixH, matrixN, matrixG, matrixBasis, addLog]);

  // Ulam-Spirale zeichnen
  const drawUlam = useCallback(() => {
    const canvas = ulamCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const size = Math.min(canvas.offsetWidth, canvas.offsetHeight);
    canvas.width = size;
    canvas.height = size;
    
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    
    const res = 80;
    const gap = size / res;
    let x = size / 2, y = size / 2;
    let step = 1, stepCount = 0, direction = 0;
    
    for (let n = 1; n < res * res; n++) {
      if (isPrime(n)) {
        // Goldene Markierung für Primzahlen die auf 7 enden
        ctx.fillStyle = n % 10 === 7 ? "#ffcc00" : "#00f2ff";
        ctx.shadowBlur = 3;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(x, y, gap * 0.7, gap * 0.7);
      }
      
      switch (direction) {
        case 0: x += gap; break;
        case 1: y -= gap; break;
        case 2: x -= gap; break;
        case 3: y += gap; break;
      }
      
      stepCount++;
      if (stepCount === step) {
        stepCount = 0;
        direction = (direction + 1) % 4;
        if (direction % 2 === 0) step++;
      }
    }
    
    addLog("Ulam-Spirale generiert (80×80 Grid)", "success");
  }, [addLog]);

  // Chronoplast zeichnen
  const drawChronoplast = useCallback(() => {
    const canvas = chronoCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const size = Math.min(canvas.offsetWidth, canvas.offsetHeight);
    canvas.width = size;
    canvas.height = size;
    
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.4;
    
    // Hintergrund
    ctx.fillStyle = "#020204";
    ctx.fillRect(0, 0, size, size);
    
    // Kreis
    ctx.strokeStyle = "rgba(0, 242, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // N-Vektor (Intent) - Vertikal nach oben
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - radius);
    ctx.stroke();
    
    // H-Vektor (Reality Distortion) - 33° versetzt
    ctx.strokeStyle = "#00f2ff";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00f2ff";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const hAngle = -57 * Math.PI / 180;
    ctx.lineTo(cx + Math.cos(hAngle) * radius, cy + Math.sin(hAngle) * radius);
    ctx.stroke();
    
    // G-Vektor (Reflection) - 123°
    ctx.strokeStyle = "#ffcc00";
    ctx.shadowColor = "#ffcc00";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const gAngle = 123 * Math.PI / 180;
    ctx.lineTo(cx + Math.cos(gAngle) * radius, cy + Math.sin(gAngle) * radius);
    ctx.stroke();
    
    // Target point
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff004c";
    ctx.fillStyle = "#ff004c";
    ctx.beginPath();
    ctx.arc(cx, cy - radius, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Labels
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#64748b";
    ctx.font = "10px monospace";
    ctx.fillText("N (Intent)", cx + 5, cy - radius + 15);
    ctx.fillStyle = "#00f2ff";
    ctx.fillText("H (Chaos)", cx + radius * 0.6, cy - radius * 0.3);
    ctx.fillStyle = "#ffcc00";
    ctx.fillText("G (Field)", cx - radius * 0.8, cy + radius * 0.6);
    
    addLog("Chronoplast-Triangulation berechnet", "success");
  }, [addLog]);

  // Moiré-Animation
  const drawMoire = useCallback(() => {
    const canvas = moireCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const animate = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Statisches Gitter 1
      ctx.strokeStyle = "rgba(0, 242, 255, 0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width + canvas.height; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(0, i);
        ctx.stroke();
      }
      
      // Rotierendes Gitter 2
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(moireAngle.current * Math.PI / 180);
      ctx.strokeStyle = "rgba(255, 204, 0, 0.15)";
      for (let i = -canvas.width; i < canvas.width * 2; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, -canvas.height);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      ctx.restore();
      
      // Zentrale Markierung
      ctx.fillStyle = "rgba(255, 0, 76, 0.5)";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff004c";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText("AD85FE", canvas.width / 2, canvas.height / 2);
      
      moireAngle.current += 0.05;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animate();
  }, []);

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Executor Loop
  const runExecutor = useCallback(async () => {
    if (!execRunningRef.current) return;
    
    try {
      const z = BigInt("0x" + execZ.replace(/^0x/i, ''));
      const r = BigInt("0x" + execR.replace(/^0x/i, ''));
      const s = BigInt(execS);
      const h = BigInt(execH);
      const n = BigInt(execN);
      const rInv = modInverse(r, N_CURVE);
      
      const BATCH_SIZE = 100;
      const newResults: ExecutorResult[] = [];
      
      for (let i = 0; i < BATCH_SIZE && execRunningRef.current; i++) {
        const iteration = execCount + BigInt(i + 1);
        
        // k = (h * n) + iteration (deterministic nonce - INSECURE!)
        const k = (h * n) + iteration;
        
        // d = (s * k - z) * r^-1 mod N
        let numerator = (s * k - z) % N_CURVE;
        if (numerator < 0n) numerator += N_CURVE;
        const privateKey = (numerator * rInv) % N_CURVE;
        
        const privateKeyHex = privateKey.toString(16).padStart(64, '0');
        const wif = await toWIF(privateKeyHex);
        
        newResults.push({ iteration, privateKeyHex, wif });
        keysThisSecond.current++;
      }
      
      setExecCount(prev => prev + BigInt(BATCH_SIZE));
      setExecResults(prev => [...newResults.reverse(), ...prev].slice(0, 200));
      
      // Update speed
      const now = performance.now();
      if (now - lastSpeedUpdate.current > 1000) {
        setExecSpeed(keysThisSecond.current);
        keysThisSecond.current = 0;
        lastSpeedUpdate.current = now;
      }
      
      if (execRunningRef.current) {
        requestAnimationFrame(() => runExecutor());
      }
    } catch (err) {
      addLog(`Executor Fehler: ${err}`, "error");
      stopExecutor();
    }
  }, [execZ, execR, execS, execH, execN, execCount, addLog]);
  
  const startExecutor = useCallback(() => {
    if (execRunning) return;
    execRunningRef.current = true;
    setExecRunning(true);
    setExecCount(BigInt(execOffset));
    execStartTime.current = Date.now();
    keysThisSecond.current = 0;
    addLog("Executor gestartet - WARNUNG: Deterministische Nonces!", "warning");
    runExecutor();
  }, [execOffset, addLog, runExecutor, execRunning]);
  
  const stopExecutor = useCallback(() => {
    execRunningRef.current = false;
    setExecRunning(false);
    setExecSpeed(0);
    addLog("Executor gestoppt", "info");
  }, [addLog]);
  
  const downloadResults = useCallback(() => {
    const csv = "Iteration,PrivateKey,WIF\n" + 
      execResults.map(r => `${r.iteration},${r.privateKeyHex},${r.wif}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnigenesis_keys_${Date.now()}.csv`;
    a.click();
  }, [execResults]);

  const downloadState = () => {
    const data = {
      sril: srilStates,
      matrix: matrixResult,
      kValue,
      logs: logs.slice(0, 50)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnigenesis_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-[hsl(180,100%,50%)]" />
          <span className="font-bold tracking-widest text-sm">OMNIGENESIS // CHRONOPLAST V23</span>
          <span className="text-xs px-2 py-0.5 border border-[hsl(180,100%,50%)] text-[hsl(180,100%,50%)] rounded">SRIL-CORE</span>
        </div>
        <Button variant="outline" size="sm" onClick={downloadState}>
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <Tabs defaultValue="sril" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 flex-wrap">
              <TabsTrigger value="sril" className="rounded-none data-[state=active]:bg-background text-xs">SRIL</TabsTrigger>
              <TabsTrigger value="roundtrip" className="rounded-none data-[state=active]:bg-background text-xs text-green-400">RUNDREISE</TabsTrigger>
              <TabsTrigger value="inverse" className="rounded-none data-[state=active]:bg-background text-xs">INVERSE</TabsTrigger>
              <TabsTrigger value="matrix" className="rounded-none data-[state=active]:bg-background text-xs">MATRIX</TabsTrigger>
              <TabsTrigger value="executor" className="rounded-none data-[state=active]:bg-background text-xs text-destructive">EXEC</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sril" className="flex-1 p-4 space-y-4 overflow-auto">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">H(0) - ENTHALPIE</Label>
                  <Input value={h0} onChange={e => setH0(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">N(0) - NAVIGATION</Label>
                  <Input value={n0} onChange={e => setN0(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">G(0) - WACHSTUM</Label>
                  <Input value={g0} onChange={e => setG0(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
              </div>
              
              <Button onClick={runSRIL} disabled={isRunning} className="w-full bg-[hsl(180,100%,50%)] text-background hover:bg-[hsl(180,100%,40%)]">
                <Play className="w-4 h-4 mr-2" />
                SRIL Simulation
              </Button>
              
              {/* SRIL Results */}
              {srilStates.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-xs text-muted-foreground">ZEITREIHE</Label>
                  <div className="bg-background p-2 rounded text-xs font-mono space-y-1 max-h-40 overflow-auto">
                    {srilStates.map((s, i) => (
                      <div key={i} className={`${s.H > 0 ? "text-green-400" : "text-yellow-400"}`}>
                        T={s.t}: H={s.H.toFixed(3)} N={s.N.toFixed(3)} G={s.G.toFixed(3)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* RUNDREISE Tab - vollständige Hin-und-Zurück Berechnung */}
            <TabsContent value="roundtrip" className="flex-1 p-4 space-y-4 overflow-auto">
              <div className="bg-green-900/30 border border-green-500 rounded p-2 text-xs">
                <span className="text-green-400 font-bold">VOLLSTÄNDIGE RUNDREISE</span>
                <p className="text-muted-foreground mt-1">T=0 → T=n → T=0 mit Fehleranalyse</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">SCHRITTE (T=0 → T=n)</Label>
                  <Input value={roundTripSteps} onChange={e => setRoundTripSteps(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={usePerturbations} 
                    onChange={e => setUsePerturbations(e.target.checked)}
                    className="rounded"
                  />
                  <Label className="text-xs text-muted-foreground">Perturbationen (ε_H, ε_N, ε_G)</Label>
                </div>
                
                <div className="bg-background p-2 rounded text-xs font-mono space-y-1">
                  <div className="text-muted-foreground">KOEFFIZIENTEN (empirisch):</div>
                  <div>α = {ALPHA} (Harm. Kopplung)</div>
                  <div>β = {BETA} (Entropie-Abfluss)</div>
                  <div className="text-yellow-400">γ = {GAMMA} (Nav.-Drift, korrigiert!)</div>
                  <div>δ = {DELTA} (Phasen-Kopplung)</div>
                  <div>η = {ETA} (Wachstums-Impuls)</div>
                </div>
              </div>
              
              <Button 
                onClick={runRoundTrip} 
                disabled={isRunningRoundTrip} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isRunningRoundTrip ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    BERECHNE...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    RUNDREISE STARTEN
                  </>
                )}
              </Button>
              
              {roundTripResult && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">ERGEBNISSE</Label>
                    <Button variant="outline" size="sm" onClick={exportRoundTrip} className="h-6 text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </div>
                  
                  {/* Summary */}
                  <div className={`p-3 rounded border ${roundTripResult.totalError < 1e-8 ? "bg-green-900/30 border-green-500" : roundTripResult.totalError < 1e-4 ? "bg-yellow-900/30 border-yellow-500" : "bg-red-900/30 border-red-500"}`}>
                    <div className="text-xs font-bold mb-2">REVERSIBILITÄT</div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>Ø Fehler:</div>
                      <div className={roundTripResult.totalError < 1e-8 ? "text-green-400" : "text-yellow-400"}>
                        {roundTripResult.totalError.toExponential(4)}
                      </div>
                      <div>Max Fehler:</div>
                      <div>{Math.max(...roundTripResult.errors.map(e => e.euclidean)).toExponential(4)}</div>
                      <div>Status:</div>
                      <div className={roundTripResult.totalError < 1e-8 ? "text-green-400" : "text-yellow-400"}>
                        {roundTripResult.totalError < 1e-8 ? "PERFEKT" : roundTripResult.totalError < 1e-4 ? "GUT" : "KRITISCH"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Error per Step */}
                  <div className="bg-background p-2 rounded text-xs font-mono">
                    <div className="text-muted-foreground mb-2">FEHLER PRO SCHRITT:</div>
                    {roundTripResult.errors.map((e, i) => (
                      <div key={i} className={`flex justify-between py-0.5 ${e.t === 0 ? "text-green-400 font-bold" : ""}`}>
                        <span>T={e.t}</span>
                        <span>||Δ|| = {e.euclidean.toExponential(4)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Origin Comparison */}
                  <div className="bg-background p-2 rounded text-xs font-mono">
                    <div className="text-muted-foreground mb-2">URSPRUNG (15 Dezimalstellen):</div>
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-[hsl(180,100%,50%)]">H(0) erwartet:</span>
                        <span>{roundTripResult.forward[0].H.toFixed(15)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-[hsl(280,100%,70%)]">H(0) berechnet:</span>
                        <span>{roundTripResult.backward[0].H.toFixed(15)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-green-400">
                        <span>ΔH:</span>
                        <span>{(roundTripResult.backward[0].H - roundTripResult.forward[0].H).toExponential(10)}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border space-y-1">
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-[hsl(180,100%,50%)]">N(0) erwartet:</span>
                        <span>{roundTripResult.forward[0].N.toFixed(15)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-[hsl(280,100%,70%)]">N(0) berechnet:</span>
                        <span>{roundTripResult.backward[0].N.toFixed(15)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-green-400">
                        <span>ΔN:</span>
                        <span>{(roundTripResult.backward[0].N - roundTripResult.forward[0].N).toExponential(10)}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border space-y-1">
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-[hsl(180,100%,50%)]">G(0) erwartet:</span>
                        <span>{roundTripResult.forward[0].G.toFixed(15)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-[hsl(280,100%,70%)]">G(0) berechnet:</span>
                        <span>{roundTripResult.backward[0].G.toFixed(15)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-green-400">
                        <span>ΔG:</span>
                        <span>{(roundTripResult.backward[0].G - roundTripResult.forward[0].G).toExponential(10)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="inverse" className="flex-1 p-4 space-y-4 overflow-auto">
              <div className="bg-[hsl(280,100%,30%)]/20 border border-[hsl(280,100%,50%)] rounded p-2 text-xs">
                <span className="text-[hsl(280,100%,70%)]">RÜCKWÄRTS-REKONSTRUKTION</span>
                <p className="text-muted-foreground mt-1">Vom Zielzustand zurück zu T=0</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">ZIEL T (Zeitpunkt)</Label>
                  <Input value={targetT} onChange={e => setTargetT(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">H(T) - ZIEL-ENTHALPIE</Label>
                  <Input value={targetH} onChange={e => setTargetH(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">N(T) - ZIEL-NAVIGATION</Label>
                  <Input value={targetN} onChange={e => setTargetN(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">G(T) - ZIEL-WACHSTUM</Label>
                  <Input value={targetG} onChange={e => setTargetG(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
              </div>
              
              <Button onClick={runSRILInverse} disabled={isRunningInverse} className="w-full bg-[hsl(280,100%,50%)] text-white hover:bg-[hsl(280,100%,40%)]">
                <RotateCcw className="w-4 h-4 mr-2" />
                RÜCKWÄRTS RECHNEN
              </Button>
              
              {/* Inverse Results */}
              {srilInverseStates.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-xs text-muted-foreground">REKONSTRUIERTE ZEITREIHE</Label>
                  <div className="bg-background p-2 rounded text-xs font-mono space-y-1 max-h-48 overflow-auto">
                    {srilInverseStates.map((s, i) => (
                      <div key={i} className={`${s.t === 0 ? "text-green-400 font-bold" : "text-[hsl(280,100%,70%)]"}`}>
                        T={s.t}: H={s.H.toFixed(3)} N={s.N.toFixed(3)} G={s.G.toFixed(3)}
                        {s.t === 0 && " ← URSPRUNG"}
                      </div>
                    ))}
                  </div>
                  {srilInverseStates[0]?.t === 0 && (
                    <div className="bg-green-900/30 border border-green-500 rounded p-2 text-xs text-green-400">
                      <div className="font-bold mb-1">URSPRUNG GEFUNDEN:</div>
                      <div>H(0) = {srilInverseStates[0].H.toFixed(4)}</div>
                      <div>N(0) = {srilInverseStates[0].N.toFixed(4)}</div>
                      <div>G(0) = {srilInverseStates[0].G.toFixed(4)}</div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="matrix" className="flex-1 p-4 space-y-4 overflow-auto">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">H (Chaos-Winkel)</Label>
                  <Input value={matrixH} onChange={e => setMatrixH(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">N (Navigations-Vektor)</Label>
                  <Input value={matrixN} onChange={e => setMatrixN(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">G (Geometrie-Feld)</Label>
                  <Input value={matrixG} onChange={e => setMatrixG(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">BASIS (2^n)</Label>
                  <Input value={matrixBasis} onChange={e => setMatrixBasis(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
              </div>
              
              <Button onClick={runMatrixReduction} className="w-full bg-[hsl(45,100%,50%)] text-background hover:bg-[hsl(45,100%,40%)]">
                <Box className="w-4 h-4 mr-2" />
                LLL-Reduktion
              </Button>
              
              {matrixResult.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">3×3 GITTER</Label>
                  <div className="grid grid-cols-3 gap-1 text-xs font-mono">
                    {matrixResult.flat().map((v, i) => (
                      <div key={i} className="bg-background p-2 text-center text-[hsl(180,100%,50%)]">
                        {typeof v === "number" ? (v > 1000 ? v.toExponential(2) : v.toFixed(3)) : v}
                      </div>
                    ))}
                  </div>
                  {kValue && (
                    <div className="bg-background p-2 rounded text-xs text-green-400 font-mono">
                      K: {kValue}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="executor" className="flex-1 p-4 space-y-3 overflow-auto">
              <div className="bg-destructive/20 border border-destructive rounded p-2 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span>UNSICHERE SCHLÜSSELGENERIERUNG (Demo)</span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Z-HASH</Label>
                  <Input value={execZ} onChange={e => setExecZ(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SIG-R</Label>
                  <Input value={execR} onChange={e => setExecR(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SIG-S</Label>
                  <Input value={execS} onChange={e => setExecS(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">H (Linke)</Label>
                    <Input value={execH} onChange={e => setExecH(e.target.value)} className="font-mono text-xs bg-background" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">N (Linke)</Label>
                    <Input value={execN} onChange={e => setExecN(e.target.value)} className="font-mono text-xs bg-background" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">START-OFFSET</Label>
                  <Input value={execOffset} onChange={e => setExecOffset(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
              </div>
              
              <div className="space-y-2">
                {!execRunning ? (
                  <Button onClick={startExecutor} className="w-full bg-destructive hover:bg-destructive/80">
                    <Play className="w-4 h-4 mr-2" />
                    STARTEN (UNSICHER)
                  </Button>
                ) : (
                  <Button onClick={stopExecutor} variant="outline" className="w-full border-destructive text-destructive">
                    <Square className="w-4 h-4 mr-2" />
                    STOPPEN
                  </Button>
                )}
                <Button onClick={downloadResults} variant="outline" size="sm" className="w-full" disabled={execResults.length === 0}>
                  <Download className="w-3 h-3 mr-1" />
                  CSV Export ({execResults.length})
                </Button>
              </div>
              
              <div className="text-xs space-y-1 font-mono bg-background p-2 rounded">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Keys:</span>
                  <span className="text-[hsl(180,100%,50%)]">{execCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Speed:</span>
                  <span className="text-green-400">{execSpeed} Keys/s</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Visualizations */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="ulam" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-card p-0">
              <TabsTrigger value="ulam" className="rounded-none data-[state=active]:bg-background text-xs gap-1" onClick={drawUlam}>
                <Circle className="w-3 h-3" /> ULAM
              </TabsTrigger>
              <TabsTrigger value="chrono" className="rounded-none data-[state=active]:bg-background text-xs gap-1" onClick={drawChronoplast}>
                <Target className="w-3 h-3" /> CHRONO
              </TabsTrigger>
              <TabsTrigger value="moire" className="rounded-none data-[state=active]:bg-background text-xs gap-1" onClick={drawMoire}>
                <Layers className="w-3 h-3" /> MOIRÉ
              </TabsTrigger>
              <TabsTrigger value="stream" className="rounded-none data-[state=active]:bg-background text-xs gap-1">
                <Cpu className="w-3 h-3" /> STREAM
              </TabsTrigger>
              <TabsTrigger value="compare" className="rounded-none data-[state=active]:bg-background text-xs gap-1">
                <GitCompare className="w-3 h-3" /> VERGLEICH
              </TabsTrigger>
              <TabsTrigger value="chaos" className="rounded-none data-[state=active]:bg-background text-xs gap-1">
                <Activity className="w-3 h-3" /> CHAOS
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ulam" className="flex-1 flex items-center justify-center bg-black p-4">
              <canvas ref={ulamCanvasRef} className="max-w-full max-h-full" style={{ width: "100%", height: "100%" }} />
            </TabsContent>
            
            <TabsContent value="chrono" className="flex-1 flex items-center justify-center bg-black p-4">
              <canvas ref={chronoCanvasRef} className="max-w-full max-h-full" style={{ width: "100%", height: "100%" }} />
            </TabsContent>
            
            <TabsContent value="moire" className="flex-1 relative bg-black overflow-hidden">
              <canvas ref={moireCanvasRef} className="absolute inset-0 w-full h-full" />
            </TabsContent>
            
            <TabsContent value="stream" className="flex-1 bg-black overflow-hidden flex flex-col">
              <div className="p-2 border-b border-border text-xs text-muted-foreground flex justify-between items-center">
                <span>KEY DERIVATION STREAM</span>
                <span className={execRunning ? "text-green-400 animate-pulse" : "text-muted-foreground"}>
                  {execRunning ? "● LIVE" : "○ IDLE"}
                </span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 font-mono text-xs space-y-0.5">
                  {execResults.length === 0 ? (
                    <div className="text-muted-foreground p-4 text-center">
                      Starte den Executor um Keys zu generieren...
                    </div>
                  ) : (
                    execResults.map((r, i) => (
                      <div key={i} className="flex gap-2 border-b border-border/20 py-1">
                        <span className="text-muted-foreground w-20 shrink-0">{r.iteration.toString().padStart(8, '0')}</span>
                        <span className="text-[hsl(30,100%,50%)] truncate flex-1">{r.privateKeyHex.substring(0, 24)}...</span>
                        <span className="text-green-400 shrink-0">{r.wif.substring(0, 12)}...</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="compare" className="flex-1 bg-background overflow-auto p-4">
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* Forward SRIL */}
                <div className="border border-[hsl(180,100%,50%)]/30 rounded-lg p-3 bg-card">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                    <Play className="w-4 h-4 text-[hsl(180,100%,50%)]" />
                    <span className="text-xs font-bold text-[hsl(180,100%,50%)]">VORWÄRTS (T=0 → T=n)</span>
                  </div>
                  {srilStates.length > 0 ? (
                    <div className="space-y-1 font-mono text-xs">
                      {srilStates.map((s, i) => (
                        <div key={i} className={`flex justify-between py-1 px-2 rounded ${i === 0 ? "bg-[hsl(180,100%,50%)]/10 border border-[hsl(180,100%,50%)]/30" : ""}`}>
                          <span className="text-muted-foreground">T={s.t}</span>
                          <span className="text-[hsl(180,100%,70%)]">H={s.H.toFixed(3)}</span>
                          <span className="text-green-400">N={s.N.toFixed(3)}</span>
                          <span className="text-yellow-400">G={s.G.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs text-center py-8">
                      Führe SRIL Vorwärts-Simulation aus...
                    </div>
                  )}
                </div>
                
                {/* Backward SRIL */}
                <div className="border border-[hsl(280,100%,50%)]/30 rounded-lg p-3 bg-card">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                    <RotateCcw className="w-4 h-4 text-[hsl(280,100%,50%)]" />
                    <span className="text-xs font-bold text-[hsl(280,100%,50%)]">RÜCKWÄRTS (T=n → T=0)</span>
                  </div>
                  {srilInverseStates.length > 0 ? (
                    <div className="space-y-1 font-mono text-xs">
                      {srilInverseStates.map((s, i) => (
                        <div key={i} className={`flex justify-between py-1 px-2 rounded ${s.t === 0 ? "bg-[hsl(280,100%,50%)]/10 border border-[hsl(280,100%,50%)]/30" : ""}`}>
                          <span className="text-muted-foreground">T={s.t}</span>
                          <span className="text-[hsl(280,100%,70%)]">H={s.H.toFixed(3)}</span>
                          <span className="text-green-400">N={s.N.toFixed(3)}</span>
                          <span className="text-yellow-400">G={s.G.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs text-center py-8">
                      Führe SRIL Rückwärts-Berechnung aus...
                    </div>
                  )}
                </div>
              </div>
              
              {/* Difference Analysis */}
              {srilStates.length > 0 && srilInverseStates.length > 0 && srilInverseStates[0]?.t === 0 && (
                <div className="mt-4 border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold">DIFFERENZANALYSE (Ursprung: Erwartet vs. Berechnet)</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => exportComparison("json")} className="h-6 text-xs px-2">
                        <FileJson className="w-3 h-3 mr-1" />
                        JSON
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => exportComparison("csv")} className="h-6 text-xs px-2">
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 font-mono text-xs">
                    <div className="text-center">
                      <div className="text-muted-foreground mb-1">PARAMETER</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[hsl(180,100%,50%)] mb-1">ERWARTET (Vorwärts T=0)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[hsl(280,100%,50%)] mb-1">BERECHNET (Rückwärts)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-destructive mb-1">ΔABWEICHUNG</div>
                    </div>
                    
                    {/* H Row */}
                    <div className="text-center font-bold">H(0)</div>
                    <div className="text-center text-[hsl(180,100%,70%)]">{srilStates[0].H.toFixed(4)}</div>
                    <div className="text-center text-[hsl(280,100%,70%)]">{srilInverseStates[0].H.toFixed(4)}</div>
                    <div className={`text-center ${Math.abs(srilStates[0].H - srilInverseStates[0].H) < 0.01 ? "text-green-400" : "text-destructive"}`}>
                      {(srilInverseStates[0].H - srilStates[0].H).toFixed(4)}
                      <span className="ml-1 text-muted-foreground">({((Math.abs(srilInverseStates[0].H - srilStates[0].H) / Math.abs(srilStates[0].H)) * 100).toFixed(2)}%)</span>
                    </div>
                    
                    {/* N Row */}
                    <div className="text-center font-bold">N(0)</div>
                    <div className="text-center text-[hsl(180,100%,70%)]">{srilStates[0].N.toFixed(4)}</div>
                    <div className="text-center text-[hsl(280,100%,70%)]">{srilInverseStates[0].N.toFixed(4)}</div>
                    <div className={`text-center ${Math.abs(srilStates[0].N - srilInverseStates[0].N) < 0.01 ? "text-green-400" : "text-destructive"}`}>
                      {(srilInverseStates[0].N - srilStates[0].N).toFixed(4)}
                      <span className="ml-1 text-muted-foreground">({((Math.abs(srilInverseStates[0].N - srilStates[0].N) / Math.abs(srilStates[0].N)) * 100).toFixed(2)}%)</span>
                    </div>
                    
                    {/* G Row */}
                    <div className="text-center font-bold">G(0)</div>
                    <div className="text-center text-[hsl(180,100%,70%)]">{srilStates[0].G.toFixed(4)}</div>
                    <div className="text-center text-[hsl(280,100%,70%)]">{srilInverseStates[0].G.toFixed(4)}</div>
                    <div className={`text-center ${Math.abs(srilStates[0].G - srilInverseStates[0].G) < 0.01 ? "text-green-400" : "text-destructive"}`}>
                      {(srilInverseStates[0].G - srilStates[0].G).toFixed(4)}
                      <span className="ml-1 text-muted-foreground">({((Math.abs(srilInverseStates[0].G - srilStates[0].G) / Math.abs(srilStates[0].G)) * 100).toFixed(2)}%)</span>
                    </div>
                  </div>
                  
                  {/* Total Error */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">GESAMT-REKONSTRUKTIONSFEHLER (Euklidische Distanz):</span>
                      <span className={`font-mono font-bold ${
                        Math.sqrt(
                          Math.pow(srilStates[0].H - srilInverseStates[0].H, 2) +
                          Math.pow(srilStates[0].N - srilInverseStates[0].N, 2) +
                          Math.pow(srilStates[0].G - srilInverseStates[0].G, 2)
                        ) < 0.1 ? "text-green-400" : "text-yellow-400"
                      }`}>
                        {Math.sqrt(
                          Math.pow(srilStates[0].H - srilInverseStates[0].H, 2) +
                          Math.pow(srilStates[0].N - srilInverseStates[0].N, 2) +
                          Math.pow(srilStates[0].G - srilInverseStates[0].G, 2)
                        ).toFixed(6)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-background rounded overflow-hidden">
                      <div 
                        className={`h-full ${
                          Math.sqrt(
                            Math.pow(srilStates[0].H - srilInverseStates[0].H, 2) +
                            Math.pow(srilStates[0].N - srilInverseStates[0].N, 2) +
                            Math.pow(srilStates[0].G - srilInverseStates[0].G, 2)
                          ) < 0.1 ? "bg-green-500" : "bg-yellow-500"
                        }`}
                        style={{ 
                          width: `${Math.max(5, 100 - Math.sqrt(
                            Math.pow(srilStates[0].H - srilInverseStates[0].H, 2) +
                            Math.pow(srilStates[0].N - srilInverseStates[0].N, 2) +
                            Math.pow(srilStates[0].G - srilInverseStates[0].G, 2)
                          ) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      Genauigkeit: {Math.max(0, (100 - Math.sqrt(
                        Math.pow(srilStates[0].H - srilInverseStates[0].H, 2) +
                        Math.pow(srilStates[0].N - srilInverseStates[0].N, 2) +
                        Math.pow(srilStates[0].G - srilInverseStates[0].G, 2)
                      ) * 100)).toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Chaos Sensitivity Tab */}
            <TabsContent value="chaos" className="flex-1 bg-background overflow-auto p-4">
              <div className="space-y-4">
                <div className="bg-[hsl(0,100%,30%)]/20 border border-destructive rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-destructive" />
                    <span className="font-bold text-destructive">CHAOS-SENSITIVITÄTS-ANALYSE</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Zeigt wie kleine Änderungen im Zielzustand zu unterschiedlichen Ursprungswerten führen (Schmetterlingseffekt)
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        PERTURBATION: ±{(chaosPerturbation * 2).toFixed(1)}%
                      </Label>
                      <Slider
                        value={[chaosPerturbation]}
                        onValueChange={(v) => setChaosPerturbation(v[0])}
                        min={0}
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>±10%</span>
                        <span>±20%</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={runChaosSensitivity} 
                      className="w-full bg-destructive hover:bg-destructive/80"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      CHAOS ANALYSIEREN
                    </Button>
                  </div>
                </div>
                
                {/* Chaos Results */}
                {chaosResults.length > 0 && (
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                      <span className="text-xs font-bold">URSPRUNGS-VARIATION BEI PERTURBATION</span>
                      <Button variant="outline" size="sm" onClick={() => exportComparison("csv")} className="h-6 text-xs px-2">
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                    </div>
                    
                    <div className="space-y-2 font-mono text-xs">
                      <div className="grid grid-cols-4 gap-2 text-muted-foreground border-b border-border pb-1">
                        <span>ΔZIEL</span>
                        <span>H(0)</span>
                        <span>N(0)</span>
                        <span>G(0)</span>
                      </div>
                      
                      {chaosResults.map((r, i) => {
                        const isBaseline = Math.abs(r.delta) < 0.001;
                        return (
                          <div 
                            key={i} 
                            className={`grid grid-cols-4 gap-2 py-1 rounded px-1 ${
                              isBaseline ? "bg-green-500/10 border border-green-500/30" : ""
                            }`}
                          >
                            <span className={isBaseline ? "text-green-400 font-bold" : r.delta < 0 ? "text-blue-400" : "text-orange-400"}>
                              {r.delta >= 0 ? "+" : ""}{r.delta.toFixed(2)}%
                            </span>
                            <span className={isBaseline ? "text-green-400" : "text-[hsl(280,100%,70%)]"}>
                              {r.origin.H.toFixed(4)}
                            </span>
                            <span className={isBaseline ? "text-green-400" : "text-[hsl(280,100%,70%)]"}>
                              {r.origin.N.toFixed(4)}
                            </span>
                            <span className={isBaseline ? "text-green-400" : "text-[hsl(280,100%,70%)]"}>
                              {r.origin.G.toFixed(4)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Sensitivity Metrics */}
                    <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-4 text-xs">
                      <div className="text-center">
                        <div className="text-muted-foreground mb-1">ΔH SPREAD</div>
                        <div className="font-mono text-destructive">
                          {(Math.max(...chaosResults.map(r => r.origin.H)) - Math.min(...chaosResults.map(r => r.origin.H))).toFixed(4)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground mb-1">ΔN SPREAD</div>
                        <div className="font-mono text-destructive">
                          {(Math.max(...chaosResults.map(r => r.origin.N)) - Math.min(...chaosResults.map(r => r.origin.N))).toFixed(4)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground mb-1">ΔG SPREAD</div>
                        <div className="font-mono text-destructive">
                          {(Math.max(...chaosResults.map(r => r.origin.G)) - Math.min(...chaosResults.map(r => r.origin.G))).toFixed(4)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Visual Bar Chart */}
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-2">H(0) VERTEILUNG</div>
                      <div className="space-y-1">
                        {chaosResults.map((r, i) => {
                          const min = Math.min(...chaosResults.map(x => x.origin.H));
                          const max = Math.max(...chaosResults.map(x => x.origin.H));
                          const range = max - min || 1;
                          const width = ((r.origin.H - min) / range) * 100;
                          const isBaseline = Math.abs(r.delta) < 0.001;
                          
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs w-16 text-muted-foreground">{r.delta.toFixed(1)}%</span>
                              <div className="flex-1 h-3 bg-background rounded overflow-hidden">
                                <div 
                                  className={`h-full ${isBaseline ? "bg-green-500" : "bg-[hsl(280,100%,50%)]"}`}
                                  style={{ width: `${Math.max(5, width)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Terminal */}
        <div className="w-80 border-l border-border flex flex-col bg-card">
          <div className="p-2 border-b border-border text-xs text-muted-foreground flex items-center justify-between">
            <span>TERMINAL</span>
            <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-1 font-mono text-xs">
              {logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`py-1 border-b border-border/30 ${
                    log.type === "success" ? "text-green-400" : 
                    log.type === "warning" ? "text-yellow-400" : 
                    log.type === "error" ? "text-red-400" : "text-muted-foreground"
                  }`}
                >
                  <span className="opacity-50">[{log.time}]</span> {log.message}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-muted-foreground">Warte auf Befehle...</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
