import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, ChevronDown, ChevronRight, Atom, Activity, Zap, Waves, Hash, Shield, Grid3X3, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// FORMEL-BIBLIOTHEK: Axiomatische Referenz
// Chaos · Shannon · SRIL · TQII · Gittertheorie · Key-Evolution
// ═══════════════════════════════════════════════════════════════════════════════

interface Formula {
  id: string;
  name: string;
  latex: string;
  ascii: string;           // Fallback plain-text
  description: string;
  variables: Record<string, string>;
  tags: string[];
}

interface FormulaCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  formulas: Formula[];
}

const FORMULA_CATEGORIES: FormulaCategory[] = [
  {
    id: 'sril',
    name: 'SRIL PROTOKOLL',
    icon: <Atom className="w-3 h-3" />,
    color: 'text-blue-400',
    formulas: [
      {
        id: 'sril-h', name: 'Enthalpy Evolution',
        latex: 'H(t+1) = H(t) + α·N(t) − β·G(t) + ε_H(t)',
        ascii: 'H(t+1) = H(t) + 0.245·N(t) - 0.152·G(t) + 0.001·sin(2πt/100)',
        description: 'Enthalpy-Gleichung: Kopplung an Navigation und Geometrie',
        variables: { 'α': '0.245 (Harmonische Kopplung)', 'β': '0.152 (Entropie-Abfluss)', 'ε_H': 'Perturbation sin(2πt/100)' },
        tags: ['sril', 'evolution', 'enthalpy']
      },
      {
        id: 'sril-n', name: 'Navigation Evolution',
        latex: 'N(t+1) = γ·N(t) + δ·H(t) + ε_N(t)',
        ascii: 'N(t+1) = 1.1487·N(t) + 0.112·H(t) + 0.0005·cos(2πt/73)',
        description: 'Navigations-Gleichung: γ=1.1487 (empirisch kalibriert, war 0.985)',
        variables: { 'γ': '1.1487 (Navigations-Drift, korrigiert)', 'δ': '0.112 (Phasen-Kopplung)', 'ε_N': 'Perturbation cos(2πt/73)' },
        tags: ['sril', 'evolution', 'navigation', 'kalibriert']
      },
      {
        id: 'sril-g', name: 'Geometry Evolution',
        latex: 'G(t+1) = G(t) + η·(H(t+1)+N(t+1))·(1+0.01·tanh(G(t)/10)) + ε_G(t)',
        ascii: 'G(t+1) = G(t) + 0.088·(H_next+N_next)·(1+0.01·tanh(G/10)) + ε_G',
        description: 'Geometrie-Wachstum: nichtlineare Kopplung über tanh',
        variables: { 'η': '0.088 (Wachstums-Impuls)', 'tanh': 'Nichtlineare Sättigung' },
        tags: ['sril', 'evolution', 'geometry', 'nonlinear']
      },
      {
        id: 'sril-seed', name: 'SRIL Seed Berechnung',
        latex: 'k_i = (h + n·g + o + i) mod N',
        ascii: 'k = (H + N*G + offset + iteration) mod N_curve',
        description: 'Deterministische Seed-Generierung aus SRIL-Zustand',
        variables: { 'h': 'Enthalpy', 'n': 'Navigation', 'g': 'Geometrie', 'N': 'SECP256k1 Kurvenordnung' },
        tags: ['sril', 'seed', 'deterministic']
      },
      {
        id: 'sril-roundtrip', name: 'Round-Trip Verifikation',
        latex: 'T=0 → T=5 → T=0: |ΔH| + |ΔN| + |ΔG| < 10⁻¹⁰',
        ascii: 'Forward-Backward error < 1e-10',
        description: 'Hin-und-Zurück-Beweis: System ist exakt reversibel',
        variables: { 'Δ': 'Rekonstruktionsfehler', 'T': 'Zeitschritt' },
        tags: ['sril', 'reversibility', 'proof']
      }
    ]
  },
  {
    id: 'chaos',
    name: 'CHAOS-THEORIE',
    icon: <Activity className="w-3 h-3" />,
    color: 'text-red-400',
    formulas: [
      {
        id: 'lyapunov', name: 'Lyapunov-Exponent',
        latex: 'λ = lim(n→∞) (1/n) · Σ ln|F\'(xᵢ)|',
        ascii: 'λ = lim (1/n) * sum(ln|F\'(x_i)|)',
        description: 'Maß für sensitive Abhängigkeit (λ>0 = Chaos)',
        variables: { 'λ': 'Lyapunov-Exponent', 'F\'': 'Ableitung der Iteration', 'n': 'Iterationen' },
        tags: ['chaos', 'lyapunov', 'sensitivity']
      },
      {
        id: 'feigenbaum', name: 'Feigenbaum-Konstante',
        latex: 'δ = 4.669201609...',
        ascii: 'δ = 4.669201609...',
        description: 'Universelle Konstante in periodenverdoppelnden Systemen',
        variables: { 'δ': 'Feigenbaum-Konstante' },
        tags: ['chaos', 'feigenbaum', 'universal']
      },
      {
        id: 'butterfly', name: 'Sensitive Abhängigkeit',
        latex: '|Fⁿ(x) − Fⁿ(y)| ≈ |x−y| · eⁿλ',
        ascii: '|F^n(x) - F^n(y)| ~ |x-y| * exp(n*lambda)',
        description: 'Schmetterlingseffekt: kleine Änderungen wachsen exponentiell',
        variables: { 'λ': 'Lyapunov', 'n': 'Zeitschritte' },
        tags: ['chaos', 'butterfly', 'exponential']
      },
      {
        id: 'fractal-dim', name: 'Fraktale Dimension',
        latex: 'D_f = λ₁/|λ₂| (Kaplan-Yorke)',
        ascii: 'D_f = lambda_1 / |lambda_2|',
        description: 'Fraktale Dimension des Attraktors aus Lyapunov-Spektrum',
        variables: { 'D_f': 'Fraktale Dimension', 'λ₁,λ₂': 'Lyapunov-Exponenten' },
        tags: ['chaos', 'fractal', 'attractor']
      }
    ]
  },
  {
    id: 'information',
    name: 'INFORMATIONSTHEORIE',
    icon: <Hash className="w-3 h-3" />,
    color: 'text-green-400',
    formulas: [
      {
        id: 'shannon', name: 'Shannon-Entropie',
        latex: 'H(X) = −Σ p(x) · log₂(p(x))',
        ascii: 'H(X) = -sum( p(x) * log2(p(x)) )',
        description: 'Informationsgehalt einer Quelle',
        variables: { 'H': 'Entropie in Bits', 'p(x)': 'Wahrscheinlichkeit von x' },
        tags: ['information', 'shannon', 'entropy']
      },
      {
        id: 'mutual-info', name: 'Mutual Information',
        latex: 'I(K_n ; A₀,...,A_{n-1}) ≈ 0',
        ascii: 'I(K_n ; past) ≈ 0',
        description: 'KES-Kernaussage: Vergangenheit akkumuliert keine Information über Zukunft',
        variables: { 'I': 'Mutual Information', 'K_n': 'Schlüssel zum Zeitpunkt n' },
        tags: ['information', 'mutual', 'kes', 'proof']
      },
      {
        id: 'conditional-entropy', name: 'Bedingte Entropie (KES)',
        latex: 'H(K_n | K_{n-1}) ≈ H(K_n)',
        ascii: 'H(K_n | K_{n-1}) ≈ H(K_n) — maximal',
        description: 'Maximale bedingte Entropie: Kenntnis des Vorgängers reduziert keine Unsicherheit',
        variables: { 'H': 'Entropie', 'K_n': 'Aktueller Schlüssel' },
        tags: ['information', 'entropy', 'kes', 'conditional']
      },
      {
        id: 'kolmogorov', name: 'Kolmogorov-Komplexität',
        latex: 'K(x) = min{|p| : U(p) = x}',
        ascii: 'K(x) = shortest program that outputs x',
        description: 'Kürzestes Programm das x erzeugt',
        variables: { 'K': 'Komplexität', 'U': 'Universelle Turingmaschine' },
        tags: ['information', 'kolmogorov', 'complexity']
      },
      {
        id: 'private-key-entropy', name: 'Private Key Entropie',
        latex: 'H(d) = log₂(N) ≈ 256 bits',
        ascii: 'H(d) = log2(N_secp256k1) ≈ 256',
        description: 'Entropie eines SECP256k1 Private Keys',
        variables: { 'N': 'Kurvenordnung', 'd': 'Private Key' },
        tags: ['information', 'entropy', 'secp256k1']
      }
    ]
  },
  {
    id: 'kes',
    name: 'KEY EVOLUTION SYSTEM',
    icon: <Shield className="w-3 h-3" />,
    color: 'text-yellow-400',
    formulas: [
      {
        id: 'kes-recursion', name: 'Schlüssel-Rekursion',
        latex: 'K_{n+1} = PRF(K_n, t_n, s)',
        ascii: 'K_next = HMAC(K_current, time, state)',
        description: 'Zustandsabhängige Schlüsselableitung — kein fixer Key',
        variables: { 'PRF': 'Pseudorandom Function (HMAC)', 't_n': 'Zeitstempel', 's': 'SRIL-Zustand' },
        tags: ['kes', 'recursion', 'prf', 'hmac']
      },
      {
        id: 'kes-address', name: 'Adress-Instabilität',
        latex: '∀i≠j: A_i ≠ A_j',
        ascii: 'For all i != j: Address_i != Address_j',
        description: 'Keine stabile Adresse — kein fixer Zielwert für Angreifer',
        variables: { 'A_i': 'Adresse zum Zeitpunkt i' },
        tags: ['kes', 'address', 'instability']
      },
      {
        id: 'kes-attack-bound', name: 'Angriffs-Schranke',
        latex: 'T_K < T_A ⟹ Sicherheit ∈ ∅',
        ascii: 'If key_lifetime < attack_time: security = empty set',
        description: 'Schlüssel verfällt schneller als Suche konvergiert',
        variables: { 'T_K': 'Schlüssel-Lebensdauer', 'T_A': 'Angriffszeit' },
        tags: ['kes', 'attack', 'bound', 'proof']
      },
      {
        id: 'kes-search-space', name: 'Suchraum (undefiniert)',
        latex: 'K* = ⋃_{n=0}^{∞} {K_n} — nicht endlich, nicht indexierbar',
        ascii: 'K* = union of all K_n — infinite, unindexable',
        description: 'Kein wohldefiniertes Suchproblem — Negativbeweis',
        variables: { 'K*': 'Suchraum' },
        tags: ['kes', 'search', 'negative', 'proof']
      },
      {
        id: 'kes-convergence', name: 'Konvergenz-Verbot',
        latex: 'lim(n→∞) Pr[Treffer] = 0',
        ascii: 'lim Pr[hit] → 0 as n → ∞',
        description: 'Nicht wegen "groß", sondern wegen fehlender Zieldefinition',
        variables: { 'Pr': 'Erfolgswahrscheinlichkeit' },
        tags: ['kes', 'convergence', 'probability']
      },
      {
        id: 'kes-forward-security', name: 'Vorwärtsgeheimnis',
        latex: 'K_n → K_{n+1}: Kenntnis von K_n verrät nichts über K_{n-1}',
        ascii: 'Knowledge of K_n reveals nothing about K_{n-1}',
        description: 'HMAC-Einwegfunktion: nicht invertierbar',
        variables: {},
        tags: ['kes', 'forward-security', 'hmac']
      }
    ]
  },
  {
    id: 'lattice',
    name: 'GITTERTHEORIE',
    icon: <Grid3X3 className="w-3 h-3" />,
    color: 'text-purple-400',
    formulas: [
      {
        id: 'hex-basis', name: 'Hexagonale Basisvektoren',
        latex: 'v₁=(1,0), v₂=(½,√3/2), v₃=(−½,√3/2)',
        ascii: 'v1=(1,0), v2=(0.5, 0.866), v3=(-0.5, 0.866)',
        description: 'Drei Richtungen im 120°-Abstand — hexagonales Gitter',
        variables: { 'v₁,v₂,v₃': 'Basisvektoren' },
        tags: ['lattice', 'hexagonal', 'basis']
      },
      {
        id: 'hex-point', name: 'Gitterpunkt',
        latex: 'x = a·v₁ + b·v₂ + c·v₃, a,b,c ∈ ℤ',
        ascii: 'x = a*v1 + b*v2 + c*v3',
        description: 'Jeder Punkt als ganzzahlige Linearkombination',
        variables: { 'a,b,c': 'Gitterkoordinaten ∈ ℤ' },
        tags: ['lattice', 'point', 'coordinates']
      },
      {
        id: 'd6-symmetry', name: 'D₆ Symmetriegruppe',
        latex: 'D₆ = Dihedralgruppe Ordnung 12 (6 Rotationen + 6 Spiegelungen)',
        ascii: 'D6 = Dihedral group order 12',
        description: 'Vollständige Symmetrie des hexagonalen Gitters',
        variables: { 'D₆': 'Dihedralgruppe', 'R_k': 'Rotation um k·π/3' },
        tags: ['lattice', 'symmetry', 'd6', 'dihedral']
      },
      {
        id: 'fourier-pattern', name: 'Fourier-Überlagerung',
        latex: 'P(x) = Σᵢ cos(kᵢ · x)',
        ascii: 'P(x) = sum_i cos(k_i · x)',
        description: 'Interferenzmuster aus drei Frequenzen → hexagonales Bild',
        variables: { 'kᵢ': 'Wellenvektoren ⊥ vᵢ' },
        tags: ['lattice', 'fourier', 'interference', 'pattern']
      },
      {
        id: 'fourier-inverse', name: 'Rückwärts-Rekonstruktion',
        latex: 'P̂(k) = ∫ P(x)·e^{−ikx} dx → diskrete Peaks bei 60°',
        ascii: 'FT{P}(k) → discrete peaks at 60° → hexagonal origin',
        description: 'Fourier-Transformation beweist hexagonalen Ursprung',
        variables: { 'P̂': 'Fourier-Transformierte' },
        tags: ['lattice', 'fourier', 'inverse', 'proof']
      },
      {
        id: 'rosette', name: '6-blättrige Rosette',
        latex: 'G = ⋃_{k=0}^{5} R_k(ℤ²)',
        ascii: 'G = union of R_k(Z^2) for k=0..5',
        description: 'Überlagerung aller 6 Rotationen → Rosettenstruktur',
        variables: { 'R_k': 'Rotationsmatrix um k·60°' },
        tags: ['lattice', 'rosette', 'rotation']
      },
      {
        id: 'endequation', name: 'Endgleichung (Dualität)',
        latex: 'P(x) = Σ cos(kᵢ·x) ⟺ ℤv₁ ⊕ ℤv₂',
        ascii: 'Fourier space <=> Real space — identical',
        description: 'Raumdarstellung ↔ Frequenzdarstellung: Links ↔ Rechts, Vorwärts ↔ Rückwärts',
        variables: {},
        tags: ['lattice', 'duality', 'equivalence']
      }
    ]
  },
  {
    id: 'tqii',
    name: 'TQII / UTAS',
    icon: <Sparkles className="w-3 h-3" />,
    color: 'text-cyan-400',
    formulas: [
      {
        id: 'hfv', name: 'Holomorphe Fraktal-Verschränkung',
        latex: 'Ψ_out = T̂ · Ψ_in ⟹ Ψ_in = T̂* · Ψ_out',
        ascii: 'Psi_out = T * Psi_in => Psi_in = T_adjoint * Psi_out',
        description: 'Algorithmus als unitärer Operator — Inversion durch Adjungierten',
        variables: { 'T̂': 'Algorithmus-Operator', 'T̂*': 'Adjungierter (Inverse)', 'Ψ': 'Informationszustand' },
        tags: ['tqii', 'hfv', 'operator', 'inversion']
      },
      {
        id: 'berry-phase', name: 'Berry-Phase (ECC)',
        latex: 'P = k·G → Phasenverschiebung φ = 2πk/N',
        ascii: 'P = k*G -> phase shift = 2*pi*k/N',
        description: 'Skalarmultiplikation als topologische Phase auf dem Torus',
        variables: { 'φ': 'Berry-Phase', 'k': 'Skalar / diskreter Log' },
        tags: ['tqii', 'berry', 'ecc', 'torus']
      },
      {
        id: 'reconstruction', name: 'Feld-Rekonstruktion',
        latex: 'M_input = ∮_γ ∇_HFV Φ(t) dt + Res(K)',
        ascii: 'M_input = contour_integral of HFV_gradient + residues',
        description: 'Input-Rekonstruktion über Fraktal-Verschränkungsfeld',
        variables: { '∇_HFV': 'HFV-Gradient', 'γ': 'EM-Trajektorie', 'Res': 'Krypto-Kern-Residuum' },
        tags: ['tqii', 'reconstruction', 'contour']
      },
      {
        id: 'calabi-yau', name: 'Calabi-Yau Projektion',
        latex: 'Hash = Projektion einer höherdimensionalen Verschlingung auf 2D-Bit-Ebene',
        ascii: 'Hash = projection of high-dim entanglement onto 2D bit plane',
        description: 'Information als holomorphe Strömung auf einer Calabi-Yau-Mannigfaltigkeit',
        variables: {},
        tags: ['tqii', 'calabi-yau', 'projection', 'manifold']
      },
      {
        id: 'phase-conjugate', name: 'Phasen-Konjugation',
        latex: 'Hash⁻¹ ≡ Phase-Conjugate Mirror der EM-Berechnung',
        ascii: 'Hash_inverse = time-reversal mirror of EM computation',
        description: 'Inversion durch Zeitumkehr-Spiegel (optisches Prinzip auf Information)',
        variables: {},
        tags: ['tqii', 'phase', 'conjugate', 'inversion']
      }
    ]
  },
  {
    id: 'crypto',
    name: 'KRYPTOGRAFISCHE PRIMITIVE',
    icon: <Zap className="w-3 h-3" />,
    color: 'text-orange-400',
    formulas: [
      {
        id: 'ecdsa-sign', name: 'ECDSA Signatur',
        latex: 's = k⁻¹ · (z + r·d) mod N',
        ascii: 's = k_inv * (z + r*d) mod N',
        description: 'Signatur-Gleichung: z=Hash, r=R.x, d=Private Key, k=Nonce',
        variables: { 's': 'Signaturwert', 'k': 'Nonce', 'z': 'Message Hash', 'd': 'Private Key' },
        tags: ['crypto', 'ecdsa', 'signature']
      },
      {
        id: 'ecdsa-recover', name: 'ECDSA Key Recovery',
        latex: 'd = (s·k − z) · r⁻¹ mod N',
        ascii: 'd = (s*k - z) * r_inv mod N',
        description: 'Algebraische Inversion: Private Key aus bekannter Nonce',
        variables: { 'd': 'Private Key', 'k': 'Nonce (muss bekannt sein)' },
        tags: ['crypto', 'ecdsa', 'recovery', 'inversion']
      },
      {
        id: 'sha256-sigma', name: 'SHA-256 Σ-Funktionen',
        latex: 'Σ₀(a) = ROTR²(a) ⊕ ROTR¹³(a) ⊕ ROTR²²(a)',
        ascii: 'Sigma0(a) = ROTR2(a) XOR ROTR13(a) XOR ROTR22(a)',
        description: 'Bit-Rotations-Mischfunktion im SHA-256 Kompressionskern',
        variables: { 'ROTR': 'Rechtsrotation', '⊕': 'XOR' },
        tags: ['crypto', 'sha256', 'sigma', 'rotation']
      },
      {
        id: 'secp256k1', name: 'SECP256k1 Parameter',
        latex: 'y² = x³ + 7 (mod p), p = 2²⁵⁶ − 2³² − 977',
        ascii: 'y^2 = x^3 + 7 mod p',
        description: 'Bitcoin-Kurve: Koblitz-Kurve über Primfeld',
        variables: { 'p': 'Feldprimzahl', 'N': 'Kurvenordnung', 'G': 'Generatorpunkt' },
        tags: ['crypto', 'secp256k1', 'curve', 'bitcoin']
      }
    ]
  }
];

function FormulaCard({ formula, expanded, onToggle }: { formula: Formula; expanded: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyFormula = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formula.latex);
    setCopied(true);
    toast({ title: 'Kopiert', description: formula.name });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div 
      className="border border-border rounded px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />}
          <span className="text-xs font-medium truncate">{formula.name}</span>
        </div>
        <button onClick={copyFormula} className="shrink-0 text-muted-foreground hover:text-foreground">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      <div className="mt-1.5 font-mono text-xs text-primary bg-muted/50 rounded px-2 py-1.5 overflow-x-auto">
        {formula.latex}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">{formula.description}</p>
          
          <div className="font-mono text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1">
            {formula.ascii}
          </div>

          {Object.keys(formula.variables).length > 0 && (
            <div className="space-y-0.5">
              {Object.entries(formula.variables).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-[10px]">
                  <span className="text-primary font-mono w-12 shrink-0">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {formula.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FormulaLibrary() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return FORMULA_CATEGORIES;
    const q = search.toLowerCase();
    return FORMULA_CATEGORIES.map(cat => ({
      ...cat,
      formulas: cat.formulas.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.latex.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.tags.some(t => t.includes(q))
      )
    })).filter(cat => cat.formulas.length > 0);
  }, [search]);

  const totalFormulas = FORMULA_CATEGORIES.reduce((s, c) => s + c.formulas.length, 0);
  const shownFormulas = filtered.reduce((s, c) => s + c.formulas.length, 0);

  const toggleCategory = (id: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportAll = () => {
    const data = FORMULA_CATEGORIES.map(cat => ({
      category: cat.name,
      formulas: cat.formulas.map(f => ({
        name: f.name,
        formula: f.latex,
        ascii: f.ascii,
        description: f.description,
        variables: f.variables
      }))
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formel-bibliothek.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">FORMEL-BIBLIOTHEK</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {shownFormulas}/{totalFormulas} Formeln • {filtered.length} Kategorien
            </p>
          </div>
          <button onClick={exportAll} className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1">
            JSON Export
          </button>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suche: kes, sha256, entropie, fourier..."
            className="pl-8 text-xs h-8"
          />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filtered.map(cat => (
            <div key={cat.id}>
              <button 
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center gap-2 w-full text-left mb-2 group"
              >
                {collapsedCategories.has(cat.id) 
                  ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                }
                <span className={cat.color}>{cat.icon}</span>
                <span className="text-xs font-medium">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground">({cat.formulas.length})</span>
              </button>

              {!collapsedCategories.has(cat.id) && (
                <div className="space-y-1.5 ml-5">
                  {cat.formulas.map(f => (
                    <FormulaCard
                      key={f.id}
                      formula={f}
                      expanded={expandedId === f.id}
                      onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
