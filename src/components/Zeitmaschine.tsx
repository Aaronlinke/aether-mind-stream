import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  calculatePersonalSignature,
  calculateBackward,
  calculateForward,
  calculateCosmologyBackward,
  lambertW,
  solveInverse,
  CONSTANTS,
  type CosmologyModel,
} from "@/lib/timeMachine";

// ─── ZEITMASCHINE ──────────────────────────────────────────────────────────
// Universeller Rückwärtsrechner: persönliche Signatur, H-N-G Inversion,
// Kosmologie-Rückrechnung (LambdaCDM/Materie/Strahlung/Persönlich),
// Lambert-W und allgemeiner Newton-Inverse-Solver.
// ──────────────────────────────────────────────────────────────────────────

type Tab = "sig" | "hng" | "cosmo" | "inv";

export function Zeitmaschine() {
  const [tab, setTab] = useState<Tab>("hng");

  const tabs: { id: Tab; label: string }[] = [
    { id: "sig", label: "SIGNATUR" },
    { id: "hng", label: "H-N-G RÜCK" },
    { id: "cosmo", label: "KOSMOS" },
    { id: "inv", label: "INVERSE" },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto space-y-3">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium">ZEITMASCHINE · Universeller Rückwärtsrechner</h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Inverse Berechnungen: SRIL H-N-G, Kosmologie, Lambert-W, Newton-Inverse
        </p>
      </header>

      <div className="flex border border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 text-[10px] font-mono transition-colors ${
              tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sig" && <SignaturePanel />}
      {tab === "hng" && <HNGPanel />}
      {tab === "cosmo" && <CosmoPanel />}
      {tab === "inv" && <InversePanel />}
    </div>
  );
}

// ─── SIGNATUR ─────────────────────────────────────────────────────────────
function SignaturePanel() {
  const [name, setName] = useState("Lovable");
  const sig = useMemo(() => calculatePersonalSignature(name), [name]);
  return (
    <div className="border border-border p-3 space-y-2 font-mono text-xs">
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground w-16">Name:</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-input border border-border px-2 py-1 text-xs"
        />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] pt-2 border-t border-border">
        <div>φ (golden)</div><div>{sig.goldenRatio.toFixed(9)}</div>
        <div>π (persönlich)</div><div>{sig.personalPi.toFixed(6)}</div>
        <div>Chaos C</div><div>{sig.chaosConstant.toFixed(6)}</div>
        <div>Symmetrie S</div><div>{sig.symmetryFactor.toFixed(6)}</div>
        <div>Fraktal-Dim D</div><div>{sig.fractalDimension.toFixed(6)}</div>
        <div>Zeitkristall τ</div><div>{sig.timecrystal.toFixed(6)}</div>
        <div>Entropie H</div><div>{sig.entropyValue.toFixed(6)}</div>
        <div>|ψ⟩ Re/Im</div><div>{sig.superposition.re.toFixed(4)} / {sig.superposition.im.toFixed(4)}</div>
      </div>
      <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
        Hash → Monte-Carlo π (100k Punkte) → Shannon-Entropie → Quantenüberlagerung e^{`{iθ}`}
      </div>
    </div>
  );
}

// ─── H-N-G ────────────────────────────────────────────────────────────────
function HNGPanel() {
  const [H, setH] = useState("88.22");
  const [N, setN] = useState("84.09");
  const [G, setG] = useState("152.14");
  const [tEnd, setTEnd] = useState(10);

  const back = useMemo(
    () => calculateBackward({ H: parseFloat(H), N: parseFloat(N), G: parseFloat(G) }, tEnd),
    [H, N, G, tEnd]
  );
  const fwd = useMemo(() => {
    const s0 = back[0];
    return calculateForward({ H: s0.H, N: s0.N, G: s0.G }, tEnd);
  }, [back, tEnd]);

  const drift = Math.hypot(
    fwd[tEnd].H - parseFloat(H),
    fwd[tEnd].N - parseFloat(N),
    fwd[tEnd].G - parseFloat(G)
  );

  return (
    <div className="space-y-3">
      <div className="border border-border p-3 grid grid-cols-4 gap-2 text-xs font-mono">
        {[
          ["H(end)", H, setH],
          ["N(end)", N, setN],
          ["G(end)", G, setG],
        ].map(([l, v, set]: any) => (
          <div key={l} className="space-y-1">
            <label className="text-[10px] text-muted-foreground">{l}</label>
            <input value={v} onChange={(e) => set(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-xs"/>
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">t_end</label>
          <input type="number" value={tEnd} min={1} max={50} onChange={(e) => setTEnd(parseInt(e.target.value) || 1)}
            className="w-full bg-input border border-border px-2 py-1 text-xs"/>
        </div>
      </div>

      <div className="border border-border p-3 font-mono text-xs space-y-1">
        <div className="text-[10px] text-muted-foreground">Rekonstruierter Anfangszustand:</div>
        <div>H(0) = {back[0].H.toFixed(4)} · N(0) = {back[0].N.toFixed(4)} · G(0) = {back[0].G.toFixed(4)}</div>
        <div className="text-[10px] text-muted-foreground pt-1">Vorwärts-Verifikation:</div>
        <div>‖fwd(t_end) − end‖ = {drift.toExponential(3)} {drift < 1e-6 ? "✓ konsistent" : "⚠ Drift"}</div>
      </div>

      <div className="border border-border">
        <div className="grid grid-cols-4 text-[10px] font-mono border-b border-border bg-muted/30">
          <div className="p-2">t</div><div className="p-2">H</div><div className="p-2">N</div><div className="p-2">G</div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {back.map((s) => (
            <div key={s.t} className="grid grid-cols-4 text-[11px] font-mono border-b border-border last:border-0">
              <div className="p-2">{s.t}</div>
              <div className="p-2">{s.H.toFixed(3)}</div>
              <div className="p-2">{s.N.toFixed(3)}</div>
              <div className="p-2">{s.G.toFixed(3)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground font-mono">
        Inversion: N(t)=H(t)−N(t+1), G(t)=(G(t+1)+H(t))/2, H(t)=(H(t+1)+N(t+1)−G(t+1)/2)/2.5
      </div>
    </div>
  );
}

// ─── KOSMOS ───────────────────────────────────────────────────────────────
function CosmoPanel() {
  const [model, setModel] = useState<CosmologyModel>("LambdaCDM");
  const data = useMemo(
    () =>
      calculateCosmologyBackward(
        { H0: CONSTANTS.H0, Omega_m: 0.315, Omega_lambda: 0.685, T0: CONSTANTS.T_CMB },
        model,
        calculatePersonalSignature("Lovable")
      ),
    [model]
  );

  // Plot T(z)
  const Ts = data.map((d) => Math.log10(d.temperature_K));
  const zs = data.map((d) => Math.log10(1 + d.z));
  const lo = Math.min(...Ts), hi = Math.max(...Ts);
  const xLo = Math.min(...zs), xHi = Math.max(...zs);
  const path = data.map((d, i) => {
    const x = 20 + ((zs[i] - xLo) / (xHi - xLo)) * 660;
    const y = 160 - ((Ts[i] - lo) / (hi - lo)) * 140;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="space-y-3">
      <div className="border border-border p-3 flex flex-wrap gap-2">
        {(["LambdaCDM","MaterieDominiert","StrahlungsDominiert","Persoenlich"] as CosmologyModel[]).map(m => (
          <Button key={m} size="sm" variant={model===m?"default":"outline"} onClick={()=>setModel(m)}>{m}</Button>
        ))}
      </div>
      <div className="border border-border p-2">
        <div className="text-[10px] font-mono text-muted-foreground mb-1">log₁₀(T[K]) vs log₁₀(1+z) · 100 Punkte bis z≈1100 (Rekombination)</div>
        <svg viewBox="0 0 700 180" className="w-full">
          <path d={path} stroke="hsl(var(--foreground))" strokeWidth="1.2" fill="none"/>
        </svg>
      </div>
      <div className="border border-border">
        <div className="grid grid-cols-5 text-[10px] font-mono border-b border-border bg-muted/30">
          <div className="p-2">z</div><div className="p-2">t [Gyr]</div><div className="p-2">T [K]</div><div className="p-2">a</div><div className="p-2">H</div>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {data.filter((_,i)=>i%10===0).map((d,i) => (
            <div key={i} className="grid grid-cols-5 text-[11px] font-mono border-b border-border last:border-0">
              <div className="p-2">{d.z.toExponential(2)}</div>
              <div className="p-2">{(d.time_years/1e9).toExponential(2)}</div>
              <div className="p-2">{d.temperature_K.toExponential(2)}</div>
              <div className="p-2">{d.scale_factor.toExponential(2)}</div>
              <div className="p-2">{d.hubble.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── INVERSE ──────────────────────────────────────────────────────────────
function InversePanel() {
  const [expr, setExpr] = useState("x*Math.exp(x)");
  const [target, setTarget] = useState("2.5");
  const [rangeLo, setRangeLo] = useState("-5");
  const [rangeHi, setRangeHi] = useState("5");

  const result = useMemo(() => {
    try {
      // eslint-disable-next-line no-new-func
      const f = new Function("x", `return ${expr};`) as (x: number) => number;
      const sols = solveInverse(f, parseFloat(target), [parseFloat(rangeLo), parseFloat(rangeHi)]);
      return { sols, err: null as string | null };
    } catch (e: any) {
      return { sols: [], err: e.message };
    }
  }, [expr, target, rangeLo, rangeHi]);

  const lw = useMemo(() => lambertW(parseFloat(target)), [target]);

  return (
    <div className="space-y-3">
      <div className="border border-border p-3 space-y-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground w-16">f(x) =</label>
          <input value={expr} onChange={(e)=>setExpr(e.target.value)} className="flex-1 bg-input border border-border px-2 py-1 text-xs"/>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="text-[10px] text-muted-foreground">target</label>
            <input value={target} onChange={(e)=>setTarget(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-xs"/></div>
          <div><label className="text-[10px] text-muted-foreground">x_min</label>
            <input value={rangeLo} onChange={(e)=>setRangeLo(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-xs"/></div>
          <div><label className="text-[10px] text-muted-foreground">x_max</label>
            <input value={rangeHi} onChange={(e)=>setRangeHi(e.target.value)} className="w-full bg-input border border-border px-2 py-1 text-xs"/></div>
        </div>
        <div className="text-[10px] text-muted-foreground">JS-Ausdruck mit Math.* erlaubt (Math.sin, Math.exp, Math.log, …)</div>
      </div>

      <div className="border border-border p-3 font-mono text-xs">
        <div className="text-[10px] text-muted-foreground">Newton-Multi-Start (20 Startpunkte):</div>
        {result.err ? (
          <div className="text-destructive">{result.err}</div>
        ) : result.sols.length === 0 ? (
          <div className="text-muted-foreground">keine Lösung im Bereich</div>
        ) : (
          result.sols.map((s, i) => <div key={i}>x = {s}</div>)
        )}
      </div>

      <div className="border border-border p-3 font-mono text-xs">
        <div className="text-[10px] text-muted-foreground">Lambert-W (Hauptzweig) für z = target:</div>
        <div>W({target}) = {isNaN(lw) ? "undefiniert (z &lt; −1/e)" : lw.toFixed(10)}</div>
        <div className="text-[10px] text-muted-foreground pt-1">löst W·e^W = z</div>
      </div>
    </div>
  );
}
