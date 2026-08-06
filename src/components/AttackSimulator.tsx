import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Square, RotateCcw, Shield, AlertTriangle, Download } from 'lucide-react';
import { sha256Hex, sha256Prefix32 } from '@/lib/sha256';
import { downloadJson } from '@/lib/download';

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE ANGRIFFS-SIMULATOR — echter Brute-Force
// Der Angreifer sucht ein echtes Truncated-Preimage von K(t): SHA-256(nonce)
// mit den ersten b Bits gleich K(t). Kein Zufalls-Fake: jede Hash-Operation
// wird gezählt, die Hashrate wird gemessen, T_A folgt aus 2^b / Hashrate.
// ═══════════════════════════════════════════════════════════════════════════════

const ALPHA = 0.245, BETA = 0.152, GAMMA = 1.1487, DELTA = 0.112, ETA = 0.088;
const BUDGET_MS = 25; // Rechenbudget des Angreifers pro Tick (Nicht-Blockieren der UI)

interface AttackState {
  t: number;
  defenderKey: string;
  attackerGuess: string;   // bester Kandidat (höchste Bit-Übereinstimmung)
  bestMatchBits: number;   // gemessene führende Bit-Übereinstimmung
  hashes: number;          // echte Hashes in diesem Tick
  cumHashes: number;
  found: boolean;          // Truncated-Preimage gefunden
  keyChanged: boolean;
  distance: number;        // Hamming-Distanz (Bits) Kandidat vs K(t)
  defenderH: number;
  defenderN: number;
  defenderG: number;
}

function srilStep(h: number, n: number, g: number, t: number) {
  const eps_H = 0.001 * Math.sin(2 * Math.PI * t / 100);
  const eps_N = 0.0005 * Math.cos(2 * Math.PI * t / 73);
  const eps_G = 0.0002 * Math.sin(2 * Math.PI * t / 37 + Math.PI / 4);
  const hn = h + ALPHA * n - BETA * g + eps_H;
  const nn = GAMMA * n + DELTA * h + eps_N;
  return {
    h: hn,
    n: nn,
    g: g + ETA * (hn + nn) * (1 + 0.01 * Math.tanh(g / 10)) + eps_G,
  };
}

function hammingDistance(a: string, b: string): number {
  let dist = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor) { dist += xor & 1; xor >>= 1; }
  }
  return dist;
}

function leadingMatchBits(a: number, b: number): number {
  const x = (a ^ b) >>> 0;
  if (x === 0) return 32;
  return Math.clz32(x);
}

export function AttackSimulator() {
  const [states, setStates] = useState<AttackState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(150);
  const [keyLifetime, setKeyLifetime] = useState(1);   // T_K in Ticks
  const [bits, setBits] = useState(20);                // Zielbreite des Preimage-Angriffs
  const [totalHashes, setTotalHashes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [hashrate, setHashrate] = useState(0);
  const runRef = useRef(false);
  const stateRef = useRef({ h: -4.256, n: 5.824, g: 1.952, t: 0, prevKey: 'INIT' });

  const run = useCallback(async () => {
    setIsRunning(true);
    runRef.current = true;
    stateRef.current = { h: -4.256, n: 5.824, g: 1.952, t: 0, prevKey: 'INIT' };
    setStates([]); setTotalHashes(0); setSuccessCount(0); setHashrate(0);

    let cum = 0, successes = 0, nonce = 0;
    let target = 0, targetKey = '', shift = 32 - bits;

    while (runRef.current) {
      const { h, n, g, t, prevKey } = stateRef.current;
      const sril = srilStep(h, n, g, t);
      const seed = `${sril.h.toFixed(12)}:${sril.n.toFixed(12)}:${sril.g.toFixed(12)}`;
      const newKey = sha256Hex(`${prevKey}|${t}|${seed}`);

      // Rotation: Angreifer verliert seinen gesamten Suchfortschritt
      const keyChanged = t === 0 || t % keyLifetime === 0;
      if (keyChanged) {
        targetKey = newKey;
        shift = 32 - bits;
        target = (parseInt(newKey.slice(0, 8), 16) >>> 0) >>> shift;
        nonce = 0;
      }

      // ── ECHTER BRUTE-FORCE (zeitbudgetiert) ──
      const t0 = performance.now();
      let hashes = 0, found = false, bestBits = -1, bestNonce = nonce;
      while (performance.now() - t0 < BUDGET_MS) {
        for (let i = 0; i < 512; i++) {
          const p = sha256Prefix32(`atk:${nonce}`);
          hashes++;
          const m = leadingMatchBits(p >>> shift << shift, target << shift);
          if (m > bestBits) { bestBits = m; bestNonce = nonce; }
          if ((p >>> shift) === target) { found = true; break; }
          nonce++;
        }
        if (found) break;
      }
      const dt = performance.now() - t0;
      const rate = dt > 0 ? hashes / (dt / 1000) : 0;
      cum += hashes;
      if (found) successes++;

      const guess = sha256Hex(`atk:${bestNonce}`);
      setStates(prev => [...prev.slice(-80), {
        t,
        defenderKey: newKey,
        attackerGuess: guess,
        bestMatchBits: Math.max(0, Math.min(bits, bestBits)),
        hashes,
        cumHashes: cum,
        found,
        keyChanged,
        distance: hammingDistance(targetKey, guess),
        defenderH: sril.h, defenderN: sril.n, defenderG: sril.g,
      }]);
      setTotalHashes(cum);
      setSuccessCount(successes);
      setHashrate(rate);

      stateRef.current = { h: sril.h, n: sril.n, g: sril.g, t: t + 1, prevKey: newKey };
      await new Promise(r => setTimeout(r, speed));
    }
  }, [speed, keyLifetime, bits]);

  const stop = () => { runRef.current = false; setIsRunning(false); };
  const reset = () => { stop(); setStates([]); setTotalHashes(0); setSuccessCount(0); setHashrate(0); };

  useEffect(() => () => { runRef.current = false; }, []);

  const latest = states[states.length - 1];
  const searchSpace = Math.pow(2, bits);
  const hashesPerTick = states.length ? states.reduce((s, x) => s + x.hashes, 0) / states.length : 0;
  const T_A = hashesPerTick > 0 ? searchSpace / hashesPerTick : Infinity; // erwartete Ticks (Worst Case)
  const T_A_exp = hashesPerTick > 0 ? (searchSpace / 2) / hashesPerTick : Infinity; // Erwartungswert
  const secure = keyLifetime < T_A_exp;
  const successRate = states.length ? (successCount / states.length * 100).toFixed(3) : '0';

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">ANGRIFFS-SIMULATOR</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Echter SHA-256-Brute-Force auf {bits} bit von K(t) — gemessene Hashrate, T_K &lt; T_A
        </p>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">T_K (Key-Rotation): {keyLifetime} Ticks</div>
              <Slider value={[keyLifetime]} onValueChange={v => setKeyLifetime(v[0])} min={1} max={40} step={1} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">
                Angriffsbreite b: {bits} bit (Suchraum 2^{bits} = {searchSpace.toLocaleString('de-DE')})
              </div>
              <Slider value={[bits]} onValueChange={v => setBits(v[0])} min={8} max={30} step={1} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">Tick-Pause: {speed}ms</div>
              <Slider value={[speed]} onValueChange={v => setSpeed(v[0])} min={0} max={600} step={25} />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {!isRunning ? (
              <Button size="sm" onClick={run} className="text-xs h-7"><Play className="w-3 h-3 mr-1" /> Simulation starten</Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stop} className="text-xs h-7"><Square className="w-3 h-3 mr-1" /> Stopp</Button>
            )}
            <Button size="sm" variant="outline" onClick={reset} className="text-xs h-7"><RotateCcw className="w-3 h-3 mr-1" /> Reset</Button>
            <Button size="sm" variant="outline" className="text-xs h-7" disabled={!states.length}
              onClick={() => downloadJson({
                params: { bits, keyLifetime, tickPauseMs: speed, budgetMs: BUDGET_MS },
                metrics: { totalHashes, hashrate, hashesPerTick, T_A_worst: T_A, T_A_expected: T_A_exp, successCount, secure },
                states,
              }, 'angriffs-simulation')}>
              <Download className="w-3 h-3 mr-1" /> Messdaten ↓
            </Button>
          </div>

          {latest && (
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-border rounded p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><Shield className="w-3 h-3" /> VERTEIDIGER</div>
                <div className="text-[8px] font-mono truncate text-primary">K({latest.t}) = {latest.defenderKey.slice(0, 24)}…</div>
                <div className="text-[8px] text-muted-foreground font-mono">H={latest.defenderH.toFixed(3)} N={latest.defenderN.toFixed(3)} G={latest.defenderG.toFixed(3)}</div>
              </div>
              <div className="border border-border rounded p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><AlertTriangle className="w-3 h-3" /> ANGREIFER</div>
                <div className="text-[8px] font-mono truncate text-destructive">best = {latest.attackerGuess.slice(0, 24)}…</div>
                <div className="text-[8px] text-muted-foreground font-mono">
                  Treffer-Präfix {latest.bestMatchBits}/{bits} bit · {latest.hashes.toLocaleString('de-DE')} Hashes/Tick
                </div>
              </div>
            </div>
          )}

          <div className="border border-border rounded p-2">
            <div className="text-[10px] text-muted-foreground mb-1">WETTLAUF: K(t)-Rotation vs. Präfix-Fortschritt</div>
            <svg viewBox="0 0 400 120" className="w-full">
              {states.map((s, i) => {
                const x = (i / 80) * 380 + 10;
                const y = 20 + (parseInt(s.defenderKey.slice(0, 2), 16) / 255) * 40;
                return (
                  <g key={`d-${i}`}>
                    {s.keyChanged && <line x1={x} y1={5} x2={x} y2={112} stroke="hsl(var(--muted-foreground))" strokeWidth={0.4} opacity={0.4} strokeDasharray="2,2" />}
                    <circle cx={x} cy={y} r={1.5} fill="hsl(var(--primary))" opacity={0.85} />
                  </g>
                );
              })}
              {states.map((s, i) => {
                const x = (i / 80) * 380 + 10;
                const y = 110 - (s.bestMatchBits / bits) * 35;
                return <circle key={`a-${i}`} cx={x} cy={y} r={1.5} fill="hsl(var(--destructive))" opacity={0.7} />;
              })}
              {states.map((s, i) => s.found ? (
                <circle key={`f-${i}`} cx={(i / 80) * 380 + 10} cy={72} r={3} fill="none" stroke="hsl(var(--destructive))" strokeWidth={0.8} />
              ) : null)}
              <text x={5} y={10} fontSize={7} fill="hsl(var(--primary))">K(t) — Verteidiger (Rotationen gestrichelt)</text>
              <text x={5} y={118} fontSize={7} fill="hsl(var(--destructive))">Angreifer: bestes Präfix / {bits} bit</text>
            </svg>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Hashes</div>
              <div className="text-sm font-mono font-bold">{totalHashes.toLocaleString('de-DE')}</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Hashrate</div>
              <div className="text-sm font-mono font-bold">{(hashrate / 1000).toFixed(0)}k/s</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Preimages</div>
              <div className="text-sm font-mono font-bold text-destructive">{successCount}</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Trefferrate</div>
              <div className="text-sm font-mono font-bold">{successRate}%</div>
            </div>
          </div>

          {states.length > 5 && (
            <div className="border border-border rounded p-2">
              <div className="text-[10px] text-muted-foreground mb-1">HAMMING-DISTANZ Kandidat ⊕ K(t) (Bits von 256)</div>
              <svg viewBox="0 0 400 50" className="w-full">
                {states.slice(-60).map((s, i) => (
                  <circle key={i} cx={(i / 60) * 380 + 10} cy={45 - (s.distance / 256) * 40} r={1} fill="hsl(var(--primary))" opacity={0.7} />
                ))}
                <line x1={10} y1={25} x2={390} y2={25} stroke="hsl(var(--muted-foreground))" strokeWidth={0.3} strokeDasharray="3,3" />
                <text x={392} y={27} fontSize={6} fill="hsl(var(--muted-foreground))">128</text>
              </svg>
            </div>
          )}

          <div className="border border-border rounded p-2 bg-muted/10">
            <div className="text-[10px] font-medium text-muted-foreground mb-1">MESSUNG STATT BEHAUPTUNG</div>
            <div className="font-mono text-[9px] space-y-0.5">
              <div>Gemessen: {hashesPerTick.toFixed(0)} Hashes/Tick · {(hashrate / 1000).toFixed(0)} kH/s (Single-Thread, WASM-frei)</div>
              <div>T_A(erwartet) = 2^{bits}/2 / Hashes-pro-Tick = {Number.isFinite(T_A_exp) ? T_A_exp.toFixed(2) : '—'} Ticks</div>
              <div>T_A(worst) = {Number.isFinite(T_A) ? T_A.toFixed(2) : '—'} Ticks · T_K = {keyLifetime} Ticks</div>
              <div className={`font-bold ${secure ? 'text-primary' : 'text-destructive'}`}>
                {secure ? '✓ T_K < T_A → Suche wird vor Konvergenz zurückgesetzt' : '✗ T_K ≥ T_A → Preimages werden gefunden (siehe Trefferrate)'}
              </div>
              <div className="text-muted-foreground text-[8px] mt-1">
                Hinweis: b wird künstlich klein gehalten (8–30 bit), damit der Angriff im Browser messbar ist.
                Volle 256 bit ⇒ 2^255 erwartete Hashes; die Skalierung ist linear in 2^b.
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
