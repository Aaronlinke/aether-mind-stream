import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// SHA-256 Initial Hash Values (H0-H7)
const H_INIT = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];

// SHA-256 Round Constants (first 8 for display)
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5
];

const REGISTER_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];

function toBin32(n: number): string {
  return (n >>> 0).toString(2).padStart(32, "0");
}

function toHex8(n: number): string {
  return (n >>> 0).toString(16).padStart(8, "0");
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function sigma0(x: number): number {
  return (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
}

function sigma1(x: number): number {
  return (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
}

function ch(e: number, f: number, g: number): number {
  return ((e & f) ^ (~e & g)) >>> 0;
}

function maj(a: number, b: number, c: number): number {
  return ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
}

function add32(...nums: number[]): number {
  return nums.reduce((a, b) => (a + b) >>> 0, 0);
}

interface RoundState {
  registers: number[];
  t1: number;
  t2: number;
  sigma0_val: number;
  sigma1_val: number;
  ch_val: number;
  maj_val: number;
  rotations: {
    e6: number; e11: number; e25: number;
    a2: number; a13: number; a22: number;
  };
}

export function SHA256Analyzer() {
  const [round, setRound] = useState(0);
  const [w0, setW0] = useState("80000000");
  const [state, setState] = useState<RoundState | null>(null);
  const [registers, setRegisters] = useState<number[]>([...H_INIT]);

  const calculate = () => {
    const [a, b, c, d, e, f, g, h] = registers;
    const wVal = parseInt(w0, 16) >>> 0;
    const kVal = K[round % 8];

    const e6 = rotr(e, 6);
    const e11 = rotr(e, 11);
    const e25 = rotr(e, 25);
    const sig1 = sigma1(e);
    const chVal = ch(e, f, g);

    const a2 = rotr(a, 2);
    const a13 = rotr(a, 13);
    const a22 = rotr(a, 22);
    const sig0 = sigma0(a);
    const majVal = maj(a, b, c);

    const t1 = add32(h, sig1, chVal, kVal, wVal);
    const t2 = add32(sig0, majVal);

    const newRegisters = [
      add32(t1, t2), // A neu
      a,              // B neu
      b,              // C neu
      c,              // D neu
      add32(d, t1),   // E neu
      e,              // F neu
      f,              // G neu
      g               // H neu
    ];

    setState({
      registers: [...registers],
      t1, t2,
      sigma0_val: sig0,
      sigma1_val: sig1,
      ch_val: chVal,
      maj_val: majVal,
      rotations: { e6, e11, e25, a2, a13, a22 }
    });

    setRegisters(newRegisters);
    setRound(r => r + 1);
  };

  const reset = () => {
    setRegisters([...H_INIT]);
    setRound(0);
    setState(null);
  };

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">SHA-256 ANALYZER</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Runde {round} • Bit-Rotationen • Σ-Funktionen • T1/T2 Berechnung
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Controls */}
        <div className="flex gap-2 items-center">
          <Input
            value={w0}
            onChange={(e) => setW0(e.target.value)}
            placeholder="W (Hex)"
            className="w-32 font-mono text-xs"
          />
          <Button size="sm" onClick={calculate}>Runde berechnen</Button>
          <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
        </div>

        {/* Register State */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground font-medium">REGISTER (Aktuell)</div>
          <div className="grid gap-1 text-xs font-mono">
            {registers.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 text-muted-foreground">{REGISTER_NAMES[i]}</span>
                <span className="text-primary">{toHex8(val)}</span>
                <span className="text-muted-foreground text-[10px] tracking-wider">
                  {toBin32(val).match(/.{4}/g)?.join(" ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Round Details */}
        {state && (
          <>
            <div className="border-t border-border pt-4 space-y-3">
              <div className="text-xs text-muted-foreground font-medium">T1 BERECHNUNG (E-Komplex)</div>
              
              <div className="grid gap-1 text-xs font-mono">
                <div className="flex gap-2">
                  <span className="w-16 text-muted-foreground">E(rot 6)</span>
                  <span>{toHex8(state.rotations.e6)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 text-muted-foreground">E(rot 11)</span>
                  <span>{toHex8(state.rotations.e11)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 text-muted-foreground">E(rot 25)</span>
                  <span>{toHex8(state.rotations.e25)}</span>
                </div>
                <div className="flex gap-2 text-primary">
                  <span className="w-16">Σ1(E)</span>
                  <span>{toHex8(state.sigma1_val)}</span>
                </div>
                <div className="flex gap-2 text-primary">
                  <span className="w-16">Ch(E,F,G)</span>
                  <span>{toHex8(state.ch_val)}</span>
                </div>
                <div className="flex gap-2 border-t border-border pt-1 text-primary font-bold">
                  <span className="w-16">T1</span>
                  <span>{toHex8(state.t1)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground font-medium">T2 BERECHNUNG (A-Komplex)</div>
              
              <div className="grid gap-1 text-xs font-mono">
                <div className="flex gap-2">
                  <span className="w-16 text-muted-foreground">A(rot 2)</span>
                  <span>{toHex8(state.rotations.a2)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 text-muted-foreground">A(rot 13)</span>
                  <span>{toHex8(state.rotations.a13)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 text-muted-foreground">A(rot 22)</span>
                  <span>{toHex8(state.rotations.a22)}</span>
                </div>
                <div className="flex gap-2 text-primary">
                  <span className="w-16">Σ0(A)</span>
                  <span>{toHex8(state.sigma0_val)}</span>
                </div>
                <div className="flex gap-2 text-primary">
                  <span className="w-16">Maj(A,B,C)</span>
                  <span>{toHex8(state.maj_val)}</span>
                </div>
                <div className="flex gap-2 border-t border-border pt-1 text-primary font-bold">
                  <span className="w-16">T2</span>
                  <span>{toHex8(state.t2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground font-medium">NEUE REGISTER (nach Runde {round})</div>
              <div className="grid gap-1 text-xs font-mono">
                <div className="flex gap-2 text-primary font-bold">
                  <span className="w-16">A (neu)</span>
                  <span>T1 + T2 = {toHex8(add32(state.t1, state.t2))}</span>
                </div>
                <div className="flex gap-2 text-primary font-bold">
                  <span className="w-16">E (neu)</span>
                  <span>D + T1 = {toHex8(add32(state.registers[3], state.t1))}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Constants Reference */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="text-xs text-muted-foreground font-medium">KONSTANTEN</div>
          <div className="grid grid-cols-2 gap-1 text-xs font-mono">
            {K.slice(0, 8).map((k, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground">K[{i}]</span>
                <span>{toHex8(k)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
