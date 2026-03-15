import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// 3D GITTER-VISUALIZER
// Hexagonales Gitter · D₆-Symmetrie · Fourier-Interferenz im 3D-Raum
// ═══════════════════════════════════════════════════════════════════════════════

const SQRT3_2 = Math.sqrt(3) / 2;
const V1: [number, number] = [1, 0];
const V2: [number, number] = [0.5, SQRT3_2];

const K1 = [0, 1];
const K2 = [SQRT3_2, -0.5];
const K3 = [-SQRT3_2, -0.5];

function fourierHeight(x: number, y: number, freq: number, phase: number): number {
  return (
    Math.cos(freq * (K1[0] * x + K1[1] * y) + phase) +
    Math.cos(freq * (K2[0] * x + K2[1] * y) + phase * 0.7) +
    Math.cos(freq * (K3[0] * x + K3[1] * y) + phase * 1.3)
  ) / 3;
}

// Lattice points component
function LatticePoints({ range, frequency, phase, showInterference }: { range: number; frequency: number; phase: number; showInterference: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const points = useMemo(() => {
    const pts: { x: number; y: number; z: number; isOrigin: boolean }[] = [];
    for (let a = -range; a <= range; a++) {
      for (let b = -range; b <= range; b++) {
        const x = a * V1[0] + b * V2[0];
        const y = a * V1[1] + b * V2[1];
        if (Math.abs(x) <= range + 1 && Math.abs(y) <= range + 1) {
          const z = showInterference ? fourierHeight(x, y, frequency, phase) * 0.5 : 0;
          pts.push({ x, y, z, isOrigin: a === 0 && b === 0 });
        }
      }
    }
    return pts;
  }, [range, frequency, phase, showInterference]);

  useFrame(() => {
    if (!meshRef.current) return;
    points.forEach((p, i) => {
      dummy.position.set(p.x, p.z, p.y);
      dummy.scale.setScalar(p.isOrigin ? 0.12 : 0.06);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#ffffff" emissive="#888888" />
    </instancedMesh>
  );
}

// Interference surface
function InterferenceSurface({ range, frequency, phase }: { range: number; frequency: number; phase: number }) {
  const geometry = useMemo(() => {
    const res = 60;
    const size = range * 1.2;
    const geo = new THREE.PlaneGeometry(size * 2, size * 2, res, res);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h = fourierHeight(x, y, frequency, phase) * 0.5;
      pos.setZ(i, h);
      
      const norm = (h + 0.5) / 1;
      colors[i * 3] = norm * 0.3;
      colors[i * 3 + 1] = 0.1 + norm * 0.3;
      colors[i * 3 + 2] = 0.5 + (1 - norm) * 0.5;
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [range, frequency, phase]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <meshStandardMaterial vertexColors transparent opacity={0.4} side={THREE.DoubleSide} wireframe />
    </mesh>
  );
}

// Rosette lines
function RosetteLines({ range, symmetry }: { range: number; symmetry: number }) {
  const lines = useMemo(() => {
    const result: THREE.Vector3[][] = [];
    for (let k = 0; k < symmetry; k++) {
      const angle = (k * Math.PI) / (symmetry / 2);
      const r = range;
      result.push([
        new THREE.Vector3(r * Math.cos(angle), 0, r * Math.sin(angle)),
        new THREE.Vector3(-r * Math.cos(angle), 0, -r * Math.sin(angle))
      ]);
    }
    return result;
  }, [range, symmetry]);

  return (
    <>
      {lines.map((pts, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([pts[0].x, pts[0].y, pts[0].z, pts[1].x, pts[1].y, pts[1].z])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#666" transparent opacity={0.3} />
        </line>
      ))}
    </>
  );
}

// Basis vectors
function BasisVectors() {
  const colors = ['#ff6666', '#66ff66', '#6666ff'];
  const vectors: [number, number][] = [V1, V2, [-0.5, SQRT3_2]];
  
  return (
    <>
      {vectors.map((v, i) => (
        <group key={i}>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, 0, 0, v[0] * 2, 0, v[1] * 2])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={colors[i]} linewidth={2} />
          </line>
        </group>
      ))}
    </>
  );
}

// Auto-rotate wrapper
function AutoRotate({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current && enabled) ref.current.rotation.y += 0.003;
  });
  return <group ref={ref}>{children}</group>;
}

export function Lattice3D() {
  const [frequency, setFrequency] = useState(4);
  const [range, setRange] = useState(5);
  const [phase, setPhase] = useState(0);
  const [symmetry, setSymmetry] = useState(6);
  const [showSurface, setShowSurface] = useState(true);
  const [showRosette, setShowRosette] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">3D GITTER-VISUALIZER</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          D₆-Symmetrie · Fourier-Interferenz · Drehbare 3D-Projektion
        </p>
      </header>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-[300px] bg-background">
        <Canvas camera={{ position: [8, 6, 8], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-5, 5, -5]} intensity={0.3} />
          
          <AutoRotate enabled={autoRotate}>
            {showPoints && (
              <LatticePoints range={range} frequency={frequency} phase={phase} showInterference={showSurface} />
            )}
            {showSurface && (
              <InterferenceSurface range={range} frequency={frequency} phase={phase} />
            )}
            {showRosette && (
              <RosetteLines range={range} symmetry={symmetry} />
            )}
            <BasisVectors />
          </AutoRotate>
          
          <gridHelper args={[20, 20, '#222', '#111']} />
          <OrbitControls enableDamping dampingFactor={0.05} />
        </Canvas>
      </div>

      {/* Controls */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex gap-1 flex-wrap">
          <Badge variant={showPoints ? 'default' : 'outline'} className="cursor-pointer text-[9px]"
            onClick={() => setShowPoints(v => !v)}>Punkte</Badge>
          <Badge variant={showSurface ? 'default' : 'outline'} className="cursor-pointer text-[9px]"
            onClick={() => setShowSurface(v => !v)}>Interferenz</Badge>
          <Badge variant={showRosette ? 'default' : 'outline'} className="cursor-pointer text-[9px]"
            onClick={() => setShowRosette(v => !v)}>Rosette</Badge>
          <Badge variant={autoRotate ? 'default' : 'outline'} className="cursor-pointer text-[9px]"
            onClick={() => setAutoRotate(v => !v)}>Auto-Rotation</Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] text-muted-foreground">Frequenz: {frequency}</div>
            <Slider value={[frequency]} onValueChange={v => setFrequency(v[0])} min={1} max={12} step={0.5} />
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground">Phase: {phase.toFixed(2)}</div>
            <Slider value={[phase]} onValueChange={v => setPhase(v[0])} min={0} max={6.28} step={0.05} />
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground">Reichweite: {range}</div>
            <Slider value={[range]} onValueChange={v => setRange(v[0])} min={2} max={8} step={1} />
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground">Symmetrie: {symmetry}-fach</div>
            <Slider value={[symmetry]} onValueChange={v => setSymmetry(v[0])} min={2} max={12} step={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
