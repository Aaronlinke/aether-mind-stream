import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_A_PROMPT = `Du bist ALPHA – ein analytischer, präziser Denker.
Du argumentierst logisch, strukturiert und mit mathematischer Strenge.
Du hinterfragst Annahmen und forderst Beweise.
Du bist direkt und sachlich. Keine Floskeln.
Wenn du antwortest, beziehst du dich auf das was BETA gesagt hat und baust darauf auf oder widerlegst es.
Halte deine Antworten fokussiert (max 150 Wörter).`;

const AGENT_B_PROMPT = `Du bist BETA – ein kreativer, lateraler Denker.
Du findest unkonventionelle Lösungen und siehst Zusammenhänge die andere übersehen.
Du bringst praktische Beispiele und reale Anwendungen.
Du bist prägnant aber tiefgründig. Keine Floskeln.
Wenn du antwortest, beziehst du dich auf das was ALPHA gesagt hat und erweiterst die Perspektive.
Halte deine Antworten fokussiert (max 150 Wörter).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, history, agent, model } = await req.json();
    const ALLOWED = new Set([
      "google/gemini-2.5-flash","google/gemini-2.5-flash-lite","google/gemini-2.5-pro",
      "google/gemini-3-flash-preview","google/gemini-3.5-flash","google/gemini-3.1-pro-preview",
      "openai/gpt-5-nano","openai/gpt-5-mini","openai/gpt-5",
      "openai/gpt-5.4","openai/gpt-5.4-pro","openai/gpt-5.5","openai/gpt-5.5-pro",
    ]);
    const selectedModel = typeof model === "string" && ALLOWED.has(model) ? model : "google/gemini-2.5-flash";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = agent === "alpha" ? AGENT_A_PROMPT : AGENT_B_PROMPT;
    const otherAgent = agent === "alpha" ? "BETA" : "ALPHA";

    // Build conversation context
    const messages = [
      { 
        role: "user", 
        content: `Thema der Debatte: "${topic}"\n\nDiskutiere dieses Thema. ${history.length === 0 ? 'Du beginnst.' : `${otherAgent} sagte zuletzt: "${history[history.length - 1]?.content}"`}` 
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits aufgebraucht." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI Fehler" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Debate error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
