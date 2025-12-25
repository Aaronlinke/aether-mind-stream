import { useState } from "react";
import { MathChat } from "@/components/MathChat";
import { DebateChat } from "@/components/DebateChat";

const Index = () => {
  const [mode, setMode] = useState<"chat" | "debate">("chat");

  return (
    <div className="h-screen flex flex-col">
      {/* Mode Toggle */}
      <div className="border-b border-border flex">
        <button
          onClick={() => setMode("chat")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === "chat" 
              ? "bg-foreground text-background" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          CHAT
        </button>
        <button
          onClick={() => setMode("debate")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === "debate" 
              ? "bg-foreground text-background" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          DEBATTE
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "chat" ? <MathChat /> : <DebateChat />}
      </div>
    </div>
  );
};

export default Index;
