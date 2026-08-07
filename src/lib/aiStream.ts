// Shared helper: call math-chat edge function and collect full text from SSE stream.
// Fusion: jede KI-Anfrage trägt den Live-Zustand des geteilten SVRC-Feldes als Kontext,
// jede Antwort fließt als Erinnerung zurück -> gemeinsames Gedächtnis über alle Module.
import type { CustomKeys } from "./aiModels";
import { getSVRC } from "./svrc";
import { auditText, repairPrompt } from "./rigor";

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/math-chat`;

export async function callMathChat(opts: {
  messages: Array<{ role: string; content: string }>;
  model: string;
  customKeys?: CustomKeys;
  strictMode?: boolean;
  signal?: AbortSignal;
  onDelta?: (chunk: string) => void;
  /** SVRC-Kontextinjektion (Standard: an). */
  svrc?: boolean;
  /** Modulname für das gemeinsame Gedächtnis. */
  source?: string;
  /** Rigor-Auto-Korrektur (Standard: an, nur ohne onDelta möglich). */
  rigor?: boolean;
}): Promise<string> {
  const useSvrc = opts.svrc !== false;
  let messages = opts.messages;
  if (useSvrc) {
    const core = getSVRC();
    core.think(2);
    const last = [...opts.messages].reverse().find(m => m.role === "user");
    if (last) core.memory.store(`Q[${opts.source ?? "ai"}]: ${String(last.content).slice(0, 400)}`, 1.5);
    messages = [
      {
        role: "system",
        content:
          `Geteilter Systemzustand (SVRC-Feld, nichtlin. Schrödinger 32×32): ${core.contextSnapshot()}. ` +
          `Nutze diesen Zustand nur als Kontext-Signal (Energie=Aktivität, Entropie=Unsicherheit, Empfehlung=Strategie); ` +
          `erfinde daraus keine physikalischen Behauptungen.`,
      },
      ...opts.messages,
    ];
  }

  const resp = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages,
      model: opts.model,
      customKeys: opts.customKeys,
      strictMode: opts.strictMode,
    }),
    signal: opts.signal,
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${resp.status}`);
  }

  if (!resp.body) throw new Error("Kein Stream");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          opts.onDelta?.(delta);
        }
      } catch { /* noop */ }
    }
  }
  // Rigor-Gate: fällt die Antwort durch die Fachprüfung, wird EINE Korrekturrunde
  // gefahren (nur bei nicht-gestreamtem Verbrauch, sonst ist die UI schon gefüllt).
  if (opts.rigor !== false && !opts.onDelta && full.trim().length > 40) {
    const rep = auditText(full);
    if (rep.findings.some(f => f.severity === "hoch") || rep.score < 70) {
      try {
        const fixed = await callMathChat({
          ...opts,
          rigor: false,
          svrc: false,
          messages: [
            ...opts.messages,
            { role: "assistant", content: full },
            { role: "user", content: repairPrompt(rep) },
          ],
        });
        if (fixed.trim().length > 40 && auditText(fixed).score > rep.score) full = fixed;
      } catch { /* Korrekturrunde optional */ }
    }
  }

  if (useSvrc && full) {
    const core = getSVRC();
    core.memory.store(`A[${opts.source ?? "ai"}]: ${full.slice(0, 600)}`, 2);
    core.learning.learn(Array.from(full.slice(0, 256)).map(ch => ch.charCodeAt(0)));
  }
  return full;
}

