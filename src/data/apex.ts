// APEX — SRIL-Engine v3 Konfiguration (Referenz-Dump)
// Koeffizienten und Riccati-DGL aus dem OmniGenesis/SRIL-Protokoll.

export const APEX_CONFIG = {
  version: "SRIL-Engine v3.0 / OmniGenesis-Final",
  coefficients: {
    alpha: 0.245,   // H-Kopplung
    beta:  0.152,   // N-Kopplung
    gamma: 0.985,   // G-Dämpfung / Lock-Faktor
    delta: 0.112,   // Cross-term
    eta:   0.088,   // Stochastik / Rausch-Korrektur
  },
  riccati: {
    // dP/dt = A·P + P·Aᵀ − P·B·R⁻¹·Bᵀ·P + Q
    description:
      "Matrix-Riccati-Differentialgleichung steuert die Kovarianz-Evolution P(t) im SRIL-Phasenraum (H, N, G).",
    latex:
      "\\dot{P}(t) = A P + P A^\\top - P B R^{-1} B^\\top P + Q",
    state: ["H (Hash-Phase)", "N (Nonce-Phase)", "G (Generator-Phase)"],
  },
  evolution: {
    description: "CHRONOS-Kettenregel für Schlüssel-Evolution",
    latex: "K_{n+1} = \\mathrm{PRF}(K_n, t_n, s)",
  },
  derivation: {
    pipeline: "(h, n, g, o, r, i) → d → WIF → Q → Adresse",
    inverse: "Adresse → Hash160 → (nicht invertierbar)",
    nonceReuse: "(r, s₁, s₂, z₁, z₂) → d (eindeutig)",
  },
} as const;

export const APEX_MD = `# APEX · SRIL-Engine v3

## Koeffizienten
- α = 0.245 (H-Kopplung)
- β = 0.152 (N-Kopplung)
- γ = 0.985 (G-Dämpfung / Lock-Faktor)
- δ = 0.112 (Cross-term)
- η = 0.088 (Rausch-Korrektur)

## Matrix-Riccati-DGL
\`\`\`
dP/dt = A·P + P·Aᵀ − P·B·R⁻¹·Bᵀ·P + Q
\`\`\`
Zustand: (H, N, G) im SRIL-Phasenraum.

## CHRONOS-Evolution
\`\`\`
K_{n+1} = PRF(K_n, t_n, s)
\`\`\`

## Pipeline
Vorwärts: (h, n, g, o, r, i) → d → WIF → Q → Adresse
Rückwärts: Adresse → Hash160 → ⊥
Nonce-Reuse: (r, s₁, s₂, z₁, z₂) → d
`;
