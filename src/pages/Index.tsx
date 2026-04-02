import { useState } from "react";
import { MathChat } from "@/components/MathChat";
import { DebateChat } from "@/components/DebateChat";
import { CryptoTools } from "@/components/CryptoTools";
import { SHA256Analyzer } from "@/components/SHA256Analyzer";
import { LatticeAnalyzer } from "@/components/LatticeAnalyzer";
import { LinkeSystem } from "@/components/LinkeSystem";
import { OmniGenesis } from "@/components/OmniGenesis";
import { Nexus } from "@/components/Nexus";
import { Inversion } from "@/components/Inversion";
import { Chronos } from "@/components/Chronos";
import { FormulaLibrary } from "@/components/FormulaLibrary";
import { HexLattice } from "@/components/HexLattice";
import { SRILPipeline } from "@/components/SRILPipeline";
import { AttackSimulator } from "@/components/AttackSimulator";
import { LaTeXExport } from "@/components/LaTeXExport";
import { Lattice3D } from "@/components/Lattice3D";
import { LogisticMapViz } from "@/components/LogisticMapViz";
import { FormulaExport } from "@/components/FormulaExport";

type Mode = "chronos" | "inversion" | "nexus" | "omni" | "linke" | "chat" | "debate" | "tools" | "sha256" | "lattice" | "formeln" | "hexgitter" | "pipeline" | "attack" | "latex" | "3d" | "logmap" | "export";

const Index = () => {
  const [mode, setMode] = useState<Mode>("chronos");

  const modes: { id: Mode; label: string }[] = [
    { id: "chronos", label: "CHRONOS" },
    { id: "pipeline", label: "PIPELINE" },
    { id: "attack", label: "ANGRIFF" },
    { id: "inversion", label: "INVERSION" },
    { id: "nexus", label: "NEXUS" },
    { id: "omni", label: "OMNI" },
    { id: "linke", label: "LINKE" },
    { id: "formeln", label: "FORMELN" },
    { id: "export", label: "EXPORT" },
    { id: "logmap", label: "LOGISTIK" },
    { id: "latex", label: "LaTeX" },
    { id: "hexgitter", label: "HEX-2D" },
    { id: "3d", label: "HEX-3D" },
    { id: "sha256", label: "SHA-256" },
    { id: "lattice", label: "GITTER" },
    { id: "tools", label: "TOOLS" },
    { id: "chat", label: "CHAT" },
    { id: "debate", label: "DEBATTE" },
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Mode Toggle - scrollable */}
      <div className="border-b border-border overflow-x-auto flex">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-shrink-0 px-3 py-2 text-[10px] font-medium transition-colors whitespace-nowrap ${
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
        {mode === "chronos" && <Chronos />}
        {mode === "pipeline" && <SRILPipeline />}
        {mode === "attack" && <AttackSimulator />}
        {mode === "inversion" && <Inversion />}
        {mode === "nexus" && <Nexus />}
        {mode === "omni" && <OmniGenesis />}
        {mode === "linke" && <LinkeSystem />}
        {mode === "formeln" && <FormulaLibrary />}
        {mode === "latex" && <LaTeXExport />}
        {mode === "hexgitter" && <HexLattice />}
        {mode === "3d" && <Lattice3D />}
        {mode === "chat" && <MathChat />}
        {mode === "debate" && <DebateChat />}
        {mode === "tools" && <CryptoTools />}
        {mode === "sha256" && <SHA256Analyzer />}
        {mode === "lattice" && <LatticeAnalyzer />}
      </div>
    </div>
  );
};

export default Index;
