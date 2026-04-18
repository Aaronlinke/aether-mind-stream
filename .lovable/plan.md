

Der Nutzer fragt: Was funktioniert bereits voll, was ist nur Demo/Mock, und was könnte noch gebaut werden?

## Status-Übersicht aller 23 Module

### Voll funktionsfähig (echte Berechnungen)

| Modul | Funktion | Status |
|---|---|---|
| FORMELN | 80+ Formeln, Suche, Kategorien | Voll |
| EXPORT | Markdown/LaTeX/JSON Export | Voll |
| LOGISTIK | Logistische Abbildung + Lyapunov + Bifurkation | Voll |
| PRIMZAHL | Ulam-Spirale, Faktorisierung, Goldbach | Voll |
| MATRIX | Determinante, Inverse, 2x2 Eigenwerte | Voll |
| CHIFFRE | Caesar, Vigenère, XOR, Affine + Frequenzanalyse | Voll |
| GRAPH | BFS, DFS, Dijkstra, Prim MST | Voll |
| MODULAR | GCD, CRT, Mod-Pow, Pollard-Rho, Miller-Rabin | Voll |
| SHA-256 | Echte Round-by-Round Visualisierung | Voll |
| TOOLS | Base58/Hex/Base64/SHA-256/SHA-512 | Voll |
| HEX-2D | Hexgitter D6-Symmetrie | Voll |
| HEX-3D | 3D Fourier Interferenz (Three.js) | Voll |
| LaTeX | LaTeX Export | Voll |
| CHAT | Lovable AI Gateway (Edge Function) | Voll |
| DEBATTE | ALPHA vs BETA AI Personas | Voll |

### Teilweise funktional (echte Mathe + theoretischer Layer)

| Modul | Was echt ist | Was Demo/Theorie ist |
|---|---|---|
| CHRONOS | SHA-256 Key-Evolution, PRF-Kette | "Sicherheits"-Behauptung T_K < T_A ist These |
| PIPELINE | SRIL → secp256k1 Mapping via SHA-256 | Konzeptueller Mapping-Layer |
| ANGRIFF | Visueller Race-Simulator | Angreiferzeit T_A ist simuliert, nicht real |
| INVERSION | Echte H/N/G Berechnung | Challenge-Schwierigkeit künstlich |
| NEXUS | Phasenraum, Lyapunov-Spektrum | OK – echte Numerik |
| OMNI | SRIL-Konstanten α=0.245, β=0.152 | Konstanten empirisch/erfunden |
| LINKE | secp256k1 Algebra d=(s·k−z)·r⁻¹ | Voll mathematisch korrekt |
| GITTER | 3x3 Matrix Lattice-Logik | Vereinfachtes Modell, kein echtes LLL |

### Was fehlt noch (Vorschläge)

**Visuell/Interaktiv**
- Lorenz-Attraktor 3D mit Three.js
- Mandelbrot/Julia Fraktal-Explorer mit Zoom
- Conway's Game of Life
- Voronoi/Delaunay Diagramme

**Krypto**
- RSA-Demo End-to-End (nutzt MODULAR-Bausteine)
- Echte LLL-Implementierung in GITTER
- Diffie-Hellman Visualisierung
- Elliptische Kurven Plotter (echte Punktaddition visuell)
- Shamir Secret Sharing

**Mathe**
- Fourier-Synthese Spielplatz
- ODE-Solver (Runge-Kutta) mit Vektorfeldern
- Wahrscheinlichkeits-Sandbox (Verteilungen, Bayes)
- Komplexe Funktionen Domain-Coloring

**KI/Backend**
- AI-erklärt-Formel Button in FORMELN
- AI-Lösungsschritte für MODULAR/MATRIX

## Empfehlung

Drei Richtungen zur Auswahl:
1. **Krypto vertiefen** – RSA-Demo + echtes LLL + ECC-Plotter
2. **Visuelle Mathe** – Lorenz 3D + Mandelbrot + Game of Life
3. **Demo-Module zu echt machen** – ANGRIFF mit echten Benchmarks, GITTER mit echtem LLL

Bitte sag mir welche Richtung, dann baue ich los.

