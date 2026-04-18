import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// ═══════════════════════════════════════════════════════════════════════════════
// MODULAR ARITHMETIC LAB
// GCD · Erweiterter Euklid · Modulare Inverse · CRT · Modulare Exponentiation
// Pollard-Rho Faktorisierung · Eulersche φ-Funktion · Fermat-Test
// ═══════════════════════════════════════════════════════════════════════════════

type Tab = "gcd" | "ext" | "inv" | "crt" | "pow" | "factor" | "phi" | "primality";

// BigInt helpers
function babs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

function gcd(a: bigint, b: bigint): bigint {
  a = babs(a); b = babs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function gcdSteps(a: bigint, b: bigint): { a: bigint; b: bigint; q: bigint; r: bigint }[] {
  const steps: { a: bigint; b: bigint; q: bigint; r: bigint }[] = [];
  a = babs(a); b = babs(b);
  while (b) {
    const q = a / b;
    const r = a % b;
    steps.push({ a, b, q, r });
    [a, b] = [b, r];
  }
  return steps;
}

// Extended Euclidean: returns [gcd, x, y] s.t. a*x + b*y = gcd
function extGcd(a: bigint, b: bigint): { g: bigint; x: bigint; y: bigint; steps: any[] } {
  const steps: any[] = [];
  let [oldR, r] = [a, b];
  let [oldS, s] = [1n, 0n];
  let [oldT, t] = [0n, 1n];
  while (r !== 0n) {
    const q = oldR / r;
    steps.push({ q, r: oldR, next: r, s: oldS, t: oldT });
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  return { g: oldR, x: oldS, y: oldT, steps };
}

function modInverse(a: bigint, m: bigint): bigint | null {
  const { g, x } = extGcd(((a % m) + m) % m, m);
  if (g !== 1n) return null;
  return ((x % m) + m) % m;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  base = ((base % mod) + mod) % mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

// CRT: solve x ≡ r_i (mod m_i)
function crt(rs: bigint[], ms: bigint[]): { x: bigint; M: bigint } | null {
  let M = 1n;
  for (const m of ms) M *= m;
  let x = 0n;
  for (let i = 0; i < rs.length; i++) {
    const Mi = M / ms[i];
    const yi = modInverse(Mi, ms[i]);
    if (yi === null) return null;
    x = (x + rs[i] * Mi * yi) % M;
  }
  return { x: ((x % M) + M) % M, M };
}

// Miller-Rabin primality test
function millerRabin(n: bigint, k = 20): boolean {
  if (n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n) return false;
  let d = n - 1n;
  let r = 0n;
  while (d % 2n === 0n) { d /= 2n; r++; }
  const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (let i = 0; i < Math.min(k, witnesses.length); i++) {
    const a = witnesses[i];
    if (a >= n) continue;
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let j = 0n; j < r - 1n; j++) {
      x = (x * x) % n;
      if (x === n - 1n) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}

// Pollard-Rho factorization
function pollardRho(n: bigint): bigint | null {
  if (n % 2n === 0n) return 2n;
  let x = 2n, y = 2n, c = 1n, d = 1n;
  const f = (x: bigint) => (x * x + c) % n;
  let attempts = 0;
  while (d === 1n && attempts < 100000) {
    x = f(x);
    y = f(f(y));
    d = gcd(babs(x - y), n);
    attempts++;
  }
  return d === n ? null : d;
}

function factorize(n: bigint): bigint[] {
  if (n <= 1n) return [];
  const factors: bigint[] = [];
  const stack = [n];
  while (stack.length) {
    const m = stack.pop()!;
    if (m === 1n) continue;
    if (millerRabin(m)) { factors.push(m); continue; }
    let d = pollardRho(m);
    if (d === null || d === m) {
      // trial fallback
      for (let i = 2n; i * i <= m; i++) {
        if (m % i === 0n) { d = i; break; }
      }
    }
    if (d === null || d === m) { factors.push(m); continue; }
    stack.push(d);
    stack.push(m / d);
  }
  return factors.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function eulerPhi(n: bigint): bigint {
  if (n === 1n) return 1n;
  const factors = factorize(n);
  const unique = Array.from(new Set(factors.map(String))).map(BigInt);
  let result = n;
  for (const p of unique) {
    result = result - result / p;
  }
  return result;
}

function tryParse(s: string): bigint | null {
  try {
    const t = s.trim();
    if (!t || !/^-?\d+$/.test(t)) return null;
    return BigInt(t);
  } catch { return null; }
}

export function ModularArithmetic() {
  const [tab, setTab] = useState<Tab>("gcd");

  // GCD / ExtGCD inputs
  const [a, setA] = useState("462");
  const [b, setB] = useState("1071");

  // Inverse
  const [invA, setInvA] = useState("17");
  const [invM, setInvM] = useState("3120");

  // CRT
  const [crtPairs, setCrtPairs] = useState<{ r: string; m: string }[]>([
    { r: "2", m: "3" }, { r: "3", m: "5" }, { r: "2", m: "7" },
  ]);

  // ModPow
  const [pBase, setPBase] = useState("2");
  const [pExp, setPExp] = useState("1000000");
  const [pMod, setPMod] = useState("1000000007");

  // Factorize / phi / primality
  const [nVal, setNVal] = useState("123456789");

  const tabs: { id: Tab; label: string }[] = [
    { id: "gcd", label: "GCD" },
    { id: "ext", label: "EXT-EUKLID" },
    { id: "inv", label: "INVERSE" },
    { id: "crt", label: "CRT" },
    { id: "pow", label: "MOD-POW" },
    { id: "factor", label: "FAKTOR" },
    { id: "phi", label: "φ(n)" },
    { id: "primality", label: "PRIM-TEST" },
  ];

  // Computations
  const gcdResult = useMemo(() => {
    const aa = tryParse(a), bb = tryParse(b);
    if (aa === null || bb === null) return null;
    return { steps: gcdSteps(aa, bb), g: gcd(aa, bb) };
  }, [a, b]);

  const extResult = useMemo(() => {
    const aa = tryParse(a), bb = tryParse(b);
    if (aa === null || bb === null || aa === 0n || bb === 0n) return null;
    return extGcd(aa, bb);
  }, [a, b]);

  const invResult = useMemo(() => {
    const aa = tryParse(invA), mm = tryParse(invM);
    if (aa === null || mm === null || mm <= 0n) return null;
    return modInverse(aa, mm);
  }, [invA, invM]);

  const crtResult = useMemo(() => {
    const rs: bigint[] = [], ms: bigint[] = [];
    for (const p of crtPairs) {
      const r = tryParse(p.r), m = tryParse(p.m);
      if (r === null || m === null || m <= 0n) return null;
      rs.push(r); ms.push(m);
    }
    if (rs.length === 0) return null;
    return crt(rs, ms);
  }, [crtPairs]);

  const powResult = useMemo(() => {
    const bb = tryParse(pBase), ee = tryParse(pExp), mm = tryParse(pMod);
    if (bb === null || ee === null || mm === null || mm <= 0n || ee < 0n) return null;
    return modPow(bb, ee, mm);
  }, [pBase, pExp, pMod]);

  const factorResult = useMemo(() => {
    const n = tryParse(nVal);
    if (n === null || n <= 1n || n > 10n ** 18n) return null;
    return factorize(n);
  }, [nVal]);

  const phiResult = useMemo(() => {
    const n = tryParse(nVal);
    if (n === null || n <= 0n || n > 10n ** 18n) return null;
    return eulerPhi(n);
  }, [nVal]);

  const primeResult = useMemo(() => {
    const n = tryParse(nVal);
    if (n === null || n < 0n) return null;
    return millerRabin(n);
  }, [nVal]);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">MODULARE ARITHMETIK</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          GCD · Ext-Euklid · Inverse · CRT · Mod-Pow · Faktorisierung · φ(n) · Miller-Rabin
        </p>
      </header>

      <div className="border-b border-border overflow-x-auto flex">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
              tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* GCD */}
          {tab === "gcd" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">a</div>
                  <Input value={a} onChange={(e) => setA(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">b</div>
                  <Input value={b} onChange={(e) => setB(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
              </div>
              {gcdResult && (
                <>
                  <div className="bg-muted p-2 rounded">
                    <div className="text-[9px] text-muted-foreground">Ergebnis</div>
                    <div className="text-sm font-mono font-bold">gcd({a}, {b}) = {gcdResult.g.toString()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] text-muted-foreground">Euklidische Schritte</div>
                    {gcdResult.steps.map((s, i) => (
                      <div key={i} className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded">
                        {s.a.toString()} = {s.q.toString()} · {s.b.toString()} + {s.r.toString()}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Extended Euclidean */}
          {tab === "ext" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">a</div>
                  <Input value={a} onChange={(e) => setA(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">b</div>
                  <Input value={b} onChange={(e) => setB(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
              </div>
              {extResult && (
                <>
                  <div className="bg-muted p-2 rounded space-y-1">
                    <div className="text-[9px] text-muted-foreground">Bézout-Identität</div>
                    <div className="text-xs font-mono break-all">
                      {a} · ({extResult.x.toString()}) + {b} · ({extResult.y.toString()}) = {extResult.g.toString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      gcd = {extResult.g.toString()} · x = {extResult.x.toString()} · y = {extResult.y.toString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] text-muted-foreground">Iterationsschritte (q · r · s · t)</div>
                    {extResult.steps.map((s, i) => (
                      <div key={i} className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded grid grid-cols-4 gap-1">
                        <span>q={s.q.toString()}</span>
                        <span>r={s.r.toString()}</span>
                        <span>s={s.s.toString()}</span>
                        <span>t={s.t.toString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Modular Inverse */}
          {tab === "inv" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">a</div>
                  <Input value={invA} onChange={(e) => setInvA(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">m</div>
                  <Input value={invM} onChange={(e) => setInvM(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-[9px] text-muted-foreground">Modulare Inverse</div>
                {invResult === null ? (
                  <div className="text-xs text-destructive font-mono">Keine Inverse · gcd(a,m) ≠ 1</div>
                ) : (
                  <div className="text-sm font-mono font-bold break-all">
                    {invA}⁻¹ ≡ {invResult.toString()} (mod {invM})
                  </div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Anwendung: RSA-Schlüsselgenerierung, Diffie-Hellman, ECC.
              </div>
            </div>
          )}

          {/* CRT */}
          {tab === "crt" && (
            <div className="space-y-3">
              <div className="text-[10px] text-muted-foreground">
                Löse x ≡ rᵢ (mod mᵢ) für paarweise teilerfremde mᵢ
              </div>
              <div className="space-y-2">
                {crtPairs.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <Input
                      value={p.r}
                      onChange={(e) => {
                        const c = [...crtPairs]; c[i] = { ...c[i], r: e.target.value }; setCrtPairs(c);
                      }}
                      placeholder="r"
                      className="h-8 text-xs font-mono"
                    />
                    <Input
                      value={p.m}
                      onChange={(e) => {
                        const c = [...crtPairs]; c[i] = { ...c[i], m: e.target.value }; setCrtPairs(c);
                      }}
                      placeholder="m"
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      size="sm" variant="outline"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setCrtPairs(crtPairs.filter((_, j) => j !== i))}
                      disabled={crtPairs.length <= 1}
                    >×</Button>
                  </div>
                ))}
              </div>
              <Button
                size="sm" variant="outline" className="text-[10px] h-7 w-full"
                onClick={() => setCrtPairs([...crtPairs, { r: "0", m: "2" }])}
              >+ Kongruenz</Button>
              <div className="bg-muted p-2 rounded">
                <div className="text-[9px] text-muted-foreground">Lösung</div>
                {crtResult === null ? (
                  <div className="text-xs text-destructive font-mono">Keine Lösung · Module nicht teilerfremd</div>
                ) : (
                  <div className="text-sm font-mono font-bold break-all">
                    x ≡ {crtResult.x.toString()} (mod {crtResult.M.toString()})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mod Pow */}
          {tab === "pow" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">Basis</div>
                  <Input value={pBase} onChange={(e) => setPBase(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">Exponent</div>
                  <Input value={pExp} onChange={(e) => setPExp(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground mb-1">Modul</div>
                  <Input value={pMod} onChange={(e) => setPMod(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-[9px] text-muted-foreground">Square-and-Multiply</div>
                {powResult === null ? (
                  <div className="text-xs text-destructive font-mono">Ungültige Eingabe</div>
                ) : (
                  <div className="text-sm font-mono font-bold break-all">
                    {pBase}^{pExp} ≡ {powResult.toString()} (mod {pMod})
                  </div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Kernoperation für RSA, DSA, Diffie-Hellman. O(log e) Multiplikationen.
              </div>
            </div>
          )}

          {/* Factorize */}
          {tab === "factor" && (
            <div className="space-y-3">
              <div>
                <div className="text-[9px] text-muted-foreground mb-1">n (max ~10¹⁸)</div>
                <Input value={nVal} onChange={(e) => setNVal(e.target.value)} className="h-8 text-xs font-mono" />
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-[9px] text-muted-foreground">Pollard-Rho Faktorisierung</div>
                {factorResult === null ? (
                  <div className="text-xs text-destructive font-mono">Ungültig oder zu groß</div>
                ) : (
                  <>
                    <div className="text-sm font-mono font-bold break-all">
                      {nVal} = {factorResult.map(String).join(" · ")}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Array.from(new Set(factorResult.map(String))).map((p) => {
                        const count = factorResult.filter((x) => x.toString() === p).length;
                        return (
                          <Badge key={p} variant="outline" className="text-[9px] font-mono">
                            {p}{count > 1 ? `^${count}` : ""}
                          </Badge>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Euler Phi */}
          {tab === "phi" && (
            <div className="space-y-3">
              <div>
                <div className="text-[9px] text-muted-foreground mb-1">n</div>
                <Input value={nVal} onChange={(e) => setNVal(e.target.value)} className="h-8 text-xs font-mono" />
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-[9px] text-muted-foreground">Eulersche φ-Funktion</div>
                {phiResult === null ? (
                  <div className="text-xs text-destructive font-mono">Ungültig</div>
                ) : (
                  <div className="text-sm font-mono font-bold break-all">
                    φ({nVal}) = {phiResult.toString()}
                  </div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Anzahl der zu n teilerfremden Zahlen in [1, n]. Grundlage des Satzes von Euler: a^φ(n) ≡ 1 (mod n).
              </div>
            </div>
          )}

          {/* Primality */}
          {tab === "primality" && (
            <div className="space-y-3">
              <div>
                <div className="text-[9px] text-muted-foreground mb-1">n</div>
                <Input value={nVal} onChange={(e) => setNVal(e.target.value)} className="h-8 text-xs font-mono" />
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-[9px] text-muted-foreground">Miller-Rabin Test</div>
                {primeResult === null ? (
                  <div className="text-xs text-destructive font-mono">Ungültig</div>
                ) : primeResult ? (
                  <div className="text-sm font-mono font-bold text-primary">{nVal} ist (wahrscheinlich) PRIM</div>
                ) : (
                  <div className="text-sm font-mono font-bold text-destructive">{nVal} ist ZUSAMMENGESETZT</div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Probabilistischer Primzahltest mit Zeugen 2, 3, 5, …, 37. Deterministisch für n &lt; 3.3 × 10²⁴.
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
