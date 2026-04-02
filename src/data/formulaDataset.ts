// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS MATHEMATICS EXPLORER — Vollständiges Formel-Dataset v3.0.0
// 18 Kategorien, 80+ Formeln — Proper LaTeX syntax for KaTeX rendering
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
  // ─── 1. CHAOSTHEORIE ──────────────────────────────────────────────────────────
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
        description: 'Polynomielle Abbildung — komplexes chaotisches Verhalten aus einfachen nichtlinearen Gleichungen. r < 3 → stabil, r > 3.569 → Chaos.',
        variables: { 'x_n': 'Populationsverhältnis im Schritt n (0 ≤ x ≤ 1)', 'r': 'Wachstumsrate (0 < r ≤ 4)' },
        tags: ['chaos', 'logistic', 'bifurcation']
      },
      {
        id: 'lyapunov-exponent',
        name: 'Lyapunov-Exponent',
        latex: '\\lambda = \\lim_{N \\to \\infty} \\frac{1}{N} \\sum_{i=0}^{N-1} \\ln |f\'(x_i)|',
        description: 'Quantifiziert die exponentielle Rate der Trajektorienseparation. λ > 0 → Chaos, λ < 0 → Stabilität.',
        variables: { '\\lambda': 'Lyapunov-Exponent', 'f\'(x_i)': 'Ableitung am Punkt x_i', 'N': 'Iterationen' },
        tags: ['chaos', 'lyapunov', 'sensitivity']
      },
      {
        id: 'lorenz-system',
        name: 'Lorenz-Attraktor',
        latex: '\\frac{dx}{dt} = \\sigma(y-x),\\; \\frac{dy}{dt} = x(\\rho-z)-y,\\; \\frac{dz}{dt} = xy - \\beta z',
        description: 'Gekoppeltes ODE-System (σ=10, ρ=28, β=8/3) — erster entdeckter chaotischer Attraktor, Schmetterlingseffekt.',
        variables: { '\\sigma': 'Prandtl-Zahl (10)', '\\rho': 'Rayleigh-Zahl (28)', '\\beta': 'Geometrischer Faktor (8/3)' },
        tags: ['chaos', 'lorenz', 'attractor', 'ode']
      },
      {
        id: 'feigenbaum-constant',
        name: 'Feigenbaum-Konstante',
        latex: '\\delta = \\lim_{n \\to \\infty} \\frac{a_{n-1} - a_{n-2}}{a_n - a_{n-1}} = 4.669201\\ldots',
        description: 'Universelle Konstante für Periodenverdopplungskaskaden — tritt systemunabhängig auf.',
        variables: { '\\delta': 'Feigenbaum-Konstante ≈ 4.6692', 'a_n': 'Parameterwert bei n-ter Bifurkation' },
        tags: ['chaos', 'feigenbaum', 'universal']
      },
      {
        id: 'henon-map',
        name: 'Hénon-Abbildung',
        latex: 'x_{n+1} = 1 - a x_n^2 + y_n, \\quad y_{n+1} = b x_n',
        description: '2D-Abbildung die den Poincaré-Schnitt eines chaotischen Flusses approximiert. Typisch: a=1.4, b=0.3.',
        variables: { 'a': 'Nichtlinearitätsparameter (1.4)', 'b': 'Dissipationsparameter (0.3)' },
        tags: ['chaos', 'henon', 'attractor', '2d']
      }
    ]
  },

  // ─── 2. OMNIGENESE ────────────────────────────────────────────────────────────
  {
    id: 'omnigenesis',
    name: 'Omnigenese',
    icon: 'Dna',
    description: 'Konzepte zur genetischen Vererbung komplexer Merkmale und Krankheiten.',
    formulas: [
      {
        id: 'omnigenic-liability',
        name: 'Omnigenic Liability Modell',
        latex: 'y = \\sum_{i \\in \\text{core}} \\beta_i g_i + \\sum_{j \\in \\text{periph}} \\beta_j g_j + \\epsilon',
        description: 'Alle in krankheitsrelevanten Zellen exprimierten Gene tragen zur Heritabilität bei.',
        variables: { 'y': 'Phänotypische Anfälligkeit', '\\beta_i': 'Kerngen-Effekt', 'g_i': 'Genotyp am Locus i', '\\epsilon': 'Umweltrauschen' },
        tags: ['omnigenesis', 'liability', 'genetics']
      },
      {
        id: 'heritability-partition',
        name: 'Heritabilitäts-Partitionierung',
        latex: 'h^2 = \\frac{\\sigma^2_G}{\\sigma^2_P} = \\frac{\\sigma^2_{\\text{core}} + \\sigma^2_{\\text{periph}}}{\\sigma^2_G + \\sigma^2_E}',
        description: 'Zerlegung der Heritabilität in Kern- und Peripherie-Komponenten.',
        variables: { 'h^2': 'Heritabilität', '\\sigma^2_G': 'Genetische Varianz', '\\sigma^2_P': 'Phänotypische Varianz' },
        tags: ['omnigenesis', 'heritability', 'variance']
      }
    ]
  },

  // ─── 3. INFORMATIONSTHEORIE ───────────────────────────────────────────────────
  {
    id: 'information-theory',
    name: 'Informationstheorie',
    icon: 'Binary',
    description: 'Mathematische Grundlagen zur Messung, Speicherung, Übertragung und Verarbeitung von Informationen.',
    formulas: [
      {
        id: 'shannon-entropy',
        name: 'Shannon-Entropie',
        latex: 'H(X) = -\\sum_{i=1}^{n} p(x_i) \\log_2 p(x_i)',
        description: 'Fundamentale Größe: durchschnittlicher Informationsgehalt einer Zufallsvariablen in Bits.',
        variables: { 'H(X)': 'Entropie in Bits', 'p(x_i)': 'Wahrscheinlichkeit von x_i', 'n': 'Anzahl möglicher Ereignisse' },
        tags: ['information', 'shannon', 'entropy']
      },
      {
        id: 'mutual-information',
        name: 'Transinformation',
        latex: 'I(X;Y) = \\sum_{x,y} p(x,y) \\log_2 \\frac{p(x,y)}{p(x)p(y)}',
        description: 'Quantifiziert gegenseitige Abhängigkeit zweier Zufallsvariablen.',
        variables: { 'I(X;Y)': 'Transinformation', 'p(x,y)': 'Gemeinsame Verteilung', 'p(x)': 'Marginalverteilung' },
        tags: ['information', 'mutual', 'dependence']
      },
      {
        id: 'kl-divergence',
        name: 'Kullback-Leibler-Divergenz',
        latex: 'D_{KL}(P \\| Q) = \\sum_{i} P(i) \\log_2 \\frac{P(i)}{Q(i)}',
        description: 'Asymmetrisches Maß für den Unterschied zwischen zwei Verteilungen — Informationsverlust bei Approximation.',
        variables: { 'D_{KL}': 'KL-Divergenz (Bits)', 'P': 'Referenzverteilung', 'Q': 'Approximierende Verteilung' },
        tags: ['information', 'kl-divergence', 'deep-learning']
      },
      {
        id: 'channel-capacity',
        name: 'Kanalkapazität',
        latex: 'C = \\max_{p(x)} I(X;Y)',
        description: 'Maximale zuverlässige Informationsrate über einen verrauschten Kanal.',
        variables: { 'C': 'Kanalkapazität (Bits/Symbol)', 'p(x)': 'Eingangsverteilung', 'I(X;Y)': 'Transinformation' },
        tags: ['information', 'channel', 'capacity']
      },
      {
        id: 'shannon-hartley',
        name: 'Shannon-Hartley-Theorem',
        latex: 'C = B \\log_2 \\left(1 + \\frac{S}{N}\\right)',
        description: 'Maximale Datenrate für bandbegrenzten Kanal mit Gauß-Rauschen.',
        variables: { 'C': 'Kapazität (Bits/s)', 'B': 'Bandbreite (Hz)', 'S/N': 'Signal-Rausch-Verhältnis' },
        tags: ['information', 'shannon-hartley', 'awgn']
      },
      {
        id: 'rate-distortion',
        name: 'Rate-Distortion Funktion',
        latex: 'R(D) = \\min_{p(\\hat{x}|x): \\mathbb{E}[d(x,\\hat{x})] \\leq D} I(X;\\hat{X})',
        description: 'Minimale Bitrate für verlustbehaftete Kompression bei Verzerrung D.',
        variables: { 'R(D)': 'Minimale Bitrate', 'd': 'Verzerrungsmaß', 'D': 'Max. Verzerrung' },
        tags: ['information', 'compression', 'rate-distortion']
      },
      {
        id: 'mutual-info-kes',
        name: 'Mutual Information (KES)',
        latex: 'I(K_n ; A_0, \\ldots, A_{n-1}) \\approx 0',
        description: 'KES-Kernaussage: Vergangenheit akkumuliert keine Information über Zukunft.',
        variables: { 'I': 'Mutual Information', 'K_n': 'Schlüssel zum Zeitpunkt n' },
        tags: ['information', 'mutual', 'kes']
      },
      {
        id: 'conditional-entropy',
        name: 'Bedingte Entropie (KES)',
        latex: 'H(K_n | K_{n-1}) \\approx H(K_n)',
        description: 'Maximale bedingte Entropie: Vorgänger-Kenntnis reduziert keine Unsicherheit.',
        variables: { 'H': 'Entropie', 'K_n': 'Aktueller Schlüssel' },
        tags: ['information', 'entropy', 'kes', 'conditional']
      },
      {
        id: 'kolmogorov',
        name: 'Kolmogorov-Komplexität',
        latex: 'K(x) = \\min\\{|p| : U(p) = x\\}',
        description: 'Kürzestes Programm das x erzeugt — algorithmischer Informationsgehalt.',
        variables: { 'K': 'Komplexität', 'U': 'Universelle Turingmaschine' },
        tags: ['information', 'kolmogorov', 'complexity']
      },
      {
        id: 'private-key-entropy',
        name: 'Private Key Entropie',
        latex: 'H(d) = \\log_2(N) \\approx 256 \\text{ bits}',
        description: 'Entropie eines SECP256k1 Private Keys.',
        variables: { 'N': 'Kurvenordnung', 'd': 'Private Key' },
        tags: ['information', 'entropy', 'secp256k1']
      }
    ]
  },

  // ─── 4. QUANTENINFORMATIONSTHEORIE ────────────────────────────────────────────
  {
    id: 'quantum-information',
    name: 'Quanteninformationstheorie',
    icon: 'Atom',
    description: 'Erweiterung der Informationstheorie auf Quantensysteme — Superposition, Verschränkung, Quantenmessung.',
    formulas: [
      {
        id: 'von-neumann-entropy',
        name: 'von Neumann-Entropie',
        latex: 'S(\\rho) = -\\text{Tr}(\\rho \\log_2 \\rho)',
        description: 'Quantenmechanisches Analogon zur Shannon-Entropie für Dichteoperatoren.',
        variables: { 'S(\\rho)': 'von Neumann-Entropie', '\\rho': 'Dichteoperator', '\\text{Tr}': 'Spur' },
        tags: ['quantum', 'entropy', 'von-neumann']
      },
      {
        id: 'bell-inequality',
        name: 'Bell-Ungleichung (CHSH)',
        latex: '|E(a,b) - E(a,b\') + E(a\',b) + E(a\',b\')| \\leq 2',
        description: 'Lokaler Realismus vs. Quantenmechanik — Verletzung bis 2√2 beweist Verschränkung.',
        variables: { 'E(a,b)': 'Korrelationsfunktion', 'a,b': 'Messeinstellungen Alice/Bob' },
        tags: ['quantum', 'bell', 'entanglement', 'chsh']
      },
      {
        id: 'quantum-fisher',
        name: 'Quanten-Fisher-Information',
        latex: 'F_Q[\\rho, A] = 2 \\sum_{i,j} \\frac{(\\lambda_i - \\lambda_j)^2}{\\lambda_i + \\lambda_j} |\\langle i|A|j\\rangle|^2',
        description: 'Empfindlichste Messbarkeit eines Parameters — Quanten-Cramér-Rao-Schranke.',
        variables: { 'F_Q': 'Fisher-Information', '\\lambda_i': 'Eigenwerte von ρ', 'A': 'Generator' },
        tags: ['quantum', 'fisher', 'metrology']
      },
      {
        id: 'quantum-teleportation',
        name: 'Quantenteleportation',
        latex: '|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle \\xrightarrow{\\text{EPR}} |\\psi\\rangle',
        description: 'Übertragung eines Quantenzustands via Verschränkung + klassische Kommunikation.',
        variables: { '|\\psi\\rangle': 'Zu teleportierender Zustand', '\\alpha,\\beta': 'Amplituden' },
        tags: ['quantum', 'teleportation', 'epr']
      },
      {
        id: 'no-cloning',
        name: 'No-Cloning Theorem',
        latex: '\\nexists\\; U : U|\\psi\\rangle|0\\rangle = |\\psi\\rangle|\\psi\\rangle \\;\\forall\\; |\\psi\\rangle',
        description: 'Kein unitärer Operator kann einen unbekannten Quantenzustand exakt kopieren.',
        variables: { 'U': 'Unitärer Operator', '|\\psi\\rangle': 'Unbekannter Zustand' },
        tags: ['quantum', 'no-cloning', 'fundamental']
      },
      {
        id: 'qkd-bb84',
        name: 'BB84 Schlüsselrate',
        latex: 'R \\geq 1 - H(e_b) - H(e_p)',
        description: 'Sichere Schlüsselrate des BB84 Quantenkryptographie-Protokolls.',
        variables: { 'R': 'Schlüsselrate', 'e_b': 'Bit-Fehlerrate', 'H': 'Binäre Entropie' },
        tags: ['quantum', 'qkd', 'bb84', 'cryptography']
      }
    ]
  },

  // ─── 5. STRINGTHEORIE ─────────────────────────────────────────────────────────
  {
    id: 'string-theory',
    name: 'Stringtheorie',
    icon: 'Orbit',
    description: 'Physikalische Modelle, die Elementarteilchen als eindimensionale Strings beschreiben.',
    formulas: [
      {
        id: 'nambu-goto',
        name: 'Nambu-Goto-Aktion',
        latex: 'S = -T \\int d^2\\sigma \\sqrt{-\\det(g_{\\alpha\\beta})}',
        description: 'Aktion für einen relativistischen String, proportional zur Weltfläche.',
        variables: { 'S': 'Aktion', 'T': 'Stringspannung', 'g_{\\alpha\\beta}': 'Induzierte Metrik' },
        tags: ['string', 'nambu-goto', 'action']
      },
      {
        id: 'polyakov-action',
        name: 'Polyakov-Aktion',
        latex: 'S_P = -\\frac{T}{2} \\int d^2\\sigma \\sqrt{-h}\\, h^{\\alpha\\beta} \\partial_\\alpha X^\\mu \\partial_\\beta X_\\mu',
        description: 'Gleichwertige String-Aktion mit unabhängiger Weltflächenmetrik.',
        variables: { 'h_{\\alpha\\beta}': 'Weltflächenmetrik', 'X^\\mu': 'Raumzeit-Einbettung', 'T': 'Stringspannung' },
        tags: ['string', 'polyakov', 'action']
      },
      {
        id: 'beta-function',
        name: 'Weyl-Anomalie / Beta-Funktion',
        latex: '\\beta^G_{\\mu\\nu} = R_{\\mu\\nu} + 2\\nabla_\\mu \\nabla_\\nu \\Phi - \\frac{1}{4}H_{\\mu\\lambda\\kappa}H_\\nu^{\\ \\lambda\\kappa} = 0',
        description: 'Verschwindende Beta-Funktion → konforme Invarianz → Bewegungsgleichungen.',
        variables: { 'R_{\\mu\\nu}': 'Ricci-Tensor', '\\Phi': 'Dilatonfeld', 'H_{\\mu\\nu\\lambda}': 'Kalb-Ramond-Feldstärke' },
        tags: ['string', 'weyl', 'beta', 'conformal']
      }
    ]
  },

  // ─── 6. KOSMOLOGIE ────────────────────────────────────────────────────────────
  {
    id: 'cosmology',
    name: 'Kosmologie',
    icon: 'Globe',
    description: 'Physik des Universums — Entstehung, Expansion und Struktur.',
    formulas: [
      {
        id: 'friedmann',
        name: 'Friedmann-Gleichung',
        latex: 'H^2 = \\frac{8\\pi G}{3}\\rho - \\frac{k}{a^2} + \\frac{\\Lambda}{3}',
        description: 'Expansionsrate des Universums im Rahmen der ART.',
        variables: { 'H': 'Hubble-Parameter', 'G': 'Gravitationskonstante', '\\rho': 'Energiedichte', 'k': 'Krümmung', '\\Lambda': 'Kosmologische Konstante' },
        tags: ['cosmology', 'friedmann', 'expansion']
      },
      {
        id: 'einstein-field',
        name: 'Einstein-Feldgleichungen',
        latex: 'G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}',
        description: 'Geometrie der Raumzeit ↔ Materie-Energie-Verteilung.',
        variables: { 'G_{\\mu\\nu}': 'Einstein-Tensor', 'g_{\\mu\\nu}': 'Metrik-Tensor', 'T_{\\mu\\nu}': 'Energie-Impuls-Tensor', '\\Lambda': 'Kosmologische Konstante' },
        tags: ['cosmology', 'einstein', 'field-equations']
      },
      {
        id: 'hawking-temperature',
        name: 'Hawking-Temperatur',
        latex: 'T_H = \\frac{\\hbar c^3}{8\\pi G M k_B}',
        description: 'Schwarzkörperstrahlung von Schwarzen Löchern durch Quanteneffekte.',
        variables: { 'T_H': 'Hawking-Temperatur', '\\hbar': 'Plancksches Wirkungsquantum', 'M': 'Masse des Schwarzen Lochs', 'k_B': 'Boltzmann-Konstante' },
        tags: ['cosmology', 'hawking', 'black-hole', 'quantum']
      },
      {
        id: 'schwarzschild',
        name: 'Schwarzschild-Radius',
        latex: 'r_s = \\frac{2GM}{c^2}',
        description: 'Radius des Ereignishorizonts eines nicht-rotierenden Schwarzen Lochs.',
        variables: { 'r_s': 'Schwarzschild-Radius', 'G': 'Gravitationskonstante', 'M': 'Masse', 'c': 'Lichtgeschwindigkeit' },
        tags: ['cosmology', 'schwarzschild', 'black-hole']
      },
      {
        id: 'hubble-law',
        name: 'Hubble-Gesetz',
        latex: 'v = H_0 \\cdot d',
        description: 'Fluchtgeschwindigkeit einer Galaxie proportional zu ihrem Abstand.',
        variables: { 'v': 'Fluchtgeschwindigkeit', 'H_0': 'Hubble-Konstante (~70 km/s/Mpc)', 'd': 'Abstand' },
        tags: ['cosmology', 'hubble', 'expansion']
      }
    ]
  },

  // ─── 7. GITTER-KRYPTANALYSE ──────────────────────────────────────────────────
  {
    id: 'lattice-cryptanalysis',
    name: 'Gitter-Kryptanalyse',
    icon: 'Grid3x3',
    description: 'Gitter-basierte Kryptographie und Post-Quanten-Sicherheit.',
    formulas: [
      {
        id: 'lll-algorithm',
        name: 'LLL-Schranke',
        latex: '\\|b_1^*\\| \\leq 2^{(n-1)/4} (\\det L)^{1/n}',
        description: 'Obere Schranke des LLL-Gitterbasisreduktionsalgorithmus (Lenstra-Lenstra-Lovász, 1982).',
        variables: { 'b_1^*': 'Kürzester reduzierter Basisvektor', 'n': 'Gitterdimension', '\\det L': 'Gitterdeterminante' },
        tags: ['lattice', 'lll', 'reduction']
      },
      {
        id: 'svp-hardness',
        name: 'SVP-Approximation',
        latex: '\\|v\\| \\leq \\gamma(n) \\cdot \\lambda_1(L)',
        description: 'Shortest Vector Problem — Grundlage der Post-Quanten-Kryptographie.',
        variables: { 'v': 'Gefundener Vektor', '\\gamma(n)': 'Approximationsfaktor', '\\lambda_1(L)': 'Kürzester Vektor' },
        tags: ['lattice', 'svp', 'hardness']
      },
      {
        id: 'learning-with-errors',
        name: 'Learning With Errors (LWE)',
        latex: 'b = \\langle \\mathbf{a}, \\mathbf{s} \\rangle + e \\pmod{q}',
        description: 'Fundamentales Problem der Post-Quanten-Kryptographie (Regev, 2005) — so schwer wie worst-case Gitterprobleme.',
        variables: { '\\mathbf{a}': 'Zufälliger Vektor', '\\mathbf{s}': 'Geheimer Vektor', 'e': 'Fehlerterm', 'q': 'Modul' },
        tags: ['lattice', 'lwe', 'post-quantum']
      },
      {
        id: 'ring-lwe',
        name: 'Ring-LWE',
        latex: 'b = a \\cdot s + e \\in R_q = \\mathbb{Z}_q[x]/(x^n+1)',
        description: 'Effizientere LWE-Variante im Polynomring — Basis für Kyber, Dilithium.',
        variables: { 'R_q': 'Polynomring mod x^n+1', 'a': 'Zufälliges Ringelement', 's': 'Geheimer Schlüssel', 'e': 'Fehler' },
        tags: ['lattice', 'ring-lwe', 'kyber', 'post-quantum']
      },
      {
        id: 'gaussian-heuristic',
        name: 'Gaußsche Heuristik',
        latex: '\\lambda_1(L) \\approx \\sqrt{\\frac{n}{2\\pi e}} \\cdot (\\det L)^{1/n}',
        description: 'Erwartete Länge des kürzesten Vektors in einem zufälligen Gitter.',
        variables: { '\\lambda_1': 'Kürzester Vektor', 'n': 'Dimension', '\\det L': 'Gitterdeterminante' },
        tags: ['lattice', 'gaussian', 'heuristic']
      }
    ]
  },

  // ─── 8. ANGRIFFS-ALGORITHMEN ──────────────────────────────────────────────────
  {
    id: 'attack-algorithms',
    name: 'Angriffs-Algorithmen',
    icon: 'Swords',
    description: 'Klassische und quantenbasierte Algorithmen zur Analyse kryptographischer Systeme.',
    formulas: [
      {
        id: 'grover-speedup',
        name: 'Grover-Algorithmus',
        latex: 'O(\\sqrt{N}) \\text{ vs } O(N) \\text{ klassisch}',
        description: 'Quadratische Quanten-Beschleunigung für unstrukturierte Suche — Schlüssellänge verdoppeln.',
        variables: { 'N': 'Suchraum-Größe' },
        tags: ['attack', 'grover', 'quantum']
      },
      {
        id: 'shor-period',
        name: 'Shor-Algorithmus (Periodenfindung)',
        latex: 'r : a^r \\equiv 1 \\pmod{N},\\quad \\gcd(a^{r/2} \\pm 1, N)',
        description: 'Quantenalgorithmus zur Faktorzerlegung in Polynomialzeit — bedroht RSA und ECC.',
        variables: { 'r': 'Periode', 'a': 'Zufällige Basis', 'N': 'Zu faktorisierende Zahl' },
        tags: ['attack', 'shor', 'quantum', 'factoring']
      },
      {
        id: 'birthday-attack',
        name: 'Geburtstagsangriff',
        latex: 'P(\\text{Kollision}) \\approx 1 - e^{-n^2/(2H)},\\quad n \\approx 1.2\\sqrt{H}',
        description: 'Probabilistischer Angriff via Geburtstagsparadoxon auf Hash-Kollisionen.',
        variables: { 'n': 'Stichproben', 'H': 'Hash-Ausgaberaum' },
        tags: ['attack', 'birthday', 'hash', 'collision']
      },
      {
        id: 'differential-cryptanalysis',
        name: 'Differenzkryptanalyse',
        latex: '\\Pr[\\Delta Y = \\Delta Y^* \\mid \\Delta X = \\Delta X^*] = p',
        description: 'Eingabedifferenzen durch Chiffre propagieren → schlüsselabhängige Muster.',
        variables: { '\\Delta X^*': 'Eingabedifferenz', '\\Delta Y^*': 'Ausgabedifferenz', 'p': 'Differenzwahrscheinlichkeit' },
        tags: ['attack', 'differential', 'cipher']
      },
      {
        id: 'pollard-rho',
        name: 'Pollard-Rho Algorithmus',
        latex: 'x_{i+1} = f(x_i) \\pmod{N},\\quad d = \\gcd(|x_i - x_{2i}|, N)',
        description: 'Probabilistischer Faktorisierungsalgorithmus mit O(N^{1/4}) Erwartung.',
        variables: { 'f': 'Pseudo-Zufallsfunktion', 'N': 'Zu faktorisierende Zahl', 'd': 'Gefundener Faktor' },
        tags: ['attack', 'pollard', 'factoring', 'classical']
      }
    ]
  },

  // ─── 9. BITCOIN-SPEZIFISCH ────────────────────────────────────────────────────
  {
    id: 'bitcoin-specific',
    name: 'Bitcoin-Spezifisch',
    icon: 'Bitcoin',
    description: 'Mathematische Grundlagen der Bitcoin-Blockchain.',
    formulas: [
      {
        id: 'hashcash-pow',
        name: 'Hashcash Proof of Work',
        latex: '\\text{SHA256}(\\text{SHA256}(\\text{header})) < \\frac{2^{224}}{D}',
        description: 'Proof-of-Work: Hash unter Schwierigkeitsziel finden.',
        variables: { '\\text{header}': 'Block-Header', 'D': 'Schwierigkeitsparameter' },
        tags: ['bitcoin', 'pow', 'mining']
      },
      {
        id: 'difficulty-adjustment',
        name: 'Schwierigkeitsanpassung',
        latex: 'D_{\\text{neu}} = D_{\\text{alt}} \\times \\frac{T_{\\text{aktuell}}}{T_{\\text{ziel}}}',
        description: 'Alle 2016 Blöcke → ~10 Minuten Blockintervall.',
        variables: { 'D': 'Schwierigkeit', 'T_{\\text{aktuell}}': 'Zeit für letzte 2016 Blöcke', 'T_{\\text{ziel}}': '2 Wochen' },
        tags: ['bitcoin', 'difficulty', 'retarget']
      },
      {
        id: 'ecdsa-signature',
        name: 'ECDSA-Signatur',
        latex: 's = k^{-1}(z + r \\cdot d_A) \\pmod{n}',
        description: 'Elliptische Kurven Signatur für Bitcoin-Transaktionen.',
        variables: { 's': 'Signaturkomponente', 'k': 'Nonce', 'z': 'Nachrichten-Hash', 'r': 'x von kG', 'd_A': 'Privater Schlüssel' },
        tags: ['bitcoin', 'ecdsa', 'signature']
      },
      {
        id: 'merkle-root',
        name: 'Merkle-Root',
        latex: 'H_{\\text{root}} = H(H(H(tx_0) \\| H(tx_1)) \\| H(H(tx_2) \\| H(tx_3)))',
        description: 'Binärer Hash-Baum zur effizienten Verifikation aller Transaktionen in einem Block.',
        variables: { 'H': 'SHA-256', 'tx_i': 'Transaktion i', '\\|': 'Konkatenation' },
        tags: ['bitcoin', 'merkle', 'tree', 'verification']
      },
      {
        id: 'selfish-mining',
        name: 'Selfish Mining Schwelle',
        latex: '\\alpha > \\frac{1 - \\gamma}{3 - 2\\gamma}',
        description: 'Mindest-Hashrate für profitable Selfish-Mining-Strategie (Eyal & Sirer, 2014).',
        variables: { '\\alpha': 'Attacker Hashrate-Anteil', '\\gamma': 'Netzwerk-Propagationsvorteil' },
        tags: ['bitcoin', 'selfish-mining', 'game-theory']
      }
    ]
  },

  // ─── 10. ENTROPIE-KOLLAPS ─────────────────────────────────────────────────────
  {
    id: 'entropy-collapse',
    name: 'Entropie-Kollaps-Vektoren',
    icon: 'Zap',
    description: 'Messung und Erhaltung von Entropie in kryptographischen Systemen.',
    formulas: [
      {
        id: 'min-entropy',
        name: 'Min-Entropie',
        latex: 'H_\\infty(X) = -\\log_2 \\max_x p(x)',
        description: 'Konservativstes Entropie-Maß — Wahrscheinlichkeit des häufigsten Ergebnisses.',
        variables: { 'H_\\infty': 'Min-Entropie', 'p(x)': 'Max. Wahrscheinlichkeit' },
        tags: ['entropy', 'min-entropy', 'security']
      },
      {
        id: 'entropy-rate-decay',
        name: 'Entropie-Abnahmerate',
        latex: 'H_n = H_0 \\cdot e^{-\\lambda t} + H_{\\text{floor}}',
        description: 'Degradation der Entropie in schlecht gesäten PRNGs.',
        variables: { 'H_n': 'Entropie bei n', 'H_0': 'Anfangsentropie', '\\lambda': 'Abnahmerate', 'H_{\\text{floor}}': 'Entropieboden' },
        tags: ['entropy', 'decay', 'prng']
      },
      {
        id: 'leftover-hash',
        name: 'Leftover Hash Lemma',
        latex: '\\text{SD}(h(X), U_m) \\leq \\frac{1}{2} \\sqrt{2^{m - H_\\infty(X)}}',
        description: 'Universelle Hash-Funktion + hohe Entropie → nahezu gleichmäßige Ausgabe.',
        variables: { '\\text{SD}': 'Statistischer Abstand', 'h': 'Hash-Funktion', 'm': 'Ausgabelänge', 'H_\\infty': 'Min-Entropie' },
        tags: ['entropy', 'hash', 'lemma']
      },
      {
        id: 'renyi-entropy',
        name: 'Rényi-Entropie',
        latex: 'H_\\alpha(X) = \\frac{1}{1-\\alpha} \\log_2 \\sum_x p(x)^\\alpha',
        description: 'Familie von Entropiemaßen parametrisiert durch α — verallgemeinert Shannon und Min-Entropie.',
        variables: { '\\alpha': 'Ordnungsparameter', 'H_\\alpha': 'Rényi-Entropie der Ordnung α' },
        tags: ['entropy', 'renyi', 'generalized']
      }
    ]
  },

  // ─── 11. KOMPLEXITÄTSKLASSEN ──────────────────────────────────────────────────
  {
    id: 'complexity-classes',
    name: 'Komplexitätsklassen',
    icon: 'Layers',
    description: 'Klassifizierung von Rechenproblemen nach Ressourcenverbrauch.',
    formulas: [
      {
        id: 'p-vs-np',
        name: 'P vs. NP',
        latex: '\\text{P} \\subseteq \\text{NP},\\quad \\text{P} \\stackrel{?}{=} \\text{NP}',
        description: 'Das wichtigste offene Problem der theoretischen Informatik.',
        variables: { '\\text{P}': 'Polynomialzeit lösbar', '\\text{NP}': 'Nichtdeterministisch polynomial verifizierbar' },
        tags: ['complexity', 'p', 'np', 'open-problem']
      },
      {
        id: 'bqp-definition',
        name: 'BQP',
        latex: '\\text{BPP} \\subseteq \\text{BQP} \\subseteq \\text{PSPACE}',
        description: 'Entscheidungsprobleme lösbar durch Quantencomputer in Polynomialzeit.',
        variables: { '\\text{BPP}': 'Bounded-Error Probabilistic Polynomial', '\\text{BQP}': 'Bounded-Error Quantum Polynomial', '\\text{PSPACE}': 'Polynomieller Speicher' },
        tags: ['complexity', 'bqp', 'quantum']
      },
      {
        id: 'np-completeness',
        name: 'Cook-Levin Theorem',
        latex: '\\text{SAT} \\in \\text{NP-vollständig} \\implies \\forall L \\in \\text{NP},\\; L \\leq_p \\text{SAT}',
        description: 'SAT ist NP-vollständig — jedes NP-Problem reduzierbar auf SAT.',
        variables: { '\\text{SAT}': 'Boolesches Erfüllbarkeitsproblem', '\\leq_p': 'Polynomialzeitreduktion' },
        tags: ['complexity', 'np-complete', 'sat']
      },
      {
        id: 'time-hierarchy',
        name: 'Zeithierarchie-Satz',
        latex: '\\text{DTIME}(o(f(n))) \\subsetneq \\text{DTIME}(f(n) \\cdot \\log f(n))',
        description: 'Mehr Rechenzeit ermöglicht strikt mehr lösbare Probleme.',
        variables: { '\\text{DTIME}': 'Deterministische Zeitklasse', 'f(n)': 'Zeitschranke' },
        tags: ['complexity', 'hierarchy', 'separation']
      }
    ]
  },

  // ─── 12. SRIL / KES PROTOKOLL ─────────────────────────────────────────────────
  {
    id: 'sril-kes',
    name: 'SRIL / KES Protokoll',
    icon: 'Atom',
    description: 'Eigenentwickelte Schlüssel-Evolution und SRIL-Zustandsgleichungen.',
    formulas: [
      {
        id: 'sril-h',
        name: 'Enthalpy Evolution',
        latex: 'H(t+1) = H(t) + \\alpha \\cdot N(t) - \\beta \\cdot G(t) + \\varepsilon_H(t)',
        description: 'Enthalpy-Gleichung: Kopplung an Navigation und Geometrie.',
        variables: { '\\alpha': '0.245 (Harmonische Kopplung)', '\\beta': '0.152 (Entropie-Abfluss)', '\\varepsilon_H': 'Perturbation' },
        tags: ['sril', 'evolution', 'enthalpy']
      },
      {
        id: 'sril-n',
        name: 'Navigation Evolution',
        latex: 'N(t+1) = \\gamma \\cdot N(t) + \\delta \\cdot H(t) + \\varepsilon_N(t)',
        description: 'Navigations-Gleichung: γ=1.1487 (empirisch kalibriert).',
        variables: { '\\gamma': '1.1487 (Navigations-Drift)', '\\delta': '0.112 (Phasen-Kopplung)' },
        tags: ['sril', 'evolution', 'navigation']
      },
      {
        id: 'sril-g',
        name: 'Geometry Evolution',
        latex: 'G(t+1) = G(t) + \\eta(H+N)(1+0.01\\tanh(G/10)) + \\varepsilon_G(t)',
        description: 'Geometrie-Wachstum: nichtlineare Kopplung über tanh.',
        variables: { '\\eta': '0.088 (Wachstums-Impuls)', '\\tanh': 'Nichtlineare Sättigung' },
        tags: ['sril', 'evolution', 'geometry']
      },
      {
        id: 'kes-recursion',
        name: 'Schlüssel-Rekursion (KES)',
        latex: 'K_{n+1} = \\text{PRF}(K_n, t_n, s)',
        description: 'Zustandsabhängige Schlüsselableitung — kein fixer Key.',
        variables: { '\\text{PRF}': 'HMAC', 't_n': 'Zeitstempel', 's': 'SRIL-Zustand' },
        tags: ['kes', 'recursion', 'hmac']
      },
      {
        id: 'kes-convergence',
        name: 'Konvergenz-Verbot',
        latex: '\\lim_{n \\to \\infty} \\Pr[\\text{Treffer}] = 0',
        description: 'Nicht wegen "groß" — wegen fehlender Zieldefinition.',
        variables: { '\\Pr': 'Erfolgswahrscheinlichkeit' },
        tags: ['kes', 'convergence', 'proof']
      },
      {
        id: 'kes-forward-security',
        name: 'Vorwärtsgeheimnis',
        latex: 'K_n \\to K_{n+1}:\\; \\text{Kenntnis von } K_n \\text{ verrät nichts über } K_{n-1}',
        description: 'HMAC-Einwegfunktion: nicht invertierbar.',
        variables: {},
        tags: ['kes', 'forward-security']
      }
    ]
  },

  // ─── 13. NEURONALE NETZE & DEEP LEARNING ──────────────────────────────────────
  {
    id: 'neural-networks',
    name: 'Neuronale Netze',
    icon: 'Activity',
    description: 'Mathematische Grundlagen von Deep Learning und künstlichen neuronalen Netzen.',
    formulas: [
      {
        id: 'backpropagation',
        name: 'Backpropagation',
        latex: '\\frac{\\partial L}{\\partial w_{ij}} = \\frac{\\partial L}{\\partial a_j} \\cdot \\frac{\\partial a_j}{\\partial z_j} \\cdot \\frac{\\partial z_j}{\\partial w_{ij}}',
        description: 'Kettenregel zur Berechnung der Gradienten — Kern des Lernalgorithmus.',
        variables: { 'L': 'Verlustfunktion', 'w_{ij}': 'Gewicht', 'a_j': 'Aktivierung', 'z_j': 'Pre-Aktivierung' },
        tags: ['neural', 'backprop', 'gradient']
      },
      {
        id: 'softmax',
        name: 'Softmax-Funktion',
        latex: '\\sigma(z_i) = \\frac{e^{z_i}}{\\sum_{j=1}^{K} e^{z_j}}',
        description: 'Normalisiert Logits zu Wahrscheinlichkeitsverteilung — Standard-Ausgabeschicht für Klassifikation.',
        variables: { 'z_i': 'Logit der Klasse i', 'K': 'Anzahl Klassen' },
        tags: ['neural', 'softmax', 'classification']
      },
      {
        id: 'cross-entropy',
        name: 'Kreuzentropie-Verlust',
        latex: 'L = -\\sum_{i=1}^{K} y_i \\log(\\hat{y}_i)',
        description: 'Standard-Verlustfunktion für Klassifikation — misst Abweichung von Vorhersage zu Label.',
        variables: { 'y_i': 'One-Hot Label', '\\hat{y}_i': 'Vorhergesagte Wahrscheinlichkeit', 'K': 'Klassen' },
        tags: ['neural', 'loss', 'cross-entropy']
      },
      {
        id: 'attention',
        name: 'Scaled Dot-Product Attention',
        latex: '\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
        description: 'Kern des Transformer-Modells (Vaswani et al., 2017) — Grundlage moderner LLMs.',
        variables: { 'Q': 'Queries', 'K': 'Keys', 'V': 'Values', 'd_k': 'Key-Dimension' },
        tags: ['neural', 'attention', 'transformer']
      }
    ]
  },

  // ─── 14. DIFFERENTIALGEOMETRIE ────────────────────────────────────────────────
  {
    id: 'differential-geometry',
    name: 'Differentialgeometrie',
    icon: 'Sparkles',
    description: 'Geometrie gekrümmter Räume — Grundlage der Allgemeinen Relativitätstheorie.',
    formulas: [
      {
        id: 'riemann-tensor',
        name: 'Riemann-Krümmungstensor',
        latex: 'R^\\rho_{\\;\\sigma\\mu\\nu} = \\partial_\\mu \\Gamma^\\rho_{\\nu\\sigma} - \\partial_\\nu \\Gamma^\\rho_{\\mu\\sigma} + \\Gamma^\\rho_{\\mu\\lambda}\\Gamma^\\lambda_{\\nu\\sigma} - \\Gamma^\\rho_{\\nu\\lambda}\\Gamma^\\lambda_{\\mu\\sigma}',
        description: 'Vollständige Beschreibung der intrinsischen Krümmung einer Mannigfaltigkeit.',
        variables: { 'R^\\rho_{\\;\\sigma\\mu\\nu}': 'Riemann-Tensor', '\\Gamma': 'Christoffel-Symbole' },
        tags: ['geometry', 'riemann', 'curvature']
      },
      {
        id: 'geodesic-equation',
        name: 'Geodätengleichung',
        latex: '\\frac{d^2 x^\\mu}{d\\tau^2} + \\Gamma^\\mu_{\\alpha\\beta} \\frac{dx^\\alpha}{d\\tau} \\frac{dx^\\beta}{d\\tau} = 0',
        description: 'Bewegungsgleichung für frei fallende Teilchen in gekrümmter Raumzeit.',
        variables: { 'x^\\mu': 'Koordinaten', '\\tau': 'Eigenzeit', '\\Gamma': 'Christoffel-Symbole' },
        tags: ['geometry', 'geodesic', 'motion']
      },
      {
        id: 'gauss-bonnet',
        name: 'Gauß-Bonnet Theorem',
        latex: '\\int_M K \\, dA = 2\\pi \\chi(M)',
        description: 'Verbindet die totale Krümmung einer geschlossenen Fläche mit ihrer Topologie.',
        variables: { 'K': 'Gauß-Krümmung', 'M': 'Mannigfaltigkeit', '\\chi': 'Euler-Charakteristik' },
        tags: ['geometry', 'gauss-bonnet', 'topology']
      }
    ]
  },

  // ─── 15. GRUPPENTHEORIE & ALGEBRA ─────────────────────────────────────────────
  {
    id: 'algebra',
    name: 'Gruppentheorie & Algebra',
    icon: 'Hash',
    description: 'Abstrakte algebraische Strukturen — Grundlage moderner Kryptographie.',
    formulas: [
      {
        id: 'lagrange-theorem',
        name: 'Satz von Lagrange',
        latex: '|H| \\;\\big|\\; |G| \\quad \\Rightarrow \\quad [G:H] = \\frac{|G|}{|H|}',
        description: 'Ordnung einer Untergruppe teilt die Ordnung der Gruppe.',
        variables: { '|G|': 'Gruppenordnung', '|H|': 'Untergruppenordnung', '[G:H]': 'Index' },
        tags: ['algebra', 'lagrange', 'group']
      },
      {
        id: 'euler-totient',
        name: 'Euler-Totientenfunktion',
        latex: '\\phi(n) = n \\prod_{p|n} \\left(1 - \\frac{1}{p}\\right)',
        description: 'Anzahl der zu n teilerfremden Zahlen — zentral für RSA.',
        variables: { '\\phi(n)': 'Euler-Totient', 'p': 'Primteiler von n' },
        tags: ['algebra', 'euler', 'rsa', 'number-theory']
      },
      {
        id: 'chinese-remainder',
        name: 'Chinesischer Restsatz',
        latex: 'x \\equiv a_i \\pmod{m_i},\\; i=1,\\ldots,k \\implies \\exists!\\; x \\pmod{\\prod m_i}',
        description: 'Existenz und Eindeutigkeit simultaner Kongruenzen — beschleunigt RSA.',
        variables: { 'a_i': 'Reste', 'm_i': 'Paarweise teilerfremde Module' },
        tags: ['algebra', 'crt', 'number-theory']
      },
      {
        id: 'discrete-log',
        name: 'Diskreter Logarithmus',
        latex: 'g^x \\equiv h \\pmod{p} \\implies x = \\log_g h',
        description: 'Basis der Diffie-Hellman und ElGamal Kryptographie — schwer für große p.',
        variables: { 'g': 'Generator', 'h': 'Zielwert', 'p': 'Primzahl', 'x': 'Diskreter Log' },
        tags: ['algebra', 'dlog', 'diffie-hellman']
      }
    ]
  },

  // ─── 16. THERMODYNAMIK & STATISTISCHE MECHANIK ────────────────────────────────
  {
    id: 'thermodynamics',
    name: 'Thermodynamik',
    icon: 'Flame',
    description: 'Statistische Mechanik und thermodynamische Gesetze — Brücke zwischen Mikro- und Makrophysik.',
    formulas: [
      {
        id: 'boltzmann-entropy',
        name: 'Boltzmann-Entropie',
        latex: 'S = k_B \\ln \\Omega',
        description: 'Verknüpft makroskopische Entropie mit der Anzahl der Mikrozustände.',
        variables: { 'S': 'Entropie', 'k_B': 'Boltzmann-Konstante', '\\Omega': 'Anzahl Mikrozustände' },
        tags: ['thermo', 'boltzmann', 'entropy']
      },
      {
        id: 'partition-function',
        name: 'Zustandssumme',
        latex: 'Z = \\sum_i e^{-E_i / k_B T}',
        description: 'Normierungsfaktor der Boltzmann-Verteilung — zentrale Größe der statistischen Mechanik.',
        variables: { 'Z': 'Zustandssumme', 'E_i': 'Energieniveau i', 'T': 'Temperatur' },
        tags: ['thermo', 'partition', 'statistical']
      },
      {
        id: 'free-energy',
        name: 'Freie Energie (Helmholtz)',
        latex: 'F = -k_B T \\ln Z = U - TS',
        description: 'Thermodynamisches Potential bei konstanter Temperatur und Volumen.',
        variables: { 'F': 'Freie Energie', 'U': 'Innere Energie', 'T': 'Temperatur', 'S': 'Entropie' },
        tags: ['thermo', 'helmholtz', 'free-energy']
      }
    ]
  },

  // ─── 17. TOPOLOGIE ────────────────────────────────────────────────────────────
  {
    id: 'topology',
    name: 'Topologie',
    icon: 'Orbit',
    description: 'Studium von Formen und Räumen unter stetigen Verformungen.',
    formulas: [
      {
        id: 'euler-characteristic',
        name: 'Euler-Charakteristik',
        latex: '\\chi = V - E + F',
        description: 'Topologische Invariante für Polyeder: Ecken minus Kanten plus Flächen.',
        variables: { '\\chi': 'Euler-Charakteristik', 'V': 'Ecken', 'E': 'Kanten', 'F': 'Flächen' },
        tags: ['topology', 'euler', 'polyhedra']
      },
      {
        id: 'fundamental-group',
        name: 'Fundamentalgruppe',
        latex: '\\pi_1(S^1) \\cong \\mathbb{Z},\\quad \\pi_1(S^n) = 0 \\;(n \\geq 2)',
        description: 'Klassifiziert Schleifen auf einem topologischen Raum bis auf stetige Deformation.',
        variables: { '\\pi_1': 'Fundamentalgruppe', 'S^n': 'n-Sphäre', '\\mathbb{Z}': 'Ganze Zahlen' },
        tags: ['topology', 'homotopy', 'fundamental-group']
      },
      {
        id: 'betti-numbers',
        name: 'Betti-Zahlen',
        latex: 'b_k = \\dim H_k(X; \\mathbb{R})',
        description: 'Zählen die k-dimensionalen "Löcher" eines topologischen Raums.',
        variables: { 'b_k': 'k-te Betti-Zahl', 'H_k': 'k-te Homologiegruppe', 'X': 'Topologischer Raum' },
        tags: ['topology', 'betti', 'homology']
      }
    ]
  },

  // ─── 18. SPIELTHEORIE ─────────────────────────────────────────────────────────
  {
    id: 'game-theory',
    name: 'Spieltheorie',
    icon: 'Swords',
    description: 'Mathematische Modellierung strategischer Interaktionen — relevant für Konsens und Kryptowährungen.',
    formulas: [
      {
        id: 'nash-equilibrium',
        name: 'Nash-Gleichgewicht',
        latex: 'u_i(s_i^*, s_{-i}^*) \\geq u_i(s_i, s_{-i}^*) \\;\\forall\\; s_i \\in S_i',
        description: 'Strategiekombination bei der kein Spieler durch einseitiges Abweichen profitiert.',
        variables: { 'u_i': 'Nutzen von Spieler i', 's_i^*': 'Gleichgewichtsstrategie', 's_{-i}^*': 'Strategien aller anderen' },
        tags: ['game-theory', 'nash', 'equilibrium']
      },
      {
        id: 'minimax',
        name: 'Minimax-Theorem',
        latex: '\\max_x \\min_y f(x,y) = \\min_y \\max_x f(x,y)',
        description: 'In Nullsummenspielen stimmen optimale Strategien überein (von Neumann, 1928).',
        variables: { 'f(x,y)': 'Auszahlungsfunktion', 'x': 'Strategie Spieler 1', 'y': 'Strategie Spieler 2' },
        tags: ['game-theory', 'minimax', 'zero-sum']
      },
      {
        id: 'mechanism-design',
        name: 'Offenbarungsprinzip',
        latex: '\\text{Jeder implementierbare Mechanismus} \\iff \\text{wahrheitsgemäßer direkter Mechanismus}',
        description: 'Grundlage des Mechanism Design — jeder Mechanismus hat ein äquivalentes direktes Protokoll.',
        variables: {},
        tags: ['game-theory', 'mechanism-design', 'incentive']
      }
    ]
  }
];
