// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS MATHEMATICS EXPLORER — Vollständiges Formel-Dataset v1.0.0
// Chaos · Omnigenese · Informationstheorie · Stringtheorie · Kosmologie
// Gitter-Kryptanalyse · Angriffs-Algorithmen · Bitcoin · Entropie · Komplexität
// + SRIL/KES/TQII Eigenentwicklungen
// ═══════════════════════════════════════════════════════════════════════════════

export interface Formula {
  id: string;
  name: string;
  latex: string;
  description: string;
  variables: Record<string, string>;
  tags?: string[];
}

export interface FormulaCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  formulas: Formula[];
}

export const FORMULA_DATASET: FormulaCategory[] = [
  {
    id: 'chaos',
    name: 'Chaostheorie',
    icon: 'Flame',
    description: 'Erforschung komplexer dynamischer Systeme, die empfindlich auf Anfangsbedingungen reagieren.',
    formulas: [
      {
        id: 'logistic-map',
        name: 'Logistische Abbildung',
        latex: 'x_{n+1} = r \\cdot x_n (1 - x_n)',
        description: 'Polynomielle Abbildung — komplexes chaotisches Verhalten aus einfachen nichtlinearen Gleichungen.',
        variables: { 'x_n': 'Populationsverhältnis im Schritt n', 'r': 'Wachstumsrate (0 < r ≤ 4)' },
        tags: ['chaos', 'logistic', 'bifurcation']
      },
      {
        id: 'lyapunov-exponent',
        name: 'Lyapunov-Exponent',
        latex: 'λ = lim(N→∞) (1/N) · Σ ln|f\'(xᵢ)|',
        description: 'Quantifiziert die Rate der Separation infinitesimal naher Trajektorien.',
        variables: { 'λ': 'Lyapunov-Exponent', 'f\'(xᵢ)': 'Ableitung am Punkt xᵢ', 'N': 'Iterationen' },
        tags: ['chaos', 'lyapunov', 'sensitivity']
      },
      {
        id: 'lorenz-system',
        name: 'Lorenz-Attraktor',
        latex: 'dx/dt = σ(y−x), dy/dt = x(ρ−z)−y, dz/dt = xy−βz',
        description: 'System von ODEs mit chaotischen Lösungen — modelliert atmosphärische Konvektion.',
        variables: { 'σ': 'Prandtl-Zahl', 'ρ': 'Rayleigh-Zahl', 'β': 'Geometrischer Faktor' },
        tags: ['chaos', 'lorenz', 'attractor', 'ode']
      },
      {
        id: 'feigenbaum-constant',
        name: 'Feigenbaum-Konstante',
        latex: 'δ = lim(n→∞) (aₙ₋₁ − aₙ₋₂)/(aₙ − aₙ₋₁) = 4.669201…',
        description: 'Universelle Konstante für Periodenverdopplungskaskaden.',
        variables: { 'δ': 'Feigenbaum-Konstante', 'aₙ': 'Parameterwert bei n-ter Bifurkation' },
        tags: ['chaos', 'feigenbaum', 'universal']
      }
    ]
  },
  {
    id: 'omnigenesis',
    name: 'Omnigenese',
    icon: 'Dna',
    description: 'Konzepte zur genetischen Vererbung komplexer Merkmale und Krankheiten.',
    formulas: [
      {
        id: 'omnigenic-liability',
        name: 'Omnigenic Liability Modell',
        latex: 'y = Σᵢ∈core βᵢgᵢ + Σⱼ∈periph βⱼgⱼ + ε',
        description: 'Alle in krankheitsrelevanten Zellen exprimierten Gene tragen zur Heritabilität bei.',
        variables: { 'y': 'Phänotypische Anfälligkeit', 'βᵢ': 'Kerngen-Effekt', 'gᵢ': 'Genotyp am Locus i', 'ε': 'Umweltrauschen' },
        tags: ['omnigenesis', 'liability', 'genetics']
      },
      {
        id: 'heritability-partition',
        name: 'Heritabilitäts-Partitionierung',
        latex: 'h² = σ²_G / σ²_P = (σ²_core + σ²_periph) / (σ²_G + σ²_E)',
        description: 'Zerlegung der Heritabilität in Kern- und Peripherie-Komponenten.',
        variables: { 'h²': 'Heritabilität', 'σ²_G': 'Genetische Varianz', 'σ²_P': 'Phänotypische Varianz' },
        tags: ['omnigenesis', 'heritability', 'variance']
      }
    ]
  },
  {
    id: 'information-theory',
    name: 'Informationstheorie',
    icon: 'Binary',
    description: 'Grundlagen zur Messung, Speicherung und Übertragung von Informationen.',
    formulas: [
      {
        id: 'shannon-entropy',
        name: 'Shannon-Entropie',
        latex: 'H(X) = −Σ p(x) · log₂(p(x))',
        description: 'Informationsgehalt einer Quelle in Bits.',
        variables: { 'H': 'Entropie in Bits', 'p(x)': 'Wahrscheinlichkeit von x' },
        tags: ['information', 'shannon', 'entropy']
      },
      {
        id: 'mutual-info',
        name: 'Mutual Information (KES)',
        latex: 'I(Kₙ ; A₀,…,Aₙ₋₁) ≈ 0',
        description: 'KES-Kernaussage: Vergangenheit akkumuliert keine Information über Zukunft.',
        variables: { 'I': 'Mutual Information', 'Kₙ': 'Schlüssel zum Zeitpunkt n' },
        tags: ['information', 'mutual', 'kes']
      },
      {
        id: 'conditional-entropy',
        name: 'Bedingte Entropie (KES)',
        latex: 'H(Kₙ | Kₙ₋₁) ≈ H(Kₙ) — maximal',
        description: 'Maximale bedingte Entropie: Vorgänger-Kenntnis reduziert keine Unsicherheit.',
        variables: { 'H': 'Entropie', 'Kₙ': 'Aktueller Schlüssel' },
        tags: ['information', 'entropy', 'kes', 'conditional']
      },
      {
        id: 'kolmogorov',
        name: 'Kolmogorov-Komplexität',
        latex: 'K(x) = min{|p| : U(p) = x}',
        description: 'Kürzestes Programm das x erzeugt.',
        variables: { 'K': 'Komplexität', 'U': 'Universelle Turingmaschine' },
        tags: ['information', 'kolmogorov', 'complexity']
      },
      {
        id: 'private-key-entropy',
        name: 'Private Key Entropie',
        latex: 'H(d) = log₂(N) ≈ 256 bits',
        description: 'Entropie eines SECP256k1 Private Keys.',
        variables: { 'N': 'Kurvenordnung', 'd': 'Private Key' },
        tags: ['information', 'entropy', 'secp256k1']
      }
    ]
  },
  {
    id: 'string-theory',
    name: 'Stringtheorie',
    icon: 'Orbit',
    description: 'Physikalische Modelle, die Elementarteilchen als eindimensionale Strings beschreiben.',
    formulas: [
      {
        id: 'nambu-goto',
        name: 'Nambu-Goto-Aktion',
        latex: 'S = −T ∫ d²σ √(−det(g_αβ))',
        description: 'Aktion für einen relativistischen String, proportional zur Weltfläche.',
        variables: { 'S': 'Aktion', 'T': 'Stringspannung', 'g_αβ': 'Induzierte Metrik' },
        tags: ['string', 'nambu-goto', 'action']
      },
      {
        id: 'polyakov-action',
        name: 'Polyakov-Aktion',
        latex: 'S_P = −(T/2) ∫ d²σ √(−h) h^αβ ∂_α X^μ ∂_β X_μ',
        description: 'Gleichwertige String-Aktion mit unabhängiger Weltflächenmetrik.',
        variables: { 'h_αβ': 'Weltflächenmetrik', 'X^μ': 'Raumzeit-Einbettung', 'T': 'Stringspannung' },
        tags: ['string', 'polyakov', 'action']
      },
      {
        id: 'beta-function',
        name: 'Weyl-Anomalie / Beta-Funktion',
        latex: 'β^G_μν = R_μν + 2∇_μ∇_ν Φ − (1/4)H_μλκ H_ν^λκ = 0',
        description: 'Verschwindende Beta-Funktion → konforme Invarianz → Bewegungsgleichungen.',
        variables: { 'R_μν': 'Ricci-Tensor', 'Φ': 'Dilatonfeld', 'H_μνλ': 'Kalb-Ramond-Feldstärke' },
        tags: ['string', 'weyl', 'beta', 'conformal']
      }
    ]
  },
  {
    id: 'cosmology',
    name: 'Kosmologie',
    icon: 'Globe',
    description: 'Physik des Universums — Entstehung, Expansion und Struktur.',
    formulas: [
      {
        id: 'friedmann',
        name: 'Friedmann-Gleichung',
        latex: 'H² = (8πG/3)ρ − k/a² + Λ/3',
        description: 'Expansionsrate des Universums im Rahmen der ART.',
        variables: { 'H': 'Hubble-Parameter', 'G': 'Gravitationskonstante', 'ρ': 'Energiedichte', 'k': 'Krümmung', 'Λ': 'Kosmologische Konstante' },
        tags: ['cosmology', 'friedmann', 'expansion']
      },
      {
        id: 'einstein-field',
        name: 'Einstein-Feldgleichungen',
        latex: 'G_μν + Λg_μν = (8πG/c⁴) T_μν',
        description: 'Geometrie der Raumzeit ↔ Materie-Energie-Verteilung.',
        variables: { 'G_μν': 'Einstein-Tensor', 'g_μν': 'Metrik-Tensor', 'T_μν': 'Energie-Impuls-Tensor', 'Λ': 'Kosmologische Konstante' },
        tags: ['cosmology', 'einstein', 'field-equations']
      },
      {
        id: 'hawking-temperature',
        name: 'Hawking-Temperatur',
        latex: 'T_H = ℏc³ / (8πGMk_B)',
        description: 'Schwarzkörperstrahlung von Schwarzen Löchern durch Quanteneffekte.',
        variables: { 'T_H': 'Hawking-Temperatur', 'ℏ': 'Plancksches Wirkungsquantum', 'M': 'Masse des Schwarzen Lochs', 'k_B': 'Boltzmann-Konstante' },
        tags: ['cosmology', 'hawking', 'black-hole', 'quantum']
      }
    ]
  },
  {
    id: 'lattice-cryptanalysis',
    name: 'Gitter-Kryptanalyse',
    icon: 'Grid3x3',
    description: 'Gitter-basierte Kryptographie und Post-Quanten-Sicherheit.',
    formulas: [
      {
        id: 'lll-algorithm',
        name: 'LLL-Schranke',
        latex: '‖b₁*‖ ≤ 2^((n−1)/4) · (det L)^(1/n)',
        description: 'Obere Schranke des LLL-Gitterbasisreduktionsalgorithmus.',
        variables: { 'b₁*': 'Kürzester reduzierter Basisvektor', 'n': 'Gitterdimension', 'det L': 'Gitterdeterminante' },
        tags: ['lattice', 'lll', 'reduction']
      },
      {
        id: 'svp-hardness',
        name: 'SVP-Approximation',
        latex: '‖v‖ ≤ γ(n) · λ₁(L)',
        description: 'Approximationsfaktor für das Shortest Vector Problem.',
        variables: { 'v': 'Gefundener Vektor', 'γ(n)': 'Approximationsfaktor', 'λ₁(L)': 'Kürzester Vektor' },
        tags: ['lattice', 'svp', 'hardness']
      },
      {
        id: 'learning-with-errors',
        name: 'Learning With Errors (LWE)',
        latex: 'b = ⟨a, s⟩ + e (mod q)',
        description: 'Berechnungsproblem als Grundlage post-quanten Kryptographie.',
        variables: { 'a': 'Zufälliger Vektor', 's': 'Geheimer Vektor', 'e': 'Fehlerterm', 'q': 'Modul' },
        tags: ['lattice', 'lwe', 'post-quantum']
      }
    ]
  },
  {
    id: 'attack-algorithms',
    name: 'Angriffs-Algorithmen',
    icon: 'Swords',
    description: 'Algorithmen zur Analyse kryptographischer Systeme.',
    formulas: [
      {
        id: 'grover-speedup',
        name: 'Grover-Algorithmus',
        latex: 'O(√N) vs O(N) klassisch',
        description: 'Quadratische Quanten-Beschleunigung für unstrukturierte Suche.',
        variables: { 'N': 'Suchraum-Größe' },
        tags: ['attack', 'grover', 'quantum']
      },
      {
        id: 'shor-period',
        name: 'Shor-Algorithmus (Periodenfindung)',
        latex: 'r : a^r ≡ 1 (mod N), gcd(a^(r/2) ± 1, N)',
        description: 'Quantenalgorithmus zur Faktorzerlegung in Polynomialzeit — bedroht RSA.',
        variables: { 'r': 'Periode', 'a': 'Zufällige Basis', 'N': 'Zu faktorisierende Zahl' },
        tags: ['attack', 'shor', 'quantum', 'factoring']
      },
      {
        id: 'birthday-attack',
        name: 'Geburtstagsangriff',
        latex: 'P(Kollision) ≈ 1 − e^(−n²/(2H)), n ≈ 1.2√H',
        description: 'Probabilistischer Angriff via Geburtstagsparadoxon auf Hash-Kollisionen.',
        variables: { 'n': 'Stichproben', 'H': 'Hash-Ausgaberaum' },
        tags: ['attack', 'birthday', 'hash', 'collision']
      },
      {
        id: 'differential-cryptanalysis',
        name: 'Differenzkryptanalyse',
        latex: 'Pr[ΔY = ΔY* | ΔX = ΔX*] = p',
        description: 'Eingabedifferenzen durch Chiffre propagieren → schlüsselabhängige Muster.',
        variables: { 'ΔX*': 'Eingabedifferenz', 'ΔY*': 'Ausgabedifferenz', 'p': 'Differenzwahrscheinlichkeit' },
        tags: ['attack', 'differential', 'cipher']
      }
    ]
  },
  {
    id: 'bitcoin-specific',
    name: 'Bitcoin-Spezifisch',
    icon: 'Bitcoin',
    description: 'Mathematische Grundlagen der Bitcoin-Blockchain.',
    formulas: [
      {
        id: 'hashcash-pow',
        name: 'Hashcash Proof of Work',
        latex: 'SHA256(SHA256(header)) < 2²²⁴/D',
        description: 'Proof-of-Work: Hash unter Schwierigkeitsziel finden.',
        variables: { 'header': 'Block-Header', 'D': 'Schwierigkeitsparameter' },
        tags: ['bitcoin', 'pow', 'mining']
      },
      {
        id: 'difficulty-adjustment',
        name: 'Schwierigkeitsanpassung',
        latex: 'D_neu = D_alt × T_aktuell / T_ziel',
        description: 'Alle 2016 Blöcke → ~10 Minuten Blockintervall.',
        variables: { 'D': 'Schwierigkeit', 'T_aktuell': 'Zeit für letzte 2016 Blöcke', 'T_ziel': '2 Wochen' },
        tags: ['bitcoin', 'difficulty', 'retarget']
      },
      {
        id: 'ecdsa-signature',
        name: 'ECDSA-Signatur',
        latex: 's = k⁻¹(z + r·d_A) mod n',
        description: 'Elliptische Kurven Signatur für Bitcoin-Transaktionen.',
        variables: { 's': 'Signaturkomponente', 'k': 'Nonce', 'z': 'Nachrichten-Hash', 'r': 'x von kG', 'd_A': 'Privater Schlüssel' },
        tags: ['bitcoin', 'ecdsa', 'signature']
      }
    ]
  },
  {
    id: 'entropy-collapse',
    name: 'Entropie-Kollaps-Vektoren',
    icon: 'Zap',
    description: 'Messung und Erhaltung von Entropie in kryptographischen Systemen.',
    formulas: [
      {
        id: 'min-entropy',
        name: 'Min-Entropie',
        latex: 'H_∞(X) = −log₂ max_x p(x)',
        description: 'Konservativstes Entropie-Maß — Wahrscheinlichkeit des häufigsten Ergebnisses.',
        variables: { 'H_∞': 'Min-Entropie', 'p(x)': 'Wahrscheinlichkeit des häufigsten Ergebnisses' },
        tags: ['entropy', 'min-entropy', 'security']
      },
      {
        id: 'entropy-rate-decay',
        name: 'Entropie-Abnahmerate',
        latex: 'Hₙ = H₀ · e^(−λt) + H_floor',
        description: 'Degradation der Entropie in schlecht gesäten PRNGs.',
        variables: { 'Hₙ': 'Entropie bei n', 'H₀': 'Anfangsentropie', 'λ': 'Abnahmerate', 'H_floor': 'Entropieboden' },
        tags: ['entropy', 'decay', 'prng']
      },
      {
        id: 'leftover-hash',
        name: 'Leftover Hash Lemma',
        latex: 'SD(h(X), U_m) ≤ ½ · √(2^(m − H_∞(X)))',
        description: 'Universelle Hash-Funktion + hohe Entropie → nahezu gleichmäßige Ausgabe.',
        variables: { 'SD': 'Statistischer Abstand', 'h': 'Hash-Funktion', 'm': 'Ausgabelänge', 'H_∞': 'Min-Entropie' },
        tags: ['entropy', 'hash', 'lemma']
      }
    ]
  },
  {
    id: 'complexity-classes',
    name: 'Komplexitätsklassen',
    icon: 'Layers',
    description: 'Klassifizierung von Rechenproblemen nach Ressourcenverbrauch.',
    formulas: [
      {
        id: 'p-vs-np',
        name: 'P vs. NP',
        latex: 'P ⊆ NP, P =? NP',
        description: 'Hat jedes polynomial verifizierbare Problem auch eine polynomialzeitliche Lösung?',
        variables: { 'P': 'Polynomialzeit lösbar', 'NP': 'Nichtdeterministisch polynomial verifizierbar' },
        tags: ['complexity', 'p', 'np', 'open-problem']
      },
      {
        id: 'bqp-definition',
        name: 'BQP',
        latex: 'BPP ⊆ BQP ⊆ PSPACE',
        description: 'Entscheidungsprobleme lösbar durch Quantencomputer in Polynomialzeit.',
        variables: { 'BPP': 'Bounded-Error Probabilistic Polynomial', 'BQP': 'Bounded-Error Quantum Polynomial', 'PSPACE': 'Polynomieller Speicher' },
        tags: ['complexity', 'bqp', 'quantum']
      },
      {
        id: 'np-completeness',
        name: 'Cook-Levin Theorem',
        latex: 'SAT ∈ NP-vollständig ⟹ ∀L ∈ NP: L ≤_p SAT',
        description: 'SAT ist NP-vollständig — jedes NP-Problem reduzierbar auf SAT.',
        variables: { 'SAT': 'Boolesches Erfüllbarkeitsproblem', '≤_p': 'Polynomialzeitreduktion' },
        tags: ['complexity', 'np-complete', 'sat']
      }
    ]
  },
  {
    id: 'sril-kes',
    name: 'SRIL / KES Protokoll',
    icon: 'Atom',
    description: 'Eigenentwickelte Schlüssel-Evolution und SRIL-Zustandsgleichungen.',
    formulas: [
      {
        id: 'sril-h',
        name: 'Enthalpy Evolution',
        latex: 'H(t+1) = H(t) + α·N(t) − β·G(t) + ε_H(t)',
        description: 'Enthalpy-Gleichung: Kopplung an Navigation und Geometrie.',
        variables: { 'α': '0.245 (Harmonische Kopplung)', 'β': '0.152 (Entropie-Abfluss)', 'ε_H': 'Perturbation' },
        tags: ['sril', 'evolution', 'enthalpy']
      },
      {
        id: 'sril-n',
        name: 'Navigation Evolution',
        latex: 'N(t+1) = γ·N(t) + δ·H(t) + ε_N(t)',
        description: 'Navigations-Gleichung: γ=1.1487 (empirisch kalibriert).',
        variables: { 'γ': '1.1487 (Navigations-Drift)', 'δ': '0.112 (Phasen-Kopplung)' },
        tags: ['sril', 'evolution', 'navigation']
      },
      {
        id: 'sril-g',
        name: 'Geometry Evolution',
        latex: 'G(t+1) = G(t) + η·(H+N)·(1+0.01·tanh(G/10)) + ε_G(t)',
        description: 'Geometrie-Wachstum: nichtlineare Kopplung über tanh.',
        variables: { 'η': '0.088 (Wachstums-Impuls)', 'tanh': 'Nichtlineare Sättigung' },
        tags: ['sril', 'evolution', 'geometry']
      },
      {
        id: 'kes-recursion',
        name: 'Schlüssel-Rekursion (KES)',
        latex: 'K_{n+1} = PRF(Kₙ, tₙ, s)',
        description: 'Zustandsabhängige Schlüsselableitung — kein fixer Key.',
        variables: { 'PRF': 'HMAC', 'tₙ': 'Zeitstempel', 's': 'SRIL-Zustand' },
        tags: ['kes', 'recursion', 'hmac']
      },
      {
        id: 'kes-convergence',
        name: 'Konvergenz-Verbot',
        latex: 'lim(n→∞) Pr[Treffer] = 0',
        description: 'Nicht wegen "groß" — wegen fehlender Zieldefinition.',
        variables: { 'Pr': 'Erfolgswahrscheinlichkeit' },
        tags: ['kes', 'convergence', 'proof']
      },
      {
        id: 'kes-forward-security',
        name: 'Vorwärtsgeheimnis',
        latex: 'Kₙ → Kₙ₊₁: Kenntnis von Kₙ verrät nichts über Kₙ₋₁',
        description: 'HMAC-Einwegfunktion: nicht invertierbar.',
        variables: {},
        tags: ['kes', 'forward-security']
      }
    ]
  }
];
