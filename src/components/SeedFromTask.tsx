// Wiederverwendbares Widget: Aufgabentext -> SRIL-Startvektor (H0, N0, G0, t).
// Ersetzt das "woher kommen diese Zahlen?"-Problem durch eine nachvollziehbare,
// deterministische Ableitung (SHA-256 -> Bereichsabbildung).
import { useState } from "react";
import { Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deriveSRILSeed, SEED_PRESETS, SRIL_REFERENCE, type SRILSeed } from "@/lib/srilSeed";

export function SeedFromTask({
  onSeed,
  compact = false,
}: {
  onSeed: (seed: { H: number; N: number; G: number; steps: number }) => void;
  compact?: boolean;
}) {
  const [task, setTask] = useState("");
  const [seed, setSeed] = useState<SRILSeed | null>(null);
  const [showMath, setShowMath] = useState(false);

  const apply = (text: string) => {
    if (!text.trim()) return;
    const s = deriveSRILSeed(text);
    setSeed(s);
    onSeed({ H: s.H, N: s.N, G: s.G, steps: s.steps });
  };

  return (
    <div className="border border-border rounded p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Aufgabe → Startvektor (H₀, N₀, G₀)
        </span>
        <button
          className="text-[10px] text-muted-foreground underline"
          onClick={() => { setSeed(null); onSeed(SRIL_REFERENCE); }}
        >
          Referenz laden
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") apply(task); }}
          placeholder="z. B. „secp256k1 d=3 WIF ableiten“"
          className="flex-1 text-xs bg-input border border-border rounded px-2 py-1.5 font-mono"
        />
        <Button size="sm" variant="outline" onClick={() => apply(task)} disabled={!task.trim()}>
          <Wand2 className="h-3 w-3 mr-1" />Schalten
        </Button>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-1">
          {SEED_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                if (p.task === "__reference__") { setSeed(null); setTask(""); onSeed(SRIL_REFERENCE); return; }
                setTask(p.task); apply(p.task);
              }}
              className="text-[10px] border border-border rounded px-1.5 py-0.5 hover:bg-muted font-mono"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {seed && (
        <div className="text-[10px] font-mono space-y-1">
          <div className="grid grid-cols-4 gap-2">
            <div>H₀ = {seed.H}</div>
            <div>N₀ = {seed.N}</div>
            <div>G₀ = {seed.G}</div>
            <div>t = {seed.steps}</div>
          </div>
          <div className="text-muted-foreground break-all">SHA-256: {seed.hash.slice(0, 32)}…</div>
          <button className="flex items-center gap-1 underline" onClick={() => setShowMath((v) => !v)}>
            {showMath ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Herleitung
          </button>
          {showMath && (
            <pre className="whitespace-pre-wrap opacity-70 border-l-2 border-border pl-2">
              {seed.derivation.join("\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
