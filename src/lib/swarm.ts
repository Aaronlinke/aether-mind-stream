// SCHWARM: Kollektiv-Orchestrator mit Mikro-Agenten.
//
// Architektur (geschlossener Regelkreis):
//   1. KERN-AGENTEN denken parallel an derselben Aufgabe, sehen aber alle dasselbe
//      Blackboard (gemeinsames Gedaechtnis) -> "jeder denkt mit jedem".
//   2. Jeder Kern-Agent darf MIKRO-AGENTEN schalten: kleine, exakt umrissene
//      Einzelaufgaben (eine Rechnung, eine Pruefung, ein Gegenbeispiel).
//      Mikro-Agenten laufen kurz, billig und schreiben ihr Ergebnis ins Blackboard.
//   3. Jeder Kern-Agent haelt zusaetzlich EINEN eigenen divergenten Gedanken
//      (Spur), den er ueber alle Runden weiterdenkt -> kein Gedanke geht verloren.
//   4. SCHLIESSUNG: Synthese-Agent bildet Konsens, listet offene Punkte und
//      uebernimmt jede divergente Spur explizit. Danach ist der Zyklus "zu".
//
// Alle Modell-Aufrufe laufen ueber die Edge Function math-chat (Rigor-Verfassung aktiv).

import { callMathChat } from "./aiStream";
import type { CustomKeys } from "./aiModels";

export type SwarmPhase = "idle" | "denken" | "mikro" | "synthese" | "fertig" | "fehler";

export type MicroTask = {
  id: string;
  parent: string;      // Name des Kern-Agenten
  round: number;
  spec: string;        // Auftrag
  result?: string;
  status: "offen" | "laeuft" | "fertig" | "fehler";
  ms?: number;
};

export type CoreAgent = {
  id: string;
  name: string;
  role: string;
  model: string;
  /** eigener, weitergedachter Gedanke (divergente Spur) */
  divergent: string;
  contributions: string[];
  microCount: number;
};

export type BlackboardEntry = {
  round: number;
  kind: "beitrag" | "mikro" | "divergent" | "synthese";
  author: string;
  text: string;
  t: number;
};

export type SwarmRun = {
  task: string;
  rounds: number;
  agents: CoreAgent[];
  micro: MicroTask[];
  blackboard: BlackboardEntry[];
  synthesis: string;
  startedAt: number;
  finishedAt?: number;
};

export const DEFAULT_ROLES: Array<{ name: string; role: string }> = [
  { name: "ALPHA", role: "Konstruktiver Rechner: fuehrt die Aufgabe exakt und schrittweise aus (BigInt/rational bevorzugt)." },
  { name: "BETA", role: "Falsifikator: sucht Gegenbeispiele, Rand- und Entartungsfaelle, prueft jede Behauptung gegen." },
  { name: "GAMMA", role: "Strukturtheoretiker: sucht Invarianten, Symmetrien, Abbildungen auf bekannte Saetze." },
  { name: "DELTA", role: "Numerik/Komplexitaet: Fehlerabschaetzung, Stabilitaet, Laufzeit in O-Notation, Bit-Aufwand." },
  { name: "EPSILON", role: "Methodenoeffner: sucht einen nicht offensichtlichen, aber pruefbaren Loesungsweg abseits des Standardpfads." },
  { name: "ZETA", role: "Quellen/Definitionen: praezisiert Begriffe, nennt Normen und Referenzsaetze (nur real existierende)." },
];

const MARK = {
  beitrag: "###BEITRAG",
  mikro: "###MIKRO",
  eigen: "###EIGEN",
};

function section(text: string, marker: string): string {
  const i = text.indexOf(marker);
  if (i < 0) return "";
  const rest = text.slice(i + marker.length);
  const next = Object.values(MARK)
    .map((m) => rest.indexOf(m))
    .filter((p) => p >= 0)
    .sort((a, b) => a - b)[0];
  return (next === undefined ? rest : rest.slice(0, next)).trim();
}

function parseMicroSpecs(block: string, limit: number): string[] {
  return block
    .split("\n")
    .map((l) => l.replace(/^[\s\-*\u2022\d.)]+/, "").trim())
    .filter((l) => l.length > 8 && !/^keine\b/i.test(l))
    .slice(0, limit);
}

/** Kleiner Concurrency-Limiter (Rate-Limits schonen). */
async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (idx < items.length) {
      const my = idx++;
      await fn(items[my], my);
    }
  });
  await Promise.all(workers);
}

function boardDigest(bb: BlackboardEntry[], maxChars = 3200): string {
  const lines = bb.map((e) => `[R${e.round} ${e.kind.toUpperCase()} ${e.author}] ${e.text.replace(/\s+/g, " ").slice(0, 420)}`);
  let out = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    if (out.length + lines[i].length > maxChars) break;
    out = lines[i] + "\n" + out;
  }
  return out.trim() || "(leer)";
}

export type SwarmOptions = {
  task: string;
  rounds?: number;
  model: string;
  microModel?: string;
  agentCount?: number;
  maxMicroPerAgent?: number;
  concurrency?: number;
  customKeys?: CustomKeys;
  strictMode?: boolean;
  signal?: AbortSignal;
  onEvent?: (run: SwarmRun, phase: SwarmPhase, note?: string) => void;
};

export async function runSwarm(opts: SwarmOptions): Promise<SwarmRun> {
  const rounds = Math.max(1, Math.min(opts.rounds ?? 2, 5));
  const count = Math.max(2, Math.min(opts.agentCount ?? 4, DEFAULT_ROLES.length));
  const maxMicro = Math.max(0, Math.min(opts.maxMicroPerAgent ?? 2, 4));
  const conc = Math.max(1, Math.min(opts.concurrency ?? 4, 8));
  const microModel = opts.microModel ?? opts.model;

  const agents: CoreAgent[] = DEFAULT_ROLES.slice(0, count).map((r, i) => ({
    id: `a${i}`,
    name: r.name,
    role: r.role,
    model: opts.model,
    divergent: "",
    contributions: [],
    microCount: 0,
  }));

  const run: SwarmRun = {
    task: opts.task,
    rounds,
    agents,
    micro: [],
    blackboard: [],
    synthesis: "",
    startedAt: Date.now(),
  };
  const emit = (phase: SwarmPhase, note?: string) => opts.onEvent?.({ ...run }, phase, note);

  const push = (e: Omit<BlackboardEntry, "t">) => {
    run.blackboard.push({ ...e, t: Date.now() });
  };

  try {
    for (let r = 1; r <= rounds; r++) {
      // ---- Phase 1: Kern-Agenten denken parallel, sehen dasselbe Blackboard ----
      emit("denken", `Runde ${r}/${rounds}: ${agents.length} Kern-Agenten`);
      const digest = boardDigest(run.blackboard);

      await pool(agents, conc, async (ag) => {
        if (opts.signal?.aborted) return;
        const sys =
          `Du bist Kern-Agent ${ag.name} in einem Kollektiv aus ${agents.length} Agenten.\n` +
          `Rolle: ${ag.role}\n` +
          `Du siehst das gemeinsame Blackboard aller Agenten und denkst MIT dem Kollektiv, ` +
          `behaeltst aber genau EINEN eigenen, divergenten Gedanken, den du ueber alle Runden weiterdenkst.\n` +
          `Du kannst MIKRO-AGENTEN schalten: hoechstens ${maxMicro} atomare Einzelaufgaben, ` +
          `jede in einer Zeile, jede fuer sich ohne Kontext loesbar (eine Rechnung, eine Pruefung, ein Gegenbeispiel, eine Definition).\n` +
          `Antworte AUSSCHLIESSLICH in diesem Format, ohne Vorrede:\n` +
          `${MARK.beitrag}\n<dein sachlicher Beitrag zur Aufgabe, mit Rechenweg oder Pruefschritt>\n` +
          `${MARK.mikro}\n<je Zeile eine Mikroaufgabe, oder "keine">\n` +
          `${MARK.eigen}\n<dein eigener divergenter Gedanke, weitergedacht statt wiederholt; er darf riskant sein, muss aber pruefbar formuliert sein>`;

        const user =
          `AUFGABE: ${opts.task}\n\n` +
          `BLACKBOARD (Kollektiv, gekuerzt):\n${digest}\n\n` +
          (ag.divergent ? `DEINE BISHERIGE EIGENE SPUR:\n${ag.divergent}\n\n` : "") +
          `Runde ${r} von ${rounds}. Wiederhole nichts, was schon im Blackboard steht; ergaenze oder widerlege es.`;

        const out = await callMathChat({
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
          model: ag.model,
          customKeys: opts.customKeys,
          strictMode: opts.strictMode,
          signal: opts.signal,
          source: `schwarm/${ag.name}`,
        });

        const beitrag = section(out, MARK.beitrag) || out.trim();
        const eigen = section(out, MARK.eigen);
        const specs = parseMicroSpecs(section(out, MARK.mikro), maxMicro);

        ag.contributions.push(beitrag);
        push({ round: r, kind: "beitrag", author: ag.name, text: beitrag });
        if (eigen) {
          ag.divergent = eigen;
          push({ round: r, kind: "divergent", author: ag.name, text: eigen });
        }
        for (const spec of specs) {
          run.micro.push({
            id: `m${run.micro.length}`,
            parent: ag.name,
            round: r,
            spec,
            status: "offen",
          });
          ag.microCount++;
        }
        emit("denken", `${ag.name} fertig (Runde ${r})`);
      });

      if (opts.signal?.aborted) break;

      // ---- Phase 2: Mikro-Agenten abarbeiten ----
      const open = run.micro.filter((m) => m.status === "offen");
      if (open.length) {
        emit("mikro", `${open.length} Mikro-Agenten (Runde ${r})`);
        await pool(open, conc, async (mt) => {
          if (opts.signal?.aborted) return;
          mt.status = "laeuft";
          emit("mikro", `${mt.parent} → ${mt.spec.slice(0, 60)}`);
          const t0 = performance.now();
          try {
            const res = await callMathChat({
              messages: [
                {
                  role: "system",
                  content:
                    `Du bist ein Mikro-Agent fuer genau EINE atomare Teilaufgabe. ` +
                    `Antworte maximal 120 Woerter, ohne Einleitung, ohne Wiederholung der Frage. ` +
                    `Struktur: Ergebnis, Rechenweg/Begruendung in einer Zeile, dann "PRUEFUNG:" mit Gegenprobe oder Testvektor. ` +
                    `Wenn die Aufgabe unentscheidbar oder unterbestimmt ist, schreibe "UNBESTIMMT:" und warum.`,
                },
                { role: "user", content: `Kontextaufgabe (nur zur Orientierung): ${opts.task}\n\nMIKROAUFGABE: ${mt.spec}` },
              ],
              model: microModel,
              customKeys: opts.customKeys,
              strictMode: opts.strictMode,
              signal: opts.signal,
              svrc: false, // Mikro-Agenten bleiben schlank
              rigor: false,
              source: `mikro/${mt.parent}`,
            });
            mt.result = res.trim();
            mt.status = "fertig";
            mt.ms = Math.round(performance.now() - t0);
            push({ round: r, kind: "mikro", author: `${mt.parent}/µ`, text: `${mt.spec} → ${mt.result}` });
          } catch (e) {
            mt.status = "fehler";
            mt.result = e instanceof Error ? e.message : "Fehler";
            mt.ms = Math.round(performance.now() - t0);
          }
          emit("mikro");
        });
      }
    }

    // ---- Phase 3: Schliessung ----
    if (!opts.signal?.aborted) {
      emit("synthese", "Kollektiv wird geschlossen");
      const microBlock = run.micro
        .filter((m) => m.status === "fertig")
        .map((m) => `- [${m.parent}/µ] ${m.spec}\n  ${m.result?.replace(/\s+/g, " ").slice(0, 400)}`)
        .join("\n");
      const divergentBlock = agents
        .filter((a) => a.divergent)
        .map((a) => `- ${a.name}: ${a.divergent.replace(/\s+/g, " ").slice(0, 400)}`)
        .join("\n");

      run.synthesis = await callMathChat({
        messages: [
          {
            role: "system",
            content:
              `Du schliesst ein Kollektiv aus ${agents.length} Kern-Agenten und ${run.micro.length} Mikro-Agenten ab. ` +
              `Du erfindest nichts hinzu; du verdichtest, entscheidest bei Widerspruechen begruendet und markierst Unentschiedenes als offen. ` +
              `Struktur:\n1. ERGEBNIS (die Loesung, exakt, mit Rechenweg)\n2. BELEGE (welche Mikro-Ergebnisse tragen das Ergebnis)\n` +
              `3. WIDERSPRUECHE (aufgeloest oder offen, jeweils mit Begruendung)\n4. DIVERGENTE SPUREN (jede Spur einzeln: tragfaehig / widerlegt / offen, mit naechstem Pruefschritt)\n` +
              `5. GESCHLOSSEN? (ja/nein + welche Restluecke bleibt)`,
          },
          {
            role: "user",
            content:
              `AUFGABE: ${opts.task}\n\nBLACKBOARD:\n${boardDigest(run.blackboard, 6000)}\n\n` +
              `MIKRO-ERGEBNISSE:\n${microBlock || "(keine)"}\n\nDIVERGENTE SPUREN:\n${divergentBlock || "(keine)"}`,
          },
        ],
        model: opts.model,
        customKeys: opts.customKeys,
        strictMode: opts.strictMode,
        signal: opts.signal,
        source: "schwarm/synthese",
      });
      push({ round: rounds, kind: "synthese", author: "KOLLEKTIV", text: run.synthesis });
    }

    run.finishedAt = Date.now();
    emit("fertig");
    return run;
  } catch (e) {
    run.finishedAt = Date.now();
    emit("fehler", e instanceof Error ? e.message : "Fehler");
    throw e;
  }
}
