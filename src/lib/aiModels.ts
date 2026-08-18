export type Provider = "lovable" | "openai" | "deepseek" | "google";
export type AiModel = { id: string; label: string; provider: string; route: Provider };

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

  { id: "custom-google/gemini-2.0-flash",    label: "Gemini 2.0 Flash (eigener Key)",   provider: "Google direkt",   route: "google" },
  { id: "custom-google/gemini-2.5-pro",      label: "Gemini 2.5 Pro (eigener Key)",     provider: "Google direkt",   route: "google" },
];

export const DEFAULT_MODEL = "google/gemini-2.5-flash";

export function getModel(id: string): AiModel | undefined {
  return AI_MODELS.find(m => m.id === id);
}

// LocalStorage Key-Management
export type CustomKeys = { openai?: string; deepseek?: string; google?: string };

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
  if (m.route === "openai"   && !keys.openai)   return { ok: false, missing: "openai" };
  if (m.route === "deepseek" && !keys.deepseek) return { ok: false, missing: "deepseek" };
  if (m.route === "google"   && !keys.google)   return { ok: false, missing: "google" };
  return { ok: true };
}
