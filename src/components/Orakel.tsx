import { useState, useRef, useEffect } from "react";
import { Sparkles, Square, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AI_MODELS, DEFAULT_MODEL, loadCustomKeys, modelRequiresKey, type CustomKeys } from "@/lib/aiModels";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { downloadMarkdown, downloadJson } from "@/lib/download";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/math-chat`;

const ORACLE_PROMPT = (q: string) => `Analysiere folgende Eingabe ERSCHÖPFEND und vollständig in ALLEN mathematischen und wissenschaftlichen Dimensionen, die anwendbar sind. Keine Floskeln, keine Einleitung, sofort rechnen.

EINGABE:
"""
${q}
"""

LIEFERE — falls anwendbar — nacheinander und nummeriert:

1. KLASSIFIKATION: Was ist die Eingabe? (Zahl / Ausdruck / Gleichung / Text / Hash / Schlüssel / Sequenz / Formel …)
2. NORMALFORM: Kanonische Darstellung, Dezimal, Bruch, wissenschaftliche Notation.
3. ZAHLENTHEORIE: Primfaktorzerlegung, GCD/LCM mit relevanten Zahlen, Primzahltest (Miller-Rabin), Eulersche φ, Carmichael λ, Quadratreste, Ordnung, Restklassen.
4. ALGEBRA: Vereinfachung, Faktorisierung, Wurzeln, Polynomdivision, Symbolisches Lösen.
5. ANALYSIS: Ableitung, Integral, Grenzwert, Taylor-Reihe, Fourier-Koeffizienten falls sinnvoll.
6. LINEARE ALGEBRA: falls Matrix/Vektor — Determinante, Rang, Inverse, Eigenwerte/-vektoren, SVD.
7. KOMBINATORIK / STATISTIK: Permutationen, Binomial, Wahrscheinlichkeiten, Verteilungen, Erwartungswert, Varianz.
8. NUMERIK: Floating-Point-Repräsentation (IEEE 754), Rundungsfehler, Konditionszahl.
9. KRYPTO: Hashes (SHA-256, SHA-512, SHA-1, MD5, BLAKE2), HMAC, Base16/58/64, ROT13, Entropie in Bits, Kolmogorov-Komplexität (Schätzung).
10. ECC / RSA: Falls Zahl in Bereich secp256k1 — als privater Schlüssel interpretieren, öffentlicher Punkt P = k·G nur falls bekannt, sonst überspringen. RSA-Modulus-Verdacht prüfen.
11. KODIERUNG: ASCII / UTF-8 / Unicode Codepoints, Hex-Dump, Binär.
12. PHYSIK / EINHEITEN: Falls Zahl mit plausibler Einheit — Größenordnung, SI-Umrechnung, Naturkonstanten-Vergleich (c, ℏ, G, kB, e, NA).
13. CHAOS / DYNAMIK: Falls Sequenz/Wert — Logistische Abbildung, Lyapunov-Exponent, Bifurkationspunkt.
14. GEOMETRIE: Falls geometrisch interpretierbar — Fläche, Volumen, Winkel.
15. KONTEXT: Bekannte mathematische Bedeutung (z.B. 1729 = Hardy-Ramanujan, 6.674e-11 = G, …).
16. CODE: Lauffähiger Berechnungs-Snippet (TypeScript) der Hauptresultate reproduziert.

REGELN:
- Überspringe Sektionen die nicht anwendbar sind kommentarlos.
- Jeder Wert mit Quelle der Berechnung (Formel angeben).
- Keine Mythologie, keine Marketing-Sprache, keine "[gefährlich]" Warnungen außer mathematisch begründet.
- Markdown mit fenced code blocks für Code und ASCII-Tabellen.`;

export function Orakel() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<string>(() => localStorage.getItem("ai-model") || DEFAULT_MODEL);
  const [customKeys, setCustomKeys] = useState<CustomKeys>(() => loadCustomKeys());
  const abortRef = useRef<AbortController | null>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => { localStorage.setItem("ai-model", model); }, [model]);
  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [output]);

  const stop = () => { abortRef.current?.abort(); setIsLoading(false); };

  const run = async () => {
    if (!input.trim() || isLoading) return;
    const keyCheck = modelRequiresKey(model, customKeys);
    if (!keyCheck.ok) {
      toast({ variant: "destructive", title: `${keyCheck.missing?.toUpperCase()} API-Key fehlt`,
        description: "Im Keys-Dialog hinterlegen oder ein Lovable-Modell wählen." });
      return;
    }

    setOutput("");
    setIsLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: ORACLE_PROMPT(input.trim()) }],
          model, customKeys, strictMode: false,
        }),
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `Fehler ${resp.status}`);
      }
      if (!resp.body) throw new Error("Keine Antwort");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { acc += c; setOutput(acc); }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast({ variant: "destructive", title: "Fehler",
          description: err instanceof Error ? err.message : "Unbekannt" });
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const examples = [
    "1729",
    "secp256k1 private key 0x1",
    "x^4 - 5x^2 + 4 = 0",
    "SHA-256 von 'hello'",
    "6.67430e-11",
    "[[2,1],[1,3]]",
    "0xdeadbeef",
    "P(X=k) Binomial n=10 p=0.3",
  ];

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      <header className="border-b border-border p-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> ORAKEL
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Eine Eingabe — vollständige mathematisch-wissenschaftliche Dekomposition.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ApiKeyManager onChange={setCustomKeys} />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isLoading}
            className="text-xs bg-input border border-border rounded px-2 py-1 text-foreground max-w-[220px]"
            title="KI-Modell"
          >
            {Object.entries(AI_MODELS.reduce((a, m) => { (a[m.provider] ||= []).push(m); return a; }, {} as Record<string, typeof AI_MODELS>)).map(([prov, list]) => (
              <optgroup key={prov} label={prov}>
                {list.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </header>

      <div className="p-4 border-b border-border space-y-3">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
            placeholder="Zahl, Formel, Hash, Schlüssel, Matrix, Sequenz, Text…"
            className="resize-none bg-input border-border min-h-[110px] text-base rounded-2xl pr-28"
            disabled={isLoading}
          />
          <div className="absolute right-3 bottom-3 flex gap-2">
            {isLoading ? (
              <Button onClick={stop} size="sm" variant="outline" className="gap-1">
                <Square className="h-3 w-3" /> Stop
              </Button>
            ) : (
              <Button onClick={run} size="sm" disabled={!input.trim()} className="gap-1">
                <Sparkles className="h-3 w-3" /> Berechnen
              </Button>
            )}
            {output && !isLoading && (
              <>
                <Button size="sm" variant="outline" onClick={() => downloadMarkdown(`# ORAKEL\n\n**Eingabe:** ${input}\n\n**Modell:** ${model}\n\n---\n\n${output}`, "orakel")}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadJson({ input, model, output, ts: Date.now() }, "orakel")}>
                  JSON
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              disabled={isLoading}
              className="text-[10px] px-2 py-1 border border-border rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter zum Ausführen</p>
      </div>

      <div ref={outRef} className="flex-1 overflow-y-auto p-4">
        {!output && !isLoading && (
          <div className="text-muted-foreground text-sm mt-8 text-center">
            Eingabe oben — das Orakel zerlegt sie in Primfaktoren, Hashes, Ableitungen, Eigenwerte, Entropie, ECC-Punkte und mehr.
          </div>
        )}
        {(output || isLoading) && (
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
            {output}
            {isLoading && <span className="inline-block w-2 h-4 bg-foreground ml-1 animate-pulse" />}
          </pre>
        )}
      </div>
    </div>
  );
}
