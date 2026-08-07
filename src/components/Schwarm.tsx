import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Square, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AI_MODELS, DEFAULT_MODEL, loadCustomKeys, modelRequiresKey, type CustomKeys } from "@/lib/aiModels";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { downloadJson, downloadMarkdown } from "@/lib/download";
import { runSwarm, DEFAULT_ROLES, type SwarmPhase, type SwarmRun } from "@/lib/swarm";

// SCHWARM: Kern-Agenten denken kollektiv am gleichen Blackboard, schalten Mikro-Agenten
// fuer atomare Teilaufgaben und halten je eine eigene divergente Denkspur.

export function Schwarm() {
  const [task, setTask] = useState("Bestimme alle x in Z mit x^2 ≡ 1 (mod 2^k) für k ≥ 3 und beweise die Anzahl der Lösungen.");
  const [model, setModel] = useState(() => localStorage.getItem("ai-model") || DEFAULT_MODEL);
  const [microModel, setMicroModel] = useState("google/gemini-2.5-flash-lite");
  const [agentCount, setAgentCount] = useState(4);
  const [rounds, setRounds] = useState(2);
  const [maxMicro, setMaxMicro] = useState(2);
  const [strictMode, setStrictMode] = useState(() => localStorage.getItem("strict-mode") === "1");
  const [customKeys, setCustomKeys] = useState<CustomKeys>(() => loadCustomKeys());
  const [run, setRun] = useState<SwarmRun | null>(null);
  const [phase, setPhase] = useState<SwarmPhase>("idle");
  const [note, setNote] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const { toast } = useToast();
  const busy = phase === "denken" || phase === "mikro" || phase === "synthese";

  const start = async () => {
    if (!task.trim() || busy) return;
    for (const id of [model, microModel]) {
      const k = modelRequiresKey(id, customKeys);
      if (!k.ok) {
        toast({ variant: "destructive", title: `${k.missing?.toUpperCase()} API-Key fehlt`,
          description: "Im Keys-Dialog hinterlegen oder ein Lovable-Modell wählen." });
        return;
      }
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setRun(null);
    setPhase("denken");
    setNote("");
    try {
      const result = await runSwarm({
        task: task.trim(),
        model,
        microModel,
        rounds,
        agentCount,
        maxMicroPerAgent: maxMicro,
        strictMode,
        customKeys,
        signal: ac.signal,
        onEvent: (r, p, n) => { setRun(r); setPhase(p); if (n) setNote(n); },
      });
      setRun(result);
      setPhase("fertig");
    } catch (e) {
      setPhase("fehler");
      if (!ac.signal.aborted) {
        toast({ variant: "destructive", title: "Schwarm-Fehler",
          description: e instanceof Error ? e.message : "Unbekannter Fehler" });
      }
    }
  };

  const stop = () => { abortRef.current?.abort(); setPhase("idle"); };

  const exportMd = () => {
    if (!run) return;
    const md =
      `# SCHWARM · Kollektiv-Protokoll\n\n**Aufgabe:** ${run.task}\n\n` +
      `**Modell:** ${model} · Mikro: ${microModel} · Runden: ${run.rounds} · ` +
      `Kern-Agenten: ${run.agents.length} · Mikro-Agenten: ${run.micro.length}\n\n---\n\n` +
      `## Synthese\n\n${run.synthesis}\n\n## Divergente Spuren\n\n` +
      run.agents.map(a => `### ${a.name}\n${a.role}\n\n${a.divergent || "(keine)"}`).join("\n\n") +
      `\n\n## Mikro-Agenten\n\n` +
      run.micro.map(m => `- **[${m.parent}/µ R${m.round}]** ${m.spec}\n  - ${m.result ?? "-"} (${m.ms ?? 0} ms, ${m.status})`).join("\n") +
      `\n\n## Blackboard\n\n` +
      run.blackboard.map(b => `- \`R${b.round} ${b.kind} ${b.author}\` ${b.text}`).join("\n");
    downloadMarkdown(md, "schwarm-protokoll");
  };

  const microDone = run?.micro.filter(m => m.status === "fertig").length ?? 0;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="border border-border p-3 space-y-1">
        <div className="text-xs text-muted-foreground">SCHWARM · Kollektiv mit Mikro-Agenten</div>
        <div className="text-sm">
          Kern-Agenten denken parallel am gleichen Blackboard (jeder sieht jeden Gedanken), schalten
          selbstständig Mikro-Agenten für atomare Teilaufgaben und halten je eine eigene divergente Spur,
          die am Ende einzeln bewertet und geschlossen wird.
        </div>
      </div>

      <div className="border border-border p-3 space-y-3">
        <Textarea value={task} onChange={e => setTask(e.target.value)} rows={3} disabled={busy}
          className="font-mono text-xs" placeholder="Aufgabe für den Schwarm…" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] text-muted-foreground">
          <label className="space-y-1">
            <div>KERN-MODELL</div>
            <select value={model} onChange={e => setModel(e.target.value)} disabled={busy}
              className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-xs">
              {AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <div>MIKRO-MODELL</div>
            <select value={microModel} onChange={e => setMicroModel(e.target.value)} disabled={busy}
              className="w-full bg-input border border-border rounded px-2 py-1 text-foreground text-xs">
              {AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <div>KERN-AGENTEN: {agentCount}</div>
            <input type="range" min={2} max={DEFAULT_ROLES.length} value={agentCount} disabled={busy}
              onChange={e => setAgentCount(Number(e.target.value))} className="w-full" />
          </label>
          <label className="space-y-1">
            <div>RUNDEN: {rounds}</div>
            <input type="range" min={1} max={4} value={rounds} disabled={busy}
              onChange={e => setRounds(Number(e.target.value))} className="w-full" />
          </label>
          <label className="space-y-1">
            <div>MIKRO / AGENT: {maxMicro}</div>
            <input type="range" min={0} max={4} value={maxMicro} disabled={busy}
              onChange={e => setMaxMicro(Number(e.target.value))} className="w-full" />
          </label>
          <label className="flex items-end gap-1 cursor-pointer">
            <input type="checkbox" checked={strictMode} disabled={busy}
              onChange={e => setStrictMode(e.target.checked)} />
            STRIKT
          </label>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {!busy ? (
            <Button size="sm" onClick={start} disabled={!task.trim()}>
              <Play className="h-3 w-3 mr-1" />Schwarm starten
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={stop}>
              <Square className="h-3 w-3 mr-1" />Stop
            </Button>
          )}
          <ApiKeyManager onChange={setCustomKeys} />
          {run && !busy && (
            <>
              <Button size="sm" variant="outline" onClick={exportMd}>
                <Download className="h-3 w-3 mr-1" />MD
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadJson(run, "schwarm-run")}>JSON</Button>
            </>
          )}
          {busy && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {phase.toUpperCase()} · {note}
            </span>
          )}
        </div>

        {run && (
          <div className="text-[10px] font-mono text-muted-foreground">
            Beiträge: {run.blackboard.filter(b => b.kind === "beitrag").length} ·
            Mikro: {microDone}/{run.micro.length} ·
            Spuren: {run.agents.filter(a => a.divergent).length} ·
            Dauer: {(((run.finishedAt ?? Date.now()) - run.startedAt) / 1000).toFixed(1)} s
          </div>
        )}
      </div>

      {run && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-border p-3 space-y-2">
            <div className="text-xs text-muted-foreground">KERN-AGENTEN & EIGENE SPUREN</div>
            {run.agents.map(a => (
              <div key={a.id} className="border-l-2 border-primary pl-2 space-y-1">
                <div className="text-xs font-medium">{a.name} <span className="text-muted-foreground font-normal">· {a.microCount} µ</span></div>
                <div className="text-[10px] text-muted-foreground">{a.role}</div>
                {a.divergent && <div className="text-[11px] whitespace-pre-wrap">{a.divergent}</div>}
              </div>
            ))}
          </div>

          <div className="border border-border p-3 space-y-2">
            <div className="text-xs text-muted-foreground">MIKRO-AGENTEN</div>
            {run.micro.length === 0 && <div className="text-[11px] text-muted-foreground">(keine geschaltet)</div>}
            {run.micro.map(m => (
              <div key={m.id} className="text-[11px] border-b border-border pb-1">
                <div className="font-mono text-[10px] text-muted-foreground">
                  [{m.parent}/µ R{m.round}] {m.status}{m.ms ? ` · ${m.ms} ms` : ""}
                </div>
                <div>{m.spec}</div>
                {m.result && <div className="text-muted-foreground whitespace-pre-wrap">{m.result}</div>}
              </div>
            ))}
          </div>

          <div className="border border-border p-3 space-y-2 lg:col-span-2">
            <div className="text-xs text-muted-foreground">BLACKBOARD (gemeinsames Gedächtnis)</div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {run.blackboard.map((b, i) => (
                <div key={i} className="text-[11px]">
                  <span className="font-mono text-[10px] text-muted-foreground mr-1">R{b.round} {b.kind} {b.author}</span>
                  <span className="whitespace-pre-wrap">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {run.synthesis && (
            <div className="border border-border p-3 lg:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">SCHLIESSUNG / SYNTHESE</div>
              <div className="text-sm whitespace-pre-wrap">{run.synthesis}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
