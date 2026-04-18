import { useState, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const MathChat = lazy(() => import("@/components/MathChat").then(m => ({ default: m.MathChat })));
const DebateChat = lazy(() => import("@/components/DebateChat").then(m => ({ default: m.DebateChat })));
const CryptoTools = lazy(() => import("@/components/CryptoTools").then(m => ({ default: m.CryptoTools })));
const SHA256Analyzer = lazy(() => import("@/components/SHA256Analyzer").then(m => ({ default: m.SHA256Analyzer })));
const LatticeAnalyzer = lazy(() => import("@/components/LatticeAnalyzer").then(m => ({ default: m.LatticeAnalyzer })));
const LinkeSystem = lazy(() => import("@/components/LinkeSystem").then(m => ({ default: m.LinkeSystem })));
const OmniGenesis = lazy(() => import("@/components/OmniGenesis").then(m => ({ default: m.OmniGenesis })));
const Nexus = lazy(() => import("@/components/Nexus").then(m => ({ default: m.Nexus })));
const Inversion = lazy(() => import("@/components/Inversion").then(m => ({ default: m.Inversion })));
const Chronos = lazy(() => import("@/components/Chronos").then(m => ({ default: m.Chronos })));
const FormulaLibrary = lazy(() => import("@/components/FormulaLibrary").then(m => ({ default: m.FormulaLibrary })));
const HexLattice = lazy(() => import("@/components/HexLattice").then(m => ({ default: m.HexLattice })));
const SRILPipeline = lazy(() => import("@/components/SRILPipeline").then(m => ({ default: m.SRILPipeline })));
const AttackSimulator = lazy(() => import("@/components/AttackSimulator").then(m => ({ default: m.AttackSimulator })));
const LaTeXExport = lazy(() => import("@/components/LaTeXExport").then(m => ({ default: m.LaTeXExport })));
const Lattice3D = lazy(() => import("@/components/Lattice3D").then(m => ({ default: m.Lattice3D })));
const LogisticMapViz = lazy(() => import("@/components/LogisticMapViz").then(m => ({ default: m.LogisticMapViz })));
const FormulaExport = lazy(() => import("@/components/FormulaExport").then(m => ({ default: m.FormulaExport })));
const PrimeExplorer = lazy(() => import("@/components/PrimeExplorer").then(m => ({ default: m.PrimeExplorer })));
const MatrixLab = lazy(() => import("@/components/MatrixLab").then(m => ({ default: m.MatrixLab })));
const CipherPlayground = lazy(() => import("@/components/CipherPlayground").then(m => ({ default: m.CipherPlayground })));
const GraphLab = lazy(() => import("@/components/GraphLab").then(m => ({ default: m.GraphLab })));
const ModularArithmetic = lazy(() => import("@/components/ModularArithmetic").then(m => ({ default: m.ModularArithmetic })));
const RSADemo = lazy(() => import("@/components/RSADemo").then(m => ({ default: m.RSADemo })));
const LorenzAttractor = lazy(() => import("@/components/LorenzAttractor").then(m => ({ default: m.LorenzAttractor })));
const MandelbrotExplorer = lazy(() => import("@/components/MandelbrotExplorer").then(m => ({ default: m.MandelbrotExplorer })));
const ECCPlotter = lazy(() => import("@/components/ECCPlotter").then(m => ({ default: m.ECCPlotter })));

type Mode = "chronos" | "inversion" | "nexus" | "omni" | "linke" | "chat" | "debate" | "tools" | "sha256" | "lattice" | "formeln" | "hexgitter" | "pipeline" | "attack" | "latex" | "3d" | "logmap" | "export" | "primes" | "matrix" | "cipher" | "graph" | "modular" | "rsa" | "lorenz" | "mandel" | "ecc";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const Index = () => {
  const [mode, setMode] = useState<Mode>("formeln");

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
    { id: "primes", label: "PRIMZAHL" },
    { id: "matrix", label: "MATRIX" },
    { id: "cipher", label: "CHIFFRE" },
    { id: "graph", label: "GRAPH" },
    { id: "modular", label: "MODULAR" },
    { id: "rsa", label: "RSA" },
    { id: "ecc", label: "ECC" },
    { id: "lorenz", label: "LORENZ" },
    { id: "mandel", label: "FRAKTAL" },
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

      <div className="flex-1 overflow-hidden">
        <ErrorBoundary key={mode} label={mode}>
          <Suspense fallback={<LoadingFallback />}>
            {mode === "chronos" && <Chronos />}
            {mode === "pipeline" && <SRILPipeline />}
            {mode === "attack" && <AttackSimulator />}
            {mode === "inversion" && <Inversion />}
            {mode === "nexus" && <Nexus />}
            {mode === "omni" && <OmniGenesis />}
            {mode === "linke" && <LinkeSystem />}
            {mode === "formeln" && <FormulaLibrary />}
            {mode === "export" && <FormulaExport />}
            {mode === "logmap" && <LogisticMapViz />}
            {mode === "primes" && <PrimeExplorer />}
            {mode === "matrix" && <MatrixLab />}
            {mode === "cipher" && <CipherPlayground />}
            {mode === "graph" && <GraphLab />}
            {mode === "modular" && <ModularArithmetic />}
            {mode === "rsa" && <RSADemo />}
            {mode === "ecc" && <ECCPlotter />}
            {mode === "lorenz" && <LorenzAttractor />}
            {mode === "mandel" && <MandelbrotExplorer />}
            {mode === "latex" && <LaTeXExport />}
            {mode === "hexgitter" && <HexLattice />}
            {mode === "3d" && <Lattice3D />}
            {mode === "chat" && <MathChat />}
            {mode === "debate" && <DebateChat />}
            {mode === "tools" && <CryptoTools />}
            {mode === "sha256" && <SHA256Analyzer />}
            {mode === "lattice" && <LatticeAnalyzer />}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Index;
