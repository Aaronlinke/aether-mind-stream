import { useState, useEffect, useMemo, useRef } from "react";
import { Play, Sparkles, Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AI_MODELS, DEFAULT_MODEL, loadCustomKeys, modelRequiresKey, type CustomKeys } from "@/lib/aiModels";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { downloadText } from "@/lib/download";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/math-chat`;

type Tab = "html" | "css" | "js";

const DEFAULT_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Codelab</title></head>
<body>
  <h1>Hallo Codelab</h1>
  <button id="b">Klick</button>
</body></html>`;
const DEFAULT_CSS = `body{font-family:system-ui;background:#0a0a0a;color:#eee;padding:2rem}
button{padding:.5rem 1rem;background:#fff;color:#000;border:0;cursor:pointer}`;
const DEFAULT_JS = `document.getElementById('b').onclick=()=>alert('läuft')`;

function extractBlock(src: string, lang: string): string | null {
  const re = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```", "i");
  const m = src.match(re);
  return m ? m[1].trim() : null;
}

export function Codelab() {
  const [html, setHtml] = useState(() => localStorage.getItem("codelab-html") || DEFAULT_HTML);
  const [css, setCss]   = useState(() => localStorage.getItem("codelab-css")  || DEFAULT_CSS);
  const [js, setJs]     = useState(() => localStorage.getItem("codelab-js")   || DEFAULT_JS);
  const [tab, setTab]   = useState<Tab>("html");
  const [autorun, setAutorun] = useState(true);
  const [running, setRunning] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState<string>(() => localStorage.getItem("codelab-model") || DEFAULT_MODEL);
  const [customKeys, setCustomKeys] = useState<CustomKeys>(() => loadCustomKeys());
  const [aiLog, setAiLog] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => { localStorage.setItem("codelab-html", html); }, [html]);
  useEffect(() => { localStorage.setItem("codelab-css", css); }, [css]);
  useEffect(() => { localStorage.setItem("codelab-js", js); }, [js]);
  useEffect(() => { localStorage.setItem("codelab-model", model); }, [model]);

  const srcDoc = useMemo(() => {
    if (!autorun && running === 0) return "";
    const safe = html.includes("</head>")
      ? html.replace("</head>", `<style>${css}</style></head>`)
      : `<style>${css}</style>` + html;
    const withJs = safe.includes("</body>")
      ? safe.replace("</body>", `<script>try{${js}}catch(e){document.body.insertAdjacentHTML('beforeend','<pre style=color:red>'+e+'</pre>')}<\/script></body>`)
      : safe + `<script>try{${js}}catch(e){document.body.insertAdjacentHTML('beforeend','<pre style=color:red>'+e+'</pre>')}<\/script>`;
    return withJs;
  }, [html, css, js, autorun, running]);

  const generate = async () => {
    if (!prompt.trim() || isGenerating) return;
    const chk = modelRequiresKey(model, customKeys);
    if (!chk.ok) {
      toast({ variant: "destructive", title: `${chk.missing?.toUpperCase()} API-Key fehlt` });
      return;
    }
    setIsGenerating(true);
    setAiLog("");
    abortRef.current = new AbortController();
    try {
      const sys = `Du bist ein Code-Generator. Antworte AUSSCHLIESSLICH mit drei Markdown-Codeblöcken in dieser Reihenfolge: \`\`\`html ... \`\`\`, \`\`\`css ... \`\`\`, \`\`\`js ... \`\`\`. Kein Prosa, kein Kommentar dazwischen.`;
      const userMsg = `Aufgabe: ${prompt}\n\nAktueller Code:\nHTML:\n${html}\n\nCSS:\n${css}\n\nJS:\n${js}`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }], model, customKeys }),
        signal: abortRef.current.signal,
      });
      if (!resp.ok || !resp.body) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `Fehler ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const s = line.slice(6).trim();
          if (s === "[DONE]") break;
          try { const c = JSON.parse(s).choices?.[0]?.delta?.content; if (c) { full += c; setAiLog(full); } } catch { /* noop */ }
        }
      }
      const h = extractBlock(full, "html"); const c = extractBlock(full, "css"); const j = extractBlock(full, "js") || extractBlock(full, "javascript");
      if (h) setHtml(h); if (c) setCss(c); if (j) setJs(j);
      if (!h && !c && !j) toast({ variant: "destructive", title: "Keine Codeblöcke erkannt", description: "Siehe AI-Log unten." });
      else { toast({ title: "Code generiert" }); setRunning(r => r + 1); }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast({ variant: "destructive", title: "Fehler", description: (e as Error).message });
    } finally { setIsGenerating(false); }
  };

  const current = tab === "html" ? html : tab === "css" ? css : js;
  const setCurrent = (v: string) => tab === "html" ? setHtml(v) : tab === "css" ? setCss(v) : setJs(v);

  const exportAll = () => {
    const blob = `<!doctype html>\n<html><head><meta charset="utf-8"><style>${css}</style></head><body>\n${html.replace(/<!doctype[^>]*>|<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>/gi, "")}\n<script>${js}<\/script></body></html>`;
    downloadText(blob, "codelab.html", "text/html");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="border-b border-border p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-lg font-medium">CODELAB</h1>
            <p className="text-xs text-muted-foreground">HTML · CSS · JS · Live-Preview · AI-Generate</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={model} onChange={e => setModel(e.target.value)} className="text-xs bg-input border border-border rounded px-1.5 py-1">
              {Object.entries(AI_MODELS.reduce((a, m) => { (a[m.provider] ||= []).push(m); return a; }, {} as Record<string, typeof AI_MODELS>)).map(([p, l]) => (
                <optgroup key={p} label={p}>{l.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>
              ))}
            </select>
            <ApiKeyManager onChange={setCustomKeys} />
            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={autorun} onChange={e => setAutorun(e.target.checked)} />auto</label>
            <Button size="sm" variant="outline" onClick={() => setRunning(r => r + 1)}><Play className="w-3 h-3 mr-1" />Run</Button>
            <Button size="sm" variant="outline" onClick={exportAll}><Download className="w-3 h-3 mr-1" />HTML</Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Aufgabe für AI: z.B. 'Mandelbrot-Visualisierung mit Zoom'" rows={1} className="min-h-[36px] text-sm bg-input" />
          <Button size="sm" onClick={generate} disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            Generate
          </Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        <div className="flex flex-col border-r border-border min-h-0">
          <div className="flex border-b border-border">
            {(["html", "css", "js"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-medium ${tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}>{t.toUpperCase()}</button>
            ))}
            <button onClick={() => { if (confirm("Aktuellen "+tab.toUpperCase()+"-Code löschen?")) setCurrent(""); }} className="ml-auto px-2 text-xs text-muted-foreground hover:text-foreground"><Trash2 className="w-3 h-3" /></button>
          </div>
          <Textarea value={current} onChange={e => setCurrent(e.target.value)} className="flex-1 font-mono text-xs resize-none rounded-none border-0 bg-background" spellCheck={false} />
        </div>
        <div className="flex flex-col min-h-0">
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">Preview</div>
          <iframe key={running + (autorun ? srcDoc.length : 0)} title="preview" srcDoc={srcDoc} sandbox="allow-scripts allow-modals" className="flex-1 bg-white" />
          {aiLog && (
            <details className="border-t border-border max-h-40 overflow-auto">
              <summary className="px-3 py-1 text-xs text-muted-foreground cursor-pointer">AI-Log</summary>
              <pre className="p-2 text-[10px] whitespace-pre-wrap font-mono">{aiLog}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
