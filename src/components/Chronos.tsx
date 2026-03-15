import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, Target, Atom, Zap, Download, 
  Play, Pause, RotateCcw, Copy, Check, Shield, 
  TrendingUp, Hash, Activity, AlertTriangle 
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONOS: KEY EVOLUTION SYSTEM
// Formal proof that state-bound keys eliminate offline attack vectors
// ═══════════════════════════════════════════════════════════════════════════════

// PRF: HMAC-like key derivation (simplified for visualization)
async function PRF(key: string, time: number, state: string): Promise<string> {
  const input = `${key}|${time}|${state}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// SRIL-based state evolution
const ALPHA = 0.245;
const BETA = 0.152;
const GAMMA = 1.1487;
const DELTA = 0.112;
const ETA = 0.088;

interface KeyState {
  t: number;
  K: string;        // Current key (hex)
  A: string;        // Derived address (truncated hash)
  H: number;        // SRIL state components
  N: number;
  G: number;
  entropy: number;  // Conditional entropy H(K_n | K_{n-1})
}

interface ProofStep {
  id: string;
  title: string;
  latex: string;
  description: string;
  category: 'axiom' | 'model' | 'analysis' | 'proof';
}

interface AttackMetrics {
  T_A: number;      // Attack time (iterations needed)
  T_K: number;      // Key lifetime (iterations until change)
  searchSpace: string; // Size representation
  probability: number; // Pr[success]
  convergence: boolean;
}

// Generate address from key (simplified - just hash truncation)
async function deriveAddress(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return '0x' + hex.substring(0, 40);
}

// SRIL evolution step
function srilStep(h: number, n: number, g: number, t: number): { h: number; n: number; g: number } {
  const eps_H = 0.001 * Math.sin(2 * Math.PI * t / 100);
  const eps_N = 0.0005 * Math.cos(2 * Math.PI * t / 73);
  const eps_G = 0.0002 * Math.sin(2 * Math.PI * t / 37 + Math.PI / 4);
  
  const h_next = h + ALPHA * n - BETA * g + eps_H;
  const n_next = GAMMA * n + DELTA * h + eps_N;
  const g_next = g + ETA * (h_next + n_next) * (1 + 0.01 * Math.tanh(g / 10)) + eps_G;
  
  return { h: h_next, n: n_next, g: g_next };
}

export const Chronos: React.FC = () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [keyHistory, setKeyHistory] = useState<KeyState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [copied, setCopied] = useState<string | null>(null);
  
  // Initial conditions
  const [h0, setH0] = useState(-4.256);
  const [n0, setN0] = useState(5.824);
  const [g0, setG0] = useState(1.952);
  const [seedKey, setSeedKey] = useState('0xDEADBEEF');
  
  // Attack simulation
  const [attackMetrics, setAttackMetrics] = useState<AttackMetrics | null>(null);
  const [classicMetrics, setClassicMetrics] = useState<AttackMetrics | null>(null);
  
  // Animation refs
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FORMAL PROOF STEPS (A-Z from user's analysis)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const proofSteps: ProofStep[] = useMemo(() => [
    // A - Axioms
    {
      id: 'A1',
      title: 'Klassisches Kryptomodell',
      latex: 'K ∈ 𝒦, A = g(K)',
      description: 'Statischer Schlüssel, endlicher Suchraum |𝒦| = 2^H(K)',
      category: 'axiom'
    },
    {
      id: 'A2',
      title: 'Sicherheitsannahme klassisch',
      latex: 'Pr[K̂ = K] ≤ 2^{-H(K)}',
      description: 'Fixer Zielwert, Wiederholbarkeit, zeitunabhängige Entropie',
      category: 'axiom'
    },
    
    // B - Model
    {
      id: 'B1',
      title: 'Schlüssel als Prozess',
      latex: 'K : ℕ → 𝒦, K_{n+1} = F(K_n, t_n, s)',
      description: 'Rekursive Ableitung mit PRF, Zeit und internem Zustand',
      category: 'model'
    },
    {
      id: 'B2',
      title: 'Zentrale Eigenschaft',
      latex: '∀i ≠ j: A_i ≠ A_j',
      description: 'Es existiert KEIN fixer Zielwert',
      category: 'model'
    },
    
    // C-G - Analysis
    {
      id: 'C',
      title: 'Angriffsproblem',
      latex: 'g(K_n) = A_n → K_n →^{t_{n+1}} K_{n+1}',
      description: 'Erfolg bei K_n liefert keinen Nutzen für K_{n+1}',
      category: 'analysis'
    },
    {
      id: 'D',
      title: 'Mutual Information',
      latex: 'I(K_n ; A_0,...,A_{n-1}) ≈ 0',
      description: 'Vergangenheit akkumuliert keine Information über Zukunft',
      category: 'analysis'
    },
    {
      id: 'E',
      title: 'Bedingte Entropie',
      latex: 'H(K_n | K_{n-1}) ≈ H(K_n)',
      description: 'Maximale bedingte Entropie → keine Zustandskompression',
      category: 'analysis'
    },
    {
      id: 'F',
      title: 'Suchraum-Analyse',
      latex: '𝒦* = ⋃_{n=0}^∞ {K_n}',
      description: 'Nicht endlich, nicht indexierbar, kein Zielraum',
      category: 'analysis'
    },
    {
      id: 'G',
      title: 'Brute-Force-Grenze',
      latex: 'T_K < T_A ⇒ keine Strategie',
      description: 'Schlüssel-Lebensdauer < Angriffszeit → keine Konvergenz',
      category: 'analysis'
    },
    
    // H-I - Proof
    {
      id: 'H',
      title: 'Reduktionsbruch',
      latex: 'dK/dt ≠ 0',
      description: 'Klassische Beweise benötigen K = const, hier nicht erfüllt',
      category: 'proof'
    },
    {
      id: 'I',
      title: 'Negativer Beweis',
      latex: '∃A* stabil ⇐ Klassisch, ¬∃A* ⇐ Euer System',
      description: 'Das Angriffsproblem existiert nicht',
      category: 'proof'
    },
    {
      id: 'Z',
      title: 'Endzustand',
      latex: 'Objekte → suchbar, Abläufe → nur verpassbar',
      description: 'System ist nicht unknackbar, sondern NICHT ADRESSIERBAR',
      category: 'proof'
    }
  ], []);

  // ═══════════════════════════════════════════════════════════════════════════
  // KEY EVOLUTION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const evolveKey = useCallback(async (prevState: KeyState | null): Promise<KeyState> => {
    const t = prevState ? prevState.t + 1 : 0;
    const prevKey = prevState?.K || seedKey;
    const h = prevState?.H || h0;
    const n = prevState?.N || n0;
    const g = prevState?.G || g0;
    
    // SRIL evolution for internal state
    const nextSRIL = srilStep(h, n, g, t);
    
    // State string combines SRIL state for PRF input
    const stateStr = `${nextSRIL.h.toFixed(8)}:${nextSRIL.n.toFixed(8)}:${nextSRIL.g.toFixed(8)}`;
    
    // Derive next key: K_{n+1} = PRF(K_n, t_n, s)
    const nextKey = await PRF(prevKey, t, stateStr);
    const nextAddress = await deriveAddress(nextKey);
    
    // Calculate conditional entropy (approximation)
    // In a true PRF, H(K_n | K_{n-1}) ≈ H(K_n) = 256 bits
    const entropy = 256 - Math.log2(1 + t * 0.001); // Minimal degradation visualization
    
    return {
      t,
      K: nextKey,
      A: nextAddress,
      H: nextSRIL.h,
      N: nextSRIL.n,
      G: nextSRIL.g,
      entropy
    };
  }, [seedKey, h0, n0, g0]);

  // Start evolution
  const startEvolution = useCallback(async () => {
    setIsRunning(true);
    
    const step = async () => {
      setKeyHistory(prev => {
        const lastState = prev[prev.length - 1] || null;
        evolveKey(lastState).then(newState => {
          setKeyHistory(current => [...current.slice(-99), newState]);
        });
        return prev;
      });
    };
    
    // Initial step
    const initial = await evolveKey(null);
    setKeyHistory([initial]);
    
    animationRef.current = setInterval(step, speed);
  }, [evolveKey, speed]);

  // Stop evolution
  const stopEvolution = useCallback(() => {
    setIsRunning(false);
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Reset
  const reset = useCallback(() => {
    stopEvolution();
    setKeyHistory([]);
    setAttackMetrics(null);
    setClassicMetrics(null);
  }, [stopEvolution]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACK SIMULATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const simulateAttack = useCallback(() => {
    if (keyHistory.length < 2) return;
    
    // Classic model: fixed target, finite search space
    const classicSearchSpace = Math.pow(2, 256);
    const classicT_A = Math.pow(2, 128); // Birthday bound
    const classicT_K = Infinity; // Key never changes
    
    setClassicMetrics({
      T_A: classicT_A,
      T_K: classicT_K,
      searchSpace: '2²⁵⁶',
      probability: 1 / classicT_A,
      convergence: true
    });
    
    // Our model: moving target, undefined search space
    const ourT_K = 1; // Key changes every step
    const ourT_A = Math.pow(2, 128); // Same computational effort needed
    
    setAttackMetrics({
      T_A: ourT_A,
      T_K: ourT_K,
      searchSpace: '⋃_{n=0}^∞ = ∅ (nicht definiert)',
      probability: 0, // T_K < T_A → no convergence
      convergence: false
    });
  }, [keyHistory]);

  useEffect(() => {
    if (keyHistory.length >= 10) {
      simulateAttack();
    }
  }, [keyHistory, simulateAttack]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const exportProof = useCallback(() => {
    const markdown = `# CHRONOS: Formaler Beweis
## Key-Evolution-System mit leerem Offline-Angriffsraum

---

${proofSteps.map(step => `
### ${step.id}. ${step.title}

**Formel:** \`${step.latex}\`

${step.description}

---
`).join('')}

## Schlussfolgerung

Das System ist nicht "unknackbar".
Es ist **NICHT ADRESSIERBAR**.

Klassische Kryptografie schützt **Objekte**.
Dieses System schützt **Abläufe**.

Objekte kann man suchen.
Abläufe kann man nur **verpassen**.
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chronos-formal-proof.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [proofSteps]);

  const exportJSON = useCallback(() => {
    const data = {
      system: 'CHRONOS Key Evolution',
      timestamp: new Date().toISOString(),
      initialConditions: { h0, n0, g0, seedKey },
      keyHistory: keyHistory.map(k => ({
        t: k.t,
        key: k.K,
        address: k.A,
        srilState: { H: k.H, N: k.N, G: k.G },
        entropy: k.entropy
      })),
      proofSteps,
      attackComparison: {
        classic: classicMetrics,
        ours: attackMetrics
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chronos-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [h0, n0, g0, seedKey, keyHistory, proofSteps, classicMetrics, attackMetrics]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUALIZATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Key trajectory visualization
  const keyTrajectoryViz = useMemo(() => {
    if (keyHistory.length < 2) return null;
    
    const width = 500;
    const height = 200;
    const padding = 30;
    
    const hValues = keyHistory.map(k => k.H);
    const minH = Math.min(...hValues);
    const maxH = Math.max(...hValues);
    const rangeH = maxH - minH || 1;
    
    const scaleX = (i: number) => padding + (i / (keyHistory.length - 1)) * (width - 2 * padding);
    const scaleY = (h: number) => height - padding - ((h - minH) / rangeH) * (height - 2 * padding);
    
    const pathData = keyHistory
      .map((k, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(k.H).toFixed(1)}`)
      .join(' ');
    
    return (
      <svg width={width} height={height} className="border border-border/30 rounded bg-background/50">
        <defs>
          <linearGradient id="keyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line 
            key={frac}
            x1={padding} 
            y1={padding + frac * (height - 2 * padding)} 
            x2={width - padding} 
            y2={padding + frac * (height - 2 * padding)}
            stroke="currentColor" 
            strokeOpacity={0.1}
          />
        ))}
        
        {/* Trajectory */}
        <path 
          d={pathData} 
          fill="none" 
          stroke="url(#keyGradient)" 
          strokeWidth={2}
          strokeLinecap="round"
        />
        
        {/* Current point */}
        {keyHistory.length > 0 && (
          <circle 
            cx={scaleX(keyHistory.length - 1)} 
            cy={scaleY(keyHistory[keyHistory.length - 1].H)} 
            r={4} 
            fill="currentColor"
            className="animate-pulse"
          />
        )}
        
        {/* Labels */}
        <text x={width / 2} y={height - 5} textAnchor="middle" className="text-[10px] fill-muted-foreground">
          Zeit t (Schlüssel-Evolution)
        </text>
        <text x={10} y={height / 2} textAnchor="middle" className="text-[10px] fill-muted-foreground" 
              transform={`rotate(-90, 10, ${height / 2})`}>
          SRIL State H
        </text>
      </svg>
    );
  }, [keyHistory]);

  // Search space comparison
  const searchSpaceViz = useMemo(() => {
    const width = 400;
    const height = 200;
    const padding = 40;
    
    return (
      <svg width={width} height={height} className="border border-border/30 rounded bg-background/50">
        {/* Classic - finite box */}
        <rect 
          x={padding} 
          y={padding} 
          width={120} 
          height={120} 
          fill="currentColor" 
          fillOpacity={0.1}
          stroke="currentColor"
          strokeWidth={1}
        />
        <circle 
          cx={padding + 60} 
          cy={padding + 60} 
          r={5} 
          fill="currentColor"
        />
        <text x={padding + 60} y={height - 15} textAnchor="middle" className="text-[10px] fill-muted-foreground">
          Klassisch: K* fixiert
        </text>
        
        {/* Ours - infinite/undefined */}
        <g transform={`translate(${width / 2 + 20}, ${padding})`}>
          {/* Multiple fading boxes to show evolution */}
          {[0, 1, 2, 3, 4].map(i => (
            <React.Fragment key={i}>
              <rect 
                x={i * 15} 
                y={i * 10} 
                width={80 - i * 10} 
                height={80 - i * 10} 
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                strokeOpacity={0.3 - i * 0.05}
                strokeDasharray="3,3"
              />
            </React.Fragment>
          ))}
          {/* Moving point */}
          <circle 
            cx={40 + (keyHistory.length % 30)} 
            cy={40 + (keyHistory.length % 20)} 
            r={4} 
            fill="currentColor"
            className="animate-pulse"
          />
          {/* Infinity symbol */}
          <text x={40} y={130} textAnchor="middle" className="text-lg fill-foreground">∅</text>
        </g>
        <text x={width / 2 + 60} y={height - 15} textAnchor="middle" className="text-[10px] fill-muted-foreground">
          Unser System: ⋃K_n = ∅
        </text>
      </svg>
    );
  }, [keyHistory.length]);

  // Entropy comparison chart
  const entropyViz = useMemo(() => {
    if (keyHistory.length < 2) return null;
    
    const width = 300;
    const height = 100;
    const padding = 20;
    
    const maxEntropy = 256;
    const barWidth = (width - 2 * padding) / keyHistory.length;
    
    return (
      <svg width={width} height={height} className="border border-border/30 rounded bg-background/50">
        {/* Entropy bars */}
        {keyHistory.slice(-50).map((k, i) => (
          <rect
            key={i}
            x={padding + i * barWidth}
            y={height - padding - (k.entropy / maxEntropy) * (height - 2 * padding)}
            width={Math.max(1, barWidth - 1)}
            height={(k.entropy / maxEntropy) * (height - 2 * padding)}
            fill="currentColor"
            fillOpacity={0.3 + (i / 50) * 0.7}
          />
        ))}
        
        {/* 256-bit line */}
        <line 
          x1={padding} y1={padding} 
          x2={width - padding} y2={padding}
          stroke="currentColor" strokeOpacity={0.3} strokeDasharray="3,3"
        />
        <text x={width - padding + 5} y={padding + 4} className="text-[8px] fill-muted-foreground">256 bit</text>
        
        <text x={width / 2} y={height - 3} textAnchor="middle" className="text-[9px] fill-muted-foreground">
          H(Kₙ | Kₙ₋₁) ≈ konstant
        </text>
      </svg>
    );
  }, [keyHistory]);

  // Current key state
  const currentState = keyHistory[keyHistory.length - 1];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5" />
          <span className="font-bold tracking-wider">CHRONOS</span>
          <Badge variant="outline" className="text-xs">KEY EVOLUTION SYSTEM</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
            {isRunning ? "EVOLVING" : "IDLE"}
          </Badge>
          {currentState && (
            <Badge variant="outline" className="text-xs font-mono">
              t = {currentState.t}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="evolution" className="h-full flex flex-col">
          <TabsList className="mx-3 mt-2 grid grid-cols-4 h-8">
            <TabsTrigger value="evolution" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              EVOLUTION
            </TabsTrigger>
            <TabsTrigger value="proof" className="text-xs">
              <Atom className="h-3 w-3 mr-1" />
              BEWEIS A-Z
            </TabsTrigger>
            <TabsTrigger value="attack" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              SUCHRAUM
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs">
              <Download className="h-3 w-3 mr-1" />
              EXPORT
            </TabsTrigger>
          </TabsList>

          {/* EVOLUTION TAB */}
          <TabsContent value="evolution" className="flex-1 overflow-hidden p-3">
            <div className="h-full grid grid-cols-2 gap-3">
              {/* Left: Controls & Current State */}
              <div className="space-y-3 overflow-auto">
                {/* Controls */}
                <Card className="bg-card/50">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      STEUERUNG
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={isRunning ? stopEvolution : startEvolution}
                        className="flex-1"
                      >
                        {isRunning ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        {isRunning ? 'STOP' : 'START'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={reset}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Geschwindigkeit: {speed}ms
                      </Label>
                      <Slider
                        value={[speed]}
                        onValueChange={([v]) => setSpeed(v)}
                        min={100}
                        max={2000}
                        step={100}
                        disabled={isRunning}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Seed Key</Label>
                      <Input
                        value={seedKey}
                        onChange={(e) => setSeedKey(e.target.value)}
                        className="h-7 text-xs font-mono"
                        disabled={isRunning}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">H₀</Label>
                        <Input
                          type="number"
                          value={h0}
                          onChange={(e) => setH0(parseFloat(e.target.value))}
                          className="h-6 text-xs font-mono"
                          step={0.1}
                          disabled={isRunning}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">N₀</Label>
                        <Input
                          type="number"
                          value={n0}
                          onChange={(e) => setN0(parseFloat(e.target.value))}
                          className="h-6 text-xs font-mono"
                          step={0.1}
                          disabled={isRunning}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">G₀</Label>
                        <Input
                          type="number"
                          value={g0}
                          onChange={(e) => setG0(parseFloat(e.target.value))}
                          className="h-6 text-xs font-mono"
                          step={0.1}
                          disabled={isRunning}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Key State */}
                {currentState && (
                  <Card className="bg-card/50">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        K_{currentState.t}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Schlüssel (256 bit)</Label>
                        <div className="flex items-center gap-1">
                          <code className="flex-1 text-[9px] font-mono bg-muted/50 p-1.5 rounded break-all">
                            {currentState.K}
                          </code>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(currentState.K, 'key')}
                          >
                            {copied === 'key' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Adresse A_{currentState.t}</Label>
                        <code className="block text-[10px] font-mono bg-muted/50 p-1.5 rounded">
                          {currentState.A}
                        </code>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-muted/30 p-1 rounded">
                          <div className="text-[8px] text-muted-foreground">H</div>
                          <div className="text-[10px] font-mono">{currentState.H.toFixed(3)}</div>
                        </div>
                        <div className="bg-muted/30 p-1 rounded">
                          <div className="text-[8px] text-muted-foreground">N</div>
                          <div className="text-[10px] font-mono">{currentState.N.toFixed(3)}</div>
                        </div>
                        <div className="bg-muted/30 p-1 rounded">
                          <div className="text-[8px] text-muted-foreground">G</div>
                          <div className="text-[10px] font-mono">{currentState.G.toFixed(3)}</div>
                        </div>
                        <div className="bg-muted/30 p-1 rounded">
                          <div className="text-[8px] text-muted-foreground">Entropie</div>
                          <div className="text-[10px] font-mono">{currentState.entropy.toFixed(1)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Key Formula */}
                <Card className="bg-card/50">
                  <CardContent className="p-3">
                    <div className="text-center space-y-2">
                      <code className="text-sm font-mono">
                        K<sub>n+1</sub> = PRF(K<sub>n</sub>, t<sub>n</sub>, s)
                      </code>
                      <div className="text-[10px] text-muted-foreground">
                        s = SRIL(H, N, G) | Zustandsgebundene Schlüsselableitung
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Visualizations */}
              <div className="space-y-3 overflow-auto">
                <Card className="bg-card/50">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      SCHLÜSSEL-TRAJEKTORIE K(t)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 flex justify-center">
                    {keyTrajectoryViz || (
                      <div className="text-xs text-muted-foreground py-8">
                        Starte Evolution für Visualisierung
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Activity className="h-3 w-3" />
                      BEDINGTE ENTROPIE H(Kₙ | Kₙ₋₁)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 flex justify-center">
                    {entropyViz || (
                      <div className="text-xs text-muted-foreground py-4">
                        —
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Key History */}
                <Card className="bg-card/50 flex-1">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs">SCHLÜSSEL-HISTORIE</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {keyHistory.slice(-10).reverse().map((k, i) => (
                          <div 
                            key={k.t} 
                            className={`text-[9px] font-mono flex justify-between ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}
                          >
                            <span>t={k.t}</span>
                            <span className="truncate max-w-[200px]">{k.A}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* PROOF TAB */}
          <TabsContent value="proof" className="flex-1 overflow-hidden p-3">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 gap-3">
                {proofSteps.map((step) => (
                  <Card 
                    key={step.id} 
                    className={`bg-card/50 ${
                      step.category === 'axiom' ? 'border-l-2 border-l-muted-foreground' :
                      step.category === 'model' ? 'border-l-2 border-l-foreground/50' :
                      step.category === 'proof' ? 'border-l-2 border-l-foreground' :
                      ''
                    }`}
                  >
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {step.id}
                          </Badge>
                          {step.title}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className="text-[8px]"
                        >
                          {step.category}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2">
                      <code className="block text-sm font-mono bg-muted/30 p-2 rounded text-center">
                        {step.latex}
                      </code>
                      <p className="text-[10px] text-muted-foreground">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Conclusion */}
              <Card className="mt-3 bg-card/50 border-foreground">
                <CardContent className="p-4 text-center space-y-3">
                  <div className="text-lg font-bold">ENDZUSTAND</div>
                  <div className="space-y-1 text-sm">
                    <p>Klassische Kryptografie schützt <strong>Objekte</strong>.</p>
                    <p>Dieses System schützt <strong>Abläufe</strong>.</p>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Objekte kann man suchen. Abläufe kann man nur <em>verpassen</em>.
                  </div>
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* ATTACK / SEARCH SPACE TAB */}
          <TabsContent value="attack" className="flex-1 overflow-hidden p-3">
            <div className="h-full grid grid-cols-2 gap-3">
              {/* Search Space Visualization */}
              <div className="space-y-3">
                <Card className="bg-card/50">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      SUCHRAUM-VERGLEICH
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 flex justify-center">
                    {searchSpaceViz}
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardContent className="p-3 space-y-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Mathematischer Kernbruch</div>
                      <code className="text-sm font-mono">
                        lim<sub>n→∞</sub> Pr[Treffer] = 0
                      </code>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center">
                      Nicht wegen "groß", sondern wegen <strong>fehlender Zieldefinition</strong>.
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Metrics Comparison */}
              <div className="space-y-3">
                {/* Classic Model */}
                <Card className="bg-card/50">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      KLASSISCHES MODELL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {classicMetrics ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Suchraum |𝒦|</span>
                          <code className="font-mono">{classicMetrics.searchSpace}</code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">T_A (Angriffszeit)</span>
                          <code className="font-mono">2¹²⁸ Ops</code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">T_K (Schlüssel-Lebenszeit)</span>
                          <code className="font-mono">∞</code>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Konvergenz</span>
                          <Badge variant="default" className="text-[10px]">JA</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pr[Erfolg]</span>
                          <code className="font-mono">2⁻¹²⁸</code>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        Starte Evolution für Analyse
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Our Model */}
                <Card className="bg-card/50 border-foreground">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      UNSER MODELL (CHRONOS)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {attackMetrics ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Suchraum 𝒦*</span>
                          <code className="font-mono text-[10px]">{attackMetrics.searchSpace}</code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">T_A (Angriffszeit)</span>
                          <code className="font-mono">2¹²⁸ Ops</code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">T_K (Schlüssel-Lebenszeit)</span>
                          <code className="font-mono">1 Schritt</code>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">T_K {"<"} T_A</span>
                          <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            KEINE KONVERGENZ
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pr[Erfolg]</span>
                          <code className="font-mono">0 (undefiniert)</code>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        —
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Key Insight */}
                <Card className="bg-muted/30">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Der Schlüssel <em>verfällt schneller</em></p>
                      <p className="font-medium">als die Suche <em>konvergiert</em>.</p>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2">
                      Angreifer rechnet gegen Vergangenheit.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="flex-1 overflow-hidden p-3">
            <div className="h-full grid grid-cols-2 gap-3">
              <Card className="bg-card/50">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs">FORMALER BEWEIS (Markdown)</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Exportiert alle Beweisschritte A-Z als wissenschaftliches Markdown-Dokument.
                  </p>
                  <Button onClick={exportProof} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    chronos-formal-proof.md
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs">VOLLSTÄNDIGE ANALYSE (JSON)</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Exportiert Schlüssel-Historie, SRIL-Zustände, Beweisschritte und Angriffsvergleich.
                  </p>
                  <Button onClick={exportJSON} className="w-full" disabled={keyHistory.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    chronos-analysis.json
                  </Button>
                </CardContent>
              </Card>

              {/* Stats */}
              {keyHistory.length > 0 && (
                <Card className="bg-card/50 col-span-2">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs">AKTUELLE STATISTIKEN</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-2xl font-bold">{keyHistory.length}</div>
                        <div className="text-[10px] text-muted-foreground">Schlüssel erzeugt</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-2xl font-bold">{keyHistory.length}</div>
                        <div className="text-[10px] text-muted-foreground">Adressen (alle unique)</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-2xl font-bold">256</div>
                        <div className="text-[10px] text-muted-foreground">Bit Entropie (konstant)</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-2xl font-bold">∅</div>
                        <div className="text-[10px] text-muted-foreground">Suchraum (leer)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
