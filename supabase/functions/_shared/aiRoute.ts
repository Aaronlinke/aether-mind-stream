// Shared AI routing for edge functions.
// Routes a model id to either Lovable AI Gateway or a direct provider (OpenAI/DeepSeek/Google)
// using OpenAI-compatible chat-completions endpoints.

export type CustomKeys = {
  openai?: string; deepseek?: string; google?: string;
  groq?: string; openrouter?: string; cerebras?: string; mistral?: string;
};

const ALLOWED_LOVABLE = new Set([
  "google/gemini-2.5-flash","google/gemini-2.5-flash-lite","google/gemini-2.5-pro",
  "google/gemini-3-flash-preview","google/gemini-3.5-flash","google/gemini-3.6-flash",
  "google/gemini-3.1-flash-lite","google/gemini-3.1-pro-preview",
  "openai/gpt-5-nano","openai/gpt-5-mini","openai/gpt-5","openai/gpt-5.2",
  "openai/gpt-5.4","openai/gpt-5.4-mini","openai/gpt-5.4-nano","openai/gpt-5.5",
  "openai/gpt-5.6-luna","openai/gpt-5.6-terra","openai/gpt-5.6-sol",
]);

// *-pro Reasoning-Modelle sind auf /v1/chat/completions kein Chat-Modell (400) ->
// auf das nächstbeste Chat-Modell abbilden.
const REMAP: Record<string, string> = {
  "openai/gpt-5.5-pro": "openai/gpt-5.5",
  "openai/gpt-5.4-pro": "openai/gpt-5.4",
};


export type RouteTarget = {
  url: string;
  apiKey: string;
  model: string;          // model name as sent in body
  authHeader?: string;    // override default "Authorization: Bearer"
};

// OpenAI-kompatible Endpunkte der Direkt-/Free-Tier-Provider.
const DIRECT: Record<string, { url: string; keyField: keyof CustomKeys; name: string }> = {
  "custom-openai/":     { url: "https://api.openai.com/v1/chat/completions", keyField: "openai", name: "OpenAI" },
  "custom-deepseek/":   { url: "https://api.deepseek.com/v1/chat/completions", keyField: "deepseek", name: "DeepSeek" },
  "custom-google/":     { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyField: "google", name: "Google AI Studio" },
  "custom-groq/":       { url: "https://api.groq.com/openai/v1/chat/completions", keyField: "groq", name: "Groq" },
  "custom-openrouter/": { url: "https://openrouter.ai/api/v1/chat/completions", keyField: "openrouter", name: "OpenRouter" },
  "custom-cerebras/":   { url: "https://api.cerebras.ai/v1/chat/completions", keyField: "cerebras", name: "Cerebras" },
  "custom-mistral/":    { url: "https://api.mistral.ai/v1/chat/completions", keyField: "mistral", name: "Mistral" },
};

export function resolveRoute(modelId: string, customKeys: CustomKeys | undefined, lovableKey: string): RouteTarget {
  if (typeof modelId !== "string") modelId = "google/gemini-2.5-flash";

  for (const [prefix, cfg] of Object.entries(DIRECT)) {
    if (!modelId.startsWith(prefix)) continue;
    const key = customKeys?.[cfg.keyField];
    if (!key) throw new Error(`${cfg.name} API-Key fehlt. Im Keys-Dialog hinterlegen (kostenloser Key möglich).`);
    return { url: cfg.url, apiKey: key, model: modelId.slice(prefix.length) };
  }


  // Default: Lovable Gateway
  const mapped = REMAP[modelId] ?? modelId;
  const selected = ALLOWED_LOVABLE.has(mapped) ? mapped : "google/gemini-2.5-flash";
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey: lovableKey,
    model: selected,
  };
}

export async function streamChat(target: RouteTarget, messages: Array<{ role: string; content: string }>): Promise<Response> {
  return await fetch(target.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${target.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: target.model,
      messages,
      stream: true,
    }),
  });
}
