import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Download } from "lucide-react";
import { downloadJson, downloadCsv } from "@/lib/download";

// WEAK-KEY-DETEKTOR: Chi²-Test + KL-Divergenz + heuristischer ML-Score.
// Generiert Keys aus verschiedenen Quellen und testet Byte-Verteilung gegen Uniform.

type Gen = "csprng" | "lcg" | "biased" | "affine" | "low-entropy";

const GEN_LABELS: Record<Gen, string> = {
  csprng: "CSPRNG (crypto.getRandomValues)",
  lcg: "LCG x_{n+1} = (a·x+c) mod 2^32",
  biased: "Biased (P[bit=0] = 0.6)",
  affine: "Affine Pipeline d_{n+1} = d_n + Δ mod n",
  "low-entropy": "Low-Entropy (64 Bit + 192 Bit Null)",
};

function makeGen(kind: Gen) {
  let lcgState = (Date.now() & 0xffffffff) >>> 0;
  let affineState = 0n;
  const Q = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n; // secp256k1 n
  const DELTA = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn;
  for (let i = 0; i < 32; i++) {
    affineState = (affineState << 8n) | BigInt(Math.floor(Math.random() * 256));
  }
  return (): Uint8Array => {
    const out = new Uint8Array(32);
    switch (kind) {
      case "csprng": crypto.getRandomValues(out); break;
      case "lcg":
        for (let i = 0; i < 32; i++) {
          lcgState = (Math.imul(lcgState, 1664525) + 1013904223) >>> 0;
          out[i] = (lcgState >>> 24) & 0xff;
        }
        break;
      case "biased":
        for (let i = 0; i < 32; i++) {
          let b = 0;
          for (let j = 0; j < 8; j++) if (Math.random() > 0.6) b |= 1 << j;
          out[i] = b;
        }
        break;
      case "affine":
        affineState = (affineState + DELTA) % Q;
        let s = affineState;
        for (let i = 31; i >= 0; i--) { out[i] = Number(s & 0xffn); s >>= 8n; }
        break;
      case "low-entropy":
        crypto.getRandomValues(out.subarray(0, 8));
        break;
    }
    return out;
  };
}

function byteDistribution(samples: Uint8Array[]): number[] {
  const dist = new Array(256).fill(0);
  let total = 0;
  for (const s of samples) for (const b of s) { dist[b]++; total++; }
  return dist.map(c => c / total);
}

function chiSquared(observed: number[], totalBytes: number): { chi2: number; pBucket: number } {
  // H0: uniform → erwartete Frequenz 1/256 pro Bucket
  const expected = totalBytes / 256;
  let chi2 = 0;
  for (let i = 0; i < 256; i++) {
    const obs = observed[i] * totalBytes;
    chi2 += (obs - expected) ** 2 / expected;
  }
  // df = 255; kritischer Wert α=0.001 ≈ 330
  return { chi2, pBucket: chi2 > 330 ? 0.001 : chi2 > 290 ? 0.05 : 0.5 };
}

function klVsUniform(p: number[]): number {
  const q = 1 / 256;
  let kl = 0;
  for (const pi of p) if (pi > 0) kl += pi * Math.log2(pi / q);
  return kl;
}

export function WeakKeyDetector() {
  const [gen, setGen] = useState<Gen>("csprng");
  const [n, setN] = useState(2000);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ chi2: number; p: number; kl: number; score: number; verdict: string } | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setResult(null);
    const generator = makeGen(gen);
    const samples: Uint8Array[] = [];
    for (let i = 0; i < n; i++) {
      samples.push(generator());
      if (i % 200 === 0) await new Promise(r => setTimeout(r, 0));
    }
    const dist = byteDistribution(samples);
    const { chi2, pBucket } = chiSquared(dist, n * 32);
    const kl = klVsUniform(dist);
    // Heuristischer Score: 0..1, wo 1 = sicher weak
    const score = Math.min(1, (chi2 / 1000) * 0.5 + Math.min(kl * 10, 1) * 0.5);
    const verdict = score > 0.6 ? "WEAK — Generator detektiert"
      : score > 0.2 ? "VERDÄCHTIG"
      : "CSPRNG-kompatibel";
    setResult({ chi2, p: pBucket, kl, score, verdict });
    setRunning(false);
  }, [gen, n]);

  return (
    <div className="h-full overflow-y-auto p-4 max-w-3xl mx-auto space-y-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium">WEAK-KEY-DETEKTOR</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Chi²-Test auf Byte-Verteilung + KL-Divergenz · trennt CSPRNG von strukturierten Generatoren
        </p>
      </header>

      <div className="space-y-3">
        <label className="block text-xs">
          <span className="text-muted-foreground">Generator</span>
          <select
            value={gen}
            onChange={(e) => setGen(e.target.value as Gen)}
            disabled={running}
            className="mt-1 w-full bg-input border border-border rounded px-2 py-1 text-foreground text-xs"
          >
            {Object.entries(GEN_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>

        <label className="block text-xs">
          <span className="text-muted-foreground">Stichproben (32-Byte-Keys)</span>
          <input
            type="number" min={500} max={20000} step={500} value={n}
            onChange={(e) => setN(Math.max(500, parseInt(e.target.value) || 2000))}
            disabled={running}
            className="mt-1 w-full bg-input border border-border rounded px-2 py-1 text-foreground text-xs"
          />
        </label>

        <Button onClick={run} disabled={running} className="w-full">
          {running ? <><Loader2 className="h-3 w-3 animate-spin mr-2" />Test läuft…</> : <><Play className="h-3 w-3 mr-2" />Test starten</>}
        </Button>
      </div>

      {result && (
        <div className="border border-border rounded p-3 space-y-3 text-xs font-mono">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Statistik</div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="χ² (df=255)" value={result.chi2.toFixed(2)} />
            <Stat label="p-Wert (approx)" value={result.p.toFixed(3)} />
            <Stat label="KL(P ‖ U)" value={`${result.kl.toFixed(5)} bit`} />
            <Stat label="Score" value={`${(result.score * 100).toFixed(1)}%`} />
          </div>
          <div className={`border rounded p-2 ${result.score > 0.6 ? "border-foreground" : "border-border"}`}>
            <div className="text-[10px] text-muted-foreground">Verdict</div>
            <div className="text-sm mt-1">{result.verdict}</div>
          </div>
          <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
            Kritischer Wert χ²_{`{255, α=0.001}`} ≈ 330. χ² &gt; 330 ⇒ Nullhypothese Uniformität verworfen.
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="outline" onClick={() => downloadJson({ generator: gen, samples: n, ...result, ts: Date.now() }, "weak-key")}>
              <Download className="h-3 w-3 mr-1" />JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadCsv([
              ["metric", "value"],
              ["generator", gen],
              ["samples", n],
              ["chi2", result.chi2.toFixed(4)],
              ["p_value_approx", result.p.toFixed(4)],
              ["KL_vs_uniform_bit", result.kl.toFixed(6)],
              ["score", result.score.toFixed(4)],
              ["verdict", result.verdict],
            ], "weak-key")}>
              <Download className="h-3 w-3 mr-1" />CSV
            </Button>
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
