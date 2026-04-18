import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ── BigInt helpers ────────────────────────────────────────────
const abs = (a: bigint) => (a < 0n ? -a : a);
function gcd(a: bigint, b: bigint): bigint { a = abs(a); b = abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function egcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}
function modInv(a: bigint, m: bigint): bigint {
  const [g, x] = egcd(((a % m) + m) % m, m);
  if (g !== 1n) throw new Error('keine Inverse');
  return ((x % m) + m) % m;
}
function modPow(b: bigint, e: bigint, m: bigint): bigint {
  let r = 1n; b = ((b % m) + m) % m;
  while (e > 0n) { if (e & 1n) r = (r * b) % m; e >>= 1n; b = (b * b) % m; }
  return r;
}
function isProbablePrime(n: bigint, k = 12): boolean {
  if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n, r = 0n;
  while ((d & 1n) === 0n) { d >>= 1n; r++; }
  WitnessLoop: for (let i = 0; i < k; i++) {
    const a = 2n + BigInt(Math.floor(Math.random() * 1e9)) % (n - 4n);
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let j = 0n; j < r - 1n; j++) {
      x = (x * x) % n;
      if (x === n - 1n) continue WitnessLoop;
    }
    return false;
  }
  return true;
}
function randPrime(bits: number): bigint {
  while (true) {
    let n = 1n;
    for (let i = 0; i < bits - 1; i++) n = (n << 1n) | (Math.random() < 0.5 ? 1n : 0n);
    n = (n << 1n) | 1n; // odd
    n |= 1n << BigInt(bits - 1); // top bit
    if (isProbablePrime(n)) return n;
  }
}

export function RSADemo() {
  const [bits, setBits] = useState(16);
  const [p, setP] = useState<bigint>(61n);
  const [q, setQ] = useState<bigint>(53n);
  const [e, setE] = useState<bigint>(17n);
  const [msg, setMsg] = useState('42');
  const [log, setLog] = useState<string[]>([]);

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  let d: bigint | null = null;
  try { d = modInv(e, phi); } catch {}

  const m = (() => { try { return BigInt(msg); } catch { return 0n; } })();
  const c = d && m < n ? modPow(m, e, n) : null;
  const decrypted = d && c !== null ? modPow(c, d, n) : null;
  const sig = d && m < n ? modPow(m, d, n) : null;
  const verified = sig !== null ? modPow(sig, e, n) : null;

  const generate = () => {
    const np = randPrime(bits);
    let nq = randPrime(bits);
    while (nq === np) nq = randPrime(bits);
    setP(np); setQ(nq);
    const newPhi = (np - 1n) * (nq - 1n);
    let ne = 65537n;
    if (ne >= newPhi || gcd(ne, newPhi) !== 1n) {
      ne = 3n;
      while (gcd(ne, newPhi) !== 1n) ne += 2n;
    }
    setE(ne);
    setLog([
      `1. Wähle Primzahlen p = ${np}, q = ${nq}`,
      `2. n = p·q = ${np * nq}`,
      `3. φ(n) = (p-1)(q-1) = ${newPhi}`,
      `4. Wähle e = ${ne} mit gcd(e, φ) = 1`,
      `5. Berechne d = e⁻¹ mod φ = ${modInv(ne, newPhi)}`,
      `→ Public Key: (n=${np * nq}, e=${ne})`,
      `→ Private Key: d=${modInv(ne, newPhi)}`,
    ]);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">RSA-DEMO</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">Schlüsselgenerierung · Verschlüsselung · Signatur</p>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <Tabs defaultValue="keygen">
            <TabsList className="grid grid-cols-3 h-7">
              <TabsTrigger value="keygen" className="text-[10px]">SCHLÜSSEL</TabsTrigger>
              <TabsTrigger value="enc" className="text-[10px]">VERSCHLÜSSELN</TabsTrigger>
              <TabsTrigger value="sig" className="text-[10px]">SIGNATUR</TabsTrigger>
            </TabsList>

            <TabsContent value="keygen" className="space-y-2 mt-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <div className="text-[10px] text-muted-foreground">Bits pro Primzahl</div>
                  <Input type="number" value={bits} onChange={ev => setBits(Math.min(32, Math.max(4, +ev.target.value)))} className="h-7 text-xs" />
                </div>
                <Button size="sm" onClick={generate} className="h-7 text-xs">Generieren</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground">p</div>
                  <Input value={p.toString()} onChange={ev => { try { setP(BigInt(ev.target.value)); } catch {} }} className="h-7 text-xs font-mono" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">q</div>
                  <Input value={q.toString()} onChange={ev => { try { setQ(BigInt(ev.target.value)); } catch {} }} className="h-7 text-xs font-mono" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">e</div>
                  <Input value={e.toString()} onChange={ev => { try { setE(BigInt(ev.target.value)); } catch {} }} className="h-7 text-xs font-mono" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">d (berechnet)</div>
                  <div className="h-7 px-2 flex items-center text-xs font-mono border border-border rounded truncate">
                    {d?.toString() ?? '—'}
                  </div>
                </div>
              </div>
              <div className="border border-border rounded p-2 font-mono text-[10px] space-y-0.5">
                <div>n = p·q = <span className="text-primary">{n.toString()}</span></div>
                <div>φ(n) = <span className="text-primary">{phi.toString()}</span></div>
                <div>gcd(e,φ) = <span className={gcd(e, phi) === 1n ? 'text-primary' : 'text-destructive'}>{gcd(e, phi).toString()}</span></div>
              </div>
              {log.length > 0 && (
                <div className="border border-border rounded p-2 font-mono text-[10px] space-y-0.5">
                  {log.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="enc" className="space-y-2 mt-2">
              <div>
                <div className="text-[10px] text-muted-foreground">Nachricht m (Zahl &lt; n = {n.toString()})</div>
                <Input value={msg} onChange={ev => setMsg(ev.target.value)} className="h-7 text-xs font-mono" />
              </div>
              <div className="border border-border rounded p-2 font-mono text-[10px] space-y-0.5">
                <div>m = <span className="text-primary">{m.toString()}</span></div>
                <div>c = m^e mod n = {m.toString()}^{e.toString()} mod {n.toString()}</div>
                <div>c = <span className="text-primary">{c?.toString() ?? '—'}</span></div>
                <div className="mt-1 pt-1 border-t border-border">m' = c^d mod n</div>
                <div>m' = <span className={decrypted === m ? 'text-primary' : 'text-destructive'}>{decrypted?.toString() ?? '—'}</span></div>
                <div className={decrypted === m ? 'text-primary' : 'text-destructive'}>
                  {decrypted === m ? '✓ Korrekt entschlüsselt' : '✗ Fehler'}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sig" className="space-y-2 mt-2">
              <div className="border border-border rounded p-2 font-mono text-[10px] space-y-0.5">
                <div>Signatur s = m^d mod n</div>
                <div>s = <span className="text-primary">{sig?.toString() ?? '—'}</span></div>
                <div className="mt-1 pt-1 border-t border-border">Verifikation: s^e mod n = m?</div>
                <div>v = <span className="text-primary">{verified?.toString() ?? '—'}</span></div>
                <div className={verified === m ? 'text-primary' : 'text-destructive'}>
                  {verified === m ? '✓ Signatur gültig' : '✗ Ungültig'}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
