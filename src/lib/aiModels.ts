export type AiModel = { id: string; label: string; provider: string };

export const AI_MODELS: AiModel[] = [
  // Google
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "Google" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)", provider: "Google" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", provider: "Google" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)", provider: "Google" },
  // OpenAI
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", provider: "OpenAI" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { id: "openai/gpt-5", label: "GPT-5", provider: "OpenAI" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", provider: "OpenAI" },
  { id: "openai/gpt-5.4-pro", label: "GPT-5.4 Pro", provider: "OpenAI" },
  { id: "openai/gpt-5.5", label: "GPT-5.5", provider: "OpenAI" },
  { id: "openai/gpt-5.5-pro", label: "GPT-5.5 Pro", provider: "OpenAI" },
];

export const DEFAULT_MODEL = "google/gemini-2.5-flash";
