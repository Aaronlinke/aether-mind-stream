import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Square, RotateCcw, Shield, AlertTriangle, Zap } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE ANGRIFFS-SIMULATOR
// Visualisiert: Angreifer jagt K(t) – T_K < T_A in Echtzeit
// ═══════════════════════════════════════════════════════════════════════════════

const ALPHA = 0.245, BETA = 0.152, GAMMA = 1.1487, DELTA = 0.112, ETA = 0.088;

interface AttackState {
  t: number;
  defenderKey: string;
  attackerGuess: string;
  attackerProgress: number; // 0-1 progress toward current key
  keyChanged: boolean;
  distance: number; // hamming distance
  defenderH: number;
  defenderN: number;
  defenderG: number;
}

function srilStep(h: number, n: number, g: number, t: number) {
  const eps_H = 0.001 * Math.sin(2 * Math.PI * t / 100);
  const eps_N = 0.0005 * Math.cos(2 * Math.PI * t / 73);
  const eps_G = 0.0002 * Math.sin(2 * Math.PI * t / 37 + Math.PI / 4);
  return {
    h: h + ALPHA * n - BETA * g + eps_H,
    n: GAMMA * n + DELTA * h + eps_N,
    g: g + ETA * ((h + ALPHA * n - BETA * g + eps_H) + (GAMMA * n + DELTA * h + eps_N)) * (1 + 0.01 * Math.tanh(g / 10)) + eps_G
  };
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hammingDistance(a: string, b: string): number {
  let dist = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ba = parseInt(a[i], 16);
    const bb = parseInt(b[i], 16);
    let xor = ba ^ bb;
    while (xor) { dist += xor & 1; xor >>= 1; }
  }
  return dist;
}

export function AttackSimulator() {
  const [states, setStates] = useState<AttackState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [keyLifetime, setKeyLifetime] = useState(1); // T_K in steps
  const [attackSpeed, setAttackSpeed] = useState(0.15); // progress per tick
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const runRef = useRef(false);
  const stateRef = useRef({ h: -4.256, n: 5.824, g: 1.952, t: 0, prevKey: 'INIT' });

  const run = useCallback(async () => {
    setIsRunning(true);
    runRef.current = true;
    stateRef.current = { h: -4.256, n: 5.824, g: 1.952, t: 0, prevKey: 'INIT' };
    setStates([]);
    setTotalAttempts(0);
    setSuccessCount(0);

    let attackerProgress = 0;
    let attackerTarget = '';
    let attempts = 0;
    let successes = 0;

    while (runRef.current) {
      const { h, n, g, t, prevKey } = stateRef.current;
      const sril = srilStep(h, n, g, t);
      const seed = `${sril.h.toFixed(12)}:${sril.n.toFixed(12)}:${sril.g.toFixed(12)}`;
      const newKey = await sha256(`${prevKey}|${t}|${seed}`);

      // Key rotated — attacker resets
      const keyChanged = t > 0 && t % keyLifetime === 0;
      if (keyChanged || t === 0) {
        attackerProgress = 0;
        attackerTarget = newKey;
      }

      // Attacker makes progress
      attackerProgress = Math.min(attackerProgress + attackSpeed, 1);
      attempts++;

      // Generate attacker guess (mix of target and random)
      const guessBase = attackerProgress > 0.99 ? attackerTarget : await sha256(`attack_${attempts}_${Math.random()}`);
      const dist = hammingDistance(newKey, guessBase);
      const success = attackerProgress >= 1 && !keyChanged;
      if (success) successes++;

      const state: AttackState = {
        t,
        defenderKey: newKey,
        attackerGuess: guessBase,
        attackerProgress: keyChanged ? 0 : attackerProgress,
        keyChanged,
        distance: dist,
        defenderH: sril.h,
        defenderN: sril.n,
        defenderG: sril.g
      };

      setStates(prev => [...prev.slice(-80), state]);
      setTotalAttempts(attempts);
      setSuccessCount(successes);

      stateRef.current = { h: sril.h, n: sril.n, g: sril.g, t: t + 1, prevKey: newKey };
      await new Promise(r => setTimeout(r, speed));
    }
  }, [speed, keyLifetime, attackSpeed]);

  const stop = () => { runRef.current = false; setIsRunning(false); };
  const reset = () => { stop(); setStates([]); setTotalAttempts(0); setSuccessCount(0); };

  useEffect(() => () => { runRef.current = false; }, []);

  const latestState = states[states.length - 1];
  const successRate = totalAttempts > 0 ? (successCount / totalAttempts * 100).toFixed(4) : '0';

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">ANGRIFFS-SIMULATOR</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Live: Angreifer jagt K(t) — T_K &lt; T_A → keine Konvergenz
        </p>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Controls */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">T_K (Key-Rotation): {keyLifetime}</div>
              <Slider value={[keyLifetime]} onValueChange={v => setKeyLifetime(v[0])} min={1} max={20} step={1} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">Angriff-Speed: {(attackSpeed * 100).toFixed(0)}%</div>
              <Slider value={[attackSpeed]} onValueChange={v => setAttackSpeed(v[0])} min={0.01} max={0.5} step={0.01} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">Tick-Speed: {speed}ms</div>
              <Slider value={[speed]} onValueChange={v => setSpeed(v[0])} min={50} max={1000} step={50} />
            </div>
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <Button size="sm" onClick={run} className="text-xs h-7">
                <Play className="w-3 h-3 mr-1" /> Simulation starten
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stop} className="text-xs h-7">
                <Square className="w-3 h-3 mr-1" /> Stopp
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={reset} className="text-xs h-7">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>

          {/* Live Status */}
          {latestState && (
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-border rounded p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                  <Shield className="w-3 h-3" /> VERTEIDIGER
                </div>
                <div className="text-[8px] font-mono truncate text-primary">
                  K(t={latestState.t}): {latestState.defenderKey.substring(0, 20)}...
                </div>
                <div className="text-[8px] text-muted-foreground font-mono">
                  H={latestState.defenderH.toFixed(2)} N={latestState.defenderN.toFixed(2)}
                </div>
              </div>
              <div className="border border-border rounded p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                  <AlertTriangle className="w-3 h-3" /> ANGREIFER
                </div>
                <div className="text-[8px] font-mono truncate text-destructive">
                  Guess: {latestState.attackerGuess.substring(0, 20)}...
                </div>
                <div className="text-[8px] text-muted-foreground font-mono">
                  Progress: {(latestState.attackerProgress * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Race Visualization */}
          <div className="border border-border rounded p-2">
            <div className="text-[10px] text-muted-foreground mb-1">WETTLAUF: K(t) vs Angreifer</div>
            <svg viewBox="0 0 400 120" className="w-full">
              {/* Defender trajectory */}
              {states.map((s, i) => {
                const x = (i / 80) * 380 + 10;
                const keyByte = parseInt(s.defenderKey.substring(0, 2), 16);
                const y = 20 + (keyByte / 255) * 40;
                return (
                  <g key={`d-${i}`}>
                    {s.keyChanged && (
                      <line x1={x} y1={5} x2={x} y2={65} stroke="hsl(var(--destructive))" strokeWidth={0.5} opacity={0.5} strokeDasharray="2,2" />
                    )}
                    <circle cx={x} cy={y} r={1.5} fill="hsl(120,70%,50%)" opacity={0.8} />
                  </g>
                );
              })}
              
              {/* Attacker trajectory */}
              {states.map((s, i) => {
                const x = (i / 80) * 380 + 10;
                const guessByte = parseInt(s.attackerGuess.substring(0, 2), 16);
                const y = 75 + (s.attackerProgress) * 35;
                return (
                  <circle key={`a-${i}`} cx={x} cy={y} r={1.5} fill="hsl(0,70%,50%)" opacity={0.6} />
                );
              })}

              {/* Labels */}
              <text x={5} y={10} fontSize={7} fill="hsl(120,70%,50%)">K(t) ─ Verteidiger</text>
              <text x={5} y={75} fontSize={7} fill="hsl(0,70%,50%)">Angreifer (Progress)</text>
              
              {/* Progress bar for current attack */}
              {latestState && (
                <g>
                  <rect x={10} y={112} width={380} height={4} rx={2} fill="hsl(var(--muted))" />
                  <rect x={10} y={112} width={380 * latestState.attackerProgress} height={4} rx={2} 
                        fill={latestState.attackerProgress > 0.9 ? 'hsl(45,90%,50%)' : 'hsl(0,70%,50%)'} />
                </g>
              )}
            </svg>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Versuche</div>
              <div className="text-sm font-mono font-bold">{totalAttempts}</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Erfolge</div>
              <div className="text-sm font-mono font-bold text-destructive">{successCount}</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Rate</div>
              <div className="text-sm font-mono font-bold">{successRate}%</div>
            </div>
          </div>

          {/* Hamming Distance */}
          {states.length > 5 && (
            <div className="border border-border rounded p-2">
              <div className="text-[10px] text-muted-foreground mb-1">HAMMING-DISTANZ (Bits)</div>
              <svg viewBox="0 0 400 50" className="w-full">
                {states.slice(-60).map((s, i) => {
                  const x = (i / 60) * 380 + 10;
                  const y = 45 - (s.distance / 256) * 40;
                  return <circle key={i} cx={x} cy={y} r={1} fill="hsl(var(--primary))" opacity={0.7} />;
                })}
                <line x1={10} y1={25} x2={390} y2={25} stroke="hsl(var(--muted-foreground))" strokeWidth={0.3} strokeDasharray="3,3" />
                <text x={392} y={27} fontSize={6} fill="hsl(var(--muted-foreground))">128</text>
              </svg>
            </div>
          )}

          {/* Theory Box */}
          <div className="border border-border rounded p-2 bg-muted/10">
            <div className="text-[10px] font-medium text-muted-foreground mb-1">BEWEIS DURCH SIMULATION</div>
            <div className="font-mono text-[9px] space-y-0.5">
              <div className="text-primary">T_K = {keyLifetime} (Schlüssel-Lebensdauer)</div>
              <div className="text-primary">T_A = 1/{attackSpeed.toFixed(2)} ≈ {Math.ceil(1/attackSpeed)} Ticks (Angriffszeit)</div>
              <div className={`font-bold ${keyLifetime < Math.ceil(1/attackSpeed) ? 'text-primary' : 'text-destructive'}`}>
                {keyLifetime < Math.ceil(1/attackSpeed)
                  ? '✓ T_K < T_A → KEINE KONVERGENZ → Sicher'
                  : '✗ T_K ≥ T_A → Angreifer hat Chance → Unsicher'}
              </div>
              <div className="text-muted-foreground text-[8px] mt-1">
                Erhöhe T_K oder reduziere Angriff-Speed um den Effekt zu sehen.
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
