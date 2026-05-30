import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AI_MODELS, DEFAULT_MODEL } from "@/lib/aiModels";

type AgentId = "alpha" | "beta" | "gamma" | "delta";
type DebateMessage = { agent: AgentId; content: string };

const DEBATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/debate`;

const AGENTS: { id: AgentId; label: string; role: string }[] = [
  { id: "alpha", label: "ALPHA", role: "Analytisch · Streng" },
  { id: "beta",  label: "BETA",  role: "Kreativ · Lateral" },
  { id: "gamma", label: "GAMMA", role: "Korrektiv · Skeptisch" },
  { id: "delta", label: "DELTA", role: "Synthese · Architekt" },
];

export function QuadDebate() {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentId>("alpha");
  const [streamingContent, setStreamingContent] = useState("");
  const [rounds, setRounds] = useState(3);
  const [models, setModels] = useState<Record<AgentId, string>>(() => {
    const saved = localStorage.getItem("quad-models");
    if (saved) try { return JSON.parse(saved); } catch { /* noop */ }
    return { alpha: DEFAULT_MODEL, beta: DEFAULT_MODEL, gamma: DEFAULT_MODEL, delta: DEFAULT_MODEL };
  });
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => { localStorage.setItem("quad-models", JSON.stringify(models)); }, [models]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingContent]);

  const streamOne = useCallback(async (agent: AgentId, history: DebateMessage[], topicText: string, model: string): Promise<string> => {
    abortRef.current = new AbortController();
    const resp = await fetch(DEBATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ topic: topicText, history, agent, model }),
      signal: abortRef.current.signal,
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Fehler: ${resp.status}`);
    }
    if (!resp.body) throw new Error("Keine Antwort");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const c = parsed.choices?.[0]?.delta?.content;
          if (c) { full += c; setStreamingContent(full); }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
    return full;
  }, []);

  const runDebate = useCallback(async () => {
    if (!topic.trim()) return;
    setIsRunning(true);
    setMessages([]);
    setStreamingContent("");

    let history: DebateMessage[] = [];
    const order: AgentId[] = ["alpha", "beta", "gamma", "delta"];

    try {
      for (let r = 0; r < rounds; r++) {
        for (const agent of order) {
          setCurrentAgent(agent);
          setStreamingContent("");
          const response = await streamOne(agent, history, topic, models[agent]);
          const msg: DebateMessage = { agent, content: response };
          history = [...history, msg];
          setMessages([...history]);
          setStreamingContent("");
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      console.error("Quad debate error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : "Verbindungsfehler",
      });
    } finally {
      setIsRunning(false);
      setStreamingContent("");
    }
  }, [topic, rounds, models, streamOne, toast]);

  const stopDebate = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const modelSelect = (a: AgentId) => (
    <select
      value={models[a]}
      onChange={(e) => setModels(prev => ({ ...prev, [a]: e.target.value }))}
      disabled={isRunning}
      className="text-xs bg-input border border-border rounded px-1.5 py-0.5 text-foreground w-full"
    >
      {Object.entries(AI_MODELS.reduce((acc, m) => {
        (acc[m.provider] ||= []).push(m); return acc;
      }, {} as Record<string, typeof AI_MODELS>)).map(([prov, list]) => (
        <optgroup key={prov} label={prov}>
          {list.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </optgroup>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">QUAD · 4-KI Korrektiv</h1>
        <p className="text-xs text-muted-foreground mt-1">
          ALPHA → BETA → GAMMA → DELTA · jede Runde korrigiert und synthetisiert
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {AGENTS.map(a => (
            <div key={a.id} className="border border-border rounded p-2 space-y-1">
              <div className="text-xs font-medium">{a.label}</div>
              <div className="text-[10px] text-muted-foreground">{a.role}</div>
              {modelSelect(a.id)}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs">
          <label className="text-muted-foreground">Runden:</label>
          <input
            type="number"
            min={1}
            max={10}
            value={rounds}
            onChange={(e) => setRounds(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            disabled={isRunning}
            className="w-16 bg-input border border-border rounded px-2 py-0.5 text-foreground"
          />
          <span className="text-muted-foreground">× 4 Beiträge</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isRunning && (
          <div className="text-muted-foreground text-sm mt-8 space-y-2">
            <p>Thema eingeben und START drücken. Alle 4 KIs debattieren rundenweise.</p>
            <ul className="text-xs space-y-1">
              <li>• ALPHA legt vor, BETA erweitert, GAMMA prüft, DELTA synthetisiert</li>
              <li>• Jeder Agent kann ein eigenes Modell nutzen (Mix Google + OpenAI)</li>
            </ul>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="space-y-1">
            <div className="text-xs font-medium">
              {AGENTS.find(a => a.id === msg.agent)?.label}
              <span className="text-muted-foreground ml-2 font-normal">
                · {AI_MODELS.find(m => m.id === models[msg.agent])?.label}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap pl-4 border-l border-border">
              {msg.content}
            </div>
          </div>
        ))}

        {isRunning && (
          <div className="space-y-1">
            <div className="text-xs font-medium">
              {AGENTS.find(a => a.id === currentAgent)?.label}
              <Loader2 className="inline-block w-3 h-3 ml-2 animate-spin" />
            </div>
            <div className="text-sm whitespace-pre-wrap pl-4 border-l border-border min-h-[1.25rem]">
              {streamingContent || <span className="text-muted-foreground italic">denkt nach…</span>}
              {streamingContent && <span className="inline-block w-2 h-4 bg-foreground ml-1 animate-pulse" />}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isRunning) { e.preventDefault(); runDebate(); } }}
            placeholder="Thema eingeben..."
            className="resize-none bg-input border-border text-foreground placeholder:text-muted-foreground min-h-[44px] max-h-32"
            rows={1}
            disabled={isRunning}
          />
          {!isRunning ? (
            <Button onClick={runDebate} disabled={!topic.trim()} size="icon" variant="outline" className="shrink-0">
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={stopDebate} size="icon" variant="outline" className="shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
