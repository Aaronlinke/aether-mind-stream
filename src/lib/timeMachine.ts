/**
 * UNIVERSELLER RÜCKWÄRTSRECHNER - Mathematische Zeitmaschine
 * Mathematische Utilities für inverse Berechnungen
 */

// mathjs entfernt — alle verwendeten Funktionen sind native JS

// Physikalische Konstanten
export const CONSTANTS = {
  G: 6.67430e-11,        // Gravitationskonstante [m³/(kg·s²)]
  HBAR: 1.054571817e-34, // Reduziertes Planck'sches Wirkungsquantum [J·s]
  KB: 1.380649e-23,      // Boltzmann-Konstante [J/K]
  SIGMA: 5.670374419e-8, // Stefan-Boltzmann-Konstante [W/(m²·K⁴)]
  C: 299792458,          // Lichtgeschwindigkeit [m/s]
  H0: 70.0,              // Hubble-Parameter heute [km/s/Mpc]
  T_CMB: 2.725,          // Kosmische Hintergrundstrahlung [K]
  GOLDEN_RATIO: 1.618033988749895,
  PLANCK_TIME: 5.391e-44, // [s]
  PLANCK_TEMP: 1.417e32,  // [K]
};

// ==================== PERSÖNLICHE SIGNATUR ====================

export interface PersonalSignature {
  goldenRatio: number;
  personalPi: number;
  chaosConstant: number;
  symmetryFactor: number;
  fractalDimension: number;
  timecrystal: number;
  superposition: { re: number; im: number };
  entropyValue: number;
}

/**
 * Berechnet eine einzigartige mathematische Signatur aus einem Namen
 */
export function calculatePersonalSignature(name: string): PersonalSignature {
  // Einfacher Hash-Algorithmus (ähnlich wie djb2)
  let hash1 = 5381;
  let hash2 = 0;
  let hash3 = 1;
  
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + char;
    hash2 = hash2 * 31 + char;
    hash3 = (hash3 * 37 + char) % 1000000;
  }
  
  // Normalisierung auf [0, 1]
  const chaos = Math.abs(hash1 % 1000000) / 999999;
  const symmetry = Math.sin((Math.abs(hash2) % 360) * Math.PI / 180);
  const fractalDim = 2 + (Math.abs(hash1) % 1000) / 10000;
  
  // Monte-Carlo Pi-Berechnung mit persönlichem Seed
  const personalPi = calculatePersonalPi(Math.abs(hash1) % 2**31);
  
  // Zeitkristall (aktuelle Mikrosekunde)
  const timecrystal = (Date.now() % 1000000) / 1000000;
  
  // Entropie des Namens
  const entropyValue = calculateTextEntropy(name);
  
  // Quanten-ähnliche Überlagerung
  const phase = chaos * Math.PI;
  const superposition = {
    re: Math.cos(phase),
    im: Math.sin(phase)
  };
  
  return {
    goldenRatio: CONSTANTS.GOLDEN_RATIO,
    personalPi,
    chaosConstant: chaos,
    symmetryFactor: symmetry,
    fractalDimension: fractalDim,
    timecrystal,
    superposition,
    entropyValue
  };
}

/**
 * Monte-Carlo Berechnung für personalisiertes π
 */
export function calculatePersonalPi(seed: number): number {
  // Seeded random number generator
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  
  const points = 100000;
  let inCircle = 0;
  
  for (let i = 0; i < points; i++) {
    const x = random() * 2 - 1;
    const y = random() * 2 - 1;
    if (x * x + y * y <= 1) {
      inCircle++;
    }
  }
  
  return 4 * inCircle / points;
}

/**
 * Berechnet Informationsentropie eines Textes (Shannon-Entropie)
 */
export function calculateTextEntropy(text: string): number {
  if (!text || text.length === 0) return 0;
  
  const freq: { [key: string]: number } = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  const total = text.length;
  let entropy = 0;
  
  for (const count of Object.values(freq)) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// ==================== ALGORITHMEN-RÜCKRECHNUNG (H, N, G System) ====================

export interface AlgorithmState {
  H: number; // Hauptalgorithmus
  N: number; // Nebenalgorithmus
  G: number; // Gegenalgorithmus
  t: number; // Zeitschritt
}

export interface BackwardCalculationStep {
  t: number;
  H: number;
  N: number;
  G: number;
  equation: string;
  explanation: string;
}

/**
 * Rückwärtsrechnung für das H-N-G Algorithmen-System
 * 
 * Vorwärts:
 * H(t+1) = H(t) + N(t) + G(t)
 * N(t+1) = H(t) - N(t)
 * G(t+1) = 2*G(t) - H(t)
 * 
 * Rückwärts:
 * Wir müssen das System invertieren
 */
export function calculateBackward(
  endState: { H: number; N: number; G: number },
  endTime: number
): BackwardCalculationStep[] {
  const steps: BackwardCalculationStep[] = [];
  
  // Startpunkt (Endzustand)
  let H = endState.H;
  let N = endState.N;
  let G = endState.G;
  
  steps.push({
    t: endTime,
    H, N, G,
    equation: `H(${endTime}) = ${H}, N(${endTime}) = ${N}, G(${endTime}) = ${G}`,
    explanation: 'Endzustand (gegeben)'
  });
  
  // Rückwärtsrechnung
  for (let t = endTime - 1; t >= 0; t--) {
    // Vorwärts: H(t+1) = H(t) + N(t) + G(t)
    // Vorwärts: N(t+1) = H(t) - N(t)
    // Vorwärts: G(t+1) = 2*G(t) - H(t)
    
    // Aus N(t+1) = H(t) - N(t) → N(t) = H(t) - N(t+1)
    // Aus G(t+1) = 2*G(t) - H(t) → G(t) = (G(t+1) + H(t)) / 2
    // Aus H(t+1) = H(t) + N(t) + G(t) → H(t) = H(t+1) - N(t) - G(t)
    
    // Das System ist gekoppelt, wir lösen es:
    // N(t) = H(t) - N(t+1)
    // G(t) = (G(t+1) + H(t)) / 2
    // H(t+1) = H(t) + (H(t) - N(t+1)) + (G(t+1) + H(t)) / 2
    // H(t+1) = H(t) + H(t) - N(t+1) + G(t+1)/2 + H(t)/2
    // H(t+1) = 2.5 * H(t) - N(t+1) + G(t+1)/2
    // H(t) = (H(t+1) + N(t+1) - G(t+1)/2) / 2.5
    
    const H_curr = steps[steps.length - 1].H;
    const N_curr = steps[steps.length - 1].N;
    const G_curr = steps[steps.length - 1].G;
    
    // Löse für H(t)
    const H_prev = (H_curr + N_curr - G_curr / 2) / 2.5;
    const N_prev = H_prev - N_curr;
    const G_prev = (G_curr + H_prev) / 2;
    
    H = H_prev;
    N = N_prev;
    G = G_prev;
    
    steps.push({
      t,
      H: Math.round(H * 1000) / 1000,
      N: Math.round(N * 1000) / 1000,
      G: Math.round(G * 1000) / 1000,
      equation: `H(${t}) = (${H_curr.toFixed(2)} + ${N_curr.toFixed(2)} - ${G_curr.toFixed(2)}/2) / 2.5 = ${H.toFixed(3)}`,
      explanation: `Rückrechnung von t=${t+1} auf t=${t}`
    });
  }
  
  return steps.reverse();
}

/**
 * Vorwärtsrechnung zur Verifikation
 */
export function calculateForward(
  startState: { H: number; N: number; G: number },
  steps: number
): AlgorithmState[] {
  const states: AlgorithmState[] = [];
  
  let H = startState.H;
  let N = startState.N;
  let G = startState.G;
  
  states.push({ H, N, G, t: 0 });
  
  for (let t = 0; t < steps; t++) {
    const H_new = H + N + G;
    const N_new = H - N;
    const G_new = 2 * G - H;
    
    H = H_new;
    N = N_new;
    G = G_new;
    
    states.push({ H, N, G, t: t + 1 });
  }
  
  return states;
}

// ==================== KOSMOLOGIE RÜCKRECHNUNG ====================

export interface CosmologyParameters {
  H0: number;       // Hubble-Parameter heute [km/s/Mpc]
  Omega_m: number;  // Materiedichte
  Omega_lambda: number; // Dunkle Energie
  T0: number;       // Temperatur heute [K]
}

export interface CosmologyDataPoint {
  z: number;           // Rotverschiebung
  time_years: number;  // Zeit seit heute
  temperature_K: number;
  scale_factor: number;
  hubble: number;
  density: number;
}

export type CosmologyModel = 'LambdaCDM' | 'MaterieDominiert' | 'StrahlungsDominiert' | 'Persoenlich';

/**
 * Berechnet kosmologische Parameter rückwärts in der Zeit
 */
export function calculateCosmologyBackward(
  params: CosmologyParameters,
  model: CosmologyModel = 'LambdaCDM',
  personalSignature?: PersonalSignature
): CosmologyDataPoint[] {
  const { H0, Omega_m, Omega_lambda, T0 } = params;
  const dataPoints: CosmologyDataPoint[] = [];
  
  // Rotverschiebungen von heute bis zur Rekombination
  const redshifts = Array.from({ length: 100 }, (_, i) => 
    Math.pow(10, -4 + (i * (Math.log10(1100) + 4) / 99))
  );
  
  for (const z of redshifts) {
    let hubble: number;
    let density: number;
    
    switch (model) {
      case 'LambdaCDM':
        hubble = H0 * Math.sqrt(Omega_m * Math.pow(1 + z, 3) + Omega_lambda);
        density = Omega_m * 9.47e-27 / Math.pow(1 / (1 + z), 3);
        break;
        
      case 'MaterieDominiert':
        hubble = H0 * Math.pow(1 + z, 1.5);
        density = 9.47e-27 * Math.pow(1 + z, 3);
        break;
        
      case 'StrahlungsDominiert':
        hubble = H0 * Math.pow(1 + z, 2);
        density = 9.47e-27 * Math.pow(1 + z, 4);
        break;
        
      case 'Persoenlich':
        const chaos = personalSignature?.chaosConstant || 0.5;
        const fractalDim = personalSignature?.fractalDimension || 2.5;
        hubble = H0 * Math.pow(1 + z, 1.5 * fractalDim / 2.5) * (1 + 0.1 * Math.sin(chaos * z));
        density = 9.47e-27 * Math.pow(1 + z, 3) * (1 + chaos * 0.1);
        break;
        
      default:
        hubble = H0;
        density = 9.47e-27;
    }
    
    // Zeit berechnen (vereinfachte Integration)
    const time_years = approximateCosmicTime(z, H0, Omega_m, Omega_lambda);
    
    dataPoints.push({
      z,
      time_years,
      temperature_K: T0 * (1 + z),
      scale_factor: 1 / (1 + z),
      hubble,
      density
    });
  }
  
  return dataPoints;
}

/**
 * Approximiert die kosmische Zeit zu einer gegebenen Rotverschiebung
 */
function approximateCosmicTime(z: number, H0: number, Omega_m: number, Omega_lambda: number): number {
  // Vereinfachte Formel für Lambda-CDM
  // t ≈ (2/3H0) * asinh(sqrt(Omega_lambda/Omega_m) * (1+z)^(-3/2)) / sqrt(Omega_lambda)
  const H0_per_year = H0 * 1.023e-12; // km/s/Mpc zu 1/Jahr
  
  const x = Math.sqrt(Omega_lambda / Omega_m) / Math.pow(1 + z, 1.5);
  const time = (2 / (3 * H0_per_year)) * Math.asinh(x) / Math.sqrt(Omega_lambda);
  
  return Math.abs(time);
}

// ==================== FRAKTALE MATHEMATIK ====================

export interface MandelbrotResult {
  c: { re: number; im: number };
  iterations: number;
  escaped: boolean;
  finalZ: { re: number; im: number };
}

/**
 * Berechnet Mandelbrot-Iteration für einen Punkt
 */
export function mandelbrotIteration(
  c_re: number,
  c_im: number,
  maxIterations: number = 100
): MandelbrotResult {
  let z_re = 0;
  let z_im = 0;
  let iterations = 0;
  
  while (iterations < maxIterations) {
    const z_re_new = z_re * z_re - z_im * z_im + c_re;
    const z_im_new = 2 * z_re * z_im + c_im;
    z_re = z_re_new;
    z_im = z_im_new;
    
    if (z_re * z_re + z_im * z_im > 4) {
      return {
        c: { re: c_re, im: c_im },
        iterations,
        escaped: true,
        finalZ: { re: z_re, im: z_im }
      };
    }
    
    iterations++;
  }
  
  return {
    c: { re: c_re, im: c_im },
    iterations,
    escaped: false,
    finalZ: { re: z_re, im: z_im }
  };
}

/**
 * Berechnet Lyapunov-Exponent für Chaos-Analyse
 */
export function lyapunovExponent(
  f: (x: number) => number,
  df: (x: number) => number,
  x0: number,
  iterations: number = 1000
): number {
  let x = x0;
  let lyapunov = 0;
  
  for (let i = 0; i < iterations; i++) {
    const derivative = df(x);
    if (derivative === 0) break;
    lyapunov += Math.log(Math.abs(derivative));
    x = f(x);
  }
  
  return lyapunov / iterations;
}

// ==================== INVERSE MATHEMATIK ====================

/**
 * Allgemeine numerische Umkehrsuche
 */
export function solveInverse(
  f: (x: number) => number,
  targetValue: number,
  searchRange: [number, number] = [-10, 10],
  tolerance: number = 1e-10
): number[] {
  const solutions: number[] = [];
  const numStartPoints = 20;
  const step = (searchRange[1] - searchRange[0]) / numStartPoints;
  
  for (let i = 0; i <= numStartPoints; i++) {
    const start = searchRange[0] + i * step;
    
    // Newton-Raphson Iteration
    let x = start;
    for (let iter = 0; iter < 100; iter++) {
      const fx = f(x) - targetValue;
      
      if (Math.abs(fx) < tolerance) {
        // Prüfen ob Lösung schon gefunden
        const isNew = solutions.every(s => Math.abs(s - x) > 1e-6);
        if (isNew && x >= searchRange[0] && x <= searchRange[1]) {
          solutions.push(Math.round(x * 1e10) / 1e10);
        }
        break;
      }
      
      // Numerische Ableitung
      const h = 1e-8;
      const dfx = (f(x + h) - f(x - h)) / (2 * h);
      
      if (Math.abs(dfx) < 1e-15) break;
      
      x = x - fx / dfx;
    }
  }
  
  return solutions.sort((a, b) => a - b);
}

/**
 * Lambert W Funktion (Hauptzweig)
 * Löst: W(z) * e^W(z) = z
 */
export function lambertW(z: number, tolerance: number = 1e-12): number {
  if (z < -1/Math.E) return NaN;
  if (z === 0) return 0;
  
  // Startwert
  let w = z > 1 ? Math.log(z) - Math.log(Math.log(z)) : z;
  
  // Newton-Iteration
  for (let i = 0; i < 100; i++) {
    const ew = Math.exp(w);
    const wew = w * ew;
    const delta = (wew - z) / (ew + wew);
    w -= delta;
    
    if (Math.abs(delta) < tolerance) break;
  }
  
  return w;
}
