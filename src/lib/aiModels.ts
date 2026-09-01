export type Provider = "lovable" | "openai" | "deepseek" | "google" | "groq" | "openrouter" | "cerebras" | "mistral";
export type AiModel = { id: string; label: string; provider: string; route: Provider; free?: boolean };

// route = "lovable" -> via Lovable AI Gateway (kein eigener Key nötig)
// route = "openai" | "deepseek" | "google" -> direkter Provider, eigener API-Key nötig
export const AI_MODELS: AiModel[] = [
  // Google via Lovable
  { id: "google/gemini-2.5-flash",         label: "Gemini 2.5 Flash",        provider: "Google (Lovable)", route: "lovable" },
  { id: "google/gemini-2.5-flash-lite",    label: "Gemini 2.5 Flash Lite",   provider: "Google (Lovable)", route: "lovable" },
  { id: "google/gemini-2.5-pro",           label: "Gemini 2.5 Pro",          provider: "Google (Lovable)", route: "lovable" },
  { id: "google/gemini-3-flash-preview",   label: "Gemini 3 Flash (Prev)",   provider: "Google (Lovable)", route: "lovable" },
  { id: "google/gemini-3.5-flash",         label: "Gemini 3.5 Flash",        provider: "Google (Lovable)", route: "lovable" },
  { id: "google/gemini-3.6-flash",         label: "Gemini 3.6 Flash",        provider: "Google (Lovable)", route: "lovable" },
  { id: "google/gemini-3.1-flash-lite",    label: "Gemini 3.1 Flash Lite",   provider: "Google (Lovable)", route: "lovable" },
  { id: "google/gemini-3.1-pro-preview",   label: "Gemini 3.1 Pro (Prev)",   provider: "Google (Lovable)", route: "lovable" },
  // OpenAI via Lovable (nur Chat-Modelle; *-pro laufen nur über die Responses-API)
  { id: "openai/gpt-5-nano",  label: "GPT-5 Nano",  provider: "OpenAI (Lovable)", route: "lovable" },
  { id: "openai/gpt-5-mini",  label: "GPT-5 Mini",  provider: "OpenAI (Lovable)", route: "lovable" },
  { id: "openai/gpt-5",       label: "GPT-5",       provider: "OpenAI (Lovable)", route: "lovable" },
  { id: "openai/gpt-5.4",     label: "GPT-5.4",     provider: "OpenAI (Lovable)", route: "lovable" },
  { id: "openai/gpt-5.5",     label: "GPT-5.5",     provider: "OpenAI (Lovable)", route: "lovable" },
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna", provider: "OpenAI (Lovable)", route: "lovable" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra", provider: "OpenAI (Lovable)", route: "lovable" },
  { id: "openai/gpt-5.6-sol",  label: "GPT-5.6 Sol",  provider: "OpenAI (Lovable)", route: "lovable" },


  // Direkt-Provider (eigener Key)
  { id: "custom-openai/gpt-4o",            label: "GPT-4o (eigener Key)",         provider: "OpenAI direkt",   route: "openai" },
  { id: "custom-openai/gpt-4o-mini",       label: "GPT-4o mini (eigener Key)",    provider: "OpenAI direkt",   route: "openai" },
  { id: "custom-openai/o1-mini",           label: "o1-mini (eigener Key)",        provider: "OpenAI direkt",   route: "openai" },
  { id: "custom-openai/o3-mini",           label: "o3-mini (eigener Key)",        provider: "OpenAI direkt",   route: "openai" },

  { id: "custom-deepseek/deepseek-chat",     label: "DeepSeek V3 Chat (eigener Key)",  provider: "DeepSeek direkt", route: "deepseek" },
  { id: "custom-deepseek/deepseek-reasoner", label: "DeepSeek R1 Reasoner (eigener Key)", provider: "DeepSeek direkt", route: "deepseek" },

  // Google AI Studio – Free Tier (Gemma offene Modelle + Gemini Flash)
  { id: "custom-google/gemma-3-27b-it",      label: "Gemma 3 27B (frei)",               provider: "Google AI Studio (frei)", route: "google",  free: true },
  { id: "custom-google/gemma-3-12b-it",      label: "Gemma 3 12B (frei)",               provider: "Google AI Studio (frei)", route: "google",  free: true },
  { id: "custom-google/gemma-3-4b-it",       label: "Gemma 3 4B (frei)",                provider: "Google AI Studio (frei)", route: "google",  free: true },
  { id: "custom-google/gemini-2.0-flash",    label: "Gemini 2.0 Flash (frei)",          provider: "Google AI Studio (frei)", route: "google",  free: true },
  { id: "custom-google/gemini-2.5-pro",      label: "Gemini 2.5 Pro (eigener Key)",     provider: "Google AI Studio (frei)", route: "google" },

  // Groq – Free Tier, sehr schnelle Inferenz
  { id: "custom-groq/gemma2-9b-it",                 label: "Gemma 2 9B (frei)",            provider: "Groq (frei)", route: "groq", free: true },
  { id: "custom-groq/llama-3.3-70b-versatile",      label: "Llama 3.3 70B (frei)",         provider: "Groq (frei)", route: "groq", free: true },
  { id: "custom-groq/llama-3.1-8b-instant",         label: "Llama 3.1 8B instant (frei)",  provider: "Groq (frei)", route: "groq", free: true },
  { id: "custom-groq/qwen/qwen3-32b",               label: "Qwen3 32B (frei)",             provider: "Groq (frei)", route: "groq", free: true },
  { id: "custom-groq/deepseek-r1-distill-llama-70b",label: "DeepSeek R1 Distill 70B (frei)", provider: "Groq (frei)", route: "groq", free: true },

  // OpenRouter – ":free"-Varianten
  { id: "custom-openrouter/google/gemma-3-27b-it:free",            label: "Gemma 3 27B (frei)",       provider: "OpenRouter (frei)", route: "openrouter", free: true },
  { id: "custom-openrouter/deepseek/deepseek-r1:free",             label: "DeepSeek R1 (frei)",       provider: "OpenRouter (frei)", route: "openrouter", free: true },
  { id: "custom-openrouter/deepseek/deepseek-chat-v3-0324:free",   label: "DeepSeek V3 (frei)",       provider: "OpenRouter (frei)", route: "openrouter", free: true },
  { id: "custom-openrouter/qwen/qwen3-235b-a22b:free",             label: "Qwen3 235B (frei)",        provider: "OpenRouter (frei)", route: "openrouter", free: true },
  { id: "custom-openrouter/meta-llama/llama-3.3-70b-instruct:free",label: "Llama 3.3 70B (frei)",     provider: "OpenRouter (frei)", route: "openrouter", free: true },
  { id: "custom-openrouter/mistralai/mistral-small-3.2-24b-instruct:free", label: "Mistral Small 3.2 (frei)", provider: "OpenRouter (frei)", route: "openrouter", free: true },

  // Cerebras – Free Tier
  { id: "custom-cerebras/llama-3.3-70b",  label: "Llama 3.3 70B (frei)", provider: "Cerebras (frei)", route: "cerebras", free: true },
  { id: "custom-cerebras/qwen-3-32b",     label: "Qwen3 32B (frei)",     provider: "Cerebras (frei)", route: "cerebras", free: true },

  // Mistral – Free Tier (La Plateforme)
  { id: "custom-mistral/mistral-small-latest", label: "Mistral Small (frei)",  provider: "Mistral (frei)", route: "mistral", free: true },
  { id: "custom-mistral/open-mistral-nemo",    label: "Mistral Nemo (frei)",   provider: "Mistral (frei)", route: "mistral", free: true },
];

export const DEFAULT_MODEL = "google/gemini-2.5-flash";

/** Wo bekommt man den (kostenlosen) Key her? */
export const KEY_SOURCES: Record<string, { label: string; url: string; note: string }> = {
  google:     { label: "Google AI Studio", url: "https://aistudio.google.com/apikey", note: "Gemma 3 + Gemini Flash, kostenloses Kontingent" },
  groq:       { label: "Groq Cloud",       url: "https://console.groq.com/keys",      note: "Gemma 2, Llama 3.3, Qwen3 – Free Tier" },
  openrouter: { label: "OpenRouter",       url: "https://openrouter.ai/keys",         note: "alle „:free“-Modelle" },
  cerebras:   { label: "Cerebras",         url: "https://cloud.cerebras.ai",          note: "Llama/Qwen, Free Tier" },
  mistral:    { label: "Mistral",          url: "https://console.mistral.ai/api-keys","note": "Free Tier der La Plateforme" } as never,
  openai:     { label: "OpenAI",           url: "https://platform.openai.com/api-keys", note: "kostenpflichtig" },
  deepseek:   { label: "DeepSeek",         url: "https://platform.deepseek.com",      note: "kostenpflichtig" },
};

export function getModel(id: string): AiModel | undefined {
  return AI_MODELS.find(m => m.id === id);
}

// LocalStorage Key-Management
export type CustomKeys = {
  openai?: string; deepseek?: string; google?: string;
  groq?: string; openrouter?: string; cerebras?: string; mistral?: string;
};

const KEYS_LS = "custom-api-keys";

export function loadCustomKeys(): CustomKeys {
  try { return JSON.parse(localStorage.getItem(KEYS_LS) || "{}"); } catch { return {}; }
}
export function saveCustomKeys(k: CustomKeys) {
  localStorage.setItem(KEYS_LS, JSON.stringify(k));
}

export function modelRequiresKey(id: string, keys: CustomKeys): { ok: boolean; missing?: Provider } {
  const m = getModel(id);
  if (!m || m.route === "lovable") return { ok: true };
  const k = keys[m.route as keyof CustomKeys];
  return k ? { ok: true } : { ok: false, missing: m.route };
}
