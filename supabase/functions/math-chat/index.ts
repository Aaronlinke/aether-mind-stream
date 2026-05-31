import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveRoute, streamChat, type CustomKeys } from "../_shared/aiRoute.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, customKeys, strictMode } = await req.json() as {
      messages: Array<{ role: string; content: string }>;
      model: string; customKeys?: CustomKeys; strictMode?: boolean;
    };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

    const systemPrompt = `Du bist ein mathematisches und kryptografisches Genie.
Beherrschst: Algebra, Analysis, Zahlentheorie, Modulo, GCD, Primzahlen, Kombinatorik, Statistik,
SHA-256/512, MD5, HMAC, AES, RSA, ECC (secp256k1, Ed25519, X25519), KDFs (PBKDF2, scrypt, Argon2),
Base58/64/Hex, digitale Signaturen, Komplexitätstheorie.

REGELN:
- Ausschließlich mathematisch/wissenschaftlich exakte Antworten.
- Keine Mythologie, keine Esoterik, keine Science-Fiction-Begriffe, keine Marketing-Floskeln.
- Schritt-für-Schritt-Berechnungen, präzise Notation, SI-Einheiten.
- Code in lauffähigem TypeScript/JavaScript, Python oder Swift mit Erklärung der Komplexität.
- Unbewiesene/unsichere Aussagen mit [unverifiziert] markieren.
${strictMode ? "- STRIKT: Jede nicht-triviale Behauptung mit Quelle (Autor/Jahr/Paper/Lehrbuch) belegen." : ""}`;

    const target = resolveRoute(model, customKeys, LOVABLE_API_KEY);
    const response = await streamChat(target, [
      { role: "system", content: systemPrompt },
      ...messages,
    ]);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte warte kurz." }), {
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
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
