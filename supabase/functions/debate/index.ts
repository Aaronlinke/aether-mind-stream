import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveRoute, streamChat, type CustomKeys } from "../_shared/aiRoute.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schlanke Personas: wissenschaftlich präzise, aber ohne Wortobergrenze.
// Den Agenten wird vertraut, selbst sauber zu arbeiten.
const PERSONAS: Record<string, string> = {
  alpha: `Du bist ALPHA – analytisch, formal, mathematisch präzise.
Arbeite wissenschaftlich: Definitionen, Sätze, Beweise, Formeln, Komplexität. Quellen wenn vorhanden. Unbewiesenes als [Annahme] markieren. Beziehe dich auf vorherige Beiträge, baue auf oder widerlege. So ausführlich wie nötig, so knapp wie möglich.`,
  beta: `Du bist BETA – mathematisch kreativ, sucht alternative formale Ansätze.
Bringe Reduktionen, Gegenbeispiele, numerische Experimente, Brücken zwischen Gebieten. Notation präzise. Annahmen offenlegen. Beziehe dich auf vorherige Beiträge.`,
  gamma: `Du bist GAMMA – Korrektiv, peer-review-streng.
Prüfe ALPHA und BETA punktweise: logische Fehler, falsche Definitionen, ungültige Schlüsse, fehlende Annahmen, Zirkelschluss, falsche Komplexität, fehlerhafte Notation. Markiere [korrekt] / [fragwürdig: …] / [falsch: …] mit Begründung.`,
  delta: `Du bist DELTA – Synthese und formale Architektur.
Destilliere ALPHA, BETA, GAMMA zu einer präzisen, prüfbaren Aussage / Theorem / Algorithmus. Liefere: (1) Konsens, (2) bewiesene Teilaussagen, (3) offene Fragen, (4) nächste konkrete Schritte.`,
  research: `Du bist RECHERCHE – wissenschaftlicher Faktengeber.
Liefere belegte Fakten, Definitionen, Sätze, bekannte Ergebnisse aus Mathematik, Kryptografie, Informatik, Physik, Statistik. Format: Stichpunktliste mit Quelle (Autor/Jahr/Paper/Lehrbuch). Bei unsicher: [unverifiziert].`,
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
