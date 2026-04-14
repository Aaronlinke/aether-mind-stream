import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shuffle, RotateCcw } from 'lucide-react';

type Matrix = number[][];

function det(m: Matrix): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let d = 0;
  for (let j = 0; j < n; j++) {
    const sub = m.slice(1).map(row => [...row.slice(0, j), ...row.slice(j + 1)]);
    d += (j % 2 === 0 ? 1 : -1) * m[0][j] * det(sub);
  }
  return d;
}

function transpose(m: Matrix): Matrix {
  return m[0].map((_, i) => m.map(row => row[i]));
}

function multiply(a: Matrix, b: Matrix): Matrix {
  const n = a.length, p = b[0].length, k = b.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: p }, (_, j) =>
      Array.from({ length: k }, (_, l) => a[i][l] * b[l][j]).reduce((s, v) => s + v, 0)
    )
  );
}

function inverse2x2(m: Matrix): Matrix | null {
  const d = det(m);
  if (Math.abs(d) < 1e-10) return null;
  return [
    [m[1][1] / d, -m[0][1] / d],
    [-m[1][0] / d, m[0][0] / d],
  ];
}

function inverse3x3(m: Matrix): Matrix | null {
  const d = det(m);
  if (Math.abs(d) < 1e-10) return null;
  const cofactor = (r: number, c: number) => {
    const sub = m.filter((_, i) => i !== r).map(row => row.filter((_, j) => j !== c));
    return ((r + c) % 2 === 0 ? 1 : -1) * det(sub);
  };
  const adj = transpose(Array.from({ length: 3 }, (_, i) =>
    Array.from({ length: 3 }, (_, j) => cofactor(i, j))
  ));
  return adj.map(row => row.map(v => v / d));
}

function trace(m: Matrix): number {
  return m.reduce((s, row, i) => s + row[i], 0);
}

function eigenvalues2x2(m: Matrix): string[] {
  const t = trace(m);
  const d = det(m);
  const disc = t * t - 4 * d;
  if (disc >= 0) {
    return [
      ((t + Math.sqrt(disc)) / 2).toFixed(4),
      ((t - Math.sqrt(disc)) / 2).toFixed(4),
    ];
  }
  const re = (t / 2).toFixed(4);
  const im = (Math.sqrt(-disc) / 2).toFixed(4);
  return [`${re} + ${im}i`, `${re} - ${im}i`];
}

function randomMatrix(n: number): Matrix {
  return Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 19) - 9)
  );
}

function formatNum(v: number): string {
  return Number.isInteger(v) ? v.toString() : v.toFixed(4);
}

function MatrixDisplay({ m, label }: { m: Matrix; label: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="font-mono text-xs bg-muted/30 rounded p-2 inline-block">
        {m.map((row, i) => (
          <div key={i} className="flex gap-3">
            {row.map((v, j) => (
              <span key={j} className="w-12 text-right">{formatNum(v)}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatrixLab() {
  const [dim, setDim] = useState(3);
  const [matA, setMatA] = useState<Matrix>(() => randomMatrix(3));
  const [matB, setMatB] = useState<Matrix>(() => randomMatrix(3));

  const updateCell = (which: 'A' | 'B', r: number, c: number, val: string) => {
    const setter = which === 'A' ? setMatA : setMatB;
    setter(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = parseFloat(val) || 0;
      return next;
    });
  };

  const changeDim = (n: number) => {
    setDim(n);
    setMatA(randomMatrix(n));
    setMatB(randomMatrix(n));
  };

  const detA = useMemo(() => det(matA), [matA]);
  const detB = useMemo(() => det(matB), [matB]);
  const product = useMemo(() => multiply(matA, matB), [matA, matB]);
  const transA = useMemo(() => transpose(matA), [matA]);
  const invA = useMemo(() => {
    if (dim === 2) return inverse2x2(matA);
    if (dim === 3) return inverse3x3(matA);
    return null;
  }, [matA, dim]);
  const eigenA = useMemo(() => dim === 2 ? eigenvalues2x2(matA) : null, [matA, dim]);

  const MatrixInput = ({ mat, label, which }: { mat: Matrix; label: string; which: 'A' | 'B' }) => (
    <div className="space-y-1">
      <span className="text-xs font-medium">{label}</span>
      <div className="space-y-1">
        {mat.map((row, r) => (
          <div key={r} className="flex gap-1">
            {row.map((v, c) => (
              <Input
                key={c}
                value={v}
                onChange={e => updateCell(which, r, c, e.target.value)}
                className="w-14 h-7 text-xs text-center p-0 font-mono"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">MATRIX LAB</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Determinante • Inverse • Eigenwerte • Multiplikation
        </p>
      </header>

      <div className="p-4 border-b border-border flex items-center gap-2">
        {[2, 3, 4].map(n => (
          <Button
            key={n}
            variant={dim === n ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7"
            onClick={() => changeDim(n)}
          >
            {n}×{n}
          </Button>
        ))}
        <Button variant="outline" size="sm" className="text-xs h-7 ml-auto" onClick={() => { setMatA(randomMatrix(dim)); setMatB(randomMatrix(dim)); }}>
          <Shuffle className="w-3 h-3 mr-1" /> Zufall
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setMatA(Array.from({ length: dim }, (_, i) => Array.from({ length: dim }, (_, j) => i === j ? 1 : 0))); }}>
          <RotateCcw className="w-3 h-3 mr-1" /> I
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="flex gap-6 flex-wrap">
            <MatrixInput mat={matA} label="Matrix A" which="A" />
            <MatrixInput mat={matB} label="Matrix B" which="B" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px]">det(A) = {formatNum(detA)}</Badge>
            <Badge variant="outline" className="text-[10px]">det(B) = {formatNum(detB)}</Badge>
            <Badge variant="outline" className="text-[10px]">tr(A) = {formatNum(trace(matA))}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {Math.abs(detA) < 1e-10 ? 'A singulär' : 'A invertierbar'}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MatrixDisplay m={product} label="A × B" />
            <MatrixDisplay m={transA} label="Aᵀ (Transponierte)" />
            {invA && <MatrixDisplay m={invA} label="A⁻¹ (Inverse)" />}
          </div>

          {eigenA && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Eigenwerte von A (2×2)</span>
              <div className="flex gap-2">
                {eigenA.map((e, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">λ{i + 1} = {e}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted/30 rounded p-3 text-xs space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground text-[10px]">Eigenschaften:</p>
            <p>• det(A×B) = det(A)·det(B) = {formatNum(detA * detB)} ≈ {formatNum(det(product))}</p>
            <p>• det(Aᵀ) = det(A) = {formatNum(detA)}</p>
            {invA && <p>• A·A⁻¹ = I ✓</p>}
            <p>• Rang(A) {Math.abs(detA) < 1e-10 ? `< ${dim} (defizient)` : `= ${dim} (voller Rang)`}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
