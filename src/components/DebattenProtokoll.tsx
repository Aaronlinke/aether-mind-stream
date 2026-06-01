import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { callMathChat } from "@/lib/aiStream";
import { AI_MODELS, DEFAULT_MODEL, loadCustomKeys, modelRequiresKey } from "@/lib/aiModels";
import { ApiKeyManager } from "@/components/ApiKeyManager";

type Session = { topic: string; messages: Array<{ agent: string; content: string }>; ts: number };

export function DebattenProtokoll() {
  const [session, setSession] = useState<Session | null>(null);
  const [pasted, setPasted] = useState("");
  const [tldr, setTldr] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [running, setRunning] = useState(false);
  const [customKeys, setCustomKeys] = useState(loadCustomKeys());
  const { toast } = useToast();

  useEffect(() => {
    const raw = localStorage.getItem("quad-last-session");
    if (raw) try { setSession(JSON.parse(raw)); } catch { /* noop */ }
  }, []);

  const toMarkdown = useCallback((s: Session): string => {
    const lines: string[] = [];
    lines.push(`# Debatten-Protokoll`);
    lines.push(``);
    lines.push(`**Thema:** ${s.topic}`);
    lines.push(`**Zeitstempel:** ${new Date(s.ts).toISOString()}`);
    lines.push(`**Beiträge:** ${s.messages.length}`);
    if (tldr) {
      lines.push(``); lines.push(`## TL;DR (DELTA-Synthese)`); lines.push(``); lines.push(tldr);
    }
    lines.push(``); lines.push(`---`); lines.push(``);
    for (const m of s.messages) {
      lines.push(`### ${m.agent.toUpperCase()}`);
      lines.push(``);
      lines.push(m.content);
      lines.push(``);
    }
    return lines.join("\n");
  }, [tldr]);

  const download = useCallback(() => {
    const s = session ?? (pasted ? { topic: "Manuell eingefügt", messages: [{ agent: "raw", content: pasted }], ts: Date.now() } : null);
    if (!s) { toast({ variant: "destructive", title: "Kein Inhalt" }); return; }
    const md = toMarkdown(s);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debatte-${new Date(s.ts).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [session, pasted, toMarkdown, toast]);

  const synthesize = useCallback(async () => {
    const s = session ?? (pasted ? { topic: "Manuell", messages: [{ agent: "raw", content: pasted }], ts: Date.now() } : null);
    if (!s) { toast({ variant: "destructive", title: "Kein Inhalt zum Synthetisieren" }); return; }
    const check = modelRequiresKey(model, customKeys);
    if (!check.ok) { toast({ variant: "destructive", title: `${check.missing}-Key fehlt` }); return; }
    setRunning(true);
    setTldr("");
    try {
      const transcript = s.messages.map(m => `${m.agent.toUpperCase()}: ${m.content}`).join("\n\n");
      const prompt = `Du erhältst ein Debattenprotokoll. Extrahiere strikt naturwissenschaftlich/mathematisch:

1. KONSENS (3-7 Punkte): wo stimmen alle überein
2. BEWIESENES (formal verifiziert)
3. OFFENE FRAGEN (was bleibt unbewiesen/strittig)
4. NÄCHSTE SCHRITTE (konkrete Experimente/Lemmata)

Thema: ${s.topic}

Protokoll:
${transcript}`;
      let out = "";
      await callMathChat({
        messages: [{ role: "user", content: prompt }],
        model, customKeys, strictMode: true,
        onDelta: (d) => { out += d; setTldr(out); },
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Fehler", description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }, [session, pasted, model, customKeys, toast]);

  const hasContent = !!(session || pasted.trim());

  return (
    <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto space-y-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium">DEBATTEN-PROTOKOLL</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Exportiert QUAD-KI-Sitzungen als Markdown · AI-Synthese der Konsenskerne
        </p>
      </header>

      {session ? (
        <div className="border border-border rounded p-3 text-xs space-y-1">
          <div className="text-[10px] uppercase text-muted-foreground">Letzte QUAD-Sitzung geladen</div>
          <div><span className="text-muted-foreground">Thema:</span> {session.topic}</div>
          <div><span className="text-muted-foreground">Beiträge:</span> {session.messages.length}</div>
          <div><span className="text-muted-foreground">Zeit:</span> {new Date(session.ts).toLocaleString()}</div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground border border-border rounded p-3">
          Keine gespeicherte QUAD-Sitzung gefunden. Du kannst Text unten einfügen.
        </div>
      )}

      <label className="block text-xs">
        <span className="text-muted-foreground">Oder Debatte manuell einfügen</span>
        <textarea
          value={pasted} onChange={(e) => setPasted(e.target.value)}
          rows={6}
          placeholder="ALPHA: ...&#10;BETA: ..."
          className="mt-1 w-full bg-input border border-border rounded px-2 py-1 text-foreground text-xs font-mono"
        />
      </label>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={model} onChange={(e) => setModel(e.target.value)} disabled={running}
          className="text-xs bg-input border border-border rounded px-2 py-1 text-foreground"
        >
          {Object.entries(AI_MODELS.reduce((acc, m) => { (acc[m.provider] ||= []).push(m); return acc; }, {} as Record<string, typeof AI_MODELS>)).map(([prov, list]) => (
            <optgroup key={prov} label={prov}>
              {list.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
          ))}
        </select>
        <ApiKeyManager onChange={setCustomKeys} />
        <Button onClick={synthesize} disabled={!hasContent || running} size="sm" variant="outline">
          {running ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
          TL;DR generieren
        </Button>
        <Button onClick={download} disabled={!hasContent} size="sm">
          <Download className="h-3 w-3 mr-1" />Markdown
        </Button>
      </div>

      {tldr && (
        <div className="border border-border rounded p-3 space-y-1">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <FileText className="h-3 w-3" />TL;DR
          </div>
          <pre className="text-xs whitespace-pre-wrap font-sans">{tldr}</pre>
        </div>
      )}
    </div>
  );
}
