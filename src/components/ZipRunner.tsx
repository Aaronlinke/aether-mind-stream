import { useState, useRef, useCallback } from "react";
import JSZip from "jszip";
import { Upload, Play, FileText, Loader2, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { downloadText } from "@/lib/download";
import { AI_MODELS, DEFAULT_MODEL, loadCustomKeys, modelRequiresKey } from "@/lib/aiModels";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/math-chat`;

function extractBlock(src: string, lang: string): string | null {
  const re = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```", "i");
  const m = src.match(re);
  return m ? m[1].trim() : null;
}

type Entry = { path: string; size: number; isText: boolean };

const TEXT_EXT = /\.(html?|css|js|mjs|ts|tsx|jsx|json|md|txt|svg|xml|yml|yaml|csv|sh|py|kt|java|c|cpp|h|rs|go)$/i;
const IMG_EXT = /\.(png|jpe?g|gif|webp|svg|ico|bmp)$/i;
const MIME: Record<string, string> = {
  html: "text/html", htm: "text/html", css: "text/css", js: "application/javascript",
  mjs: "application/javascript", json: "application/json", svg: "image/svg+xml",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", ico: "image/x-icon", txt: "text/plain", md: "text/markdown",
};

function mimeOf(p: string) {
  const e = p.split(".").pop()?.toLowerCase() || "";
  return MIME[e] || "application/octet-stream";
}

export function ZipRunner() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [zip, setZip] = useState<JSZip | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ kind: "html" | "text" | "image" | "binary"; data: string; mime: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [zipName, setZipName] = useState("");
  const blobUrlsRef = useRef<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [porting, setPorting] = useState(false);
  const [portLog, setPortLog] = useState("");
  const [model, setModel] = useState<string>(() => localStorage.getItem("ziprunner-model") || DEFAULT_MODEL);
  const { toast } = useToast();

  const cleanupBlobs = () => {
    blobUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
  };

  const loadZip = useCallback(async (file: File) => {
    setLoading(true);
    cleanupBlobs();
    setPreview(null); setSelected(null); setEntries([]); setZip(null);
    try {
      const z = await JSZip.loadAsync(file);
      const list: Entry[] = [];
      z.forEach((path, f) => {
        if (f.dir) return;
        list.push({ path, size: (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0, isText: TEXT_EXT.test(path) });
      });
      list.sort((a, b) => a.path.localeCompare(b.path));
      setEntries(list); setZip(z); setZipName(file.name);
      toast({ title: `${file.name} entpackt`, description: `${list.length} Dateien` });
      // auto-select index.html if present
      const idx = list.find(e => /(^|\/)index\.html?$/i.test(e.path)) || list.find(e => /\.html?$/i.test(e.path));
      if (idx) void runHtml(z, idx.path, list);
    } catch (e) {
      toast({ variant: "destructive", title: "ZIP-Fehler", description: (e as Error).message });
    } finally { setLoading(false); }
  }, [toast]);

  const runHtml = useCallback(async (z: JSZip, path: string, list: Entry[]) => {
    setSelected(path); setLoading(true);
    cleanupBlobs();
    try {
      const baseDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
      // Build blob URL map for sibling assets
      const urlMap = new Map<string, string>();
      for (const e of list) {
        if (e.path === path) continue;
        if (!e.path.startsWith(baseDir) && baseDir) continue;
        const rel = baseDir ? e.path.slice(baseDir.length) : e.path;
        if (!rel || rel.includes("..")) continue;
        const f = z.file(e.path); if (!f) continue;
        const blob = await f.async("blob");
        const typed = new Blob([blob], { type: mimeOf(e.path) });
        const url = URL.createObjectURL(typed);
        blobUrlsRef.current.push(url);
        urlMap.set(rel, url);
      }
      let htmlStr = await z.file(path)!.async("string");
      // Rewrite src/href referencing local relative paths
      htmlStr = htmlStr.replace(/(src|href)\s*=\s*(['"])([^'"#?][^'"]*)\2/gi, (m, attr, q, val) => {
        if (/^(https?:|data:|blob:|\/\/|mailto:|#)/i.test(val)) return m;
        const url = urlMap.get(val) || urlMap.get(val.replace(/^\.\//, ""));
        return url ? `${attr}=${q}${url}${q}` : m;
      });
      setPreview({ kind: "html", data: htmlStr, mime: "text/html" });
    } catch (e) {
      toast({ variant: "destructive", title: "Render-Fehler", description: (e as Error).message });
    } finally { setLoading(false); }
  }, [toast]);

  const openEntry = useCallback(async (path: string) => {
    if (!zip) return;
    if (/\.html?$/i.test(path)) { void runHtml(zip, path, entries); return; }
    setSelected(path); setLoading(true);
    try {
      const f = zip.file(path)!;
      if (IMG_EXT.test(path)) {
        const blob = await f.async("blob");
        const url = URL.createObjectURL(new Blob([blob], { type: mimeOf(path) }));
        blobUrlsRef.current.push(url);
        setPreview({ kind: "image", data: url, mime: mimeOf(path) });
      } else if (TEXT_EXT.test(path) || (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize! < 200_000) {
        const txt = await f.async("string");
        setPreview({ kind: "text", data: txt, mime: mimeOf(path) });
      } else {
        setPreview({ kind: "binary", data: `${path} (binär, ${((f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0)} bytes)`, mime: "application/octet-stream" });
      }
    } finally { setLoading(false); }
  }, [zip, entries, runHtml]);

  const downloadCurrent = async () => {
    if (!zip || !selected) return;
    const blob = await zip.file(selected)!.async("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = selected.split("/").pop()!; a.click();
    URL.revokeObjectURL(url);
  };

  const portToCodelab = useCallback(async () => {
    if (!zip || porting) return;
    const customKeys = loadCustomKeys();
    const chk = modelRequiresKey(model, customKeys);
    if (!chk.ok) {
      toast({ variant: "destructive", title: `${chk.missing?.toUpperCase()} API-Key fehlt` });
      return;
    }
    setPorting(true); setPortLog("");
    try {
      // Gather text source files (max ~120 KB total, prioritise html/js/ts/kt/py/java)
      const priority = (p: string) => {
        if (/\.(html?)$/i.test(p)) return 0;
        if (/\.(jsx?|tsx?|mjs)$/i.test(p)) return 1;
        if (/\.(css)$/i.test(p)) return 2;
        if (/\.(kt|java|py|swift|rs|go|c|cpp)$/i.test(p)) return 3;
        if (/\.(json|xml|yml|yaml|md|txt)$/i.test(p)) return 4;
        return 9;
      };
      const candidates = entries.filter(e => TEXT_EXT.test(e.path)).sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path));
      let budget = 120_000;
      const parts: string[] = [];
      for (const e of candidates) {
        const f = zip.file(e.path); if (!f) continue;
        const txt = await f.async("string");
        const snippet = txt.length > 20_000 ? txt.slice(0, 20_000) + "\n…[truncated]" : txt;
        const block = `--- FILE: ${e.path} ---\n${snippet}\n`;
        if (block.length > budget) break;
        parts.push(block); budget -= block.length;
      }
      if (parts.length === 0) {
        toast({ variant: "destructive", title: "Kein Quellcode im ZIP gefunden" });
        return;
      }

      const sys = `Du portierst beliebigen Quellcode (Kotlin/Android, Python, Java, Swift, etc.) in eine **lauffähige, interaktive Single-Page-Web-App** aus HTML + CSS + Vanilla-JS, die im Browser-Sandbox läuft.
REGELN:
- Rekonstruiere Kernlogik & UI sinngemäß; ersetze Plattform-APIs (Android UI, Dateisystem, native Bibliotheken) durch Browser-Äquivalente (DOM, Canvas, FileReader, WebCrypto, fetch, localStorage).
- Keine externen Skripte/CDNs nötig – alles self-contained.
- Ausgabe AUSSCHLIESSLICH als drei Markdown-Codeblöcke in dieser Reihenfolge:
\`\`\`html ... \`\`\`
\`\`\`css ... \`\`\`
\`\`\`js ... \`\`\`
- Keine Erklärungen, kein Prosatext.`;
      const user = `Portiere folgenden ZIP-Inhalt (${zipName}) zu einer interaktiven HTML/CSS/JS-App:\n\n${parts.join("\n")}`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "system", content: sys }, { role: "user", content: user }], model, customKeys }),
      });
      if (!resp.ok || !resp.body) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `Fehler ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const s = line.slice(6).trim();
          if (s === "[DONE]") break;
          try { const c = JSON.parse(s).choices?.[0]?.delta?.content; if (c) { full += c; setPortLog(full.slice(-4000)); } } catch { /* noop */ }
        }
      }
      const h = extractBlock(full, "html");
      const c = extractBlock(full, "css");
      const j = extractBlock(full, "js") || extractBlock(full, "javascript");
      if (!h && !c && !j) {
        toast({ variant: "destructive", title: "Keine Codeblöcke erkannt", description: "Siehe AI-Log unten." });
        return;
      }
      if (h) localStorage.setItem("codelab-html", h);
      if (c) localStorage.setItem("codelab-css", c);
      if (j) localStorage.setItem("codelab-js", j);
      toast({ title: "Portiert → CODELAB", description: "Wechsle zum CODELAB-Tab." });
      window.dispatchEvent(new CustomEvent("zr:switch-mode", { detail: "codelab" }));
    } catch (e) {
      toast({ variant: "destructive", title: "Port-Fehler", description: (e as Error).message });
    } finally { setPorting(false); }
  }, [zip, entries, model, porting, zipName, toast]);


  return (
    <div className="h-full flex flex-col bg-background">
      <header className="border-b border-border p-3 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-medium">ZIPRUNNER</h1>
          <p className="text-xs text-muted-foreground">ZIP entpacken · HTML rendern · Sandbox-Preview {zipName && `· ${zipName}`}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={model} onChange={e => { setModel(e.target.value); localStorage.setItem("ziprunner-model", e.target.value); }} className="text-xs bg-input border border-border rounded px-1.5 py-1">
            {Object.entries(AI_MODELS.reduce((a, m) => { (a[m.provider] ||= []).push(m); return a; }, {} as Record<string, typeof AI_MODELS>)).map(([p, l]) => (
              <optgroup key={p} label={p}>{l.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>
            ))}
          </select>
          <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={e => e.target.files?.[0] && loadZip(e.target.files[0])} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="w-3 h-3 mr-1" />ZIP laden
          </Button>
          {zip && (
            <Button size="sm" onClick={portToCodelab} disabled={porting}>
              {porting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              AI → CODELAB
            </Button>
          )}
          {selected && (
            <Button size="sm" variant="outline" onClick={downloadCurrent}>
              <Download className="w-3 h-3 mr-1" />Datei
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr] overflow-hidden">
        <ScrollArea className="border-r border-border">
          {entries.length === 0 && !loading && (
            <div className="p-3 text-xs text-muted-foreground">Keine ZIP geladen.</div>
          )}
          {loading && <div className="p-3 text-xs flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />arbeitet…</div>}
          <ul className="text-xs font-mono">
            {entries.map(e => (
              <li key={e.path}>
                <button onClick={() => openEntry(e.path)} className={`w-full text-left px-2 py-1 truncate hover:bg-muted ${selected === e.path ? "bg-muted text-foreground" : "text-muted-foreground"}`} title={e.path}>
                  {/\.html?$/i.test(e.path) ? <Play className="inline w-3 h-3 mr-1" /> : <FileText className="inline w-3 h-3 mr-1" />}
                  {e.path}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <div className="flex flex-col min-h-0">
          {!preview && <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Datei wählen oder ZIP laden</div>}
          {preview?.kind === "html" && (
            <iframe title="zip-html" srcDoc={preview.data} sandbox="allow-scripts allow-modals allow-same-origin" className="flex-1 bg-white" />
          )}
          {preview?.kind === "image" && (
            <div className="flex-1 overflow-auto flex items-center justify-center bg-[#111] p-4">
              <img src={preview.data} alt={selected || ""} className="max-w-full max-h-full" />
            </div>
          )}
          {preview?.kind === "text" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-3 py-1 border-b border-border text-xs">
                <span className="text-muted-foreground">{selected}</span>
                <Button size="sm" variant="ghost" onClick={() => {
                  if (!preview || !selected) return;
                  const name = selected.split("/").pop()!;
                  const dot = name.lastIndexOf(".");
                  const base = dot > 0 ? name.slice(0, dot) : name;
                  const ext = dot > 0 ? name.slice(dot + 1) : "txt";
                  downloadText(preview.data, base, ext, preview.mime);
                }}>
                  <Download className="w-3 h-3" />
                </Button>
              </div>
              <pre className="flex-1 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap">{preview.data}</pre>
            </div>
          )}
          {preview?.kind === "binary" && (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">{preview.data}</div>
          )}
        </div>
      </div>
    </div>
  );
}
