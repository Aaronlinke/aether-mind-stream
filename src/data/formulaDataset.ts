// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS MATHEMATICS EXPLORER — Vollständiges Formel-Dataset v1.0.0
// Proper LaTeX syntax for KaTeX rendering
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
        latex: '\\lambda = \\lim_{N \\to \\infty} \\frac{1}{N} \\sum_{i=0}^{N-1} \\ln |f\'(x_i)|',
        description: 'Quantifiziert die Rate der Separation infinitesimal naher Trajektorien.',
        variables: { '\\lambda': 'Lyapunov-Exponent', 'f\'(x_i)': 'Ableitung am Punkt x_i', 'N': 'Iterationen' },
        tags: ['chaos', 'lyapunov', 'sensitivity']
      },
      {
        id: 'lorenz-system',
        name: 'Lorenz-Attraktor',
        latex: '\\frac{dx}{dt} = \\sigma(y-x),\\; \\frac{dy}{dt} = x(\\rho-z)-y,\\; \\frac{dz}{dt} = xy - \\beta z',
        description: 'System von ODEs mit chaotischen Lösungen — modelliert atmosphärische Konvektion.',
        variables: { '\\sigma': 'Prandtl-Zahl', '\\rho': 'Rayleigh-Zahl', '\\beta': 'Geometrischer Faktor' },
        tags: ['chaos', 'lorenz', 'attractor', 'ode']
      },
      {
        id: 'feigenbaum-constant',
        name: 'Feigenbaum-Konstante',
        latex: '\\delta = \\lim_{n \\to \\infty} \\frac{a_{n-1} - a_{n-2}}{a_n - a_{n-1}} = 4.669201\\ldots',
        description: 'Universelle Konstante für Periodenverdopplungskaskaden.',
        variables: { '\\delta': 'Feigenbaum-Konstante', 'a_n': 'Parameterwert bei n-ter Bifurkation' },
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
  {
    id: 'information-theory',
    name: 'Informationstheorie',
    icon: 'Binary',
    description: 'Grundlagen zur Messung, Speicherung und Übertragung von Informationen.',
    formulas: [
      {
        id: 'shannon-entropy',
        name: 'Shannon-Entropie',
        latex: 'H(X) = -\\sum p(x) \\cdot \\log_2(p(x))',
        description: 'Informationsgehalt einer Quelle in Bits.',
        variables: { 'H': 'Entropie in Bits', 'p(x)': 'Wahrscheinlichkeit von x' },
        tags: ['information', 'shannon', 'entropy']
      },
      {
        id: 'mutual-info',
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
        description: 'Kürzestes Programm das x erzeugt.',
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
        latex: '\\|b_1^*\\| \\leq 2^{(n-1)/4} (\\det L)^{1/n}',
        description: 'Obere Schranke des LLL-Gitterbasisreduktionsalgorithmus.',
        variables: { 'b_1^*': 'Kürzester reduzierter Basisvektor', 'n': 'Gitterdimension', '\\det L': 'Gitterdeterminante' },
        tags: ['lattice', 'lll', 'reduction']
      },
      {
        id: 'svp-hardness',
        name: 'SVP-Approximation',
        latex: '\\|v\\| \\leq \\gamma(n) \\cdot \\lambda_1(L)',
        description: 'Approximationsfaktor für das Shortest Vector Problem.',
        variables: { 'v': 'Gefundener Vektor', '\\gamma(n)': 'Approximationsfaktor', '\\lambda_1(L)': 'Kürzester Vektor' },
        tags: ['lattice', 'svp', 'hardness']
      },
      {
        id: 'learning-with-errors',
        name: 'Learning With Errors (LWE)',
        latex: 'b = \\langle a, s \\rangle + e \\pmod{q}',
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
        latex: 'O(\\sqrt{N}) \\text{ vs } O(N) \\text{ klassisch}',
        description: 'Quadratische Quanten-Beschleunigung für unstrukturierte Suche.',
        variables: { 'N': 'Suchraum-Größe' },
        tags: ['attack', 'grover', 'quantum']
      },
      {
        id: 'shor-period',
        name: 'Shor-Algorithmus (Periodenfindung)',
        latex: 'r : a^r \\equiv 1 \\pmod{N},\\quad \\gcd(a^{r/2} \\pm 1, N)',
        description: 'Quantenalgorithmus zur Faktorzerlegung in Polynomialzeit — bedroht RSA.',
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
        latex: '\\text{P} \\subseteq \\text{NP},\\quad \\text{P} \\stackrel{?}{=} \\text{NP}',
        description: 'Hat jedes polynomial verifizierbare Problem auch eine polynomialzeitliche Lösung?',
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
  }
];
