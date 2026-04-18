import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Kleine Kurve über F_p für Visualisierung: y² = x³ + ax + b mod p ──
type Pt = { x: number; y: number } | null;

function modP(a: number, p: number) { return ((a % p) + p) % p; }
function eInv(a: number, p: number): number {
  // extended euclid
  let [old_r, r] = [a % p, p];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return modP(old_s, p);
}

function add(P: Pt, Q: Pt, a: number, p: number): Pt {
  if (!P) return Q; if (!Q) return P;
  if (P.x === Q.x && modP(P.y + Q.y, p) === 0) return null;
  let m: number;
  if (P.x === Q.x && P.y === Q.y) {
    m = modP((3 * P.x * P.x + a) * eInv(2 * P.y, p), p);
  } else {
    m = modP((Q.y - P.y) * eInv(Q.x - P.x, p), p);
  }
  const x = modP(m * m - P.x - Q.x, p);
  const y = modP(m * (P.x - x) - P.y, p);
  return { x, y };
}

function mul(k: number, P: Pt, a: number, p: number): Pt {
  let R: Pt = null; let N = P;
  while (k > 0) {
    if (k & 1) R = add(R, N, a, p);
    N = add(N, N, a, p);
    k >>= 1;
  }
  return R;
}

export function ECCPlotter() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [p, setP] = useState(97);
  const [Px, setPx] = useState(3);
  const [Py, setPy] = useState(6);
  const [k, setK] = useState(5);

  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let x = 0; x < p; x++) {
      const rhs = modP(x * x * x + a * x + b, p);
      for (let y = 0; y < p; y++) {
        if ((y * y) % p === rhs) pts.push({ x, y });
      }
    }
    return pts;
  }, [a, b, p]);

  const G: Pt = { x: Px, y: Py };
  const onCurve = points.some(pt => pt.x === Px && pt.y === Py);

  const multiples = useMemo(() => {
    const arr: { i: number; pt: Pt }[] = [];
    let R: Pt = null;
    for (let i = 1; i <= Math.min(k, 50); i++) {
      R = add(R, G, a, p);
      arr.push({ i, pt: R });
      if (R === null) break;
    }
    return arr;
  }, [k, Px, Py, a, p]);

  const result = mul(k, G, a, p);
  const size = 360;
  const cell = size / p;

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">ECC-PLOTTER</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">y² ≡ x³ + ax + b (mod p) · Punktaddition · k·G</p>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div><div className="text-[10px] text-muted-foreground">a</div><Input type="number" value={a} onChange={ev => setA(+ev.target.value)} className="h-7 text-xs" /></div>
            <div><div className="text-[10px] text-muted-foreground">b</div><Input type="number" value={b} onChange={ev => setB(+ev.target.value)} className="h-7 text-xs" /></div>
            <div><div className="text-[10px] text-muted-foreground">p (prim)</div><Input type="number" value={p} onChange={ev => setP(Math.max(5, +ev.target.value))} className="h-7 text-xs" /></div>
            <div><div className="text-[10px] text-muted-foreground">G.x</div><Input type="number" value={Px} onChange={ev => setPx(+ev.target.value)} className="h-7 text-xs" /></div>
            <div><div className="text-[10px] text-muted-foreground">G.y</div><Input type="number" value={Py} onChange={ev => setPy(+ev.target.value)} className="h-7 text-xs" /></div>
            <div><div className="text-[10px] text-muted-foreground">k</div><Input type="number" value={k} onChange={ev => setK(Math.max(1, +ev.target.value))} className="h-7 text-xs" /></div>
          </div>

          <div className={`text-[10px] font-mono ${onCurve ? 'text-primary' : 'text-destructive'}`}>
            G = ({Px}, {Py}) {onCurve ? '✓ auf Kurve' : '✗ nicht auf Kurve'}
          </div>

          <svg viewBox={`0 0 ${size} ${size}`} className="w-full border border-border bg-background">
            {/* grid */}
            {Array.from({ length: p + 1 }).map((_, i) => (
              <g key={i}>
                <line x1={i * cell} y1={0} x2={i * cell} y2={size} stroke="hsl(var(--muted))" strokeWidth={0.2} />
                <line x1={0} y1={i * cell} x2={size} y2={i * cell} stroke="hsl(var(--muted))" strokeWidth={0.2} />
              </g>
            ))}
            {points.map((pt, i) => (
              <circle key={i} cx={pt.x * cell + cell / 2} cy={size - (pt.y * cell + cell / 2)} r={Math.max(1, cell / 3)} fill="hsl(var(--muted-foreground))" />
            ))}
            {onCurve && (
              <circle cx={Px * cell + cell / 2} cy={size - (Py * cell + cell / 2)} r={Math.max(2, cell / 1.5)} fill="hsl(var(--primary))" />
            )}
            {multiples.map(({ pt, i }) => pt && (
              <g key={i}>
                <circle cx={pt.x * cell + cell / 2} cy={size - (pt.y * cell + cell / 2)} r={Math.max(2, cell / 2)} fill="none" stroke="hsl(var(--destructive))" strokeWidth={1} />
                <text x={pt.x * cell + cell / 2 + 3} y={size - (pt.y * cell + cell / 2) - 3} fontSize={7} fill="hsl(var(--destructive))">{i}</text>
              </g>
            ))}
          </svg>

          <div className="border border-border rounded p-2 font-mono text-[10px] space-y-0.5">
            <div>Punkte auf Kurve: <span className="text-primary">{points.length}</span></div>
            <div>{k}·G = <span className="text-primary">{result ? `(${result.x}, ${result.y})` : 'O (Unendlich)'}</span></div>
            <div className="text-muted-foreground pt-1 border-t border-border">
              ECDLP: gegeben G und k·G — finde k. Hier klein/sichtbar, in secp256k1 mit p≈2²⁵⁶ unmöglich.
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
