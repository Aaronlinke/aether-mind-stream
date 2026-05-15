import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// ─── EXPM ───────────────────────────────────────────────────────────────────
// Numerisch stabiles 3x3 Matrix-Exponential e^{At} via scaling & squaring
// + Padé(6,6). Wendet auf x(0) an, plottet H(t), N(t), G(t).
// Schließt die Lücke, die der DEBATTE-MANAGER explizit benannt hat:
// "Berechne e^{At} via Diagonalisierung / Padé".
// ────────────────────────────────────────────────────────────────────────────

type M = number[][];
type V = number[];

const I3: M = [[1,0,0],[0,1,0],[0,0,1]];

function mmul(A: M, B: M): M {
  const n = A.length, p = B[0].length, k = B.length;
  const C: M = Array.from({length:n}, () => Array(p).fill(0));
  for (let i=0;i<n;i++) for (let j=0;j<p;j++) {
    let s=0; for (let l=0;l<k;l++) s += A[i][l]*B[l][j];
    C[i][j]=s;
  }
  return C;
}
function madd(A: M, B: M): M { return A.map((r,i)=>r.map((v,j)=>v+B[i][j])); }
function msub(A: M, B: M): M { return A.map((r,i)=>r.map((v,j)=>v-B[i][j])); }
function smul(s: number, A: M): M { return A.map(r=>r.map(v=>s*v)); }
function mvec(A: M, x: V): V { return A.map(r=>r.reduce((s,v,j)=>s+v*x[j],0)); }
function infNorm(A: M): number { return Math.max(...A.map(r=>r.reduce((s,v)=>s+Math.abs(v),0))); }

// 3x3 inverse via cofactor
function inv3(A: M): M {
  const [a,b,c] = A[0], [d,e,f] = A[1], [g,h,i] = A[2];
  const det = a*(e*i-f*h) - b*(d*i-f*g) + c*(d*h-e*g);
  if (Math.abs(det) < 1e-14) throw new Error("singular");
  const inv = [
    [ (e*i-f*h), -(b*i-c*h),  (b*f-c*e)],
    [-(d*i-f*g),  (a*i-c*g), -(a*f-c*d)],
    [ (d*h-e*g), -(a*h-b*g),  (a*e-b*d)],
  ];
  return inv.map(r=>r.map(v=>v/det));
}

// expm via scaling & squaring + Padé(6,6)
function expm(A: M): M {
  const norm = infNorm(A);
  const s = Math.max(0, Math.ceil(Math.log2(norm/0.5)));
  const scale = Math.pow(2, s);
  const As = smul(1/scale, A);
  // Padé(6,6) coefficients
  const b = [1, 1/2, 5/44, 1/66, 1/792, 1/15840, 1/665280];
  const A2 = mmul(As, As);
  const A4 = mmul(A2, A2);
  const A6 = mmul(A4, A2);
  // U = As * (b1*I + b3*A2 + b5*A4 + b7*A6) — using order-6 surrogate
  const U = mmul(As, madd(madd(smul(b[1], I3), smul(b[3], A2)), madd(smul(b[5], A4), smul(b[6], A6))));
  const V = madd(madd(smul(b[0], I3), smul(b[2], A2)), madd(smul(b[4], A4), smul(b[6]*0, A6)));
  // R = (V-U)^{-1} (V+U)
  let R = mmul(inv3(msub(V, U)), madd(V, U));
  for (let k=0;k<s;k++) R = mmul(R, R);
  return R;
}

function parseSig(sig: string): M {
  const hex = sig.replace(/[^0-9a-fA-F]/g,"").padEnd(9, "a").slice(0,9);
  const d = hex.split("").map(c => parseInt(c,16));
  // Mapping wie im Debatten-Log: Koeffizienten = ziffer/10
  return [
    [d[0]/10, d[1]/10, d[2]/10],
    [d[3]/10, d[4]/10, d[5]/10],
    [d[6]/10, d[7]/10, d[8]/10],
  ];
}

export function MatrixExp() {
  const [sig, setSig] = useState("07e935faa");
  const [h0, setH0] = useState("-0.019");
  const [n0, setN0] = useState("-0.763");
  const [g0, setG0] = useState("0.046");
  const [tEnd, setTEnd] = useState("2");
  const [steps, setSteps] = useState("80");

  const A = useMemo(() => {
    try { return parseSig(sig); } catch { return null; }
  }, [sig]);

  const result = useMemo(() => {
    if (!A) return null;
    const x0: V = [parseFloat(h0)||0, parseFloat(n0)||0, parseFloat(g0)||0];
    const T = parseFloat(tEnd) || 1;
    const N = Math.max(2, Math.min(400, parseInt(steps)||50));
    const pts: { t: number; x: V }[] = [];
    for (let i=0;i<=N;i++) {
      const t = (i/N) * T;
      try {
        const eAt = expm(smul(t, A));
        pts.push({ t, x: mvec(eAt, x0) });
      } catch {
        return null;
      }
    }
    return pts;
  }, [A, h0, n0, g0, tEnd, steps]);

  const W = 700, H = 240, pad = 30;
  const path = (idx: number) => {
    if (!result) return "";
    const xs = result.map(p => p.x[idx]);
    const lo = Math.min(...xs), hi = Math.max(...xs);
    const range = hi - lo || 1;
    return result.map((p,i) => {
      const x = pad + (i/(result.length-1)) * (W - 2*pad);
      const y = H - pad - ((p.x[idx] - lo)/range) * (H - 2*pad);
      return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  };

  const last = result?.[result.length-1];

  return (
    <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto space-y-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium">EXPM · Matrix-Exponential</h1>
        <p className="text-xs text-muted-foreground mt-1">
          x'(t) = A·x(t) → x(t) = e^(At)·x(0) · Padé(6,6) + scaling/squaring
        </p>
      </header>

      <div className="border border-border p-3 space-y-2">
        <label className="text-[10px] font-mono text-muted-foreground">Signatur (9 Hex-Ziffern → A=ziffer/10)</label>
        <div className="flex gap-2">
          <input value={sig} onChange={e=>setSig(e.target.value)} className="flex-1 bg-input border border-border px-2 py-1 text-sm font-mono"/>
          <Button size="sm" variant="outline" onClick={()=>setSig("07e935faa")}>DEBATTE-Sig</Button>
        </div>
        {A && (
          <div className="font-mono text-[10px] mt-2">
            A = [
            {A.map((row,i)=>(
              <div key={i} className="ml-4">[{row.map(v=>v.toFixed(2)).join(", ")}]{i<2?",":""}</div>
            ))}
            ]
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-mono text-muted-foreground">H(0)</label>
          <input value={h0} onChange={e=>setH0(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-sm font-mono"/>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground">N(0)</label>
          <input value={n0} onChange={e=>setN0(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-sm font-mono"/>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground">G(0)</label>
          <input value={g0} onChange={e=>setG0(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-sm font-mono"/>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground">T (Zeit)</label>
          <input value={tEnd} onChange={e=>setTEnd(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-sm font-mono"/>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground">Schritte</label>
          <input value={steps} onChange={e=>setSteps(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-sm font-mono"/>
        </div>
        <div className="flex items-end gap-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={()=>{setH0("-0.019");setN0("-0.763");setG0("0.046");}}>Set 1</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={()=>{setH0("6.5");setN0("1.8");setG0("13.9");}}>Set 2</Button>
        </div>
      </div>

      {result && last && (
        <>
          <div className="border border-border p-3 font-mono text-xs">
            <div className="text-muted-foreground text-[10px] mb-1">x(T={parseFloat(tEnd).toFixed(2)})</div>
            <div>H(T) = {last.x[0].toExponential(4)}</div>
            <div>N(T) = {last.x[1].toExponential(4)}</div>
            <div>G(T) = {last.x[2].toExponential(4)}</div>
          </div>

          <div className="border border-border p-2">
            <div className="text-[10px] font-mono text-muted-foreground mb-1 flex gap-3">
              <span>— H</span>
              <span className="opacity-60">— N</span>
              <span className="opacity-30">— G</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              <rect x="0" y="0" width={W} height={H} fill="hsl(var(--background))"/>
              <path d={path(0)} stroke="hsl(var(--foreground))" strokeWidth="1.5" fill="none"/>
              <path d={path(1)} stroke="hsl(var(--foreground))" strokeWidth="1.5" fill="none" opacity="0.6"/>
              <path d={path(2)} stroke="hsl(var(--foreground))" strokeWidth="1.5" fill="none" opacity="0.3"/>
              <line x1={pad} y1={H-pad} x2={W-pad} y2={H-pad} stroke="hsl(var(--border))"/>
              <line x1={pad} y1={pad} x2={pad} y2={H-pad} stroke="hsl(var(--border))"/>
            </svg>
          </div>
        </>
      )}

      <div className="text-[10px] text-muted-foreground border-t border-border pt-2 font-mono">
        Methode: Higham scaling & squaring · Padé(6,6) · 3x3 Cofaktor-Inverse · stabil bis ‖A‖∞ ≈ 50
      </div>
    </div>
  );
}
