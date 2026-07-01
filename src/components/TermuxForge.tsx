import { useState, useRef } from "react";
import { Play, Square, Download, Copy, Loader2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AI_MODELS, DEFAULT_MODEL, loadCustomKeys, type CustomKeys } from "@/lib/aiModels";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { callMathChat } from "@/lib/aiStream";
import { downloadText } from "@/lib/download";

/**
 * TERMUX-FORGE
 * Silent Multi-Agent Pipeline: PLANNER → CODER → LINTER → FIXER → PACKAGER
 * Der User sieht nur Fortschritt – nicht das interne Geschwätz.
 * Ergebnis: fertiges, syntaxgeprüftes bash/python-Script für Termux
 * inkl. pkg/pip-Abhängigkeiten, Fehlerbehandlung und Kurzanleitung.
 */

type Stage = "idle" | "plan" | "code" | "lint" | "fix" | "pack" | "done" | "error";

const STAGES: { id: Stage; label: string }[] = [
  { id: "plan", label: "PLAN" },
  { id: "code", label: "CODE" },
  { id: "lint", label: "PRÜFUNG" },
  { id: "fix",  label: "FIX" },
  { id: "pack", label: "PAKET" },
];

// System-Prompts – jeder Agent hat scharf umrissenen Job und Ausgabe-Format.
const P_PLAN = `Du bist PLANNER für Termux-Scripts (Android). Analysiere die User-Anforderung und liefere kompakten JSON-Plan.
Antworte AUSSCHLIESSLICH als gültiges JSON, keine Prosa, keine Codefences:
{
 "language": "bash" | "python",
 "filename": "kebab-case.sh oder .py",
 "termux_packages": ["python","curl",...],   // via 'pkg install'
 "pip_packages": ["requests",...],            // nur wenn python
 "permissions": ["storage","microphone",...], // termux-setup-storage / termux-api Bedarfe
 "steps": ["kurzer Schritt 1", "..."],
 "risks": ["was schiefgehen kann"],
 "notes": "sehr kurz"
}`;

const P_CODE = `Du bist CODER. Schreibe basierend auf dem Plan ein VOLLSTÄNDIGES, lauffähiges Script für Termux.
REGELN:
- Wenn bash: Shebang '#!/data/data/com.termux/files/usr/bin/env bash', 'set -euo pipefail', klare Fehlermeldungen.
- Wenn python: Shebang '#!/data/data/com.termux/files/usr/bin/env python3', try/except, Argparse falls Args.
- Alle Abhängigkeiten selbst prüfen (command -v ... || pkg install -y ...).
- Keine Root-Annahmen. Pfade: $HOME, $PREFIX, ~/storage/shared für Termux.
- Deutsche Kommentare, englische Bezeichner.
- Keine Markdown-Codefences. Nur reiner Script-Code als Antwort.`;

const P_LINT = `Du bist LINTER. Prüfe das Script auf: Syntaxfehler, ShellCheck-typische Fehler (bash), Python-Syntax/Import-Fehler, fehlende Quoting, unbenutzte Variablen, race conditions, race auf $PREFIX vor Install, Termux-Inkompatibilitäten (sudo, systemctl, /etc/…), fehlende Abhängigkeitschecks, unsichere eval/rm -rf.
Antworte AUSSCHLIESSLICH als JSON:
{
 "verdict": "clean" | "issues",
 "issues": [{"severity":"error|warn","line":N,"message":"..."}],
 "hardening_notes": ["..."]
}`;

const P_FIX = `Du bist FIXER. Wende alle LINTER-Findings auf das Script an. Behalte Funktion und Struktur bei. Füge fehlende Fehlerbehandlung, Quoting, Dependency-Checks hinzu. Antworte NUR mit dem korrigierten Script, ohne Codefences, ohne Erklärung.`;

const P_PACK = `Du bist PACKAGER. Erzeuge Markdown-Anleitung für den Endnutzer (Termux auf Android).
Struktur:
# <Name>
## Installation (einmalig)
\`\`\`bash
pkg update && pkg install -y <pkgs>
\`\`\`
## Optional
- termux-setup-storage falls Storage nötig
- pkg install termux-api falls Sensor/Zwischenablage/etc
## Datei erstellen
\`\`\`bash
nano ~/<filename>
# Inhalt einfügen, STRG+O, ENTER, STRG+X
chmod +x ~/<filename>
\`\`\`
## Ausführung
\`\`\`bash
./~/<filename>   # oder: bash / python3 ~/<filename>
\`\`\`
## Was macht das Script
kurze Erklärung in 2-4 Sätzen.
## Troubleshooting
- häufige Fehler + Lösung.
Antworte NUR mit dem Markdown.`;

function stripFences(s: string): string {
  const m = s.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return (m ? m[1] : s).trim();
}
function safeJson<T>(s: string): T | null {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

export function TermuxForge() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>(() => localStorage.getItem("ai-model") || DEFAULT_MODEL);
  const [keys, setKeys] = useState<CustomKeys>(loadCustomKeys());
  const [stage, setStage] = useState<Stage>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [script, setScript] = useState("");
  const [readme, setReadme] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [lint, setLint] = useState<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const say = (s: string) => setLog(l => [...l, s]);

  const run = async () => {
    if (!prompt.trim()) return;
    setStage("plan");
    setLog([]);
    setScript("");
    setReadme("");
    setPlan(null);
    setLint(null);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const call = (sys: string, user: string) => callMathChat({
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      model, customKeys: keys, strictMode: false, signal,
    });

    try {
      // 1) PLAN
      say("· Analysiere Anforderung …");
      const planRaw = await call(P_PLAN, prompt);
      const planObj = safeJson<any>(planRaw);
      if (!planObj) throw new Error("Plan konnte nicht geparst werden");
      setPlan(planObj);
      say(`✓ Plan: ${planObj.language} · ${planObj.filename} · ${(planObj.termux_packages||[]).length} pkg`);
      setStage("code");

      // 2) CODE
      say("· Generiere Script …");
      const codeRaw = await call(P_CODE, `Plan:\n${JSON.stringify(planObj, null, 2)}\n\nUser-Anforderung:\n${prompt}`);
      let code = stripFences(codeRaw);
      say(`✓ ${code.split("\n").length} Zeilen erzeugt`);
      setStage("lint");

      // 3) LINT
      say("· Statische Prüfung (Syntax + Termux-Kompatibilität) …");
      const lintRaw = await call(P_LINT, `Sprache: ${planObj.language}\n\n${code}`);
      const lintObj = safeJson<any>(lintRaw) || { verdict: "clean", issues: [] };
      setLint(lintObj);
      const errCount = (lintObj.issues || []).filter((i: any) => i.severity === "error").length;
      const warnCount = (lintObj.issues || []).filter((i: any) => i.severity === "warn").length;
      say(`✓ Prüfung: ${errCount} Fehler · ${warnCount} Warnungen`);

      // 4) FIX (nur wenn nötig)
      if (lintObj.verdict === "issues" && (lintObj.issues || []).length > 0) {
        setStage("fix");
        say("· Wende Fixes an …");
        const fixed = await call(P_FIX, `Script:\n${code}\n\nFindings:\n${JSON.stringify(lintObj, null, 2)}`);
        code = stripFences(fixed);
        say(`✓ Korrigierte Version: ${code.split("\n").length} Zeilen`);
      } else {
        say("· Kein Fix nötig – Script sauber");
      }
      setScript(code);

      // 5) PACK
      setStage("pack");
      say("· Baue Installations-/Nutzungs-Anleitung …");
      const readmeRaw = await call(P_PACK,
        `Sprache: ${planObj.language}\nFilename: ${planObj.filename}\nPakete: ${(planObj.termux_packages||[]).join(" ")}\nPip: ${(planObj.pip_packages||[]).join(" ")}\nZweck: ${prompt}\n\nScript:\n${code}`);
      setReadme(readmeRaw.trim());
      say("✓ Fertig.");
      setStage("done");
    } catch (e: any) {
      if (e?.name === "AbortError") { setStage("idle"); return; }
      say(`✗ Fehler: ${e?.message || e}`);
      setStage("error");
      toast({ variant: "destructive", title: "Pipeline-Fehler", description: String(e?.message || e) });
    }
  };

  const stop = () => { abortRef.current?.abort(); };

  const stageIndex = STAGES.findIndex(s => s.id === stage);
  const running = stage !== "idle" && stage !== "done" && stage !== "error";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <header className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h1 className="text-lg font-medium">TERMUX-FORGE</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Multi-Agent Pipeline: Plan → Code → Lint → Fix → Paket. Nur Ergebnis wird gezeigt.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => { setModel(e.target.value); localStorage.setItem("ai-model", e.target.value); }}
              disabled={running}
              className="text-xs bg-input border border-border rounded px-2 py-1"
            >
              {Object.entries(AI_MODELS.reduce((a, m) => { (a[m.provider] ||= []).push(m); return a; }, {} as Record<string, typeof AI_MODELS>)).map(([p, list]) => (
                <optgroup key={p} label={p}>
                  {list.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </optgroup>
              ))}
            </select>
            <ApiKeyManager onChange={setKeys} />
          </div>
        </header>

        {/* Prompt */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Was soll das Termux-Script tun?</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="z.B. Backup meines ~/storage/shared/DCIM Ordners als tar.gz mit Datum, prüft Speicherplatz vorher, sendet Push via termux-notification wenn fertig"
            className="min-h-[90px] text-sm"
            disabled={running}
          />
          <div className="flex flex-wrap gap-1">
            {[
              "Kompletter WLAN-Scanner mit ARP-Lookup und JSON-Report",
              "Batterie-Logger jede Minute in CSV, Plot am Ende via matplotlib",
              "Youtube-Audio Download (yt-dlp) mit Playlist-Support in ~/storage/music",
              "Auto-Backup aller SMS via termux-sms-list nach JSON",
              "Reverse-SSH-Tunnel Watchdog mit Auto-Restart",
            ].map(s => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                disabled={running}
                className="text-[10px] px-2 py-1 border border-border rounded hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {!running ? (
              <Button onClick={run} disabled={!prompt.trim()} size="sm" className="gap-1">
                <Play className="h-3 w-3" /> FORGE
              </Button>
            ) : (
              <Button onClick={stop} variant="outline" size="sm" className="gap-1">
                <Square className="h-3 w-3" /> Stop
              </Button>
            )}
          </div>
        </div>

        {/* Pipeline-Status */}
        {stage !== "idle" && (
          <div className="border border-border rounded p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              {STAGES.map((s, i) => {
                const done = stageIndex > i || stage === "done";
                const active = stage === s.id;
                return (
                  <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                    {done ? <CheckCircle2 className="h-4 w-4 text-foreground" />
                      : active ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-[9px] ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] font-mono space-y-0.5 max-h-32 overflow-y-auto">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        )}

        {/* Ergebnis */}
        {script && stage === "done" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">FERTIGES SCRIPT</h2>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                  onClick={() => { navigator.clipboard.writeText(script); toast({ title: "Kopiert" }); }}>
                  <Copy className="h-3 w-3" /> Copy
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                  onClick={() => downloadText(script, plan?.filename?.replace(/\.[^.]+$/, "") || "termux-script",
                    plan?.language === "python" ? "py" : "sh",
                    plan?.language === "python" ? "text/x-python" : "text/x-shellscript")}>
                  <Download className="h-3 w-3" /> {plan?.filename || "script"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                  onClick={() => downloadText(readme, "README", "md", "text/markdown")}>
                  <Download className="h-3 w-3" /> README.md
                </Button>
              </div>
            </div>

            {lint && (lint.issues || []).length > 0 && (
              <details className="text-[11px] border border-border rounded p-2">
                <summary className="cursor-pointer text-muted-foreground">
                  Lint-Report ({lint.issues.length}) – behoben in aktueller Version
                </summary>
                <ul className="mt-2 space-y-1 font-mono">
                  {lint.issues.map((i: any, k: number) => (
                    <li key={k}>[{i.severity}] Z.{i.line}: {i.message}</li>
                  ))}
                </ul>
              </details>
            )}

            <pre className="text-[11px] font-mono bg-muted p-3 rounded overflow-x-auto max-h-96 whitespace-pre">
{script}
            </pre>

            {readme && (
              <div>
                <h2 className="text-sm font-medium mb-2">ANLEITUNG</h2>
                <pre className="text-[11px] font-mono bg-muted p-3 rounded overflow-x-auto max-h-96 whitespace-pre-wrap">
{readme}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
