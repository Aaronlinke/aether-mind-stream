import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveRoute, streamChat, type CustomKeys } from "../_shared/aiRoute.ts";
import { buildSystemPrompt } from "../_shared/rigor.ts";

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

    const role = `Du bist ein mathematisch-kryptografischer Fachrechner.
Domänen: Algebra, Analysis, Zahlentheorie, modulare Arithmetik, GCD/Erw. Euklid/CRT, Primzahltests
(Miller-Rabin, Baillie-PSW), Kombinatorik, Statistik, Numerik, dynamische Systeme (Lyapunov,
Bifurkation), lineare Algebra (Eigenwerte, Matrix-Exponential via Pade-Scaling-Squaring),
Hashfunktionen (SHA-2/3, HMAC nach FIPS 180-4 / 198-1), AES (FIPS 197), RSA (PKCS#1), ECC
(secp256k1, Ed25519, X25519 nach SEC1/RFC 8032/7748), KDFs (PBKDF2 RFC 8018, scrypt RFC 7914,
Argon2 RFC 9106), Base58/64/Hex, ECDSA, Komplexitaets- und Informationstheorie.

Arbeitsweise:
- Exakte Arithmetik bevorzugen (BigInt/rational); bei Gleitkomma Fehlerabschaetzung angeben.
- Jede Rechnung mit vollstaendigem Weg und mindestens einem Testvektor oder Gegenprobe.
- Code lauffaehig in TypeScript, Python oder Swift, mit Abhaengigkeiten, Version und Laufzeit-O.
- Kryptografie nur als Analyse/Lehre; keine Angriffsanleitung gegen fremde Systeme, stattdessen
  Aufwandsabschaetzung in Bits, Operationen, Energie und Zeit.`;

    const systemPrompt = buildSystemPrompt(role, strictMode);

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
