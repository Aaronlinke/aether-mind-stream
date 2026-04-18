import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';

function Trail({ sigma, rho, beta, dt, count }: { sigma: number; rho: number; beta: number; dt: number; count: number }) {
  const ref = useRef<THREE.Line>(null);
  const state = useRef({ x: 0.1, y: 0, z: 0 });
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  const idx = useRef(0);

  useFrame(() => {
    for (let i = 0; i < 5; i++) {
      const { x, y, z } = state.current;
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;
      state.current = { x: x + dx * dt, y: y + dy * dt, z: z + dz * dt };
      const k = idx.current;
      positions[k * 3] = state.current.x;
      positions[k * 3 + 1] = state.current.y;
      positions[k * 3 + 2] = state.current.z - 25;
      idx.current = (k + 1) % count;
    }
    geom.attributes.position.needsUpdate = true;
    geom.setDrawRange(0, count);
  });

  return (
    <primitive object={new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xffffff }))} ref={ref} />
  );
}

export function LorenzAttractor() {
  const [sigma, setSigma] = useState(10);
  const [rho, setRho] = useState(28);
  const [beta, setBeta] = useState(8 / 3);
  const [dt, setDt] = useState(0.01);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">LORENZ-ATTRAKTOR</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">dx/dt = σ(y−x), dy/dt = x(ρ−z)−y, dz/dt = xy−βz</p>
      </header>
      <div className="flex-1 grid grid-rows-[1fr_auto] overflow-hidden">
        <div className="overflow-hidden">
          <Canvas camera={{ position: [40, 40, 40], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: 'low-power' }}>
            <color attach="background" args={['#000000']} />
            <Trail sigma={sigma} rho={rho} beta={beta} dt={dt} count={4000} />
            <OrbitControls enablePan={false} />
          </Canvas>
        </div>
        <ScrollArea className="border-t border-border max-h-[40%]">
          <div className="p-3 space-y-2">
            <div>
              <div className="text-[10px] text-muted-foreground">σ (Prandtl): {sigma.toFixed(2)}</div>
              <Slider value={[sigma]} onValueChange={v => setSigma(v[0])} min={1} max={20} step={0.1} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">ρ (Rayleigh): {rho.toFixed(2)}</div>
              <Slider value={[rho]} onValueChange={v => setRho(v[0])} min={1} max={60} step={0.1} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">β: {beta.toFixed(3)}</div>
              <Slider value={[beta]} onValueChange={v => setBeta(v[0])} min={0.5} max={5} step={0.01} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">dt: {dt.toFixed(4)}</div>
              <Slider value={[dt]} onValueChange={v => setDt(v[0])} min={0.001} max={0.03} step={0.001} />
            </div>
            <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              Klassisch: σ=10, ρ=28, β=8/3 → chaotischer Attraktor mit zwei Flügeln
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
