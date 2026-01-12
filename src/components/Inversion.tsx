import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  RotateCcw, Target, Key, Zap, Lock, Unlock, 
  Eye, EyeOff, Sparkles, Trophy, Skull, Clock,
  ArrowRight, RefreshCw, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';

// SRIL Coefficients
const ALPHA = 0.245;
const BETA = 0.152;
const GAMMA = 1.1487;
const DELTA = 0.112;
const ETA = 0.088;

interface Challenge {
  id: string;
  targetH: number;
  targetN: number;
  targetG: number;
  targetT: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'impossible';
  tolerance: number;
  hint?: string;
  solved: boolean;
  attempts: number;
  bestScore: number;
}

interface Attempt {
  h0: number;
  n0: number;
  g0: number;
  finalH: number;
  finalN: number;
  finalG: number;
  distance: number;
  timestamp: number;
}

export const Inversion: React.FC = () => {
  // Challenge state
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [solvedChallenges, setSolvedChallenges] = useState<string[]>([]);
  
  // Player inputs
  const [guessH, setGuessH] = useState(0);
  const [guessN, setGuessN] = useState(0);
  const [guessG, setGuessG] = useState(0);
  
  // UI state
  const [showHint, setShowHint] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Statistics
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [streak, setStreak] = useState(0);

  // SRIL Forward calculation
  const computeSRIL = useCallback((h0: number, n0: number, g0: number, steps: number) => {
    let h = h0, n = n0, g = g0;
    const trajectory: { h: number; n: number; g: number; t: number }[] = [{ h, n, g, t: 0 }];
    
    for (let t = 0; t < steps; t++) {
      const eps_H = 0.001 * Math.sin(2 * Math.PI * t / 100);
      const eps_N = 0.0005 * Math.cos(2 * Math.PI * t / 73);
      const eps_G = 0.0002 * Math.sin(2 * Math.PI * t / 37 + Math.PI / 4);
      
      const h_next = h + ALPHA * n - BETA * g + eps_H;
      const n_next = GAMMA * n + DELTA * h + eps_N;
      const g_next = g + ETA * (h_next + n_next) * (1 + 0.01 * Math.tanh(g / 10)) + eps_G;
      
      h = h_next;
      n = n_next;
      g = g_next;
      trajectory.push({ h, n, g, t: t + 1 });
    }
    
    return { h, n, g, trajectory };
  }, []);

  // Generate a new challenge
  const generateChallenge = useCallback((difficulty: Challenge['difficulty']) => {
    // Generate random initial conditions based on difficulty
    const ranges = {
      easy: { h: [-2, 2], n: [3, 6], g: [1, 3], t: 3, tol: 0.5 },
      medium: { h: [-5, 5], n: [2, 8], g: [0, 4], t: 5, tol: 0.1 },
      hard: { h: [-8, 8], n: [1, 10], g: [-1, 5], t: 7, tol: 0.05 },
      impossible: { h: [-10, 10], n: [0, 12], g: [-2, 6], t: 10, tol: 0.01 }
    };
    
    const r = ranges[difficulty];
    const h0 = r.h[0] + Math.random() * (r.h[1] - r.h[0]);
    const n0 = r.n[0] + Math.random() * (r.n[1] - r.n[0]);
    const g0 = r.g[0] + Math.random() * (r.g[1] - r.g[0]);
    
    const result = computeSRIL(h0, n0, g0, r.t);
    
    // Generate hint based on difficulty
    const hints = {
      easy: `H₀ ist ${h0 > 0 ? 'positiv' : 'negativ'}, N₀ liegt zwischen ${Math.floor(n0) - 1} und ${Math.ceil(n0) + 1}`,
      medium: `Das Vorzeichen von H₀ ist ${h0 > 0 ? '+' : '-'}. G₀ ist ${g0 > 2 ? 'größer' : 'kleiner'} als 2.`,
      hard: `Die Summe H₀+N₀+G₀ ≈ ${(h0 + n0 + g0).toFixed(1)}`,
      impossible: undefined
    };
    
    const challenge: Challenge = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetH: Math.round(result.h * 1000) / 1000,
      targetN: Math.round(result.n * 1000) / 1000,
      targetG: Math.round(result.g * 1000) / 1000,
      targetT: r.t,
      difficulty,
      tolerance: r.tol,
      hint: hints[difficulty],
      solved: false,
      attempts: 0,
      bestScore: Infinity
    };
    
    setCurrentChallenge(challenge);
    setAttempts([]);
    setShowHint(false);
    setGeneratedKey(null);
    
    // Reset guesses to reasonable starting point
    setGuessH(0);
    setGuessN(5);
    setGuessG(2);
    
    toast.success(`${difficulty.toUpperCase()} Challenge generiert!`);
  }, [computeSRIL]);

  // Check solution
  const checkSolution = useCallback(() => {
    if (!currentChallenge) return;
    
    setIsAnimating(true);
    setTotalAttempts(prev => prev + 1);
    
    const result = computeSRIL(guessH, guessN, guessG, currentChallenge.targetT);
    
    const distance = Math.sqrt(
      (result.h - currentChallenge.targetH) ** 2 +
      (result.n - currentChallenge.targetN) ** 2 +
      (result.g - currentChallenge.targetG) ** 2
    );
    
    const attempt: Attempt = {
      h0: guessH,
      n0: guessN,
      g0: guessG,
      finalH: result.h,
      finalN: result.n,
      finalG: result.g,
      distance,
      timestamp: Date.now()
    };
    
    setAttempts(prev => [attempt, ...prev].slice(0, 20));
    
    setCurrentChallenge(prev => prev ? {
      ...prev,
      attempts: prev.attempts + 1,
      bestScore: Math.min(prev.bestScore, distance)
    } : null);
    
    setTimeout(() => {
      setIsAnimating(false);
      
      if (distance <= currentChallenge.tolerance) {
        // SOLVED!
        const key = generateCryptoKey(guessH, guessN, guessG, currentChallenge);
        setGeneratedKey(key);
        setSolvedChallenges(prev => [...prev, currentChallenge.id]);
        setStreak(prev => prev + 1);
        
        setCurrentChallenge(prev => prev ? { ...prev, solved: true } : null);
        
        toast.success('🎉 GELÖST! Kryptographischer Schlüssel generiert!');
      } else if (distance < currentChallenge.tolerance * 5) {
        toast.info(`Sehr nah! Distanz: ${distance.toFixed(4)}`);
      } else if (distance < currentChallenge.tolerance * 20) {
        toast.warning(`Näher... Distanz: ${distance.toFixed(3)}`);
      } else {
        toast.error(`Weit entfernt. Distanz: ${distance.toFixed(2)}`);
      }
    }, 500);
  }, [currentChallenge, guessH, guessN, guessG, computeSRIL]);

  // Generate cryptographic key from solution
  const generateCryptoKey = (h: number, n: number, g: number, challenge: Challenge): string => {
    // Create a deterministic key from the solution
    const seed = `${h.toFixed(15)}:${n.toFixed(15)}:${g.toFixed(15)}:${challenge.id}`;
    
    // Simple hash-like transformation
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Generate hex key
    const hexParts: string[] = [];
    let value = Math.abs(hash);
    const multipliers = [h * 1e6, n * 1e6, g * 1e6, challenge.targetT * 1e8];
    
    for (const mult of multipliers) {
      value = (value * 31 + Math.abs(Math.floor(mult))) & 0xFFFFFFFF;
      hexParts.push(value.toString(16).padStart(8, '0').toUpperCase());
    }
    
    return hexParts.join('');
  };

  // Copy key to clipboard
  const copyKey = useCallback(() => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success('Schlüssel kopiert!');
    setTimeout(() => setCopied(false), 2000);
  }, [generatedKey]);

  // Direction indicators
  const getDirection = useCallback((current: number, target: number, component: string) => {
    if (!currentChallenge || attempts.length === 0) return null;
    
    const lastAttempt = attempts[0];
    const lastValue = component === 'h' ? lastAttempt.finalH : 
                      component === 'n' ? lastAttempt.finalN : lastAttempt.finalG;
    const targetValue = component === 'h' ? currentChallenge.targetH :
                        component === 'n' ? currentChallenge.targetN : currentChallenge.targetG;
    
    const diff = targetValue - lastValue;
    const absDiff = Math.abs(diff);
    
    if (absDiff < currentChallenge.tolerance) return '✓';
    if (diff > 0) return '↑';
    return '↓';
  }, [currentChallenge, attempts]);

  // Trajectory visualization
  const trajectoryViz = useMemo(() => {
    if (attempts.length === 0 || !currentChallenge) return null;
    
    const result = computeSRIL(guessH, guessN, guessG, currentChallenge.targetT);
    const traj = result.trajectory;
    
    const width = 300;
    const height = 150;
    const padding = 20;
    
    const hValues = traj.map(p => p.h);
    const minH = Math.min(...hValues, currentChallenge.targetH);
    const maxH = Math.max(...hValues, currentChallenge.targetH);
    const rangeH = maxH - minH || 1;
    
    const scaleX = (t: number) => padding + (t / currentChallenge.targetT) * (width - 2 * padding);
    const scaleY = (h: number) => height - padding - ((h - minH) / rangeH) * (height - 2 * padding);
    
    const pathData = traj
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleY(p.h).toFixed(1)}`)
      .join(' ');
    
    return (
      <svg width={width} height={height} className="border border-border/30 rounded">
        <path d={pathData} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.7} />
        {/* Target line */}
        <line 
          x1={padding} 
          y1={scaleY(currentChallenge.targetH)} 
          x2={width - padding} 
          y2={scaleY(currentChallenge.targetH)}
          stroke="currentColor"
          strokeDasharray="4,4"
          opacity={0.3}
        />
        <circle cx={width - padding} cy={scaleY(currentChallenge.targetH)} r={4} fill="currentColor" opacity={0.5} />
        <circle cx={scaleX(currentChallenge.targetT)} cy={scaleY(result.h)} r={3} fill="currentColor" />
      </svg>
    );
  }, [guessH, guessN, guessG, currentChallenge, attempts, computeSRIL]);

  // Score display
  const scoreDisplay = useMemo(() => {
    const difficultyScores = { easy: 100, medium: 250, hard: 500, impossible: 1000 };
    const totalScore = solvedChallenges.length > 0 ? 
      solvedChallenges.reduce((sum, id) => {
        // Approximate difficulty from id (simplified)
        return sum + 200;
      }, 0) : 0;
    
    return totalScore;
  }, [solvedChallenges]);

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">INVERSION</h1>
            <p className="text-xs text-muted-foreground">Finde den Ursprung. Werde zum Schlüssel.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">STREAK</div>
            <div className="font-mono text-lg flex items-center gap-1">
              {streak > 0 && <Sparkles className="w-4 h-4 text-yellow-500" />}
              {streak}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">GELÖST</div>
            <div className="font-mono text-lg">{solvedChallenges.length}</div>
          </div>
        </div>
      </div>

      {/* Challenge Selection */}
      {!currentChallenge && (
        <Card className="border-2 border-dashed border-border/50">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h2 className="text-lg font-medium">Wähle deine Herausforderung</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Finde die Anfangsbedingungen (H₀, N₀, G₀), die zum Zielzustand führen
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => generateChallenge('easy')}
              >
                <span className="text-2xl">🌱</span>
                <span>EASY</span>
                <span className="text-[10px] text-muted-foreground">3 Schritte</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => generateChallenge('medium')}
              >
                <span className="text-2xl">🔥</span>
                <span>MEDIUM</span>
                <span className="text-[10px] text-muted-foreground">5 Schritte</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => generateChallenge('hard')}
              >
                <span className="text-2xl">💀</span>
                <span>HARD</span>
                <span className="text-[10px] text-muted-foreground">7 Schritte</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => generateChallenge('impossible')}
              >
                <span className="text-2xl">🌀</span>
                <span>IMPOSSIBLE</span>
                <span className="text-[10px] text-muted-foreground">10 Schritte</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Challenge */}
      {currentChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Target Display */}
          <Card className={`border-2 ${currentChallenge.solved ? 'border-green-500/50 bg-green-500/5' : 'border-border/50'}`}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  ZIELZUSTAND (T={currentChallenge.targetT})
                </div>
                <Badge variant={currentChallenge.solved ? 'default' : 'outline'}>
                  {currentChallenge.difficulty.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">TARGET H</div>
                  <div className="font-mono text-xl">{currentChallenge.targetH.toFixed(3)}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">TARGET N</div>
                  <div className="font-mono text-xl">{currentChallenge.targetN.toFixed(3)}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">TARGET G</div>
                  <div className="font-mono text-xl">{currentChallenge.targetG.toFixed(3)}</div>
                </div>
              </div>

              {/* Tolerance */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Toleranz: ±{currentChallenge.tolerance}</span>
                <span className="text-muted-foreground">Versuche: {currentChallenge.attempts}</span>
              </div>

              {/* Hint */}
              {currentChallenge.hint && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowHint(!showHint)}
                    className="text-xs"
                  >
                    {showHint ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                    {showHint ? 'Hinweis verbergen' : 'Hinweis zeigen'}
                  </Button>
                  {showHint && (
                    <span className="text-xs text-muted-foreground italic">{currentChallenge.hint}</span>
                  )}
                </div>
              )}

              {/* Best Score */}
              {currentChallenge.bestScore < Infinity && (
                <div className="text-xs text-muted-foreground">
                  Beste Distanz: {currentChallenge.bestScore.toFixed(6)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Input Controls */}
          <Card className="border-border/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="w-4 h-4" />
                DEINE VERMUTUNG (T=0)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* H Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">H₀ (Enthalpy)</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{guessH.toFixed(3)}</span>
                    {getDirection(guessH, currentChallenge.targetH, 'h') && (
                      <span className="text-xs opacity-50">{getDirection(guessH, currentChallenge.targetH, 'h')}</span>
                    )}
                  </div>
                </div>
                <Slider
                  value={[guessH]}
                  onValueChange={([v]) => setGuessH(v)}
                  min={-10}
                  max={10}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* N Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">N₀ (Navigation)</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{guessN.toFixed(3)}</span>
                    {getDirection(guessN, currentChallenge.targetN, 'n') && (
                      <span className="text-xs opacity-50">{getDirection(guessN, currentChallenge.targetN, 'n')}</span>
                    )}
                  </div>
                </div>
                <Slider
                  value={[guessN]}
                  onValueChange={([v]) => setGuessN(v)}
                  min={0}
                  max={12}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* G Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">G₀ (Geometry)</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{guessG.toFixed(3)}</span>
                    {getDirection(guessG, currentChallenge.targetG, 'g') && (
                      <span className="text-xs opacity-50">{getDirection(guessG, currentChallenge.targetG, 'g')}</span>
                    )}
                  </div>
                </div>
                <Slider
                  value={[guessG]}
                  onValueChange={([v]) => setGuessG(v)}
                  min={-2}
                  max={6}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={checkSolution} 
                  disabled={isAnimating || currentChallenge.solved}
                  className="flex-1"
                >
                  {isAnimating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  SIMULIEREN
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentChallenge(null)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trajectory Preview */}
      {currentChallenge && attempts.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              TRAJEKTORIE (H über Zeit)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {trajectoryViz}
          </CardContent>
        </Card>
      )}

      {/* Generated Key (on solve) */}
      {generatedKey && (
        <Card className="border-2 border-green-500/50 bg-green-500/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
              <Trophy className="w-4 h-4" />
              SCHLÜSSEL GENERIERT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted/50 rounded px-3 py-2 font-mono text-xs break-all">
                {generatedKey}
              </code>
              <Button variant="outline" size="icon" onClick={copyKey}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Dieser Schlüssel ist deterministisch aus deiner Lösung (H₀={guessH.toFixed(3)}, N₀={guessN.toFixed(3)}, G₀={guessG.toFixed(3)}) abgeleitet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Attempt History */}
      {attempts.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>VERSUCHSHISTORIE</span>
              <span className="text-xs text-muted-foreground font-normal">{attempts.length} Versuche</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-40 overflow-auto">
              {attempts.map((attempt, i) => (
                <div 
                  key={attempt.timestamp}
                  className={`flex items-center justify-between text-xs font-mono py-1 px-2 rounded ${
                    i === 0 ? 'bg-muted/50' : ''
                  }`}
                >
                  <span className="text-muted-foreground">#{attempts.length - i}</span>
                  <span>H₀={attempt.h0.toFixed(2)} N₀={attempt.n0.toFixed(2)} G₀={attempt.g0.toFixed(2)}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span>H={attempt.finalH.toFixed(2)} N={attempt.finalN.toFixed(2)} G={attempt.finalG.toFixed(2)}</span>
                  <Badge 
                    variant={attempt.distance < (currentChallenge?.tolerance || 0.1) ? 'default' : 'outline'}
                    className="text-[10px] ml-2"
                  >
                    d={attempt.distance.toFixed(4)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Philosophy Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border/30">
        <p className="italic">
          "Die Zukunft kennen wir. Die Vergangenheit finden wir."
        </p>
        <p className="mt-1 opacity-50">
          Jede gelöste Inversion ist ein Schlüssel. Jeder Schlüssel ist einzigartig. Jeder Ursprung ist verborgen.
        </p>
      </div>
    </div>
  );
};

export default Inversion;
