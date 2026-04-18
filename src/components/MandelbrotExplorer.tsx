import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { RotateCcw } from 'lucide-react';

export function MandelbrotExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [center, setCenter] = useState({ x: -0.5, y: 0 });
  const [scale, setScale] = useState(3);
  const [maxIter, setMaxIter] = useState(100);
  const [mode, setMode] = useState<'mandel' | 'julia'>('mandel');
  const [juliaC, setJuliaC] = useState({ x: -0.7, y: 0.27 });

  const render = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const W = c.width, H = c.height;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const aspect = W / H;
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const x0 = center.x + (px / W - 0.5) * scale * aspect;
        const y0 = center.y + (py / H - 0.5) * scale;
        let x = mode === 'mandel' ? 0 : x0;
        let y = mode === 'mandel' ? 0 : y0;
        const cx = mode === 'mandel' ? x0 : juliaC.x;
        const cy = mode === 'mandel' ? y0 : juliaC.y;
        let i = 0;
        while (x * x + y * y <= 4 && i < maxIter) {
          const xt = x * x - y * y + cx;
          y = 2 * x * y + cy;
          x = xt;
          i++;
        }
        const idx = (py * W + px) * 4;
        if (i === maxIter) {
          img.data[idx] = 0; img.data[idx + 1] = 0; img.data[idx + 2] = 0;
        } else {
          const t = i / maxIter;
          const v = Math.floor(255 * Math.pow(t, 0.5));
          img.data[idx] = v; img.data[idx + 1] = v; img.data[idx + 2] = v;
        }
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [center, scale, maxIter, mode, juliaC]);

  useEffect(() => { render(); }, [render]);

  const onClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * c.width;
    const py = ((ev.clientY - rect.top) / rect.height) * c.height;
    const aspect = c.width / c.height;
    const nx = center.x + (px / c.width - 0.5) * scale * aspect;
    const ny = center.y + (py / c.height - 0.5) * scale;
    setCenter({ x: nx, y: ny });
    setScale(s => s * 0.5);
  };

  const reset = () => { setCenter({ x: -0.5, y: 0 }); setScale(3); };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">FRAKTAL-EXPLORER</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">Klick = Zoom 2× · Mandelbrot & Julia</p>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'mandel' ? 'default' : 'outline'} onClick={() => { setMode('mandel'); reset(); }} className="text-xs h-7">Mandelbrot</Button>
            <Button size="sm" variant={mode === 'julia' ? 'default' : 'outline'} onClick={() => { setMode('julia'); reset(); }} className="text-xs h-7">Julia</Button>
            <Button size="sm" variant="outline" onClick={reset} className="text-xs h-7"><RotateCcw className="w-3 h-3 mr-1" />Reset</Button>
          </div>
          <canvas ref={canvasRef} width={400} height={400} onClick={onClick} className="w-full border border-border cursor-crosshair" style={{ imageRendering: 'pixelated' }} />
          <div>
            <div className="text-[10px] text-muted-foreground">Iterationen: {maxIter}</div>
            <Slider value={[maxIter]} onValueChange={v => setMaxIter(v[0])} min={20} max={500} step={10} />
          </div>
          {mode === 'julia' && (
            <>
              <div>
                <div className="text-[10px] text-muted-foreground">c.real: {juliaC.x.toFixed(3)}</div>
                <Slider value={[juliaC.x]} onValueChange={v => setJuliaC({ ...juliaC, x: v[0] })} min={-1.5} max={1.5} step={0.01} />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">c.imag: {juliaC.y.toFixed(3)}</div>
                <Slider value={[juliaC.y]} onValueChange={v => setJuliaC({ ...juliaC, y: v[0] })} min={-1.5} max={1.5} step={0.01} />
              </div>
            </>
          )}
          <div className="border border-border rounded p-2 font-mono text-[10px]">
            <div>Center: ({center.x.toFixed(6)}, {center.y.toFixed(6)})</div>
            <div>Scale: {scale.toExponential(3)}</div>
            <div>Zoom: {(3 / scale).toFixed(1)}×</div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
