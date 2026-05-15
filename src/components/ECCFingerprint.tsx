import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// ─── ECC FINGERPRINT LAB ────────────────────────────────────────────────────
// Toy-Kurve E: y^2 = x^3 + 7 (mod 97), G=(1,28), Ordnung 79.
// Testet 3 Fingerprint-Kanäle gegen den Skalar k:
//  (1) HASH:    SHA-256(P) → 3x3 Matrix (Ziffer/10)
//  (2) RAW:     direkte Koordinaten-Matrix (P/p)
//  (3) LOKAL:   A(P_k, P_k+G, P_k-G)  ← der vorgeschlagene Multi-Punkt-Kanal
// Misst: Pearson(k, Spur/Det/λ_max), Nachbarschaftsabstand vs. Zufallsabstand.
// ────────────────────────────────────────────────────────────────────────────

const P = 97n;
const A_CURVE = 0n;
const B_CURVE = 7n;

function mod(a: bigint, m: bigint): bigint { const r = a % m; return r < 0n ? r + m : r; }
function modInv(a: bigint, m: bigint): bigint {
  let [old_r, r] = [mod(a, m), m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return mod(old_s, m);
}
type Pt = { x: bigint; y: bigint } | null;
function ptAdd(P1: Pt, P2: Pt): Pt {
  if (!P1) return P2; if (!P2) return P1;
  if (P1.x === P2.x && mod(P1.y + P2.y, P) === 0n) return null;
  let m: bigint;
  if (P1.x === P2.x && P1.y === P2.y) {
    m = mod((3n * P1.x * P1.x + A_CURVE) * modInv(2n * P1.y, P), P);
  } else {
    m = mod((P2.y - P1.y) * modInv(mod(P2.x - P1.x, P), P), P);
  }
  const x = mod(m * m - P1.x - P2.x, P);
  const y = mod(m * (P1.x - x) - P1.y, P);
  return { x, y };
}
function ptMul(k: number, G: Pt): Pt {
  let R: Pt = null; let Q: Pt = G; let n = k;
  while (n > 0) { if (n & 1) R = ptAdd(R, Q); Q = ptAdd(Q, Q); n >>= 1; }
  return R;
}
function ptNeg(p: Pt): Pt { return p ? { x: p.x, y: mod(-p.y, P) } : null; }

const G: Pt = { x: 1n, y: 28n };

// SHA-256 sync via WebCrypto would be async — use a small sync FNV-style fold for determinism here
async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

type Mat = number[][];
function trace(M: Mat) { return M[0][0] + M[1][1] + M[2][2]; }
function det3(M: Mat) {
  const [a,b,c]=M[0],[d,e,f]=M[1],[g,h,i]=M[2];
  return a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
}
// real eigenvalues via characteristic poly + Newton-ish bracket (3x3, real symmetric not guaranteed → use companion)
function eig3(M: Mat): number[] {
  const a = -trace(M);
  const b = M[0][0]*M[1][1] + M[0][0]*M[2][2] + M[1][1]*M[2][2]
          - M[0][1]*M[1][0] - M[0][2]*M[2][0] - M[1][2]*M[2][1];
  const c = -det3(M);
  // λ^3 + aλ^2 + bλ + c = 0 → depressed via λ = t - a/3
  const p = b - a*a/3;
  const q = 2*a*a*a/27 - a*b/3 + c;
  const disc = q*q/4 + p*p*p/27;
  const roots: number[] = [];
  if (disc > 0) {
    const s = Math.cbrt(-q/2 + Math.sqrt(disc));
    const t = Math.cbrt(-q/2 - Math.sqrt(disc));
    roots.push(s + t - a/3);
  } else {
    const r = Math.sqrt(-p*p*p/27);
    const phi = Math.acos(Math.max(-1, Math.min(1, -q/(2*r))));
    const m = 2*Math.cbrt(r);
    for (let k=0;k<3;k++) roots.push(m*Math.cos((phi + 2*Math.PI*k)/3) - a/3);
  }
  return roots.sort((x,y)=>y-x);
}

function matFromHex(hex: string): Mat {
  const d = hex.slice(0,9).split("").map(c => parseInt(c,16)/10);
  return [[d[0],d[1],d[2]],[d[3],d[4],d[5]],[d[6],d[7],d[8]]];
}
function matRaw(p: Pt): Mat {
  if (!p) return [[0,0,0],[0,0,0],[0,0,0]];
  const x = Number(p.x)/97, y = Number(p.y)/97;
  return [
    [x, y, x+y],
    [x-y, x*y, x*x],
    [y*y, 2*x+y, 1],
  ];
}
function matLocal(pk: Pt, pkp: Pt, pkm: Pt): Mat {
  const r = (q: Pt) => q ? [Number(q.x)/97, Number(q.y)/97] : [0,0];
  const [a1,a2] = r(pk), [b1,b2] = r(pkp), [c1,c2] = r(pkm);
  return [
    [a1, a2, a1*a2],
    [b1-a1, b2-a2, (b1-a1)*(b2-a2)],
    [c1-a1, c2-a2, (c1-a1)*(c2-a2)],
  ];
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((s,v)=>s+v,0)/n, my = ys.reduce((s,v)=>s+v,0)/n;
  let num=0, dx=0, dy=0;
  for (let i=0;i<n;i++){ const a=xs[i]-mx, b=ys[i]-my; num+=a*b; dx+=a*a; dy+=b*b; }
  return num / (Math.sqrt(dx*dy) || 1);
}

type Row = { k: number; pt: Pt; hashMat: Mat; rawMat: Mat; locMat: Mat; hashHex: string };

export function ECCFingerprint() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(37);

  async function compute() {
    setBusy(true);
    const out: Row[] = [];
    for (let k=1; k<=78; k++) {
      const Pk = ptMul(k, G);
      const Pkp = ptAdd(Pk, G);
      const Pkm = ptAdd(Pk, ptNeg(G));
      const code = Pk ? `${Pk.x}${Pk.y}` : "0";
      const h = await sha256Hex(code);
      out.push({
        k, pt: Pk,
        hashMat: matFromHex(h),
        rawMat: matRaw(Pk),
        locMat: matLocal(Pk, Pkp, Pkm),
        hashHex: h.slice(0,12),
      });
    }
    setRows(out);
    setBusy(false);
  }

  const stats = useMemo(() => {
    if (!rows) return null;
    const ks = rows.map(r => r.k);
    const channel = (sel: (r: Row) => Mat) => {
      const tr = rows.map(r => trace(sel(r)));
      const dt = rows.map(r => det3(sel(r)));
      const lm = rows.map(r => eig3(sel(r))[0]);
      // Nachbarschaft: F als (tr, det, λ_max) normalisiert
      const norm = (xs: number[]) => {
        const lo = Math.min(...xs), hi = Math.max(...xs), r = hi-lo || 1;
        return xs.map(v => (v-lo)/r);
      };
      const T=norm(tr), D=norm(dt), L=norm(lm);
      const F = rows.map((_,i) => [T[i],D[i],L[i]]);
      const dist = (a:number[], b:number[]) => Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
      let neigh=0, nNeigh=0;
      for (let i=0;i<F.length-1;i++){ neigh+=dist(F[i],F[i+1]); nNeigh++; }
      let rand=0, nRand=0;
      for (let i=0;i<F.length;i++) for (let j=i+2;j<F.length;j++){ rand+=dist(F[i],F[j]); nRand++; }
      return {
        rTrace: pearson(ks, tr),
        rDet:   pearson(ks, dt),
        rLam:   pearson(ks, lm),
        avgNeighbor: neigh/nNeigh,
        avgRandom:   rand/nRand,
      };
    };
    return {
      hash:  channel(r => r.hashMat),
      raw:   channel(r => r.rawMat),
      local: channel(r => r.locMat),
    };
  }, [rows]);

  const targetRow = rows?.find(r => r.k === target);

  return (
    <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto space-y-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium">FINGERPRINT · ECC-Toy-Modell</h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          E: y² = x³ + 7 (mod 97) · G=(1,28) · ord=79 · k∈[1,78]
        </p>
      </header>

      <div className="border border-border p-3 flex items-center gap-3">
        <Button size="sm" onClick={compute} disabled={busy}>
          {busy ? "rechnet..." : rows ? "neu rechnen" : "Alle 78 k berechnen"}
        </Button>
        <span className="text-[10px] font-mono text-muted-foreground">
          Multi-Punkt-Matrix A(Pₖ, Pₖ+G, Pₖ−G) wird live geprüft
        </span>
      </div>

      {targetRow && (
        <div className="border border-border p-3 font-mono text-xs space-y-1">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground">Ziel k:</label>
            <input type="number" value={target} min={1} max={78}
              onChange={e=>setTarget(parseInt(e.target.value)||1)}
              className="w-16 bg-input border border-border px-2 py-1 text-xs"/>
          </div>
          <div>P_{target} = ({String(targetRow.pt?.x)}, {String(targetRow.pt?.y)})</div>
          <div className="text-muted-foreground">SHA-256: {targetRow.hashHex}…</div>
          <div className="text-muted-foreground">tr(A_hash)={trace(targetRow.hashMat).toFixed(3)} · det={det3(targetRow.hashMat).toFixed(3)}</div>
          <div className="text-muted-foreground">tr(A_lokal)={trace(targetRow.locMat).toFixed(3)} · det={det3(targetRow.locMat).toFixed(3)}</div>
        </div>
      )}

      {stats && (
        <div className="border border-border">
          <div className="grid grid-cols-4 text-[10px] font-mono border-b border-border bg-muted/30">
            <div className="p-2">Kanal</div>
            <div className="p-2">|r| Spur · Det · λmax</div>
            <div className="p-2">Ø Nachbarn</div>
            <div className="p-2">Ø Zufall</div>
          </div>
          {([
            ["HASH  P→SHA→A", stats.hash],
            ["RAW   P→A_raw", stats.raw],
            ["LOKAL  A(P,P+G,P−G)", stats.local],
          ] as const).map(([name, s]) => {
            const ratio = s.avgNeighbor / s.avgRandom;
            const signal = ratio < 0.85;
            return (
              <div key={name} className="grid grid-cols-4 text-[11px] font-mono border-b border-border last:border-0">
                <div className="p-2">{name}</div>
                <div className="p-2">
                  {Math.abs(s.rTrace).toFixed(3)} · {Math.abs(s.rDet).toFixed(3)} · {Math.abs(s.rLam).toFixed(3)}
                </div>
                <div className="p-2">{s.avgNeighbor.toFixed(4)}</div>
                <div className="p-2">
                  {s.avgRandom.toFixed(4)}
                  <span className={`ml-2 ${signal ? "text-foreground" : "text-muted-foreground"}`}>
                    {signal ? "← Signal" : "≈ rauschen"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rows && (
        <div className="border border-border p-2">
          <div className="text-[10px] font-mono text-muted-foreground mb-2">
            Pfad-Plot: |F(P_{`k+1`}) − F(P_k)| pro Kanal
          </div>
          <svg viewBox="0 0 700 180" className="w-full">
            {(["hashMat","rawMat","locMat"] as const).map((key, idx) => {
              const op = [1, 0.5, 0.25][idx];
              const trs = rows.map(r => trace(r[key]));
              const lo = Math.min(...trs), hi = Math.max(...trs), rg = hi-lo || 1;
              const path = trs.map((v,i) => {
                const x = 20 + (i/(trs.length-1)) * 660;
                const y = 160 - ((v-lo)/rg) * 140;
                return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ");
              return <path key={key} d={path} stroke="hsl(var(--foreground))" strokeWidth="1" fill="none" opacity={op}/>;
            })}
          </svg>
          <div className="text-[10px] font-mono text-muted-foreground flex gap-3 mt-1">
            <span>— hash</span><span className="opacity-60">— raw</span><span className="opacity-30">— lokal</span>
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground border-t border-border pt-2 font-mono leading-relaxed">
        Befund-Hypothese (DEBATTE-Log v. 8:25PM): HASH zerstört Nachbarschaft (Verhältnis≈1).
        Wenn LOKAL-Kanal Verhältnis &lt; 0.85 zeigt, hat Multi-Punkt einen Kompass-Anteil.
      </div>
    </div>
  );
}
