import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatSci(n: number): string {
  if (Math.abs(n) < 1e-10) return "0";
  if (Math.abs(n) > 1e10 || Math.abs(n) < 0.001) {
    return n.toExponential(4);
  }
  return n.toFixed(6);
}

function cubeRoot(x: number): number {
  return x < 0 ? -Math.pow(-x, 1/3) : Math.pow(x, 1/3);
}

export function LatticeAnalyzer() {
  const [h, setH] = useState("-3.340");
  const [n, setN] = useState("3.360");
  const [g, setG] = useState("1.780");
  const [basis, setBasis] = useState("66");
  const [result, setResult] = useState<{
    matrix: number[][];
    product: number;
    cubeRoot: number;
    kValue: bigint;
    hexResult: string;
  } | null>(null);

  const calculate = () => {
    const hVal = parseFloat(h);
    const nVal = parseFloat(n);
    const gVal = parseFloat(g);
    const basisVal = parseInt(basis);
    const modulus = 1.1579e77;
    const scale = Math.pow(2, basisVal);

    // Build lattice matrix
    const matrix = [
      [1, 0, hVal],
      [0, 1, nVal],
      [gVal / scale, nVal / scale, modulus]
    ];

    // Calculate product and cube root
    const product = Math.abs(hVal * nVal * gVal);
    const cr = cubeRoot(product);

    // Calculate K value
    const kFloat = cr * scale;
    const kBigInt = BigInt(Math.floor(kFloat));

    // Convert to hex
    const hexResult = kBigInt.toString(16).toUpperCase();

    setResult({
      matrix,
      product,
      cubeRoot: cr,
      kValue: kBigInt,
      hexResult
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">LATTICE ANALYZER</h1>
        <p className="text-xs text-muted-foreground mt-1">
          LLL-Reduktion • Gitter-Matrix • Kürzester Vektor (SVP)
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Input Parameters */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">H (Enthalpie)</label>
            <Input value={h} onChange={(e) => setH(e.target.value)} className="font-mono text-xs" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">N (Nonce)</label>
            <Input value={n} onChange={(e) => setN(e.target.value)} className="font-mono text-xs" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">G (Generator)</label>
            <Input value={g} onChange={(e) => setG(e.target.value)} className="font-mono text-xs" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Basis (2^n)</label>
            <Input value={basis} onChange={(e) => setBasis(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>

        <Button size="sm" onClick={calculate}>Matrix berechnen</Button>

        {result && (
          <>
            {/* Matrix Display */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">GITTER-MATRIX L</div>
              <div className="font-mono text-xs bg-muted p-3 rounded">
                <div className="grid gap-1">
                  {result.matrix.map((row, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-muted-foreground">|</span>
                      {row.map((val, j) => (
                        <span key={j} className="w-24 text-right">{formatSci(val)}</span>
                      ))}
                      <span className="text-muted-foreground">|</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">BERECHNUNGEN</div>
              <div className="font-mono text-xs space-y-1">
                <div>|H × N × G| = {formatSci(result.product)}</div>
                <div>∛({formatSci(result.product)}) = {result.cubeRoot.toFixed(6)}</div>
                <div className="text-muted-foreground text-[10px]">
                  (Vergleich: e ≈ 2.71828...)
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="text-xs text-muted-foreground font-medium">ERGEBNIS (K = ∛(H·N·G) × 2^{basis})</div>
              <div className="font-mono text-sm">
                <div className="text-primary font-bold break-all">
                  0x{result.hexResult.slice(0, 16)}...
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Vollständig: {result.hexResult.length} Hex-Zeichen
                </div>
              </div>
            </div>

            {/* Binary Grid Preview */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">BINÄR-MUSTER (erste 64 Bits)</div>
              <div className="font-mono text-[10px] tracking-wider bg-muted p-2 rounded break-all">
                {result.kValue.toString(2).slice(0, 64).match(/.{8}/g)?.join(" ")}
              </div>
            </div>
          </>
        )}

        {/* Theory Reference */}
        <div className="border-t border-border pt-4 space-y-2 text-xs text-muted-foreground">
          <div className="font-medium">THEORIE</div>
          <div className="space-y-1">
            <div>• LLL-Reduktion: Basis-Vektoren orthogonalisieren</div>
            <div>• SVP: Kürzester Vektor im Gitter finden</div>
            <div>• Gauß-Reduktion: Zeilen subtrahieren bis minimal</div>
          </div>
        </div>
      </div>
    </div>
  );
}
