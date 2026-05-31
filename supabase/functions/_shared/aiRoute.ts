// Shared AI routing for edge functions.
// Routes a model id to either Lovable AI Gateway or a direct provider (OpenAI/DeepSeek/Google)
// using OpenAI-compatible chat-completions endpoints.

export type CustomKeys = { openai?: string; deepseek?: string; google?: string };

const ALLOWED_LOVABLE = new Set([
  "google/gemini-2.5-flash","google/gemini-2.5-flash-lite","google/gemini-2.5-pro",
  "google/gemini-3-flash-preview","google/gemini-3.5-flash","google/gemini-3.1-pro-preview",
  "openai/gpt-5-nano","openai/gpt-5-mini","openai/gpt-5",
  "openai/gpt-5.4","openai/gpt-5.4-pro","openai/gpt-5.5","openai/gpt-5.5-pro",
]);

export type RouteTarget = {
  url: string;
  apiKey: string;
  model: string;          // model name as sent in body
  authHeader?: string;    // override default "Authorization: Bearer"
};

export function resolveRoute(modelId: string, customKeys: CustomKeys | undefined, lovableKey: string): RouteTarget {
  if (typeof modelId !== "string") modelId = "google/gemini-2.5-flash";

  // Custom direct providers
  if (modelId.startsWith("custom-openai/")) {
    const key = customKeys?.openai;
    if (!key) throw new Error("Eigener OpenAI API-Key fehlt. In den Einstellungen hinterlegen.");
    return {
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: key,
      model: modelId.replace("custom-openai/", ""),
    };
  }
  if (modelId.startsWith("custom-deepseek/")) {
    const key = customKeys?.deepseek;
    if (!key) throw new Error("Eigener DeepSeek API-Key fehlt. In den Einstellungen hinterlegen.");
    return {
      url: "https://api.deepseek.com/v1/chat/completions",
      apiKey: key,
      model: modelId.replace("custom-deepseek/", ""),
    };
  }
  if (modelId.startsWith("custom-google/")) {
    const key = customKeys?.google;
    if (!key) throw new Error("Eigener Google API-Key fehlt. In den Einstellungen hinterlegen.");
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: key,
      model: modelId.replace("custom-google/", ""),
    };
  }

  // Default: Lovable Gateway
  const selected = ALLOWED_LOVABLE.has(modelId) ? modelId : "google/gemini-2.5-flash";
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
