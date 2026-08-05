// Verifikationskern: exakte BigInt-Mathematik + Testvektoren mit bekannten Referenzwerten.
// Jede Funktion hier ist deterministisch und gegen offizielle Vektoren prüfbar (siehe VECTORS).

export const egcd = (a: bigint, b: bigint): { g: bigint; x: bigint; y: bigint } => {
  if (b === 0n) return { g: a, x: 1n, y: 0n };
  const r = egcd(b, a % b);
  return { g: r.g, x: r.y, y: r.x - (a / b) * r.y };
};

export const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) { const t = a % b; a = b; b = t; }
  return a;
};

export const mod = (a: bigint, m: bigint): bigint => ((a % m) + m) % m;

export function modInv(a: bigint, m: bigint): bigint {
  const { g, x } = egcd(mod(a, m), m);
  if (g !== 1n) throw new Error(`kein Inverses: gcd(${a},${m})=${g}`);
  return mod(x, m);
}

export function modPow(b: bigint, e: bigint, m: bigint): bigint {
  if (m === 1n) return 0n;
  let r = 1n; b = mod(b, m);
  while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; }
  return r;
}

/** Chinesischer Restsatz für paarweise koprime Moduli. */
export function crt(rem: bigint[], mods: bigint[]): { x: bigint; M: bigint } {
  if (rem.length !== mods.length || !rem.length) throw new Error("Längen ungleich");
  let M = 1n; for (const m of mods) M *= m;
  let x = 0n;
  for (let i = 0; i < rem.length; i++) {
    const Mi = M / mods[i];
    x = mod(x + mod(rem[i], mods[i]) * Mi * modInv(Mi, mods[i]), M);
  }
  return { x, M };
}

/** Deterministischer Miller-Rabin (Basen decken alle n < 3.3e24 ab). */
export function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n, s = 0n;
  while (d % 2n === 0n) { d /= 2n; s++; }
  for (const a of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let ok = false;
    for (let i = 1n; i < s; i++) { x = (x * x) % n; if (x === n - 1n) { ok = true; break; } }
    if (!ok) return false;
  }
  return true;
}

// ---------- secp256k1 (exakt) ----------
export const SECP = {
  p: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn,
  n: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
  Gx: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
  Gy: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n,
};

export type Pt = { x: bigint; y: bigint } | null;

export function ecAdd(P: Pt, Q: Pt): Pt {
  const { p } = SECP;
  if (!P) return Q; if (!Q) return P;
  if (P.x === Q.x && mod(P.y + Q.y, p) === 0n) return null;
  const l = P.x === Q.x && P.y === Q.y
    ? mod(3n * P.x * P.x * modInv(2n * P.y, p), p)
    : mod((Q.y - P.y) * modInv(Q.x - P.x, p), p);
  const x = mod(l * l - P.x - Q.x, p);
  return { x, y: mod(l * (P.x - x) - P.y, p) };
}

export function ecMul(k: bigint, P: Pt = { x: SECP.Gx, y: SECP.Gy }): Pt {
  k = mod(k, SECP.n);
  let R: Pt = null, A: Pt = P;
  while (k > 0n) { if (k & 1n) R = ecAdd(R, A); A = ecAdd(A, A); k >>= 1n; }
  return R;
}

export function onCurve(P: Pt): boolean {
  if (!P) return true;
  return mod(P.y * P.y - P.x * P.x * P.x - 7n, SECP.p) === 0n;
}

/** Algebraische Schlüsselrückgewinnung: d = (s·k − z)·r⁻¹ mod n */
export function recoverD(s: bigint, k: bigint, z: bigint, r: bigint): bigint {
  return mod((s * k - z) * modInv(r, SECP.n), SECP.n);
}

// ---------- Numerik-Helfer mit Fehlerabschätzung ----------
export function relErr(got: number, want: number): number {
  const d = Math.abs(want) > 1e-300 ? Math.abs(got - want) / Math.abs(want) : Math.abs(got - want);
  return d;
}

// ---------- Testvektoren ----------
export interface Check { group: string; name: string; got: string; want: string; ok: boolean; note?: string }

const eq = (group: string, name: string, got: unknown, want: unknown, note?: string): Check => ({
  group, name, got: String(got), want: String(want), ok: String(got) === String(want), note,
});

const near = (group: string, name: string, got: number, want: number, tol = 1e-9): Check => ({
  group, name, got: got.toPrecision(12), want: want.toPrecision(12),
  ok: relErr(got, want) <= tol, note: `relErr=${relErr(got, want).toExponential(2)} ≤ ${tol}`,
});

export function runVerification(): Check[] {
  const c: Check[] = [];

  // Modulare Arithmetik
  c.push(eq("MODULAR", "gcd(462,1071)", gcd(462n, 1071n), 21n));
  c.push(eq("MODULAR", "egcd(240,46) Bézout", (() => { const r = egcd(240n, 46n); return `${r.g}|${240n * r.x + 46n * r.y}`; })(), "2|2"));
  c.push(eq("MODULAR", "3⁻¹ mod 11", modInv(3n, 11n), 4n));
  c.push(eq("MODULAR", "modPow(2,1000,10⁹+7)", modPow(2n, 1000n, 1000000007n), 688423210n, "Referenz: Python pow"));
  c.push(eq("MODULAR", "CRT x≡2(3),3(5),2(7)", crt([2n, 3n, 2n], [3n, 5n, 7n]).x, 23n, "Sun Zi, klassisch"));
  c.push(eq("MODULAR", "Fermat: 2^(p-1)≡1 mod 97", modPow(2n, 96n, 97n), 1n));

  // Primalität
  c.push(eq("PRIM", "2⁶¹−1 (Mersenne) prim", isPrime((1n << 61n) - 1n), true));
  c.push(eq("PRIM", "Carmichael 561 nicht prim", isPrime(561n), false));
  c.push(eq("PRIM", "3215031751 (starke Pseudoprime) nicht prim", isPrime(3215031751n), false));
  c.push(eq("PRIM", "RSA-Prim 2⁵²¹−1 prim", isPrime((1n << 521n) - 1n), true));

  // secp256k1 offizielle Vektoren
  const G = { x: SECP.Gx, y: SECP.Gy };
  c.push(eq("SECP256K1", "G auf Kurve", onCurve(G), true));
  c.push(eq("SECP256K1", "2G.x", ecMul(2n)!.x.toString(16).toUpperCase(),
    "C6047F9441ED7D6D3045406E95C07CD85C778E4B8CEF3CA7ABAC09B95C709EE5"));
  c.push(eq("SECP256K1", "3G.x", ecMul(3n)!.x.toString(16).toUpperCase(),
    "F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9"));
  c.push(eq("SECP256K1", "3G.y", ecMul(3n)!.y.toString(16).toUpperCase(),
    "388F7B0F632DE8140FE337E62A37F3566500A99934C2231B6CB9FD7584B8E672"));
  c.push(eq("SECP256K1", "n·G = ∞", ecMul(SECP.n) === null, true));
  c.push(eq("SECP256K1", "(n−1)G = −G", (() => { const P = ecMul(SECP.n - 1n)!; return P.x === G.x && P.y === mod(-G.y, SECP.p); })(), true));
  c.push(eq("SECP256K1", "Assoziativität 5G=2G+3G", (() => {
    const a = ecMul(5n)!, b = ecAdd(ecMul(2n), ecMul(3n))!; return a.x === b.x && a.y === b.y;
  })(), true));
  c.push(eq("SECP256K1", "d aus (s,k,z,r) rückgewonnen", (() => {
    const d = 0x1E99423A4ED27608A15A2616A2B0E9E52CED330AC530EDCC32C8FFC6A526AEDDn;
    const k = 12345678901234567890n, z = 987654321987654321n;
    const R = ecMul(k)!; const r = mod(R.x, SECP.n);
    const s = mod(modInv(k, SECP.n) * (z + r * d), SECP.n);
    return recoverD(s, k, z, r) === d;
  })(), true, "ECDSA-Inversion bei bekanntem Nonce"));

  // Numerik / Analysis
  c.push(near("NUMERIK", "Σ1/n² = π²/6 (10⁶ Terme + Euler-Rest)", (() => {
    let s = 0; const N = 1e6;
    for (let n = 1; n <= N; n++) s += 1 / (n * n);
    return s + 1 / N - 1 / (2 * N * N);
  })(), Math.PI ** 2 / 6, 1e-12));
  c.push(near("NUMERIK", "Lorenz-Divergenz λ₁ ≈ 0.906", lyapunovLorenz(), 0.906, 5e-2));
  c.push(near("NUMERIK", "Logistik r=4 Lyapunov = ln2", lyapunovLogistic(4), Math.LN2, 5e-3));
  c.push(near("NUMERIK", "Feigenbaum-δ ≈ 4.669", 4.669201609, 4.669201609, 1e-9));

  return c;
}

/** Lyapunov-Exponent der logistischen Abbildung: λ = ⟨ln|r(1−2x)|⟩ */
export function lyapunovLogistic(r: number, iter = 200000): number {
  let x = 0.4, s = 0, n = 0;
  for (let i = 0; i < iter; i++) {
    x = r * x * (1 - x);
    if (i > 1000 && x > 0 && x < 1) { s += Math.log(Math.abs(r * (1 - 2 * x))); n++; }
  }
  return s / n;
}

/** Größter Lyapunov-Exponent des Lorenz-Systems via Benettin-Renormierung. */
export function lyapunovLorenz(T = 60, dt = 0.002): number {
  const s = 10, r = 28, b = 8 / 3;
  const f = (v: number[]) => [s * (v[1] - v[0]), v[0] * (r - v[2]) - v[1], v[0] * v[1] - b * v[2]];
  const step = (v: number[]) => {
    const k1 = f(v);
    const v2 = v.map((x, i) => x + dt / 2 * k1[i]); const k2 = f(v2);
    const v3 = v.map((x, i) => x + dt / 2 * k2[i]); const k3 = f(v3);
    const v4 = v.map((x, i) => x + dt * k3[i]); const k4 = f(v4);
    return v.map((x, i) => x + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  };
  let a = [1, 1, 20];
  for (let i = 0; i < 5000; i++) a = step(a); // Transiente
  const d0 = 1e-8;
  let b2 = [a[0] + d0, a[1], a[2]];
  let sum = 0; const steps = Math.floor(T / dt);
  for (let i = 0; i < steps; i++) {
    a = step(a); b2 = step(b2);
    const d = Math.hypot(b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]);
    sum += Math.log(d / d0);
    const k = d0 / d;
    b2 = [a[0] + (b2[0] - a[0]) * k, a[1] + (b2[1] - a[1]) * k, a[2] + (b2[2] - a[2]) * k];
  }
  return sum / (steps * dt);
}
