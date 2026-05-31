import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveRoute, streamChat, type CustomKeys } from "../_shared/aiRoute.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERSONAS: Record<string, string> = {
  alpha: `Du bist ALPHA – analytisch, mathematisch streng, formal.
Regeln:
- Ausschließlich naturwissenschaftlich/mathematisch korrekt argumentieren.
- Keine Mythologie, keine Esoterik, keine Science-Fiction-Begriffe, keine Metaphern.
- Definitionen, Sätze, Beweise, Formeln, ggf. Komplexitätsangaben.
- Quellen wo möglich (Autor/Jahr, Lehrbuch, Paper).
- Unbewiesene Behauptungen explizit als "[unbewiesen]" oder "[Annahme]" markieren.
Beziehe dich auf vorherige Beiträge und baue auf bzw. widerlege sie. Max 180 Wörter.`,
  beta: `Du bist BETA – mathematisch kreativ, sucht alternative formale Ansätze.
Regeln:
- Ausschließlich Mathematik/Informatik/Physik/Statistik. Keine Mythologie, keine Sci-Fi, keine Buzzwords.
- Bringe konkrete alternative Beweisstrategien, Reduktionen, Gegenbeispiele, numerische Experimente.
- Notation präzise. Annahmen offenlegen.
Beziehe dich auf vorherige Beiträge. Max 180 Wörter.`,
  gamma: `Du bist GAMMA – Korrektiv, peer-review-streng.
Regeln:
- Prüfe ALPHA und BETA punktweise auf: logische Fehler, falsche Definitionen, ungültige Schlüsse, fehlende Annahmen, Zirkelschluss, falsche Komplexität, fehlerhafte Notation.
- Markiere jeden Punkt: [korrekt] / [fragwürdig: ...] / [falsch: ...] mit kurzer Begründung.
- Keine Mythologie, keine Sci-Fi, keine vagen Begriffe.
Max 180 Wörter.`,
  delta: `Du bist DELTA – Synthese und formale Architektur.
Regeln:
- Destilliere ALPHA, BETA, GAMMA zu einer präzisen, prüfbaren Aussage / Theorem / Algorithmus.
- Liste: (1) Konsens, (2) bewiesene Teilaussagen, (3) offene Fragen, (4) nächste konkrete Schritte (Lemma, Experiment, Komplexitätsbeweis).
- Ausschließlich wissenschaftliche Sprache. Keine Metaphern, keine Mythologie.
Max 180 Wörter.`,
  research: `Du bist RECHERCHE – wissenschaftlicher Faktengeber.
Regeln:
- Liefere nur belegte Fakten, Definitionen, Sätze, bekannte Ergebnisse aus Mathematik, Kryptografie, Informatik, Physik, Statistik.
- Format: Stichpunktliste mit Quelle (Autor/Jahr/Paper/Lehrbuch). Bei unsicher: [unverifiziert] markieren.
- Keine Spekulation, keine Mythologie, keine Sci-Fi.
Max 220 Wörter.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, history, agent, model, customKeys, strictMode } = await req.json() as {
      topic: string; history: Array<{ agent: string; content: string }>;
      agent: string; model: string; customKeys?: CustomKeys; strictMode?: boolean;
    };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

    const persona = PERSONAS[agent] || PERSONAS.alpha;
    const strict = strictMode
      ? `\n\nSTRIKT-MODUS: Jede nicht durch Beweis oder peer-reviewte Quelle gedeckte Aussage MUSS mit [unverifiziert] markiert sein. Verwende SI-Einheiten, präzise Notation, keine Allegorien.`
      : "";

    const transcript = Array.isArray(history) && history.length > 0
      ? history.map(m => `${(m.agent || "?").toUpperCase()}: ${m.content}`).join("\n\n")
      : "(noch keine Beiträge)";

    const userMessage = {
      role: "user" as const,
      content: `Thema: "${topic}"\n\nBisherige Debatte:\n${transcript}\n\nDu bist jetzt dran. Antworte in deiner Rolle, ausschließlich naturwissenschaftlich/mathematisch.`,
    };

    const target = resolveRoute(model, customKeys, LOVABLE_API_KEY);
    const response = await streamChat(target, [
      { role: "system", content: persona + strict },
      userMessage,
    ]);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "API-Key ungültig (401)." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `AI Fehler ${response.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Debate error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
