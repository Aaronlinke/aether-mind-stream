import React, { useState, useMemo, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

function computeLogisticMap(r: number, x0: number, iterations: number): number[] {
  const values: number[] = [x0];
  let x = x0;
  for (let i = 0; i < iterations - 1; i++) {
    x = r * x * (1 - x);
    values.push(x);
  }
  return values;
}

function computeBifurcation(rMin: number, rMax: number, steps: number, settle: number, collect: number): { r: number; x: number }[] {
  const points: { r: number; x: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const r = rMin + (rMax - rMin) * (i / steps);
    let x = 0.5;
    for (let j = 0; j < settle; j++) x = r * x * (1 - x);
    for (let j = 0; j < collect; j++) {
      x = r * x * (1 - x);
      points.push({ r, x });
    }
  }
  return points;
}

function computeLyapunov(r: number, iterations: number): number {
  let x = 0.5;
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    const deriv = Math.abs(r * (1 - 2 * x));
    if (deriv > 0) sum += Math.log(deriv);
    x = r * x * (1 - x);
  }
  return sum / iterations;
}

const W = 360;
const H = 180;

function TimeSeriesChart({ data }: { data: number[] }) {
  const points = data.map((y, i) => {
    const px = (i / (data.length - 1)) * W;
    const py = H - y * H;
    return `${px},${py}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-border rounded bg-muted/20">
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" />
      <line x1="0" y1={H} x2={W} y2={H} stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" />
      <line x1="0" y1="0" x2="0" y2={H} stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" />
      <text x="2" y="10" fontSize="7" fill="hsl(var(--muted-foreground))">1.0</text>
      <text x="2" y={H - 2} fontSize="7" fill="hsl(var(--muted-foreground))">0.0</text>
    </svg>
  );
}

function BifurcationChart({ points, rValue }: { points: { r: number; x: number }[]; rValue: number }) {
  const rMin = 2.5, rMax = 4.0;
  const rLine = ((rValue - rMin) / (rMax - rMin)) * W;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-border rounded bg-muted/20">
      {points.map((p, i) => {
        const px = ((p.r - rMin) / (rMax - rMin)) * W;
        const py = H - p.x * H;
        return <circle key={i} cx={px} cy={py} r="0.4" fill="hsl(var(--primary))" opacity="0.5" />;
      })}
      <line x1={rLine} y1="0" x2={rLine} y2={H} stroke="hsl(var(--destructive))" strokeWidth="0.8" strokeDasharray="3,2" />
      <text x="2" y={H - 2} fontSize="7" fill="hsl(var(--muted-foreground))">r=2.5</text>
      <text x={W - 22} y={H - 2} fontSize="7" fill="hsl(var(--muted-foreground))">r=4.0</text>
    </svg>
  );
}

export function LogisticMapViz() {
  const [r, setR] = useState(3.57);
  const [x0, setX0] = useState(0.5);
  const iterations = 150;

  const timeSeries = useMemo(() => computeLogisticMap(r, x0, iterations), [r, x0]);
  const bifurcation = useMemo(() => computeBifurcation(2.5, 4.0, 500, 200, 50), []);
  const lyapunov = useMemo(() => computeLyapunov(r, 5000), [r]);

  const regime = lyapunov > 0.01 ? 'Chaotisch' : lyapunov < -0.01 ? 'Stabil' : 'Grenze';
  const regimeColor = lyapunov > 0.01 ? 'text-red-400' : lyapunov < -0.01 ? 'text-emerald-400' : 'text-yellow-400';

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">LOGISTISCHE ABBILDUNG</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          x<sub>n+1</sub> = r · x<sub>n</sub>(1 − x<sub>n</sub>) — Interaktive Visualisierung
        </p>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Controls */}
          <div className="space-y-3 border border-border rounded p-3">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Wachstumsrate r</span>
                <span className="font-mono font-bold">{r.toFixed(3)}</span>
              </div>
              <Slider min={0.1} max={4.0} step={0.001} value={[r]} onValueChange={([v]) => setR(v)} />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Startwert x₀</span>
                <span className="font-mono font-bold">{x0.toFixed(3)}</span>
              </div>
              <Slider min={0.01} max={0.99} step={0.01} value={[x0]} onValueChange={([v]) => setX0(v)} />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Lyapunov λ</div>
              <div className={`text-sm font-mono font-bold ${regimeColor}`}>{lyapunov.toFixed(4)}</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Regime</div>
              <div className={`text-sm font-bold ${regimeColor}`}>{regime}</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Letzter Wert</div>
              <div className="text-sm font-mono font-bold">{timeSeries[timeSeries.length - 1].toFixed(6)}</div>
            </div>
          </div>

          {/* Time Series */}
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-1">ZEITREIHE ({iterations} Iterationen)</div>
            <TimeSeriesChart data={timeSeries} />
          </div>

          {/* Bifurcation */}
          <div>
            <div className="text-[10px] font-medium text-muted-foreground mb-1">BIFURKATIONSDIAGRAMM</div>
            <BifurcationChart points={bifurcation} rValue={r} />
          </div>

          {/* Info */}
          <div className="border border-border rounded p-2 space-y-1">
            <div className="text-[10px] font-medium text-muted-foreground">PARAMETER-BEREICHE</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">
              <span className="text-muted-foreground">0 &lt; r &lt; 1</span><span>Auslöschung</span>
              <span className="text-muted-foreground">1 &lt; r &lt; 3</span><span>Fixpunkt</span>
              <span className="text-muted-foreground">3 &lt; r &lt; 3.57</span><span>Periodenverdopplung</span>
              <span className="text-muted-foreground">r ≈ 3.57+</span><span>Chaos</span>
              <span className="text-muted-foreground">r = 4.0</span><span>Volles Chaos</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
