import { useState, useRef, useEffect, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function primeFactors(n: number): number[] {
  const factors: number[] = [];
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) { factors.push(d); n /= d; }
    d++;
  }
  if (n > 1) factors.push(n);
  return factors;
}

function goldbachPair(n: number): [number, number] | null {
  if (n < 4 || n % 2 !== 0) return null;
  for (let i = 2; i <= n / 2; i++) {
    if (isPrime(i) && isPrime(n - i)) return [i, n - i];
  }
  return null;
}

export function PrimeExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(80);
  const [hovered, setHovered] = useState<number | null>(null);
  const [stats, setStats] = useState({ total: 0, primes: 0, twins: 0 });

  const drawSpiral = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, w, h);

    const max = size * size;
    const cellSize = Math.min(w, h) / size;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    // Ulam spiral coordinates
    let x = 0, y = 0, dx = 1, dy = 0;
    let steps = 1, stepCount = 0, turnCount = 0;
    let primeCount = 0;
    let twinCount = 0;

    for (let n = 1; n <= max; n++) {
      const prime = isPrime(n);
      if (prime) {
        primeCount++;
        if (isPrime(n - 2) || isPrime(n + 2)) twinCount++;

        const px = cx + x * cellSize;
        const py = cy + y * cellSize;

        // Color by prime class
        const isTwin = isPrime(n - 2) || isPrime(n + 2);
        const isSophie = isPrime((n - 1) / 2);
        const isMersenne = Number.isInteger(Math.log2(n + 1));

        if (isMersenne && n > 2) {
          ctx.fillStyle = '#f59e0b'; // amber
        } else if (isSophie) {
          ctx.fillStyle = '#8b5cf6'; // violet
        } else if (isTwin) {
          ctx.fillStyle = '#22d3ee'; // cyan
        } else {
          ctx.fillStyle = '#10b981'; // emerald
        }

        const r = Math.max(1, cellSize * 0.35);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Move in spiral
      x += dx; y += dy;
      stepCount++;
      if (stepCount === steps) {
        stepCount = 0;
        turnCount++;
        [dx, dy] = [-dy, dx]; // turn left
        if (turnCount % 2 === 0) steps++;
      }
    }

    setStats({ total: max, primes: primeCount, twins: Math.floor(twinCount / 2) });
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight - 4;
    drawSpiral();
  }, [drawSpiral]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight - 4;
      drawSpiral();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawSpiral]);

  const inspectNumber = hovered ?? size * size;
  const factors = primeFactors(inspectNumber);
  const goldbach = inspectNumber % 2 === 0 ? goldbachPair(inspectNumber) : null;

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">PRIME EXPLORER</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Ulam-Spirale • Primzahlverteilung • Faktorisierung
        </p>
      </header>

      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground w-16">Grid: {size}²</span>
          <Slider
            value={[size]}
            onValueChange={([v]) => setSize(v)}
            min={20}
            max={150}
            step={10}
            className="flex-1"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px]">
            {stats.total.toLocaleString()} Zahlen
          </Badge>
          <Badge variant="outline" className="text-[10px] text-emerald-400">
            {stats.primes.toLocaleString()} Primzahlen
          </Badge>
          <Badge variant="outline" className="text-[10px] text-cyan-400">
            {stats.twins} Zwillingspaare
          </Badge>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            π({stats.total}) ≈ {stats.total > 0 ? (stats.total / Math.log(stats.total)).toFixed(0) : 0} (PNT)
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Primzahl</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Zwilling</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Sophie Germain</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Mersenne</span>
        </div>

        <div className="bg-muted/30 rounded p-2 text-xs space-y-1">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-20">Inspektor:</span>
            <span className="font-mono">{inspectNumber}</span>
            <span className={isPrime(inspectNumber) ? 'text-emerald-400' : 'text-muted-foreground'}>
              {isPrime(inspectNumber) ? '✓ prim' : '✗ zusammengesetzt'}
            </span>
          </div>
          {!isPrime(inspectNumber) && factors.length > 0 && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20">Faktoren:</span>
              <span className="font-mono">{factors.join(' × ')}</span>
            </div>
          )}
          {goldbach && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20">Goldbach:</span>
              <span className="font-mono">{goldbach[0]} + {goldbach[1]}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-background relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / rect.width * size * size);
            setHovered(Math.max(1, Math.min(x, size * size)));
          }}
          onMouseLeave={() => setHovered(null)}
        />
      </div>
    </div>
  );
}
