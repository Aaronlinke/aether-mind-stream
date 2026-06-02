import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2, Brain, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { callMathChat } from "@/lib/aiStream";
import { AI_MODELS, DEFAULT_MODEL, loadCustomKeys, modelRequiresKey, type CustomKeys } from "@/lib/aiModels";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { downloadJson, downloadMarkdown } from "@/lib/download";

// KOLLEKTIV: N parallele Solver (5–100) → Synthese.
// Jeder Bot bekommt eine eigene Rolle/Strategie. Concurrency 8 um Rate-Limits zu schonen.

const ROLES = [
  "Algebraiker (symbolisch, exakt)",
  "Numeriker (Approximation, Konvergenz)",
  "Geometer (visuell-topologisch)",
  "Logiker (Aussagenlogik, Beweisprüfer)",
  "Kombinatoriker (Zählen, Bijektionen)",
  "Zahlentheoretiker (Modulo, Primzahlen)",
  "Analyst (Grenzwerte, Reihen, Differential)",
  "Statistiker (Wahrscheinlichkeit, Verteilung)",
  "Kryptograf (Hashes, ECC, Komplexität)",
  "Informatiker (Algorithmus, O-Notation)",
  "Physiker (dimensionale Analyse, Einheiten)",
  "Skeptiker (sucht Gegenbeispiele)",
  "Vereinfacher (Reduktion auf Spezialfall)",
  "Verallgemeinerer (Abstraktion)",
  "Konstruktivist (expliziter Beweis)",
  "Topologe (Stetigkeit, Mannigfaltigkeiten)",
  "Lineare-Algebra-Experte (Matrizen, Eigenwerte)",
  "Diskrete-Math-Experte (Graphen, Gitter)",
  "Optimierer (Lagrange, Gradient)",
  "Bayesianer (Inferenz, Prior)",
];

function roleFor(i: number): string {
  return ROLES[i % ROLES.length];
}

async function chunkRun<T, R>(items: T[], concurrency: number, fn: (t: T, i: number) => Promise<R>, onProgress: (done: number) => void): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
      done++;
      onProgress(done);
    }
  });
  await Promise.all(workers);
  return results;
}

type BotResult = { i: number; role: string; answer: string; error?: string };

export function Kollektiv() {
  const [problem, setProblem] = useState("");
  const [n, setN] = useState(20);
  const [solverModel, setSolverModel] = useState(DEFAULT_MODEL);
  const [synthModel, setSynthModel] = useState(DEFAULT_MODEL);
  const [customKeys, setCustomKeys] = useState<CustomKeys>(() => loadCustomKeys());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bots, setBots] = useState<BotResult[]>([]);
  const [synthesis, setSynthesis] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const stop = useCallback(() => { abortRef.current?.abort(); setRunning(false); }, []);

  const run = useCallback(async () => {
    if (!problem.trim()) { toast({ variant: "destructive", title: "Aufgabe fehlt" }); return; }
    for (const m of [solverModel, synthModel]) {
      const c = modelRequiresKey(m, customKeys);
      if (!c.ok) { toast({ variant: "destructive", title: `${c.missing}-Key fehlt` }); return; }
    }
    setRunning(true);
    setProgress(0);
    setBots([]);
    setSynthesis("");
    abortRef.current = new AbortController();

    const items = Array.from({ length: n }, (_, i) => i);
    try {
      const results = await chunkRun(items, 8, async (i) => {
        const role = roleFor(i);
        const sys = `Du bist Bot #${i + 1} im KOLLEKTIV. Rolle: ${role}. Löse die Aufgabe streng aus dieser Perspektive. Max 120 Wörter. Notation präzise. Bei Annahmen: [Annahme] markieren.`;
        try {
          const ans = await callMathChat({
            messages: [
              { role: "system", content: sys },
              { role: "user", content: problem },
            ],
            model: solverModel, customKeys, strictMode: false,
            signal: abortRef.current!.signal,
          });
          const r: BotResult = { i, role, answer: ans };
          setBots(prev => [...prev, r].sort((a, b) => a.i - b.i));
          return r;
        } catch (e) {
          const r: BotResult = { i, role, answer: "", error: (e as Error).message };
          setBots(prev => [...prev, r].sort((a, b) => a.i - b.i));
          return r;
        }
      }, setProgress);

      // Synthese
      const valid = results.filter(r => !r.error && r.answer);
      const transcript = valid.map(r => `[Bot #${r.i + 1} · ${r.role}]\n${r.answer}`).join("\n\n");
      const synthPrompt = `Du bist die SYNTHESE-INSTANZ über ${valid.length} Solver-Bots. Aufgabe:\n\n${problem}\n\nBot-Antworten:\n\n${transcript}\n\nLiefere die endgültige, präzise Lösung:
1. KONSENS-LÖSUNG (was die Mehrheit übereinstimmend ableitet)
2. KORREKTE EINZELBEITRÄGE (welche Bots haben Recht, falls Mehrheit irrt)
3. VOLLSTÄNDIGER BEWEIS / RECHENWEG (Schritt für Schritt)
4. ENDERGEBNIS (klar markiert)
5. KOMPLEXITÄT / KOSTEN (falls relevant)
Streng mathematisch. Keine Mythologie, keine Floskeln.`;

      let synth = "";
      await callMathChat({
        messages: [{ role: "user", content: synthPrompt }],
        model: synthModel, customKeys, strictMode: true,
        signal: abortRef.current.signal,
        onDelta: (d) => { synth += d; setSynthesis(synth); },
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast({ variant: "destructive", title: "Fehler", description: (e as Error).message });
      }
    } finally {
      setRunning(false);
    }
  }, [problem, n, solverModel, synthModel, customKeys, toast]);

  return (
    <div className="h-full overflow-y-auto p-4 max-w-5xl mx-auto space-y-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium flex items-center gap-2"><Brain className="h-4 w-4" />KOLLEKTIV</h1>
        <p className="text-xs text-muted-foreground mt-1">
          N Solver-Bots (5–100) lösen parallel mit unterschiedlichen Strategien · Synthese-Instanz aggregiert
        </p>
      </header>

      <div className="space-y-3">
        <textarea
          value={problem} onChange={(e) => setProblem(e.target.value)}
          rows={4} disabled={running}
          placeholder="Beliebige mathematische Aufgabe. Beispiele:&#10;• Löse x⁴ − 10x² + 9 = 0 vollständig in ℂ&#10;• Beweise: Σ 1/n² = π²/6&#10;• Komplexität des LLL-Algorithmus für n=512?"
          className="w-full bg-input border border-border rounded px-2 py-2 text-foreground text-sm font-mono"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <label className="block">
            <span className="text-muted-foreground">Bots N</span>
            <input
              type="number" min={5} max={100} step={5} value={n}
              onChange={(e) => setN(Math.max(5, Math.min(100, parseInt(e.target.value) || 20)))}
              disabled={running}
              className="mt-1 w-full bg-input border border-border rounded px-2 py-1 text-foreground"
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">Solver-Modell</span>
            <select value={solverModel} onChange={(e) => setSolverModel(e.target.value)} disabled={running}
              className="mt-1 w-full bg-input border border-border rounded px-2 py-1 text-foreground">
              {AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground">Synthese-Modell</span>
            <select value={synthModel} onChange={(e) => setSynthModel(e.target.value)} disabled={running}
              className="mt-1 w-full bg-input border border-border rounded px-2 py-1 text-foreground">
              {AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ApiKeyManager onChange={setCustomKeys} />
          {!running ? (
            <Button onClick={run} size="sm"><Play className="h-3 w-3 mr-1" />Start</Button>
          ) : (
            <Button onClick={stop} size="sm" variant="destructive"><Square className="h-3 w-3 mr-1" />Stop</Button>
          )}
          {running && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progress}/{n} Bots fertig
            </div>
          )}
          {(bots.length > 0 || synthesis) && (
            <>
              <Button size="sm" variant="outline" onClick={() => downloadJson({ problem, n, solverModel, synthModel, bots, synthesis, ts: Date.now() }, "kollektiv")}>
                <Download className="h-3 w-3 mr-1" />JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                const md = `# KOLLEKTIV-Lauf\n\n**Aufgabe:** ${problem}\n\n**Bots:** ${bots.length} · **Solver:** ${solverModel} · **Synthese:** ${synthModel}\n\n## Synthese\n\n${synthesis || "(keine)"}\n\n---\n\n## Einzelantworten\n\n${bots.map(b => `### Bot #${b.i + 1} · ${b.role}\n\n${b.error ? "Fehler: " + b.error : b.answer}`).join("\n\n")}`;
                downloadMarkdown(md, "kollektiv");
              }}>
                <Download className="h-3 w-3 mr-1" />Markdown
              </Button>
            </>
          )}
        </div>
      </div>

      {synthesis && (
        <div className="border-2 border-foreground rounded p-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wider">⬢ KOLLEKTIV-SYNTHESE</div>
          <pre className="text-xs whitespace-pre-wrap font-sans">{synthesis}</pre>
        </div>
      )}

      {bots.length > 0 && (
        <details className="border border-border rounded">
          <summary className="text-xs p-2 cursor-pointer text-muted-foreground hover:text-foreground">
            Einzelne Bot-Antworten ({bots.length})
          </summary>
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {bots.map(b => (
              <div key={b.i} className="border border-border rounded p-2">
                <div className="text-[10px] text-muted-foreground">Bot #{b.i + 1} · {b.role}</div>
                {b.error
                  ? <div className="text-xs text-destructive mt-1">Fehler: {b.error}</div>
                  : <pre className="text-xs whitespace-pre-wrap font-sans mt-1">{b.answer}</pre>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
