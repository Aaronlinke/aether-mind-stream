import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Orbit, Zap, Activity, Waves, Grid3X3, Sparkles, TrendingUp, Atom } from 'lucide-react';

// SRIL Coefficients (empirically calibrated)
const ALPHA = 0.245;
const BETA = 0.152;
const GAMMA = 1.1487;
const DELTA = 0.112;
const ETA = 0.088;

interface PhasePoint {
  h: number;
  n: number;
  g: number;
  t: number;
}

interface LyapunovResult {
  lambda1: number;
  lambda2: number;
  lambda3: number;
  chaosIndex: number;
}

interface BifurcationPoint {
  param: number;
  attractors: number[];
}

interface EntropyState {
  shannon: number;
  kolmogorov: number;
  topological: number;
  flow: number;
}

export const Nexus: React.FC = () => {
  // Phase space trajectory
  const [trajectory, setTrajectory] = useState<PhasePoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // Control parameters
  const [perturbation, setPerturbation] = useState(0.001);
  const [iterations, setIterations] = useState(100);
  const [bifurcationParam, setBifurcationParam] = useState<'alpha' | 'gamma' | 'eta'>('gamma');
  
  // Analysis results
  const [lyapunov, setLyapunov] = useState<LyapunovResult | null>(null);
  const [bifurcationData, setBifurcationData] = useState<BifurcationPoint[]>([]);
  const [entropy, setEntropy] = useState<EntropyState | null>(null);
  const [fractalDim, setFractalDim] = useState<number | null>(null);
  
  // Initial conditions
  const [h0, setH0] = useState(-4.256);
  const [n0, setN0] = useState(5.824);
  const [g0, setG0] = useState(1.952);

  // SRIL Forward iteration with custom coefficients
  const srilStep = useCallback((h: number, n: number, g: number, t: number, coeffs?: Partial<typeof defaultCoeffs>) => {
    const c = { ...defaultCoeffs, ...coeffs };
    const eps_H = 0.001 * Math.sin(2 * Math.PI * t / 100);
    const eps_N = 0.0005 * Math.cos(2 * Math.PI * t / 73);
    const eps_G = 0.0002 * Math.sin(2 * Math.PI * t / 37 + Math.PI / 4);
    
    const h_next = h + c.alpha * n - c.beta * g + eps_H;
    const n_next = c.gamma * n + c.delta * h + eps_N;
    const g_next = g + c.eta * (h_next + n_next) * (1 + 0.01 * Math.tanh(g / 10)) + eps_G;
    
    return { h: h_next, n: n_next, g: g_next };
  }, []);

  const defaultCoeffs = useMemo(() => ({
    alpha: ALPHA,
    beta: BETA,
    gamma: GAMMA,
    delta: DELTA,
    eta: ETA
  }), []);

  // Generate phase space trajectory
  const generateTrajectory = useCallback(() => {
    setIsRunning(true);
    const points: PhasePoint[] = [];
    let h = h0, n = n0, g = g0;
    
    for (let t = 0; t < iterations; t++) {
      points.push({ h, n, g, t });
      const next = srilStep(h, n, g, t);
      h = next.h;
      n = next.n;
      g = next.g;
    }
    
    setTrajectory(points);
    setIsRunning(false);
  }, [h0, n0, g0, iterations, srilStep]);

  // Calculate Lyapunov exponents using QR decomposition approximation
  const calculateLyapunov = useCallback(() => {
    const delta = perturbation;
    let h = h0, n = n0, g = g0;
    
    // Initialize perturbation vectors (orthonormal)
    let v1 = [1, 0, 0];
    let v2 = [0, 1, 0];
    let v3 = [0, 0, 1];
    
    let sum1 = 0, sum2 = 0, sum3 = 0;
    const transientSteps = 50;
    const measureSteps = iterations - transientSteps;
    
    for (let t = 0; t < iterations; t++) {
      // Compute Jacobian numerically
      const f0 = srilStep(h, n, g, t);
      const fh = srilStep(h + delta, n, g, t);
      const fn = srilStep(h, n + delta, g, t);
      const fg = srilStep(h, n, g + delta, t);
      
      const J = [
        [(fh.h - f0.h) / delta, (fn.h - f0.h) / delta, (fg.h - f0.h) / delta],
        [(fh.n - f0.n) / delta, (fn.n - f0.n) / delta, (fg.n - f0.n) / delta],
        [(fh.g - f0.g) / delta, (fn.g - f0.g) / delta, (fg.g - f0.g) / delta]
      ];
      
      // Apply Jacobian to perturbation vectors
      const apply = (v: number[]) => [
        J[0][0] * v[0] + J[0][1] * v[1] + J[0][2] * v[2],
        J[1][0] * v[0] + J[1][1] * v[1] + J[1][2] * v[2],
        J[2][0] * v[0] + J[2][1] * v[1] + J[2][2] * v[2]
      ];
      
      v1 = apply(v1);
      v2 = apply(v2);
      v3 = apply(v3);
      
      // Gram-Schmidt orthonormalization
      const norm1 = Math.sqrt(v1[0]**2 + v1[1]**2 + v1[2]**2);
      v1 = v1.map(x => x / norm1);
      
      const dot12 = v2[0]*v1[0] + v2[1]*v1[1] + v2[2]*v1[2];
      v2 = [v2[0] - dot12*v1[0], v2[1] - dot12*v1[1], v2[2] - dot12*v1[2]];
      const norm2 = Math.sqrt(v2[0]**2 + v2[1]**2 + v2[2]**2);
      v2 = v2.map(x => x / norm2);
      
      const dot13 = v3[0]*v1[0] + v3[1]*v1[1] + v3[2]*v1[2];
      const dot23 = v3[0]*v2[0] + v3[1]*v2[1] + v3[2]*v2[2];
      v3 = [v3[0] - dot13*v1[0] - dot23*v2[0], v3[1] - dot13*v1[1] - dot23*v2[1], v3[2] - dot13*v1[2] - dot23*v2[2]];
      const norm3 = Math.sqrt(v3[0]**2 + v3[1]**2 + v3[2]**2);
      v3 = v3.map(x => x / norm3);
      
      if (t >= transientSteps) {
        sum1 += Math.log(norm1);
        sum2 += Math.log(norm2);
        sum3 += Math.log(norm3);
      }
      
      // Update state
      h = f0.h;
      n = f0.n;
      g = f0.g;
    }
    
    const lambda1 = sum1 / measureSteps;
    const lambda2 = sum2 / measureSteps;
    const lambda3 = sum3 / measureSteps;
    
    // Chaos index: ratio of positive to total Lyapunov sum
    const positiveSum = [lambda1, lambda2, lambda3].filter(l => l > 0).reduce((a, b) => a + b, 0);
    const totalSum = Math.abs(lambda1) + Math.abs(lambda2) + Math.abs(lambda3);
    const chaosIndex = totalSum > 0 ? positiveSum / totalSum : 0;
    
    setLyapunov({ lambda1, lambda2, lambda3, chaosIndex });
  }, [h0, n0, g0, iterations, perturbation, srilStep]);

  // Generate bifurcation diagram
  const generateBifurcation = useCallback(() => {
    const points: BifurcationPoint[] = [];
    const paramRange = bifurcationParam === 'gamma' ? [0.8, 1.5] : 
                       bifurcationParam === 'alpha' ? [0.1, 0.5] : [0.02, 0.15];
    const steps = 80;
    const transient = 100;
    const record = 50;
    
    for (let i = 0; i <= steps; i++) {
      const param = paramRange[0] + (paramRange[1] - paramRange[0]) * i / steps;
      const coeffs = { ...defaultCoeffs, [bifurcationParam]: param };
      
      let h = h0, n = n0, g = g0;
      
      // Transient
      for (let t = 0; t < transient; t++) {
        const next = srilStep(h, n, g, t, coeffs);
        h = next.h; n = next.n; g = next.g;
      }
      
      // Record attractors (using H component)
      const attractors: number[] = [];
      for (let t = 0; t < record; t++) {
        const next = srilStep(h, n, g, transient + t, coeffs);
        h = next.h; n = next.n; g = next.g;
        
        // Only add if sufficiently different from existing
        const isDifferent = attractors.every(a => Math.abs(a - h) > 0.01);
        if (isDifferent && attractors.length < 20) {
          attractors.push(h);
        }
      }
      
      points.push({ param, attractors });
    }
    
    setBifurcationData(points);
  }, [bifurcationParam, h0, n0, g0, defaultCoeffs, srilStep]);

  // Calculate entropy measures
  const calculateEntropy = useCallback(() => {
    if (trajectory.length < 10) return;
    
    // Shannon entropy from H distribution
    const hValues = trajectory.map(p => p.h);
    const bins = 50;
    const min = Math.min(...hValues);
    const max = Math.max(...hValues);
    const binWidth = (max - min) / bins;
    const histogram = new Array(bins).fill(0);
    
    hValues.forEach(h => {
      const bin = Math.min(bins - 1, Math.floor((h - min) / binWidth));
      histogram[bin]++;
    });
    
    const total = hValues.length;
    const shannon = -histogram
      .filter(c => c > 0)
      .map(c => c / total)
      .reduce((sum, p) => sum + p * Math.log2(p), 0);
    
    // Kolmogorov approximation (compression ratio proxy)
    const stateString = trajectory.map(p => 
      `${Math.round(p.h * 100)}:${Math.round(p.n * 100)}:${Math.round(p.g * 100)}`
    ).join(',');
    const uniquePatterns = new Set(stateString.match(/.{1,10}/g) || []).size;
    const totalPatterns = Math.ceil(stateString.length / 10);
    const kolmogorov = uniquePatterns / totalPatterns;
    
    // Topological entropy (growth rate of distinguishable orbits)
    const epsilon = 0.1;
    let distinctOrbits = 1;
    for (let i = 1; i < trajectory.length; i++) {
      const prev = trajectory[i - 1];
      const curr = trajectory[i];
      const dist = Math.sqrt((curr.h - prev.h)**2 + (curr.n - prev.n)**2 + (curr.g - prev.g)**2);
      if (dist > epsilon) distinctOrbits++;
    }
    const topological = Math.log(distinctOrbits) / Math.log(trajectory.length);
    
    // Entropy flow (rate of change)
    const flow = trajectory.length > 1 ? 
      Math.abs(shannon - (trajectory.length / bins)) / trajectory.length : 0;
    
    setEntropy({ shannon, kolmogorov, topological, flow });
  }, [trajectory]);

  // Calculate fractal dimension (box-counting approximation)
  const calculateFractalDimension = useCallback(() => {
    if (trajectory.length < 20) return;
    
    const hValues = trajectory.map(p => p.h);
    const nValues = trajectory.map(p => p.n);
    
    const minH = Math.min(...hValues), maxH = Math.max(...hValues);
    const minN = Math.min(...nValues), maxN = Math.max(...nValues);
    const rangeH = maxH - minH || 1;
    const rangeN = maxN - minN || 1;
    
    const boxCounts: { size: number; count: number }[] = [];
    
    for (const boxSize of [0.5, 0.25, 0.125, 0.0625, 0.03125]) {
      const boxes = new Set<string>();
      
      trajectory.forEach(p => {
        const bh = Math.floor((p.h - minH) / (rangeH * boxSize));
        const bn = Math.floor((p.n - minN) / (rangeN * boxSize));
        boxes.add(`${bh},${bn}`);
      });
      
      boxCounts.push({ size: boxSize, count: boxes.size });
    }
    
    // Linear regression on log-log plot
    const logSizes = boxCounts.map(b => Math.log(1 / b.size));
    const logCounts = boxCounts.map(b => Math.log(b.count));
    
    const n = logSizes.length;
    const sumX = logSizes.reduce((a, b) => a + b, 0);
    const sumY = logCounts.reduce((a, b) => a + b, 0);
    const sumXY = logSizes.reduce((sum, x, i) => sum + x * logCounts[i], 0);
    const sumX2 = logSizes.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    setFractalDim(Math.max(1, Math.min(3, slope)));
  }, [trajectory]);

  // Run all analyses
  const runFullAnalysis = useCallback(() => {
    generateTrajectory();
  }, [generateTrajectory]);

  // Effect to run secondary analyses after trajectory is generated
  useEffect(() => {
    if (trajectory.length > 0) {
      calculateLyapunov();
      generateBifurcation();
      calculateEntropy();
      calculateFractalDimension();
    }
  }, [trajectory, calculateLyapunov, generateBifurcation, calculateEntropy, calculateFractalDimension]);

  // Phase space visualization (2D projection)
  const phaseSpaceViz = useMemo(() => {
    if (trajectory.length === 0) return null;
    
    const hValues = trajectory.map(p => p.h);
    const nValues = trajectory.map(p => p.n);
    
    const minH = Math.min(...hValues), maxH = Math.max(...hValues);
    const minN = Math.min(...nValues), maxN = Math.max(...nValues);
    const rangeH = maxH - minH || 1;
    const rangeN = maxN - minN || 1;
    
    const width = 400;
    const height = 300;
    const padding = 30;
    
    const scaleX = (h: number) => padding + ((h - minH) / rangeH) * (width - 2 * padding);
    const scaleY = (n: number) => height - padding - ((n - minN) / rangeN) * (height - 2 * padding);
    
    const pathData = trajectory
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.h).toFixed(1)} ${scaleY(p.n).toFixed(1)}`)
      .join(' ');
    
    return (
      <svg width={width} height={height} className="border border-border/30 rounded bg-background/50">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <React.Fragment key={frac}>
            <line 
              x1={padding + frac * (width - 2 * padding)} 
              y1={padding} 
              x2={padding + frac * (width - 2 * padding)} 
              y2={height - padding}
              stroke="currentColor" 
              strokeOpacity={0.1}
            />
            <line 
              x1={padding} 
              y1={padding + frac * (height - 2 * padding)} 
              x2={width - padding} 
              y2={padding + frac * (height - 2 * padding)}
              stroke="currentColor" 
              strokeOpacity={0.1}
            />
          </React.Fragment>
        ))}
        
        {/* Trajectory with gradient */}
        <defs>
          <linearGradient id="trajectoryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path 
          d={pathData} 
          fill="none" 
          stroke="url(#trajectoryGradient)" 
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        
        {/* Start point */}
        <circle cx={scaleX(hValues[0])} cy={scaleY(nValues[0])} r={5} fill="currentColor" opacity={0.5} />
        
        {/* End point */}
        <circle cx={scaleX(hValues[hValues.length - 1])} cy={scaleY(nValues[nValues.length - 1])} r={5} fill="currentColor" />
        
        {/* Axes labels */}
        <text x={width / 2} y={height - 5} textAnchor="middle" className="text-[10px] fill-muted-foreground">H (Enthalpy)</text>
        <text x={10} y={height / 2} textAnchor="middle" className="text-[10px] fill-muted-foreground" transform={`rotate(-90, 10, ${height / 2})`}>N (Navigation)</text>
      </svg>
    );
  }, [trajectory]);

  // Bifurcation visualization
  const bifurcationViz = useMemo(() => {
    if (bifurcationData.length === 0) return null;
    
    const width = 400;
    const height = 200;
    const padding = 30;
    
    const allAttractors = bifurcationData.flatMap(p => p.attractors);
    const minA = Math.min(...allAttractors, -10);
    const maxA = Math.max(...allAttractors, 10);
    const rangeA = maxA - minA || 1;
    
    const params = bifurcationData.map(p => p.param);
    const minP = Math.min(...params);
    const maxP = Math.max(...params);
    const rangeP = maxP - minP || 1;
    
    const scaleX = (p: number) => padding + ((p - minP) / rangeP) * (width - 2 * padding);
    const scaleY = (a: number) => height - padding - ((a - minA) / rangeA) * (height - 2 * padding);
    
    return (
      <svg width={width} height={height} className="border border-border/30 rounded bg-background/50">
        {/* Grid */}
        {[0, 0.5, 1].map(frac => (
          <line 
            key={frac}
            x1={padding + frac * (width - 2 * padding)} 
            y1={padding} 
            x2={padding + frac * (width - 2 * padding)} 
            y2={height - padding}
            stroke="currentColor" 
            strokeOpacity={0.1}
          />
        ))}
        
        {/* Points */}
        {bifurcationData.map((point, i) => 
          point.attractors.map((a, j) => (
            <circle 
              key={`${i}-${j}`}
              cx={scaleX(point.param)} 
              cy={scaleY(a)} 
              r={0.8} 
              fill="currentColor" 
              opacity={0.6}
            />
          ))
        )}
        
        {/* Current parameter line */}
        <line 
          x1={scaleX(defaultCoeffs[bifurcationParam])} 
          y1={padding} 
          x2={scaleX(defaultCoeffs[bifurcationParam])} 
          y2={height - padding}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.5}
        />
        
        {/* Labels */}
        <text x={width / 2} y={height - 5} textAnchor="middle" className="text-[10px] fill-muted-foreground">
          {bifurcationParam.toUpperCase()}
        </text>
        <text x={10} y={height / 2} textAnchor="middle" className="text-[10px] fill-muted-foreground" transform={`rotate(-90, 10, ${height / 2})`}>
          H∞
        </text>
      </svg>
    );
  }, [bifurcationData, bifurcationParam, defaultCoeffs]);

  // 3D-like phase space (isometric projection)
  const phaseSpace3D = useMemo(() => {
    if (trajectory.length === 0) return null;
    
    const width = 400;
    const height = 350;
    const cx = width / 2;
    const cy = height / 2;
    
    const hValues = trajectory.map(p => p.h);
    const nValues = trajectory.map(p => p.n);
    const gValues = trajectory.map(p => p.g);
    
    const normalize = (arr: number[]) => {
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const range = max - min || 1;
      return arr.map(v => (v - min) / range - 0.5);
    };
    
    const hNorm = normalize(hValues);
    const nNorm = normalize(nValues);
    const gNorm = normalize(gValues);
    
    // Isometric projection
    const scale = 200;
    const project = (h: number, n: number, g: number) => ({
      x: cx + scale * (h * 0.866 - n * 0.866),
      y: cy + scale * (h * 0.5 + n * 0.5 - g)
    });
    
    const points = trajectory.map((_, i) => project(hNorm[i], nNorm[i], gNorm[i]));
    
    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    
    // Axes
    const origin = project(0, 0, 0);
    const hAxis = project(0.3, 0, 0);
    const nAxis = project(0, 0.3, 0);
    const gAxis = project(0, 0, 0.3);
    
    return (
      <svg width={width} height={height} className="border border-border/30 rounded bg-background/50">
        {/* Axes */}
        <line x1={origin.x} y1={origin.y} x2={hAxis.x} y2={hAxis.y} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} />
        <line x1={origin.x} y1={origin.y} x2={nAxis.x} y2={nAxis.y} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} />
        <line x1={origin.x} y1={origin.y} x2={gAxis.x} y2={gAxis.y} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} />
        
        <text x={hAxis.x + 10} y={hAxis.y} className="text-[10px] fill-muted-foreground">H</text>
        <text x={nAxis.x - 15} y={nAxis.y} className="text-[10px] fill-muted-foreground">N</text>
        <text x={gAxis.x} y={gAxis.y - 10} className="text-[10px] fill-muted-foreground">G</text>
        
        {/* Trajectory */}
        <path 
          d={pathData} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth={1}
          strokeOpacity={0.7}
        />
        
        {/* Points with depth shading */}
        {points.slice(-50).map((p, i, arr) => (
          <circle 
            key={i}
            cx={p.x} 
            cy={p.y} 
            r={1 + (i / arr.length) * 2} 
            fill="currentColor" 
            opacity={0.3 + (i / arr.length) * 0.7}
          />
        ))}
      </svg>
    );
  }, [trajectory]);

  // Chaos indicator bar
  const chaosBar = useMemo(() => {
    if (!lyapunov) return null;
    const chaosPercent = Math.min(100, lyapunov.chaosIndex * 100);
    
    return (
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-foreground transition-all duration-500"
          style={{ width: `${chaosPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] font-mono mix-blend-difference text-background">
            {chaosPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }, [lyapunov]);

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Orbit className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">NEXUS</h1>
            <p className="text-xs text-muted-foreground">Topological Phase Space Analyzer</p>
          </div>
        </div>
        <Button onClick={runFullAnalysis} disabled={isRunning} size="sm">
          <Zap className="w-4 h-4 mr-2" />
          {isRunning ? 'ANALYZING...' : 'FULL ANALYSIS'}
        </Button>
      </div>

      {/* Control Panel */}
      <Card className="border-border/50">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            INITIAL CONDITIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <div>
            <label className="text-[10px] text-muted-foreground">H₀</label>
            <input 
              type="number" 
              value={h0} 
              onChange={e => setH0(parseFloat(e.target.value) || 0)}
              className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-sm font-mono"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">N₀</label>
            <input 
              type="number" 
              value={n0} 
              onChange={e => setN0(parseFloat(e.target.value) || 0)}
              className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-sm font-mono"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">G₀</label>
            <input 
              type="number" 
              value={g0} 
              onChange={e => setG0(parseFloat(e.target.value) || 0)}
              className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-sm font-mono"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">ITERATIONS</label>
            <input 
              type="number" 
              value={iterations} 
              onChange={e => setIterations(parseInt(e.target.value) || 100)}
              className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-sm font-mono"
              min={10}
              max={1000}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">PERTURBATION</label>
            <input 
              type="number" 
              value={perturbation} 
              onChange={e => setPerturbation(parseFloat(e.target.value) || 0.001)}
              className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-sm font-mono"
              step="0.0001"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">BIFURCATION</label>
            <select 
              value={bifurcationParam}
              onChange={e => setBifurcationParam(e.target.value as 'alpha' | 'gamma' | 'eta')}
              className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-sm font-mono"
            >
              <option value="gamma">γ (GAMMA)</option>
              <option value="alpha">α (ALPHA)</option>
              <option value="eta">η (ETA)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Phase Space 2D */}
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              PHASE PORTRAIT (H-N)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {phaseSpaceViz || (
              <div className="w-[400px] h-[300px] border border-dashed border-border/30 rounded flex items-center justify-center text-muted-foreground text-sm">
                Run analysis to generate
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase Space 3D */}
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Atom className="w-4 h-4" />
              3D TRAJECTORY (ISOMETRIC)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {phaseSpace3D || (
              <div className="w-[400px] h-[350px] border border-dashed border-border/30 rounded flex items-center justify-center text-muted-foreground text-sm">
                Run analysis to generate
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bifurcation Diagram */}
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              BIFURCATION DIAGRAM
              <Badge variant="outline" className="ml-2 text-[10px]">{bifurcationParam.toUpperCase()}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {bifurcationViz || (
              <div className="w-[400px] h-[200px] border border-dashed border-border/30 rounded flex items-center justify-center text-muted-foreground text-sm">
                Run analysis to generate
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metrics Panel */}
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              DYNAMICAL INVARIANTS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lyapunov Exponents */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">LYAPUNOV SPECTRUM</span>
                {lyapunov && (
                  <Badge variant={lyapunov.lambda1 > 0 ? "destructive" : "secondary"} className="text-[10px]">
                    {lyapunov.lambda1 > 0 ? 'CHAOTIC' : 'STABLE'}
                  </Badge>
                )}
              </div>
              {lyapunov ? (
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="text-muted-foreground text-[10px]">λ₁</div>
                    <div className={lyapunov.lambda1 > 0 ? 'text-destructive' : ''}>{lyapunov.lambda1.toFixed(4)}</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="text-muted-foreground text-[10px]">λ₂</div>
                    <div className={lyapunov.lambda2 > 0 ? 'text-destructive' : ''}>{lyapunov.lambda2.toFixed(4)}</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="text-muted-foreground text-[10px]">λ₃</div>
                    <div className={lyapunov.lambda3 > 0 ? 'text-destructive' : ''}>{lyapunov.lambda3.toFixed(4)}</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">—</div>
              )}
            </div>

            {/* Chaos Index */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">CHAOS INDEX</div>
              {chaosBar || <div className="h-3 bg-muted rounded-full" />}
            </div>

            {/* Fractal Dimension */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded p-2">
                <div className="text-[10px] text-muted-foreground">FRACTAL DIMENSION</div>
                <div className="font-mono text-lg">
                  {fractalDim ? fractalDim.toFixed(4) : '—'}
                </div>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="text-[10px] text-muted-foreground">TRAJECTORY POINTS</div>
                <div className="font-mono text-lg">{trajectory.length}</div>
              </div>
            </div>

            {/* Entropy */}
            {entropy && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">ENTROPY MEASURES</div>
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                  <div className="bg-muted/30 rounded p-1.5 text-center">
                    <div className="text-muted-foreground">Shannon</div>
                    <div>{entropy.shannon.toFixed(3)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-1.5 text-center">
                    <div className="text-muted-foreground">Kolmogorov</div>
                    <div>{entropy.kolmogorov.toFixed(3)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-1.5 text-center">
                    <div className="text-muted-foreground">Topological</div>
                    <div>{entropy.topological.toFixed(3)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-1.5 text-center">
                    <div className="text-muted-foreground">Flow</div>
                    <div>{entropy.flow.toFixed(3)}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Series */}
      {trajectory.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Waves className="w-4 h-4" />
              TIME SERIES DECOMPOSITION
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {(['h', 'n', 'g'] as const).map(component => {
                const values = trajectory.map(p => p[component]);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min || 1;
                
                return (
                  <div key={component} className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{component.toUpperCase()}</span>
                      <span>{min.toFixed(2)} → {max.toFixed(2)}</span>
                    </div>
                    <div className="h-12 bg-muted/30 rounded relative overflow-hidden">
                      <svg width="100%" height="100%" preserveAspectRatio="none">
                        <path
                          d={values.map((v, i) => 
                            `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * 100}% ${100 - ((v - min) / range) * 100}%`
                          ).join(' ')}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Nexus;
