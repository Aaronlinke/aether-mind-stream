import React, { useState, useMemo, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ═══════════════════════════════════════════════════════════════════════════════
// HEXAGONALER GITTER-VISUALIZER
// D₆-Symmetrie · Fourier-Interferenz · Rosetten · Kristallographie
// ═══════════════════════════════════════════════════════════════════════════════

const SQRT3_2 = Math.sqrt(3) / 2;

// Basis vectors at 120° intervals
const V1 = [1, 0];
const V2 = [0.5, SQRT3_2];
const V3 = [-0.5, SQRT3_2];

// Wave vectors (perpendicular to basis vectors)
const K1 = [0, 1];
const K2 = [SQRT3_2, -0.5];
const K3 = [-SQRT3_2, -0.5];

interface LatticePoint {
  x: number;
  y: number;
  a: number;
  b: number;
  c: number;
}

// D₆ rotation matrix
function rotateD6(x: number, y: number, k: number): [number, number] {
  const angle = (k * Math.PI) / 3;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - y * sin, x * sin + y * cos];
}

// Fourier interference pattern P(x) = Σ cos(kᵢ · x)
function fourierPattern(px: number, py: number, freq: number, phases: number[]): number {
  return (
    Math.cos(freq * (K1[0] * px + K1[1] * py) + phases[0]) +
    Math.cos(freq * (K2[0] * px + K2[1] * py) + phases[1]) +
    Math.cos(freq * (K3[0] * px + K3[1] * py) + phases[2])
  );
}

export function HexLattice() {
  const [frequency, setFrequency] = useState(4);
  const [range, setRange] = useState(5);
  const [showRosette, setShowRosette] = useState(true);
  const [showInterference, setShowInterference] = useState(true);
  const [showLattice, setShowLattice] = useState(true);
  const [rotationSymmetry, setRotationSymmetry] = useState(6);
  const [phases, setPhases] = useState([0, 0, 0]);
  const [phaseShift, setPhaseShift] = useState(0);

  const WIDTH = 380;
  const HEIGHT = 380;
  const CX = WIDTH / 2;
  const CY = HEIGHT / 2;
  const SCALE = 28;

  // Generate lattice points
  const latticePoints = useMemo<LatticePoint[]>(() => {
    const pts: LatticePoint[] = [];
    for (let a = -range; a <= range; a++) {
      for (let b = -range; b <= range; b++) {
        const x = a * V1[0] + b * V2[0];
        const y = a * V1[1] + b * V2[1];
        if (Math.abs(x) <= range + 1 && Math.abs(y) <= range + 1) {
          pts.push({ x, y, a, b, c: -(a + b) });
        }
      }
    }
    return pts;
  }, [range]);

  // Generate rosette lines (D₆ symmetry)
  const rosetteLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; k: number }[] = [];
    const r = range * SCALE;
    for (let k = 0; k < rotationSymmetry; k++) {
      const angle = (k * Math.PI) / (rotationSymmetry / 2);
      lines.push({
        x1: CX + r * Math.cos(angle),
        y1: CY + r * Math.sin(angle),
        x2: CX - r * Math.cos(angle),
        y2: CY - r * Math.sin(angle),
        k
      });
    }
    return lines;
  }, [range, rotationSymmetry]);

  // Interference pattern as pixel data
  const interferencePixels = useMemo(() => {
    if (!showInterference) return [];
    const pixels: { x: number; y: number; w: number; h: number; opacity: number; hue: number }[] = [];
    const step = 4;
    const currentPhases = [phaseShift, phaseShift * 0.7, phaseShift * 1.3];
    
    for (let px = 0; px < WIDTH; px += step) {
      for (let py = 0; py < HEIGHT; py += step) {
        const wx = (px - CX) / SCALE;
        const wy = (py - CY) / SCALE;
        const val = fourierPattern(wx, wy, frequency, currentPhases);
        // val ranges from -3 to 3
        const norm = (val + 3) / 6;
        const opacity = Math.abs(val) / 3;
        const hue = norm * 240; // blue to red
        pixels.push({ x: px, y: py, w: step, h: step, opacity: opacity * 0.6, hue });
      }
    }
    return pixels;
  }, [frequency, phaseShift, showInterference]);

  // Fourier peaks analysis
  const fourierPeaks = useMemo(() => {
    return [
      { angle: 0, magnitude: 1, label: 'k₁' },
      { angle: 60, magnitude: 1, label: 'k₂' },
      { angle: 120, magnitude: 1, label: 'k₃' },
      { angle: 180, magnitude: 1, label: '-k₁' },
      { angle: 240, magnitude: 1, label: '-k₂' },
      { angle: 300, magnitude: 1, label: '-k₃' },
    ];
  }, []);

  const toggleLayer = useCallback((layer: 'rosette' | 'interference' | 'lattice') => {
    if (layer === 'rosette') setShowRosette(v => !v);
    if (layer === 'interference') setShowInterference(v => !v);
    if (layer === 'lattice') setShowLattice(v => !v);
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">GITTER-VISUALIZER</h1>
        <p className="text-xs text-muted-foreground mt-1">
          D₆-Symmetrie • Fourier-Interferenz • Hexagonales Gitter • Rosetten
        </p>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">FREQUENZ: {frequency}</div>
              <Slider value={[frequency]} onValueChange={v => setFrequency(v[0])} min={1} max={12} step={0.5} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">REICHWEITE: {range}</div>
              <Slider value={[range]} onValueChange={v => setRange(v[0])} min={2} max={10} step={1} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">PHASE: {phaseShift.toFixed(2)}</div>
              <Slider value={[phaseShift]} onValueChange={v => setPhaseShift(v[0])} min={0} max={6.28} step={0.05} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">SYMMETRIE: {rotationSymmetry}-fach</div>
              <Slider value={[rotationSymmetry]} onValueChange={v => setRotationSymmetry(v[0])} min={2} max={12} step={2} />
            </div>
          </div>

          {/* Layer toggles */}
          <div className="flex gap-2">
            <Badge 
              variant={showLattice ? "default" : "outline"} 
              className="cursor-pointer text-[10px]"
              onClick={() => toggleLayer('lattice')}
            >
              Gitter
            </Badge>
            <Badge 
              variant={showRosette ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => toggleLayer('rosette')}
            >
              Rosette
            </Badge>
            <Badge 
              variant={showInterference ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => toggleLayer('interference')}
            >
              Interferenz
            </Badge>
          </div>

          {/* Main Visualization */}
          <div className="border border-border rounded bg-background">
            <svg width={WIDTH} height={HEIGHT} className="w-full" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
              {/* Interference pattern */}
              {interferencePixels.map((p, i) => (
                <rect
                  key={i}
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  fill={`hsl(${p.hue}, 70%, 50%)`}
                  opacity={p.opacity}
                />
              ))}

              {/* Rosette lines */}
              {showRosette && rosetteLines.map((line, i) => (
                <line
                  key={`r-${i}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="hsl(var(--primary))"
                  strokeWidth={0.5}
                  opacity={0.3}
                />
              ))}

              {/* Lattice points */}
              {showLattice && latticePoints.map((p, i) => {
                const sx = CX + p.x * SCALE;
                const sy = CY - p.y * SCALE;
                if (sx < -5 || sx > WIDTH + 5 || sy < -5 || sy > HEIGHT + 5) return null;
                const isOrigin = p.a === 0 && p.b === 0;
                return (
                  <circle
                    key={`l-${i}`}
                    cx={sx}
                    cy={sy}
                    r={isOrigin ? 3 : 1.5}
                    fill={isOrigin ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
                    opacity={isOrigin ? 1 : 0.5}
                  />
                );
              })}

              {/* Basis vectors */}
              {[V1, V2, V3].map((v, i) => (
                <g key={`bv-${i}`}>
                  <line
                    x1={CX}
                    y1={CY}
                    x2={CX + v[0] * SCALE * 2}
                    y2={CY - v[1] * SCALE * 2}
                    stroke={['hsl(0,70%,60%)', 'hsl(120,70%,60%)', 'hsl(240,70%,60%)'][i]}
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                  />
                  <text
                    x={CX + v[0] * SCALE * 2.3}
                    y={CY - v[1] * SCALE * 2.3}
                    fill={['hsl(0,70%,60%)', 'hsl(120,70%,60%)', 'hsl(240,70%,60%)'][i]}
                    fontSize={10}
                    textAnchor="middle"
                  >
                    v{i + 1}
                  </text>
                </g>
              ))}

              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--foreground))" opacity={0.5} />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Fourier Analysis */}
          <div className="border border-border rounded p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">FOURIER-PEAKS (Frequenzraum)</div>
            <div className="flex items-center justify-center">
              <svg width={160} height={160} viewBox="0 0 160 160">
                <circle cx={80} cy={80} r={50} fill="none" stroke="hsl(var(--border))" strokeWidth={0.5} />
                {fourierPeaks.map((peak, i) => {
                  const rad = (peak.angle * Math.PI) / 180;
                  const px = 80 + 50 * Math.cos(rad);
                  const py = 80 - 50 * Math.sin(rad);
                  const lx = 80 + 62 * Math.cos(rad);
                  const ly = 80 - 62 * Math.sin(rad);
                  return (
                    <g key={i}>
                      <circle cx={px} cy={py} r={4} fill="hsl(var(--primary))" opacity={0.8} />
                      <text x={lx} y={ly} fill="hsl(var(--muted-foreground))" fontSize={8} textAnchor="middle" dominantBaseline="middle">
                        {peak.label}
                      </text>
                    </g>
                  );
                })}
                <text x={80} y={80} fill="hsl(var(--muted-foreground))" fontSize={7} textAnchor="middle">60° Abstd.</text>
              </svg>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              6 diskrete Peaks bei 60° → hexagonaler Ursprung (zwingend)
            </p>
          </div>

          {/* Mathematical Summary */}
          <div className="border border-border rounded p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">MATHEMATISCHE STRUKTUR</div>
            <div className="grid gap-1.5 text-xs font-mono">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">Basis</span>
                <span className="text-primary">v₁=(1,0) v₂=(½,√3/2) v₃=(−½,√3/2)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">Symmetrie</span>
                <span className="text-primary">D₆ = Dihedralgruppe Ordnung 12</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">Muster</span>
                <span className="text-primary">P(x) = Σᵢ cos(kᵢ · x)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">Dualität</span>
                <span className="text-primary">Raum ↔ Frequenz: identisch</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">Rosette</span>
                <span className="text-primary">G = ⋃ R_k(ℤ²), k=0..5</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-20">Punkte</span>
                <span>{latticePoints.length} Gitterpunkte (Reichweite {range})</span>
              </div>
            </div>
          </div>

          {/* Endgleichung */}
          <div className="border border-border rounded p-3 bg-muted/20">
            <div className="text-center font-mono text-xs space-y-1">
              <div className="text-primary font-bold">
                P(x) = Σ cos(kᵢ·x) ⟺ ℤv₁ ⊕ ℤv₂
              </div>
              <div className="text-muted-foreground text-[10px]">
                Raumdarstellung ↔ Frequenzdarstellung — Links ↔ Rechts — Vorwärts ↔ Rückwärts
              </div>
              <div className="text-[10px] text-muted-foreground italic">
                Identisch. Hier endet die Mathematik.
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
