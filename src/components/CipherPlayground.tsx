import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ArrowDownUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Cipher = 'caesar' | 'vigenere' | 'xor' | 'atbash' | 'rot13' | 'affine';

function caesarEncrypt(text: string, shift: number): string {
  return text.replace(/[a-zA-Z]/g, c => {
    const base = c < 'a' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26 + 26) % 26 + base);
  });
}

function vigenereEncrypt(text: string, key: string, decrypt = false): string {
  if (!key) return text;
  const k = key.toLowerCase().replace(/[^a-z]/g, '');
  if (!k) return text;
  let ki = 0;
  return text.replace(/[a-zA-Z]/g, c => {
    const base = c < 'a' ? 65 : 97;
    const shift = k.charCodeAt(ki % k.length) - 97;
    ki++;
    const dir = decrypt ? -shift : shift;
    return String.fromCharCode(((c.charCodeAt(0) - base + dir) % 26 + 26) % 26 + base);
  });
}

function xorCipher(text: string, key: string): string {
  if (!key) return text;
  return Array.from(text).map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
  ).join('');
}

function atbash(text: string): string {
  return text.replace(/[a-zA-Z]/g, c => {
    const base = c < 'a' ? 65 : 97;
    return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
  });
}

function affineEncrypt(text: string, a: number, b: number): string {
  return text.replace(/[a-zA-Z]/g, c => {
    const base = c < 'a' ? 65 : 97;
    const x = c.charCodeAt(0) - base;
    return String.fromCharCode(((a * x + b) % 26 + 26) % 26 + base);
  });
}

function frequencyAnalysis(text: string): { char: string; count: number; pct: number }[] {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const c of text.toLowerCase()) {
    if (c >= 'a' && c <= 'z') {
      counts[c] = (counts[c] || 0) + 1;
      total++;
    }
  }
  return Object.entries(counts)
    .map(([char, count]) => ({ char, count, pct: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

function ic(text: string): number {
  const freq: Record<string, number> = {};
  let n = 0;
  for (const c of text.toLowerCase()) {
    if (c >= 'a' && c <= 'z') { freq[c] = (freq[c] || 0) + 1; n++; }
  }
  if (n < 2) return 0;
  let sum = 0;
  for (const f of Object.values(freq)) sum += f * (f - 1);
  return sum / (n * (n - 1));
}

const CIPHERS: { id: Cipher; name: string; desc: string }[] = [
  { id: 'caesar', name: 'Caesar', desc: 'Verschiebechiffre (Shift)' },
  { id: 'rot13', name: 'ROT13', desc: 'Caesar mit k=13 (selbstinvers)' },
  { id: 'vigenere', name: 'Vigenère', desc: 'Polyalphabetische Substitution' },
  { id: 'atbash', name: 'Atbash', desc: 'Umkehralphabet (selbstinvers)' },
  { id: 'xor', name: 'XOR', desc: 'Bitweise Exklusiv-Oder Verknüpfung' },
  { id: 'affine', name: 'Affin', desc: 'E(x) = (ax + b) mod 26' },
];

export function CipherPlayground() {
  const [cipher, setCipher] = useState<Cipher>('caesar');
  const [input, setInput] = useState('Die Mathematik ist die Königin der Wissenschaften');
  const [key, setKey] = useState('NEXUS');
  const [shift, setShift] = useState(3);
  const [affineA, setAffineA] = useState(5);
  const [affineB, setAffineB] = useState(8);
  const [direction, setDirection] = useState<'encrypt' | 'decrypt'>('encrypt');
  const { toast } = useToast();

  const output = useMemo(() => {
    const decrypt = direction === 'decrypt';
    switch (cipher) {
      case 'caesar': return caesarEncrypt(input, decrypt ? -shift : shift);
      case 'rot13': return caesarEncrypt(input, 13);
      case 'vigenere': return vigenereEncrypt(input, key, decrypt);
      case 'atbash': return atbash(input);
      case 'xor': return xorCipher(input, key);
      case 'affine': return affineEncrypt(input, affineA, affineB);
      default: return input;
    }
  }, [cipher, input, key, shift, affineA, affineB, direction]);

  const freq = useMemo(() => frequencyAnalysis(output), [output]);
  const icValue = useMemo(() => ic(output), [output]);

  const maxBar = Math.max(...freq.map(f => f.pct), 1);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">CIPHER PLAYGROUND</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Klassische Chiffren • Frequenzanalyse • Koinzidenzindex
        </p>
      </header>

      <div className="p-4 border-b border-border">
        <div className="flex flex-wrap gap-1">
          {CIPHERS.map(c => (
            <Button
              key={c.id}
              variant={cipher === c.id ? 'default' : 'outline'}
              size="sm"
              className="text-[10px] h-6 px-2"
              onClick={() => setCipher(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Key inputs */}
          <div className="flex gap-2 items-end flex-wrap">
            {(cipher === 'caesar') && (
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Verschiebung</label>
                <Input
                  type="number"
                  value={shift}
                  onChange={e => setShift(parseInt(e.target.value) || 0)}
                  className="w-20 h-7 text-xs"
                  min={0}
                  max={25}
                />
              </div>
            )}
            {(cipher === 'vigenere' || cipher === 'xor') && (
              <div className="space-y-1 flex-1">
                <label className="text-[10px] text-muted-foreground">Schlüssel</label>
                <Input
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="Schlüsselwort..."
                />
              </div>
            )}
            {cipher === 'affine' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">a (gcd(a,26)=1)</label>
                  <Input type="number" value={affineA} onChange={e => setAffineA(parseInt(e.target.value) || 1)} className="w-16 h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">b</label>
                  <Input type="number" value={affineB} onChange={e => setAffineB(parseInt(e.target.value) || 0)} className="w-16 h-7 text-xs" />
                </div>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => setDirection(d => d === 'encrypt' ? 'decrypt' : 'encrypt')}
            >
              <ArrowDownUp className="w-3 h-3 mr-1" />
              {direction === 'encrypt' ? 'Verschlüsseln' : 'Entschlüsseln'}
            </Button>
          </div>

          {/* Input */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Klartext</label>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              className="text-xs min-h-[60px] font-mono resize-none"
              rows={3}
            />
          </div>

          {/* Output */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">Chiffretext</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1"
                onClick={() => { navigator.clipboard.writeText(output); toast({ title: 'Kopiert' }); }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="bg-muted/30 rounded p-3 font-mono text-xs break-all min-h-[60px]">
              {output}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px]">IC = {icValue.toFixed(4)}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {icValue > 0.06 ? '→ monoalphabetisch' : icValue > 0.04 ? '→ polyalphabetisch' : '→ nahezu zufällig'}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{output.length} Zeichen</Badge>
          </div>

          {/* Frequency chart */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Frequenzanalyse (Chiffretext)</span>
            <div className="flex gap-px items-end h-20">
              {freq.slice(0, 26).map(f => (
                <div key={f.char} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-primary/60 rounded-t"
                    style={{ height: `${(f.pct / maxBar) * 60}px` }}
                    title={`${f.char}: ${f.pct.toFixed(1)}%`}
                  />
                  <span className="text-[8px] text-muted-foreground">{f.char}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/30 rounded p-2 text-[10px] text-muted-foreground">
            <p className="font-medium text-foreground mb-1">{CIPHERS.find(c => c.id === cipher)?.name}</p>
            <p>{CIPHERS.find(c => c.id === cipher)?.desc}</p>
            {cipher === 'caesar' && <p className="mt-1">E(x) = (x + {shift}) mod 26 | D(x) = (x - {shift}) mod 26</p>}
            {cipher === 'vigenere' && <p className="mt-1">Schlüssellänge: {key.replace(/[^a-zA-Z]/g, '').length} | Wiederholung über gesamten Text</p>}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
