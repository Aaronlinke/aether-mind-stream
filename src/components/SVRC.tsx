import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSVRC } from "@/lib/svrc";
import { downloadJson } from "@/lib/download";

export function SVRC() {
  const svrc = getSVRC();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);
  const [auto, setAuto] = useState(false);
  const [question, setQuestion] = useState("");
  const [log, setLog] = useState<{ role: "user" | "svrc"; text: string }[]>([]);
  const [data, setData] = useState("1,2,3,5,8,13,21,34,55");
  const [result, setResult] = useState<string>("");

  // Render field
  useEffect(() => {
    const cnv = canvasRef.current; if (!cnv) return;
    const ctx = cnv.getContext("2d"); if (!ctx) return;
    const N = svrc.field.size;
    const cell = Math.floor(cnv.width / N);
    const I = svrc.field.intensity();
    let mx = 1e-9; for (const v of I) if (v > mx) mx = v;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const v = I[i * N + j] / mx;
      const g = Math.floor(v * 255);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(j * cell, i * cell, cell, cell);
    }
  }, [tick, svrc]);

  // Auto-Think
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => { svrc.think(2); setTick(t => t + 1); }, 500);
    return () => clearInterval(id);
  }, [auto, svrc]);

  const ask = () => {
    if (!question.trim()) return;
    const q = question.trim();
    const a = svrc.ask(q);
    setLog(l => [...l, { role: "user", text: q }, { role: "svrc", text: a }]);
    setQuestion("");
    setTick(t => t + 1);
  };

  const analyze = () => {
    const arr = data.split(/[,\s]+/).map(Number).filter(v => Number.isFinite(v));
    if (!arr.length) { setResult("Keine Zahlen erkannt."); return; }
    const hash = svrc.learning.learn(arr);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
    setResult(`Muster=${hash} · n=${arr.length} · μ=${mean.toFixed(3)} · σ=${std.toFixed(3)}`);
  };

  const decide = () => {
    const d = svrc.decision.decide();
    setLog(l => [...l, { role: "svrc", text: `Entscheidung: ${d.name} (${(d.prob * 100).toFixed(1)}%) – ${d.context}` }]);
  };

  const st = svrc.field.stats();

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="border border-border p-3">
        <div className="text-xs text-muted-foreground mb-1">SVRC-ECI · Living Field</div>
        <div className="text-sm">Ein selbstevolvierendes Bewusstseinsfeld (nichtlin. Schrödinger, 32×32). Geteilter Kern – jede KI im System kann `getSVRC()` konsultieren.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">FELD (Intensität)</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { svrc.think(10); setTick(t => t + 1); }}>Think ×10</Button>
              <Button size="sm" variant={auto ? "default" : "outline"} onClick={() => setAuto(a => !a)}>{auto ? "Stop" : "Auto"}</Button>
            </div>
          </div>
          <canvas ref={canvasRef} width={320} height={320} className="border border-border w-full max-w-[320px] bg-black" />
          <div className="text-[10px] font-mono grid grid-cols-2 gap-1">
            <div>Energie: {st.energy.toFixed(3)}</div>
            <div>Entropie: {st.entropy.toFixed(3)}</div>
            <div>μ: {st.mean.toFixed(4)}</div>
            <div>σ: {st.std.toFixed(4)}</div>
            <div>Muster: {svrc.learning.patterns.length}</div>
            <div>Erinnerungen: {svrc.memory.memories.length}</div>
          </div>
        </div>

        <div className="border border-border p-3 space-y-2">
          <div className="text-xs text-muted-foreground">CHAT / FRAGE</div>
          <ScrollArea className="h-48 border border-border p-2">
            {log.length === 0 && <div className="text-xs text-muted-foreground">Frag das Feld…</div>}
            {log.map((m, i) => (
              <div key={i} className={`text-xs mb-1 ${m.role === "user" ? "text-foreground" : "text-primary"}`}>
                <b>{m.role === "user" ? "DU" : "SVRC"}:</b> {m.text}
              </div>
            ))}
          </ScrollArea>
          <div className="flex gap-2">
            <Input value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ask()} placeholder="z.B. Zeig mir ein Muster" />
            <Button size="sm" onClick={ask}>Fragen</Button>
            <Button size="sm" variant="outline" onClick={decide}>Entscheiden</Button>
          </div>
        </div>

        <div className="border border-border p-3 space-y-2 md:col-span-2">
          <div className="text-xs text-muted-foreground">DATENANALYSE</div>
          <Textarea value={data} onChange={e => setData(e.target.value)} rows={2} className="font-mono text-xs" />
          <div className="flex gap-2">
            <Button size="sm" onClick={analyze}>Analysieren</Button>
            <Button size="sm" variant="outline" onClick={() => downloadJson("svrc-snapshot.json", {
              stats: st,
              patterns: svrc.learning.patterns,
              memories: svrc.memory.memories.slice(-50),
              options: svrc.decision.options,
              history: svrc.field.history,
            })}>Snapshot ↓</Button>
          </div>
          {result && <div className="text-xs font-mono border-l-2 border-primary pl-2">{result}</div>}
        </div>

        <div className="border border-border p-3 md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">KI-INTEGRATION</div>
          <div className="text-xs">
            Alle KIs (CHAT, DEBATTE, QUAD-KI, KOLLEKTIV) können via <code>getSVRC().contextSnapshot()</code> den Live-Zustand
            als Kontext in ihre Prompts injizieren. Aktueller Snapshot:
          </div>
          <div className="text-[11px] font-mono mt-2 border border-border p-2 bg-muted/20">
            {svrc.contextSnapshot()}
          </div>
        </div>
      </div>
    </div>
  );
}
