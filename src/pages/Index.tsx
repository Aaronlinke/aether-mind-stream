import { useState } from "react";
import { MathChat } from "@/components/MathChat";
import { DebateChat } from "@/components/DebateChat";
import { CryptoTools } from "@/components/CryptoTools";
import { SHA256Analyzer } from "@/components/SHA256Analyzer";
import { LatticeAnalyzer } from "@/components/LatticeAnalyzer";
import { LinkeSystem } from "@/components/LinkeSystem";

const Index = () => {
  const [mode, setMode] = useState<"chat" | "debate" | "tools" | "sha256" | "lattice" | "linke">("linke");

  const modes = [
    { id: "linke", label: "LINKE" },
    { id: "tools", label: "TOOLS" },
    { id: "sha256", label: "SHA-256" },
    { id: "lattice", label: "GITTER" },
    { id: "chat", label: "CHAT" },
    { id: "debate", label: "DEBATTE" },
  ] as const;

  return (
    <div className="h-screen flex flex-col">
      {/* Mode Toggle */}
      <div className="border-b border-border flex">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              mode === m.id 
                ? "bg-foreground text-background" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "chat" && <MathChat />}
        {mode === "debate" && <DebateChat />}
        {mode === "tools" && <CryptoTools />}
        {mode === "sha256" && <SHA256Analyzer />}
        {mode === "lattice" && <LatticeAnalyzer />}
        {mode === "linke" && <LinkeSystem />}
      </div>
    </div>
  );
};

export default Index;
