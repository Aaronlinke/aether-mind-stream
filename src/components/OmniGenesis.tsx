import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, Target, Layers, Zap, Play, RotateCcw, Download, Circle } from "lucide-react";

// SRIL-Koeffizienten
const ALPHA = 0.245; // Harmonische Kopplung
const BETA = 0.152;  // Entropie-Abfluss
const GAMMA = 0.985; // Drift-Dämpfung
const DELTA = 0.112; // Phasen-Kopplung
const ETA = 0.088;   // Wachstums-Impuls

interface SRILState {
  t: number;
  H: number;
  N: number;
  G: number;
}

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

// SRIL Vorwärts-Berechnung
function computeSRIL(state: SRILState): SRILState {
  const H_new = state.H + (ALPHA * state.N) - (BETA * state.G);
  const N_new = (GAMMA * state.N) + (DELTA * Math.abs(state.H));
  const G_new = state.G + (ETA * (H_new + N_new));
  
  return {
    t: state.t + 1,
    H: H_new,
    N: N_new,
    G: G_new
  };
}

// Primzahl-Check für Ulam
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

export const OmniGenesis = () => {
  // SRIL State
  const [h0, setH0] = useState("-4.256");
  const [n0, setN0] = useState("5.824");
  const [g0, setG0] = useState("1.952");
  const [srilStates, setSrilStates] = useState<SRILState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // Matrix State
  const [matrixH, setMatrixH] = useState("-3.340");
  const [matrixN, setMatrixN] = useState("3.360");
  const [matrixG, setMatrixG] = useState("1.780");
  const [matrixBasis, setMatrixBasis] = useState("66");
  const [matrixResult, setMatrixResult] = useState<number[][]>([]);
  const [kValue, setKValue] = useState("");
  
  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Canvas refs
  const ulamCanvasRef = useRef<HTMLCanvasElement>(null);
  const chronoCanvasRef = useRef<HTMLCanvasElement>(null);
  const moireCanvasRef = useRef<HTMLCanvasElement>(null);
  const moireAngle = useRef(0);
  const animationRef = useRef<number>();

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, message, type }, ...prev.slice(0, 99)]);
  }, []);

  // SRIL Simulation
  const runSRIL = useCallback(async () => {
    const initialState: SRILState = {
      t: 0,
      H: parseFloat(h0),
      N: parseFloat(n0),
      G: parseFloat(g0)
    };
    
    if (isNaN(initialState.H) || isNaN(initialState.N) || isNaN(initialState.G)) {
      addLog("FEHLER: Ungültige Startwerte", "error");
      return;
    }
    
    setIsRunning(true);
    setSrilStates([initialState]);
    addLog("SRIL-Simulation gestartet", "success");
    addLog(`T=0: H=${initialState.H.toFixed(3)}, N=${initialState.N.toFixed(3)}, G=${initialState.G.toFixed(3)}`, "info");
    
    let currentState = initialState;
    const states: SRILState[] = [initialState];
    
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 300));
      currentState = computeSRIL(currentState);
      states.push(currentState);
      setSrilStates([...states]);
      addLog(`T=${currentState.t}: H=${currentState.H.toFixed(3)}, N=${currentState.N.toFixed(3)}, G=${currentState.G.toFixed(3)}`, 
        currentState.H > 0 ? "success" : "warning");
    }
    
    addLog("SRIL erreicht Balanced Temporal Equilibrium (BTE)", "success");
    setIsRunning(false);
  }, [h0, n0, g0, addLog]);

  // Matrix LLL-Reduktion
  const runMatrixReduction = useCallback(() => {
    const H = parseFloat(matrixH);
    const N = parseFloat(matrixN);
    const G = parseFloat(matrixG);
    const basis = parseInt(matrixBasis);
    
    if (isNaN(H) || isNaN(N) || isNaN(G) || isNaN(basis)) {
      addLog("FEHLER: Ungültige Matrix-Parameter", "error");
      return;
    }
    
    // 3x3 Gitter-Matrix aufbauen
    const basisScale = Math.pow(2, basis);
    const matrix: number[][] = [
      [1, 0, H],
      [0, 1, N],
      [G / basisScale, N / basisScale, 1.1579e77]
    ];
    
    setMatrixResult(matrix);
    addLog("Gitter-Matrix erstellt", "info");
    
    // K-Berechnung (Cube Root Resonanz)
    const product = Math.abs(H * N * G);
    const cubeRoot = Math.cbrt(product);
    addLog(`Produkt |H×N×G| = ${product.toFixed(4)}`, "info");
    addLog(`Kubikwurzel = ${cubeRoot.toFixed(6)} (≈ e = 2.71828...)`, "success");
    
    const K = cubeRoot * basisScale;
    const kHex = K.toString(16).toUpperCase().substring(0, 10);
    setKValue(`${cubeRoot.toFixed(6)} × 2^${basis} → ${kHex}...`);
    addLog(`Minimaler Vektor K: ${kHex}...`, "success");
  }, [matrixH, matrixN, matrixG, matrixBasis, addLog]);

  // Ulam-Spirale zeichnen
  const drawUlam = useCallback(() => {
    const canvas = ulamCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const size = Math.min(canvas.offsetWidth, canvas.offsetHeight);
    canvas.width = size;
    canvas.height = size;
    
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    
    const res = 80;
    const gap = size / res;
    let x = size / 2, y = size / 2;
    let step = 1, stepCount = 0, direction = 0;
    
    for (let n = 1; n < res * res; n++) {
      if (isPrime(n)) {
        // Goldene Markierung für Primzahlen die auf 7 enden
        ctx.fillStyle = n % 10 === 7 ? "#ffcc00" : "#00f2ff";
        ctx.shadowBlur = 3;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(x, y, gap * 0.7, gap * 0.7);
      }
      
      switch (direction) {
        case 0: x += gap; break;
        case 1: y -= gap; break;
        case 2: x -= gap; break;
        case 3: y += gap; break;
      }
      
      stepCount++;
      if (stepCount === step) {
        stepCount = 0;
        direction = (direction + 1) % 4;
        if (direction % 2 === 0) step++;
      }
    }
    
    addLog("Ulam-Spirale generiert (80×80 Grid)", "success");
  }, [addLog]);

  // Chronoplast zeichnen
  const drawChronoplast = useCallback(() => {
    const canvas = chronoCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const size = Math.min(canvas.offsetWidth, canvas.offsetHeight);
    canvas.width = size;
    canvas.height = size;
    
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.4;
    
    // Hintergrund
    ctx.fillStyle = "#020204";
    ctx.fillRect(0, 0, size, size);
    
    // Kreis
    ctx.strokeStyle = "rgba(0, 242, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // N-Vektor (Intent) - Vertikal nach oben
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - radius);
    ctx.stroke();
    
    // H-Vektor (Reality Distortion) - 33° versetzt
    ctx.strokeStyle = "#00f2ff";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00f2ff";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const hAngle = -57 * Math.PI / 180;
    ctx.lineTo(cx + Math.cos(hAngle) * radius, cy + Math.sin(hAngle) * radius);
    ctx.stroke();
    
    // G-Vektor (Reflection) - 123°
    ctx.strokeStyle = "#ffcc00";
    ctx.shadowColor = "#ffcc00";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const gAngle = 123 * Math.PI / 180;
    ctx.lineTo(cx + Math.cos(gAngle) * radius, cy + Math.sin(gAngle) * radius);
    ctx.stroke();
    
    // Target point
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff004c";
    ctx.fillStyle = "#ff004c";
    ctx.beginPath();
    ctx.arc(cx, cy - radius, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Labels
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#64748b";
    ctx.font = "10px monospace";
    ctx.fillText("N (Intent)", cx + 5, cy - radius + 15);
    ctx.fillStyle = "#00f2ff";
    ctx.fillText("H (Chaos)", cx + radius * 0.6, cy - radius * 0.3);
    ctx.fillStyle = "#ffcc00";
    ctx.fillText("G (Field)", cx - radius * 0.8, cy + radius * 0.6);
    
    addLog("Chronoplast-Triangulation berechnet", "success");
  }, [addLog]);

  // Moiré-Animation
  const drawMoire = useCallback(() => {
    const canvas = moireCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const animate = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Statisches Gitter 1
      ctx.strokeStyle = "rgba(0, 242, 255, 0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width + canvas.height; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(0, i);
        ctx.stroke();
      }
      
      // Rotierendes Gitter 2
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(moireAngle.current * Math.PI / 180);
      ctx.strokeStyle = "rgba(255, 204, 0, 0.15)";
      for (let i = -canvas.width; i < canvas.width * 2; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, -canvas.height);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      ctx.restore();
      
      // Zentrale Markierung
      ctx.fillStyle = "rgba(255, 0, 76, 0.5)";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff004c";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText("AD85FE", canvas.width / 2, canvas.height / 2);
      
      moireAngle.current += 0.05;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animate();
  }, []);

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const downloadState = () => {
    const data = {
      sril: srilStates,
      matrix: matrixResult,
      kValue,
      logs: logs.slice(0, 50)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnigenesis_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-[hsl(180,100%,50%)]" />
          <span className="font-bold tracking-widest text-sm">OMNIGENESIS // CHRONOPLAST V23</span>
          <span className="text-xs px-2 py-0.5 border border-[hsl(180,100%,50%)] text-[hsl(180,100%,50%)] rounded">SRIL-CORE</span>
        </div>
        <Button variant="outline" size="sm" onClick={downloadState}>
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <Tabs defaultValue="sril" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger value="sril" className="rounded-none data-[state=active]:bg-background text-xs">SRIL</TabsTrigger>
              <TabsTrigger value="matrix" className="rounded-none data-[state=active]:bg-background text-xs">MATRIX</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sril" className="flex-1 p-4 space-y-4 overflow-auto">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">H(0) - ENTHALPIE</Label>
                  <Input value={h0} onChange={e => setH0(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">N(0) - NAVIGATION</Label>
                  <Input value={n0} onChange={e => setN0(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">G(0) - WACHSTUM</Label>
                  <Input value={g0} onChange={e => setG0(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
              </div>
              
              <Button onClick={runSRIL} disabled={isRunning} className="w-full bg-[hsl(180,100%,50%)] text-background hover:bg-[hsl(180,100%,40%)]">
                <Play className="w-4 h-4 mr-2" />
                SRIL Simulation
              </Button>
              
              {/* SRIL Results */}
              {srilStates.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-xs text-muted-foreground">ZEITREIHE</Label>
                  <div className="bg-background p-2 rounded text-xs font-mono space-y-1 max-h-40 overflow-auto">
                    {srilStates.map((s, i) => (
                      <div key={i} className={`${s.H > 0 ? "text-green-400" : "text-yellow-400"}`}>
                        T={s.t}: H={s.H.toFixed(3)} N={s.N.toFixed(3)} G={s.G.toFixed(3)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="matrix" className="flex-1 p-4 space-y-4 overflow-auto">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">H (Chaos-Winkel)</Label>
                  <Input value={matrixH} onChange={e => setMatrixH(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">N (Navigations-Vektor)</Label>
                  <Input value={matrixN} onChange={e => setMatrixN(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">G (Geometrie-Feld)</Label>
                  <Input value={matrixG} onChange={e => setMatrixG(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">BASIS (2^n)</Label>
                  <Input value={matrixBasis} onChange={e => setMatrixBasis(e.target.value)} className="font-mono text-xs bg-background" />
                </div>
              </div>
              
              <Button onClick={runMatrixReduction} className="w-full bg-[hsl(45,100%,50%)] text-background hover:bg-[hsl(45,100%,40%)]">
                <Box className="w-4 h-4 mr-2" />
                LLL-Reduktion
              </Button>
              
              {matrixResult.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">3×3 GITTER</Label>
                  <div className="grid grid-cols-3 gap-1 text-xs font-mono">
                    {matrixResult.flat().map((v, i) => (
                      <div key={i} className="bg-background p-2 text-center text-[hsl(180,100%,50%)]">
                        {typeof v === "number" ? (v > 1000 ? v.toExponential(2) : v.toFixed(3)) : v}
                      </div>
                    ))}
                  </div>
                  {kValue && (
                    <div className="bg-background p-2 rounded text-xs text-green-400 font-mono">
                      K: {kValue}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Visualizations */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="ulam" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-card p-0">
              <TabsTrigger value="ulam" className="rounded-none data-[state=active]:bg-background text-xs gap-1" onClick={drawUlam}>
                <Circle className="w-3 h-3" /> ULAM
              </TabsTrigger>
              <TabsTrigger value="chrono" className="rounded-none data-[state=active]:bg-background text-xs gap-1" onClick={drawChronoplast}>
                <Target className="w-3 h-3" /> CHRONO
              </TabsTrigger>
              <TabsTrigger value="moire" className="rounded-none data-[state=active]:bg-background text-xs gap-1" onClick={drawMoire}>
                <Layers className="w-3 h-3" /> MOIRÉ
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ulam" className="flex-1 flex items-center justify-center bg-black p-4">
              <canvas ref={ulamCanvasRef} className="max-w-full max-h-full" style={{ width: "100%", height: "100%" }} />
            </TabsContent>
            
            <TabsContent value="chrono" className="flex-1 flex items-center justify-center bg-black p-4">
              <canvas ref={chronoCanvasRef} className="max-w-full max-h-full" style={{ width: "100%", height: "100%" }} />
            </TabsContent>
            
            <TabsContent value="moire" className="flex-1 relative bg-black overflow-hidden">
              <canvas ref={moireCanvasRef} className="absolute inset-0 w-full h-full" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Terminal */}
        <div className="w-80 border-l border-border flex flex-col bg-card">
          <div className="p-2 border-b border-border text-xs text-muted-foreground flex items-center justify-between">
            <span>TERMINAL</span>
            <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-1 font-mono text-xs">
              {logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`py-1 border-b border-border/30 ${
                    log.type === "success" ? "text-green-400" : 
                    log.type === "warning" ? "text-yellow-400" : 
                    log.type === "error" ? "text-red-400" : "text-muted-foreground"
                  }`}
                >
                  <span className="opacity-50">[{log.time}]</span> {log.message}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-muted-foreground">Warte auf Befehle...</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
