import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Square, Download, Zap, ArrowRight, Shield } from 'lucide-react';
import { mod, modInv, ecAdd, ecMul, onCurve } from '@/lib/verify';


// ═══════════════════════════════════════════════════════════════════════════════
// SRIL ↔ ECDSA PIPELINE
// End-to-End: SRIL State → Key Evolution → secp256k1 Signing → Verification
// ═══════════════════════════════════════════════════════════════════════════════

const N_CURVE = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
const ALPHA = 0.245, BETA = 0.152, GAMMA = 1.1487, DELTA = 0.112, ETA = 0.088;

interface PipelineStep {
  t: number;
  H: number; N: number; G: number;
  seed: string;
  privateKeyHex: string;
  signatureR: string;
  signatureS: string;
  messageHash: string;
  verified: boolean;
}

function srilStep(h: number, n: number, g: number, t: number) {
  const eps_H = 0.001 * Math.sin(2 * Math.PI * t / 100);
  const eps_N = 0.0005 * Math.cos(2 * Math.PI * t / 73);
  const eps_G = 0.0002 * Math.sin(2 * Math.PI * t / 37 + Math.PI / 4);
  const h_next = h + ALPHA * n - BETA * g + eps_H;
  const n_next = GAMMA * n + DELTA * h + eps_N;
  const g_next = g + ETA * (h_next + n_next) * (1 + 0.01 * Math.tanh(g / 10)) + eps_G;
  return { h: h_next, n: n_next, g: g_next };
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const modInverse = (a: bigint, m: bigint): bigint => modInv(a, m);

/** Echte ECDSA-Signatur auf secp256k1: r = (kG).x mod n, s = k⁻¹(z + rd) mod n. */
async function ecdsaSign(privateKeyHex: string, messageHash: string, srilSeed: string):
  Promise<{ r: string; s: string; k: bigint; pub: { x: bigint; y: bigint } }> {
  const kHash = await sha256(srilSeed + messageHash);
  const k = mod(BigInt('0x' + kHash), N_CURVE - 1n) + 1n;
  const d = mod(BigInt('0x' + privateKeyHex), N_CURVE - 1n) + 1n;
  const z = BigInt('0x' + messageHash.substring(0, 64));

  const R = ecMul(k)!;                       // echte Skalarmultiplikation
  const r = mod(R.x, N_CURVE);
  const s = mod(modInv(k, N_CURVE) * (z + r * d), N_CURVE);
  const pub = ecMul(d)! as { x: bigint; y: bigint };

  return { r: r.toString(16).padStart(64, '0'), s: s.toString(16).padStart(64, '0'), k, pub };
}

/** Standard-ECDSA-Verifikation: R' = u₁G + u₂Q, gültig ⇔ R'.x ≡ r (mod n). */
function ecdsaVerify(r: bigint, s: bigint, z: bigint, Q: { x: bigint; y: bigint }): boolean {
  if (r <= 0n || r >= N_CURVE || s <= 0n || s >= N_CURVE) return false;
  if (!onCurve(Q)) return false;
  const w = modInv(s, N_CURVE);
  const R = ecAdd(ecMul(mod(z * w, N_CURVE)), ecMul(mod(r * w, N_CURVE), Q));
  return !!R && mod(R.x, N_CURVE) === r;
}


export function SRILPipeline() {
  const [h0, setH0] = useState(-4.256);
  const [n0, setN0] = useState(5.824);
  const [g0, setG0] = useState(1.952);
  const [message, setMessage] = useState('MACALU BRAIN: Axiomatische Subversion');
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [maxSteps, setMaxSteps] = useState(10);
  const runRef = useRef(false);

  const runPipeline = useCallback(async () => {
    setIsRunning(true);
    runRef.current = true;
    setSteps([]);
    
    let h = h0, n = n0, g = g0;
    let prevKey = 'DEADBEEFCAFE';
    
    for (let t = 0; t < maxSteps && runRef.current; t++) {
      const sril = srilStep(h, n, g, t);
      h = sril.h; n = sril.n; g = sril.g;
      
      // Seed from SRIL state
      const seed = `${h.toFixed(12)}:${n.toFixed(12)}:${g.toFixed(12)}`;
      
      // Evolve key: K_{n+1} = SHA256(K_n | t | SRIL)
      const keyInput = `${prevKey}|${t}|${seed}`;
      const privateKeyHex = await sha256(keyInput);
      prevKey = privateKeyHex;
      
      // Hash the message
      const msgHash = await sha256(message + `|t=${t}`);
      
      // Sign with evolved key
      const sig = await ecdsaSign(privateKeyHex, msgHash, seed);
      
      // Echte ECDSA-Verifikation gegen den öffentlichen Punkt Q = dG
      const z = BigInt('0x' + msgHash.substring(0, 64));
      const r = BigInt('0x' + sig.r);
      const s = BigInt('0x' + sig.s);
      const verified = ecdsaVerify(r, s, z, sig.pub);

      
      const step: PipelineStep = {
        t, H: h, N: n, G: g,
        seed: seed.substring(0, 40) + '...',
        privateKeyHex,
        signatureR: sig.r,
        signatureS: sig.s,
        messageHash: msgHash,
        verified
      };
      
      setSteps(prev => [...prev, step]);
      await new Promise(r => setTimeout(r, 100));
    }
    
    setIsRunning(false);
    runRef.current = false;
  }, [h0, n0, g0, message, maxSteps]);

  const stop = () => { runRef.current = false; setIsRunning(false); };

  const exportCSV = useCallback(() => {
    const header = 't,H,N,G,PrivateKey,SigR,SigS,MsgHash,Verified\n';
    const rows = steps.map(s => 
      `${s.t},${s.H.toFixed(8)},${s.N.toFixed(8)},${s.G.toFixed(8)},${s.privateKeyHex},${s.signatureR},${s.signatureS},${s.messageHash},${s.verified}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sril-ecdsa-pipeline.csv'; a.click();
    URL.revokeObjectURL(url);
  }, [steps]);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">SRIL → ECDSA PIPELINE</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          End-to-End: SRIL Evolution → Key Derivation → Signierung → Verifikation
        </p>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Parameters */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">H₀</Label>
              <Input value={h0} onChange={e => setH0(Number(e.target.value))} className="h-7 text-xs" type="number" step="0.001" />
            </div>
            <div>
              <Label className="text-[10px]">N₀</Label>
              <Input value={n0} onChange={e => setN0(Number(e.target.value))} className="h-7 text-xs" type="number" step="0.001" />
            </div>
            <div>
              <Label className="text-[10px]">G₀</Label>
              <Input value={g0} onChange={e => setG0(Number(e.target.value))} className="h-7 text-xs" type="number" step="0.001" />
            </div>
            <div>
              <Label className="text-[10px]">Schritte</Label>
              <Input value={maxSteps} onChange={e => setMaxSteps(Number(e.target.value))} className="h-7 text-xs" type="number" min={1} max={100} />
            </div>
          </div>
          
          <div>
            <Label className="text-[10px]">Nachricht</Label>
            <Input value={message} onChange={e => setMessage(e.target.value)} className="h-7 text-xs" />
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!isRunning ? (
              <Button size="sm" onClick={runPipeline} className="text-xs h-7">
                <Play className="w-3 h-3 mr-1" /> Pipeline starten
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stop} className="text-xs h-7">
                <Square className="w-3 h-3 mr-1" /> Stopp
              </Button>
            )}
            {steps.length > 0 && (
              <Button size="sm" variant="outline" onClick={exportCSV} className="text-xs h-7">
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
            )}
          </div>

          {/* Pipeline Flow Diagram */}
          <div className="border border-border rounded p-2 bg-muted/10">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <Badge variant="outline" className="text-[8px]">SRIL(H,N,G)</Badge>
              <ArrowRight className="w-3 h-3" />
              <Badge variant="outline" className="text-[8px]">SHA-256</Badge>
              <ArrowRight className="w-3 h-3" />
              <Badge variant="outline" className="text-[8px]">K(t)</Badge>
              <ArrowRight className="w-3 h-3" />
              <Badge variant="outline" className="text-[8px]">ECDSA</Badge>
              <ArrowRight className="w-3 h-3" />
              <Badge variant="outline" className="text-[8px]">
                <Shield className="w-2 h-2 mr-0.5" />✓
              </Badge>
            </div>
            <div className="text-[8px] text-center text-muted-foreground mt-1 font-mono">
              K(t+1) = PRF(K(t), t, SRIL(H,N,G)) → Sign(m, K(t)) → Verify
            </div>
          </div>

          {/* Results */}
          {steps.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground font-medium">
                PIPELINE OUTPUT ({steps.length}/{maxSteps})
              </div>
              
              {/* Visualization: Key entropy over time */}
              <div className="border border-border rounded p-2">
                <svg viewBox="0 0 400 80" className="w-full">
                  {steps.map((s, i) => {
                    const x = (i / Math.max(maxSteps - 1, 1)) * 380 + 10;
                    const keyByte = parseInt(s.privateKeyHex.substring(0, 2), 16);
                    const y = 70 - (keyByte / 255) * 60;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={2} fill={s.verified ? 'hsl(120,70%,50%)' : 'hsl(0,70%,50%)'} />
                        {i > 0 && (
                          <line
                            x1={(((i - 1) / Math.max(maxSteps - 1, 1)) * 380 + 10)}
                            y1={70 - (parseInt(steps[i - 1].privateKeyHex.substring(0, 2), 16) / 255) * 60}
                            x2={x} y2={y}
                            stroke="hsl(var(--primary))" strokeWidth={0.5} opacity={0.4}
                          />
                        )}
                      </g>
                    );
                  })}
                  <text x={200} y={78} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={7}>
                    Schlüssel-Trajektorie K(t)
                  </text>
                </svg>
              </div>

              {/* Detail rows */}
              {steps.map((s, i) => (
                <div key={i} className="border border-border rounded p-2 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <Badge variant={s.verified ? 'default' : 'destructive'} className="text-[8px]">
                      t={s.t} {s.verified ? '✓ VALID' : '✗ FAIL'}
                    </Badge>
                    <span className="text-[8px] text-muted-foreground font-mono">
                      H={s.H.toFixed(3)} N={s.N.toFixed(3)} G={s.G.toFixed(3)}
                    </span>
                  </div>
                  <div className="text-[8px] font-mono text-muted-foreground truncate">
                    <Zap className="w-2 h-2 inline mr-0.5" />K: {s.privateKeyHex.substring(0, 32)}...
                  </div>
                  <div className="text-[8px] font-mono text-muted-foreground truncate">
                    R: {s.signatureR.substring(0, 24)}... S: {s.signatureS.substring(0, 24)}...
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Theory */}
          <div className="border border-border rounded p-2 bg-muted/10">
            <div className="text-[10px] font-medium text-muted-foreground mb-1">PIPELINE-FORMEL</div>
            <div className="font-mono text-[9px] space-y-0.5">
              <div className="text-primary">K(t+1) = SHA-256(K(t) | t | SRIL(H,N,G))</div>
              <div className="text-primary">σ(t) = ECDSA.Sign(K(t), H(m|t))</div>
              <div className="text-primary">∀t: Verify(σ(t), K(t)) = true</div>
              <div className="text-primary">∀t₁≠t₂: K(t₁) ≠ K(t₂) ∧ σ(t₁) ≠ σ(t₂)</div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
