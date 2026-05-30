import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERSONAS: Record<string, string> = {
  alpha: `Du bist ALPHA – analytisch, präzise, mathematisch streng.
Du hinterfragst Annahmen, forderst Beweise und arbeitest strukturiert.
Direkt, sachlich, ohne Floskeln. Beziehe dich auf vorherige Beiträge und baue darauf auf oder widerlege sie.
Max 150 Wörter.`,
  beta: `Du bist BETA – kreativ, lateral, querdenkend.
Du findest unkonventionelle Lösungen und siehst übersehene Zusammenhänge. Bringst praktische Beispiele.
Prägnant, tiefgründig, ohne Floskeln. Beziehe dich auf vorherige Beiträge und erweitere die Perspektive.
Max 150 Wörter.`,
  gamma: `Du bist GAMMA – Korrektiv und Skeptiker.
Du prüfst die bisherigen Beiträge auf logische Fehler, falsche Prämissen und Denkfehler.
Du markierst klar: was ist korrekt, was ist fragwürdig, was ist falsch. Begründe knapp.
Max 150 Wörter.`,
  delta: `Du bist DELTA – Synthesizer und Architekt.
Du nimmst die Beiträge von ALPHA, BETA und GAMMA und destillierst sie zu einer konkreten, umsetzbaren Position.
Du benennst Konsens, offene Punkte und nächste Schritte.
Max 150 Wörter.`,
};

const ALLOWED = new Set([
  "google/gemini-2.5-flash","google/gemini-2.5-flash-lite","google/gemini-2.5-pro",
  "google/gemini-3-flash-preview","google/gemini-3.5-flash","google/gemini-3.1-pro-preview",
  "openai/gpt-5-nano","openai/gpt-5-mini","openai/gpt-5",
  "openai/gpt-5.4","openai/gpt-5.4-pro","openai/gpt-5.5","openai/gpt-5.5-pro",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, history, agent, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const persona = PERSONAS[agent] || PERSONAS.alpha;
    const selectedModel = typeof model === "string" && ALLOWED.has(model) ? model : "google/gemini-2.5-flash";

    // Build transcript of all prior contributions
    const transcript = Array.isArray(history) && history.length > 0
      ? history.map((m: { agent: string; content: string }) => `${(m.agent || "?").toUpperCase()}: ${m.content}`).join("\n\n")
      : "(noch keine Beiträge)";

    const userMessage = {
      role: "user" as const,
      content: `Thema: "${topic}"\n\nBisherige Debatte:\n${transcript}\n\nDu bist jetzt dran. Antworte in deiner Rolle.`,
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: persona },
          userMessage,
        ],
        stream: true,
      }),
    });

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI Fehler" }), {
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
