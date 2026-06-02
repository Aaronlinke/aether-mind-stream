import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AI_MODELS, DEFAULT_MODEL, loadCustomKeys, modelRequiresKey, type CustomKeys } from "@/lib/aiModels";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { downloadMarkdown, downloadJson } from "@/lib/download";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/math-chat`;

export function MathChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<string>(() => localStorage.getItem("ai-model") || DEFAULT_MODEL);
  const [customKeys, setCustomKeys] = useState<CustomKeys>(() => loadCustomKeys());
  const [strictMode, setStrictMode] = useState<boolean>(() => localStorage.getItem("strict-mode") === "1");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => { localStorage.setItem("ai-model", model); }, [model]);
  useEffect(() => { localStorage.setItem("strict-mode", strictMode ? "1" : "0"); }, [strictMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const keyCheck = modelRequiresKey(model, customKeys);
    if (!keyCheck.ok) {
      toast({ variant: "destructive", title: `${keyCheck.missing?.toUpperCase()} API-Key fehlt`,
        description: "Im Keys-Dialog hinterlegen oder ein Lovable-Modell wählen." });
      return;
    }

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], model, customKeys, strictMode }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Fehler: ${resp.status}`);
      }

      if (!resp.body) throw new Error("Keine Antwort erhalten");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : "Verbindungsfehler",
      });
      // Remove empty assistant message on error
      if (assistantContent === "") {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting for code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const code = part.slice(3, -3);
        const firstLine = code.indexOf("\n");
        const lang = firstLine > 0 ? code.slice(0, firstLine) : "";
        const codeContent = firstLine > 0 ? code.slice(firstLine + 1) : code;
        return (
          <pre key={i} className="bg-muted p-3 rounded overflow-x-auto my-2 text-sm">
            {lang && <div className="text-muted-foreground text-xs mb-2">{lang}</div>}
            <code>{codeContent}</code>
          </pre>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="border-b border-border p-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-medium">MATH / CRYPTO</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Mathematik • Kryptografie • exakt, ohne Mythos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} disabled={isLoading} />
            STRIKT
          </label>
          {messages.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => {
                const md = `# Math-Chat\n\n**Modell:** ${model}\n\n---\n\n${messages.map(m => `### ${m.role === "user" ? "User" : "AI"}\n\n${m.content}`).join("\n\n")}`;
                downloadMarkdown(md, "mathchat");
              }}>
                <Download className="h-3 w-3 mr-1" />MD
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadJson({ model, messages, ts: Date.now() }, "mathchat")}>
                JSON
              </Button>
            </>
          )}
          <ApiKeyManager onChange={setCustomKeys} />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isLoading}
            className="text-xs bg-input border border-border rounded px-2 py-1 text-foreground max-w-[200px]"
            title="KI-Modell"
          >
            {Object.entries(AI_MODELS.reduce((acc, m) => {
              (acc[m.provider] ||= []).push(m); return acc;
            }, {} as Record<string, typeof AI_MODELS>)).map(([prov, list]) => (
              <optgroup key={prov} label={prov}>
                {list.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-muted-foreground text-sm space-y-2 mt-8">
            <p>Beispiele:</p>
            <ul className="space-y-1 text-xs">
              <li>• "Berechne den GCD von 48 und 18"</li>
              <li>• "Erkläre SHA-256 Schritt für Schritt"</li>
              <li>• "Base58 encode: Hello World"</li>
              <li>• "Generiere Ed25519 Keypair in Swift"</li>
              <li>• "Löse: 17^123 mod 31"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${
              msg.role === "user"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <span className="text-xs opacity-50 mr-2">
              {msg.role === "user" ? ">" : "#"}
            </span>
            <div className="inline chat-message">
              {msg.role === "assistant" ? formatContent(msg.content) : msg.content}
              {msg.role === "assistant" && isLoading && i === messages.length - 1 && (
                <span className="inline-block w-2 h-4 bg-foreground ml-1 animate-pulse" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Eingabe..."
            className="resize-none bg-input border-border text-foreground placeholder:text-muted-foreground min-h-[44px] max-h-32"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            variant="outline"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
