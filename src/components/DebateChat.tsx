import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AI_MODELS, DEFAULT_MODEL } from "@/lib/aiModels";

type DebateMessage = {
  agent: "alpha" | "beta";
  content: string;
};

const DEBATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/debate`;

export function DebateChat() {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<"alpha" | "beta">("alpha");
  const [streamingContent, setStreamingContent] = useState("");
  const [model, setModel] = useState<string>(() => localStorage.getItem("ai-model") || DEFAULT_MODEL);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => { localStorage.setItem("ai-model", model); }, [model]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const streamResponse = useCallback(async (agent: "alpha" | "beta", history: DebateMessage[], topicText: string): Promise<string> => {
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
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            setStreamingContent(fullContent);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    return fullContent;
  }, []);

  const runDebate = useCallback(async () => {
    if (!topic.trim()) return;

    setIsRunning(true);
    setMessages([]);
    setStreamingContent("");
    
    let history: DebateMessage[] = [];
    let agent: "alpha" | "beta" = "alpha";

    try {
      while (true) {
        setCurrentAgent(agent);
        setStreamingContent("");

        const response = await streamResponse(agent, history, topic);
        
        const newMessage: DebateMessage = { agent, content: response };
        history = [...history, newMessage];
        setMessages([...history]);
        setStreamingContent("");

        // Switch agent
        agent = agent === "alpha" ? "beta" : "alpha";

        // Small delay between responses
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // Stopped by user - this is expected
        return;
      }
      console.error("Debate error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : "Verbindungsfehler",
      });
    } finally {
      setIsRunning(false);
      setStreamingContent("");
    }
  }, [topic, streamResponse, toast]);

  const stopDebate = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isRunning) {
      e.preventDefault();
      runDebate();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">ALPHA vs BETA</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Zwei KIs debattieren • Start drücken • Stop für Ergebnis
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isRunning && (
          <div className="text-muted-foreground text-sm space-y-2 mt-8">
            <p>Gib ein Thema ein und drücke START:</p>
            <ul className="space-y-1 text-xs">
              <li>• "Beste Sortieralgorithmus für große Datenmengen"</li>
              <li>• "Monolithische vs Microservice Architektur"</li>
              <li>• "RSA vs Elliptische Kurven Kryptografie"</li>
              <li>• "Proof of Work vs Proof of Stake"</li>
              <li>• "Baue ein OS der Klasse XY"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="space-y-1">
            <div className={`text-xs font-medium ${msg.agent === "alpha" ? "text-foreground" : "text-muted-foreground"}`}>
              {msg.agent === "alpha" ? "ALPHA" : "BETA"}
            </div>
            <div className="text-sm whitespace-pre-wrap pl-4 border-l border-border">
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isRunning && (
          <div className="space-y-1">
            <div className={`text-xs font-medium ${currentAgent === "alpha" ? "text-foreground" : "text-muted-foreground"}`}>
              {currentAgent === "alpha" ? "ALPHA" : "BETA"}
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

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Thema eingeben..."
            className="resize-none bg-input border-border text-foreground placeholder:text-muted-foreground min-h-[44px] max-h-32"
            rows={1}
            disabled={isRunning}
          />
          {!isRunning ? (
            <Button
              onClick={runDebate}
              disabled={!topic.trim()}
              size="icon"
              variant="outline"
              className="shrink-0"
            >
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={stopDebate}
              size="icon"
              variant="outline"
              className="shrink-0 text-foreground"
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
