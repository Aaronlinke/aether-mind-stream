// Client-seitiger Rigor-Audit: prüft KI-Antworten auf unwissenschaftliche Sprache,
// fehlende epistemische Labels und unbelegte Zahlen. Kein Netzwerk, rein lokal.

export const BANNED_LEXICON: string[] = [
  "mystisch", "mystik", "magisch", "magie", "heilige geometrie", "sakral", "prophetie",
  "karma", "aura", "chakra", "kosmisches bewusstsein", "akasha", "seelenplan",
  "manifestieren", "alchemie", "arkan", "numerologie",
  "warp", "hyperraum", "tachyon", "subraum", "beamen", "antigravitation",
  "nullpunktenergie", "freie energie", "perpetuum mobile", "quantenbewusstsein",
  "telepathie", "teleportation",
  "revolutionär", "bahnbrechend", "geheimes wissen", "unknackbar",
  "knackt jede verschlüsselung", "löst alle probleme", "game changer",
];

export const EPISTEMIC_LABELS = [
  "[bewiesen]", "[etabliert]", "[berechnet]", "[messbar]", "[hypothese]",
  "[unverifiziert]", "[annahme]", "[korrekt]", "[fragwürdig", "[falsch",
];

export type RigorFinding = {
  kind: "lexikon" | "label" | "belege" | "physik";
  severity: "hoch" | "mittel" | "niedrig";
  msg: string;
};

export type RigorReport = {
  score: number;            // 0..100
  findings: RigorFinding[];
  labels: number;
  words: number;
};

const IMPOSSIBLE = [
  { re: /perpetuum\s*mobile|freie\s+energie|nullpunktenergie/i, msg: "Verstoß gegen Energieerhaltung / 2. Hauptsatz" },
  { re: /(bricht|knackt)\s+(aes-?256|sha-?256|secp256k1)/i, msg: "Behauptung widerspricht Stand der Kryptanalyse" },
  { re: /schneller\s+als\s+(das\s+)?licht|überlichtgeschwindigkeit/i, msg: "Verstoß gegen Relativitätstheorie" },
  { re: /löst\s+np-?vollständig.{0,20}polynomiell/i, msg: "impliziert P = NP ohne Beweis" },
];

/** Prüft einen Text und liefert Score + Fundstellen. */
export function auditText(text: string): RigorReport {
  const t = text.toLowerCase();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const findings: RigorFinding[] = [];

  for (const term of BANNED_LEXICON) {
    if (t.includes(term)) {
      findings.push({ kind: "lexikon", severity: "hoch", msg: `unwissenschaftlicher Begriff: „${term}“` });
    }
  }

  for (const p of IMPOSSIBLE) {
    if (p.re.test(text)) findings.push({ kind: "physik", severity: "hoch", msg: p.msg });
  }

  const labels = EPISTEMIC_LABELS.reduce(
    (n, l) => n + (t.split(l.toLowerCase()).length - 1), 0);

  if (words > 120 && labels === 0) {
    findings.push({ kind: "label", severity: "mittel", msg: "keine epistemischen Labels ([bewiesen]/[berechnet]/…)" });
  }

  // Zahlen ohne Rechenweg / Quelle
  const numbers = (text.match(/\d+[.,]?\d*/g) || []).length;
  const hasPath = /=|≈|mod|O\(|sum|∑|∫|Schritt|Beweis|Quelle|RFC|FIPS/i.test(text);
  if (numbers > 6 && !hasPath) {
    findings.push({ kind: "belege", severity: "mittel", msg: `${numbers} Zahlenwerte ohne gezeigten Rechenweg/Quelle` });
  }

  const penalty = findings.reduce((s, f) =>
    s + (f.severity === "hoch" ? 25 : f.severity === "mittel" ? 12 : 5), 0);
  const bonus = Math.min(10, labels * 2);
  const score = Math.max(0, Math.min(100, 100 - penalty + bonus));

  return { score, findings, labels, words };
}

/** Kurzes Verdikt für die UI. */
export function verdict(r: RigorReport): { text: string; ok: boolean } {
  if (r.findings.some(f => f.severity === "hoch")) return { text: "GEPRÜFT: BEANSTANDET", ok: false };
  if (r.score >= 88) return { text: "GEPRÜFT: FACHGERECHT", ok: true };
  if (r.score >= 70) return { text: "GEPRÜFT: MIT HINWEISEN", ok: true };
  return { text: "GEPRÜFT: SCHWACH BELEGT", ok: false };
}

/** Nachforderung an die KI, wenn der Audit durchfällt. */
export function repairPrompt(r: RigorReport): string {
  return `Deine letzte Antwort hat die Rigor-Prüfung nicht bestanden:\n` +
    r.findings.map(f => `- [${f.severity}] ${f.msg}`).join("\n") +
    `\n\nSchreibe die Antwort neu: verbotene Begriffe durch Fachtermini ersetzen, ` +
    `jede nicht-triviale Aussage mit [bewiesen]/[etabliert]/[berechnet]/[messbar]/[hypothese]/[unverifiziert] ` +
    `labeln, Zahlen mit vollständigem Rechenweg belegen. Nur die korrigierte Antwort ausgeben.`;
}
