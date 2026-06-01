import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";

// ENTROPIE-LAB: empirische Messung von H(P_k) und I(d;P_k) via Monte-Carlo.
// d ist 256-bit zufällig; P_k ist eine Projektion (Hash-Prefix, Matrix-Invariante, LSB).
// H(P_k) wird per Plug-in-Schätzer aus Häufigkeitsverteilung berechnet.
// Da d uniform ist, gilt I(d;P_k) = H(P_k) - H(P_k|d) = H(P_k) (deterministische Projektion).

type Projection = "prefix8" | "prefix12" | "prefix16" | "lsb8" | "matrix-trace" | "matrix-det";

const PROJ_LABELS: Record<Projection, string> = {
  prefix8: "SHA256-Präfix 8 Bit (Raum 256)",
  prefix12: "SHA256-Präfix 12 Bit (Raum 4096)",
  prefix16: "SHA256-Präfix 16 Bit (Raum 65536)",
  lsb8: "LSB von d, 8 Bit (Raum 256)",
  "matrix-trace": "Spur(M) mod 256, M aus SHA256(d)",
  "matrix-det": "det(M) mod 65536, M 3×3 aus SHA256(d)",
};

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return new Uint8Array(buf);
}

function randKey(weak: boolean): Uint8Array {
  const k = new Uint8Array(32);
  crypto.getRandomValues(k);
  if (weak) {
    // Min-Entropie ~64 Bit: erste 8 Bytes zufällig, Rest 0
    for (let i = 8; i < 32; i++) k[i] = 0;
  }
  return k;
}

async function project(d: Uint8Array, p: Projection): Promise<number> {
  const h = await sha256(d);
  switch (p) {
    case "prefix8": return h[0];
    case "prefix12": return (h[0] << 4) | (h[1] >> 4);
    case "prefix16": return (h[0] << 8) | h[1];
    case "lsb8": return d[31];
    case "matrix-trace": return (h[0] + h[4] + h[8]) & 0xff;
    case "matrix-det": {
      // 3x3 aus ersten 9 Bytes als signed int8
      const m: number[][] = [];
      for (let i = 0; i < 3; i++) {
        const row: number[] = [];
        for (let j = 0; j < 3; j++) {
          const v = h[i * 3 + j];
          row.push(v > 127 ? v - 256 : v);
        }
        m.push(row);
      }
      const det =
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      return ((det % 65536) + 65536) % 65536;
    }
  }
}

function shannonEntropy(counts: Map<number, number>, total: number): number {
  let h = 0;
  for (const c of counts.values()) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

function klDivergence(p: Map<number, number>, q: Map<number, number>, totalP: number, totalQ: number): number {
  const keys = new Set([...p.keys(), ...q.keys()]);
  let kl = 0;
  for (const k of keys) {
    const pi = (p.get(k) || 0) / totalP;
    const qi = (q.get(k) || 0) / totalQ;
    if (pi > 0 && qi > 0) kl += pi * Math.log2(pi / qi);
  }
  return kl;
}

export function EntropieLab() {
  const [proj, setProj] = useState<Projection>("prefix16");
  const [samples, setSamples] = useState(5000);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    hUniform: number; hWeak: number;
    kl: number;
    uniformBucketCount: number; weakBucketCount: number;
    spaceBits: number;
  } | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setResult(null);
    const uniform = new Map<number, number>();
    const weak = new Map<number, number>();
    for (let i = 0; i < samples; i++) {
      const u = await project(randKey(false), proj);
      uniform.set(u, (uniform.get(u) || 0) + 1);
      const w = await project(randKey(true), proj);
      weak.set(w, (weak.get(w) || 0) + 1);
      if (i % 250 === 0) await new Promise(r => setTimeout(r, 0));
    }
    const spaceBits = proj.startsWith("prefix") ? parseInt(proj.replace("prefix", ""))
      : proj === "matrix-det" ? 16 : 8;
    setResult({
      hUniform: shannonEntropy(uniform, samples),
      hWeak: shannonEntropy(weak, samples),
      kl: klDivergence(weak, uniform, samples, samples),
      uniformBucketCount: uniform.size,
      weakBucketCount: weak.size,
      spaceBits,
    });
    setRunning(false);
  }, [proj, samples]);

  return (
    <div className="h-full overflow-y-auto p-4 max-w-3xl mx-auto space-y-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium">ENTROPIE-LAB</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Monte-Carlo-Schätzer für H(P<sub>k</sub>) und I(d;P<sub>k</sub>) · vergleicht uniform vs. low-entropy Generator
        </p>
      </header>

      <div className="space-y-3">
        <label className="block text-xs">
          <span className="text-muted-foreground">Projektion P<sub>k</sub></span>
          <select
            value={proj}
            onChange={(e) => setProj(e.target.value as Projection)}
            disabled={running}
            className="mt-1 w-full bg-input border border-border rounded px-2 py-1 text-foreground text-xs"
          >
            {Object.entries(PROJ_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>

        <label className="block text-xs">
          <span className="text-muted-foreground">Stichproben N</span>
          <input
            type="number" min={500} max={50000} step={500} value={samples}
            onChange={(e) => setSamples(Math.max(500, parseInt(e.target.value) || 5000))}
            disabled={running}
            className="mt-1 w-full bg-input border border-border rounded px-2 py-1 text-foreground text-xs"
          />
        </label>

        <Button onClick={run} disabled={running} className="w-full">
          {running ? <><Loader2 className="h-3 w-3 animate-spin mr-2" />Messung läuft…</> : <><Play className="h-3 w-3 mr-2" />Messung starten</>}
        </Button>
      </div>

      {result && (
        <div className="border border-border rounded p-3 space-y-2 text-xs font-mono">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Ergebnis</div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="H(P|uniform d)" value={`${result.hUniform.toFixed(4)} bit`} />
            <Stat label="H(P|weak d)" value={`${result.hWeak.toFixed(4)} bit`} />
            <Stat label="max H = log₂|Raum|" value={`${result.spaceBits.toFixed(0)} bit`} />
            <Stat label="KL(weak ‖ uniform)" value={`${result.kl.toFixed(4)} bit`} />
            <Stat label="Buckets uniform" value={`${result.uniformBucketCount}`} />
            <Stat label="Buckets weak" value={`${result.weakBucketCount}`} />
          </div>
          <div className="text-[10px] text-muted-foreground border-t border-border pt-2 mt-2 space-y-1">
            <div>I(d;P) ≈ H(P) für deterministische Projektion ⇒ H(d|P) ≥ 256 − H(P|uniform) ≈ {(256 - result.hUniform).toFixed(2)} bit Restunsicherheit.</div>
            <div>Hohe KL-Divergenz {result.kl > 0.1 ? "✓ Detektierbar" : "✗ Statistisch nicht trennbar"} — weak-key Generator unterscheidbar von CSPRNG.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
