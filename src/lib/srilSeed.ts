// Aufgabe -> SRIL-Startvektor (H0, N0, G0).
//
// Bisher standen in allen SRIL-Modulen feste Zahlen (H0=-4.256, N0=5.824, G0=1.952).
// Das sind reine Referenz-Startwerte aus dem OmniGenesis-Protokoll, keine Messgrößen.
// Damit die "Knotenpunkte" sich nach der Aufgabe schalten, wird der Startvektor hier
// deterministisch aus dem Aufgabentext abgeleitet:
//
//   1. h = SHA-256(normalisierter Aufgabentext)            [berechnet]
//   2. drei disjunkte 52-bit-Fenster aus h -> u1,u2,u3 in [0,1)
//   3. affine Abbildung in die Arbeitsbereiche der SRIL-Rekursion
//   4. Schrittzahl t aus einem weiteren 16-bit-Fenster
//
// Eigenschaften: gleiche Aufgabe => gleicher Vektor (reproduzierbar, exportierbar),
// minimale Textänderung => völlig anderer Vektor (Avalanche der Hashfunktion).
// Das ist eine Parametrisierung, keine physikalische Aussage.

import { sha256Hex } from "./sha256";

export type SRILSeed = {
  H: number;
  N: number;
  G: number;
  steps: number;
  hash: string;
  /** Bereich-Definition, wie sie im UI/Export dokumentiert wird. */
  ranges: { H: [number, number]; N: [number, number]; G: [number, number] };
  /** Kurze Herleitung für Log/Export. */
  derivation: string[];
};

export const SRIL_RANGES = {
  H: [-8, 8] as [number, number],
  N: [0.5, 12] as [number, number],
  G: [0.1, 6] as [number, number],
};

/** Referenz-Startvektor des OmniGenesis-Protokolls (bleibt als Preset erhalten). */
export const SRIL_REFERENCE = { H: -4.256, N: 5.824, G: 1.952, steps: 8 };

function normalize(task: string): string {
  return task.trim().replace(/\s+/g, " ").toLowerCase();
}

/** 52-bit-Fenster (13 Hex-Zeichen) ab Position i -> u in [0,1). */
function window52(hex: string, i: number): number {
  const slice = hex.slice(i, i + 13);
  return parseInt(slice, 16) / 2 ** 52;
}

function map(u: number, [lo, hi]: [number, number], digits = 6): number {
  return parseFloat((lo + u * (hi - lo)).toFixed(digits));
}

export function deriveSRILSeed(task: string, opts?: { minSteps?: number; maxSteps?: number }): SRILSeed {
  const norm = normalize(task);
  const hash = sha256Hex(norm);

  const u1 = window52(hash, 0);
  const u2 = window52(hash, 13);
  const u3 = window52(hash, 26);
  const u4 = parseInt(hash.slice(52, 56), 16) / 65536;

  const minSteps = opts?.minSteps ?? 4;
  const maxSteps = opts?.maxSteps ?? 16;

  const H = map(u1, SRIL_RANGES.H);
  const N = map(u2, SRIL_RANGES.N);
  const G = map(u3, SRIL_RANGES.G);
  const steps = minSteps + Math.floor(u4 * (maxSteps - minSteps + 1));

  return {
    H,
    N,
    G,
    steps: Math.min(steps, maxSteps),
    hash,
    ranges: SRIL_RANGES,
    derivation: [
      `norm = "${norm.slice(0, 120)}${norm.length > 120 ? "…" : ""}"`,
      `h = SHA-256(norm) = ${hash}`,
      `u1 = h[0:13]/2^52 = ${u1.toFixed(12)}  ->  H0 = ${SRIL_RANGES.H[0]} + u1·${SRIL_RANGES.H[1] - SRIL_RANGES.H[0]} = ${H}`,
      `u2 = h[13:26]/2^52 = ${u2.toFixed(12)}  ->  N0 = ${SRIL_RANGES.N[0]} + u2·${SRIL_RANGES.N[1] - SRIL_RANGES.N[0]} = ${N}`,
      `u3 = h[26:39]/2^52 = ${u3.toFixed(12)}  ->  G0 = ${SRIL_RANGES.G[0]} + u3·${SRIL_RANGES.G[1] - SRIL_RANGES.G[0]} = ${G}`,
      `u4 = h[52:56]/2^16 = ${u4.toFixed(6)}  ->  t = ${minSteps} + ⌊u4·${maxSteps - minSteps + 1}⌋ = ${Math.min(steps, maxSteps)}`,
      `[berechnet] deterministische Parametrisierung, keine Messgröße`,
    ],
  };
}

/** Fertige Aufgaben-Presets, damit die Startwerte nicht "aus der Luft" kommen. */
export const SEED_PRESETS: { label: string; task: string }[] = [
  { label: "Referenz (Protokoll)", task: "__reference__" },
  { label: "secp256k1 d=3", task: "secp256k1 privater schlüssel d=3, Q = 3·G, WIF-Ableitung" },
  { label: "SHA-256 Preimage", task: "truncated SHA-256 preimage suche, 20 bit präfix" },
  { label: "Chaos / Lyapunov", task: "lyapunov-spektrum der SRIL-rekursion, bifurkationsdiagramm" },
  { label: "CRT / Modular", task: "chinesischer restsatz mit moduli 7, 11, 13" },
  { label: "Gitter / LLL", task: "gitterbasisreduktion, LLL, kürzester vektor" },
];

export function seedForPreset(task: string): SRILSeed | null {
  if (task === "__reference__") return null;
  return deriveSRILSeed(task);
}
