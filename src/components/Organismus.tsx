import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── ORGANISMUS ─────────────────────────────────────────────────────────────
// Vereinigt: OmegaKernel-Boot · QuantumResonanceTunnel-Bus ·
// NovaNexus Layer (Perceptual/Cognitive/Meta) · Aethel Service-Graph ·
// RL-Policy Heatmap · NCI HyperProtocol Broadcast
// Reine Frontend-Simulation, deterministisch, kein Backend nötig.
// ────────────────────────────────────────────────────────────────────────────

type LayerKey = "perceptual" | "cognitive" | "meta" | "service" | "economy";

const LAYERS: Record<LayerKey, { label: string; modules: string[] }> = {
  perceptual: {
    label: "PERCEPTUAL",
    modules: ["SensoryExt", "SensoryInt", "PatternDetector", "ContextMapper", "MemoryEcho"],
  },
  cognitive: {
    label: "COGNITIVE",
    modules: ["LogicalProcessor", "EmergentController", "MultimodalFusion", "NeuralModule"],
  },
  meta: {
    label: "META",
    modules: ["OmniMeta", "SelfSupervisedLearner", "RLPolicy", "Oracle"],
  },
  service: {
    label: "SERVICE",
    modules: ["Auth", "Data", "Knowledge", "Optimizer", "Simulator", "Stream"],
  },
  economy: {
    label: "ECONOMY",
    modules: ["BS-Coin", "TaskBroker", "ResourceMarket", "GameLoop"],
  },
};

type BusMessage = {
  id: number;
  source: string;
  target: string;
  payload: string;
  t: number;
};

type Policy = Record<string, number>; // module → q-value [0..1]

const ALL_MODULES = Object.values(LAYERS).flatMap((l) => l.modules);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export function Organismus() {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [bootPhase, setBootPhase] = useState(0); // 0..LAYERS.length
  const [bus, setBus] = useState<BusMessage[]>([]);
  const [policy, setPolicy] = useState<Policy>(() => {
    const p: Policy = {};
    ALL_MODULES.forEach((m) => (p[m] = hash(m) * 0.3));
    return p;
  });
  const [seed, setSeed] = useState("AETHEL-OMEGA-NOVA");
  const msgIdRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Boot sequence
  useEffect(() => {
    if (!running) return;
    if (bootPhase < Object.keys(LAYERS).length) {
      const t = setTimeout(() => setBootPhase((p) => p + 1), 350);
      return () => clearTimeout(t);
    }
  }, [running, bootPhase]);

  // Tick loop
  const loop = useCallback(() => {
    setTick((t) => t + 1);
    rafRef.current = window.setTimeout(loop, 600) as unknown as number;
  }, []);

  useEffect(() => {
    if (running && bootPhase >= Object.keys(LAYERS).length) {
      loop();
      return () => {
        if (rafRef.current) clearTimeout(rafRef.current);
      };
    }
  }, [running, bootPhase, loop]);

  // Per tick: emit bus messages + RL policy update
  useEffect(() => {
    if (!running || tick === 0) return;

    const seedHash = hash(seed + tick);
    const layerKeys = Object.keys(LAYERS) as LayerKey[];
    const newMsgs: BusMessage[] = [];

    for (let i = 0; i < 3; i++) {
      const sl = layerKeys[Math.floor((seedHash * 1000 + i * 7) % layerKeys.length)];
      const tl = layerKeys[Math.floor((seedHash * 2000 + i * 11) % layerKeys.length)];
      const src = LAYERS[sl].modules[Math.floor((seedHash * 100 + i) % LAYERS[sl].modules.length)];
      const tgt = LAYERS[tl].modules[Math.floor((seedHash * 200 + i) % LAYERS[tl].modules.length)];
      newMsgs.push({
        id: msgIdRef.current++,
        source: src,
        target: tgt,
        payload: ["resonance", "blueprint", "reward", "signal", "echo"][i % 5] +
          `(${(seedHash * 1000).toFixed(0)})`,
        t: tick,
      });
    }

    setBus((b) => [...newMsgs, ...b].slice(0, 40));

    // RL update
    setPolicy((p) => {
      const next = { ...p };
      newMsgs.forEach((m) => {
        const reward = hash(m.target + tick) * 0.4 - 0.1;
        next[m.target] = Math.max(0, Math.min(1, (next[m.target] ?? 0.1) + 0.25 * reward));
      });
      // decay
      Object.keys(next).forEach((k) => (next[k] = next[k] * 0.995));
      return next;
    });
  }, [tick, running, seed]);

  const start = () => {
    setRunning(true);
    setBootPhase(0);
    setBus([]);
    setTick(0);
  };

  const stop = () => {
    setRunning(false);
    if (rafRef.current) clearTimeout(rafRef.current);
  };

  const layerKeys = Object.keys(LAYERS) as LayerKey[];

  return (
    <div className="h-full overflow-y-auto p-4 max-w-6xl mx-auto space-y-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium">ORGANISMUS</h1>
        <p className="text-xs text-muted-foreground mt-1">
          OmegaKernel · QuantumTunnel-Bus · NovaNexus-Layer · RL-Policy · Aethel-Services
        </p>
      </header>

      {/* Controls */}
      <div className="flex gap-2 items-center">
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          disabled={running}
          className="flex-1 bg-input border border-border px-3 py-2 text-sm font-mono"
          placeholder="Seed..."
        />
        {!running ? (
          <Button onClick={start} size="sm" variant="outline">
            <Play className="h-3 w-3 mr-1" /> BOOT
          </Button>
        ) : (
          <Button onClick={stop} size="sm" variant="outline">
            <Square className="h-3 w-3 mr-1" /> HALT
          </Button>
        )}
      </div>

      {/* Boot log */}
      <div className="border border-border p-3 text-xs font-mono space-y-1">
        <div className="text-muted-foreground">// boot-sequence</div>
        {layerKeys.map((k, i) => (
          <div key={k} className={i < bootPhase ? "text-foreground" : "text-muted-foreground/40"}>
            {i < bootPhase ? "[OK] " : "[..] "} mount layer:{LAYERS[k].label.toLowerCase()}{" "}
            ({LAYERS[k].modules.length} modules)
          </div>
        ))}
        {running && bootPhase >= layerKeys.length && (
          <div className="text-foreground pt-1 flex items-center gap-2">
            <Zap className="h-3 w-3" /> kernel online · tick={tick}
          </div>
        )}
      </div>

      {/* Layer grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {layerKeys.map((k) => (
          <div key={k} className="border border-border p-2">
            <div className="text-[10px] font-medium mb-2 border-b border-border pb-1">
              {LAYERS[k].label}
            </div>
            <div className="space-y-1">
              {LAYERS[k].modules.map((m) => {
                const q = policy[m] ?? 0;
                return (
                  <div key={m} className="text-[10px] font-mono flex items-center gap-1">
                    <div
                      className="h-1 bg-foreground transition-all"
                      style={{ width: `${Math.max(2, q * 40)}px` }}
                    />
                    <span className="truncate">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bus */}
      <div className="border border-border">
        <div className="border-b border-border px-3 py-2 text-xs font-medium flex justify-between">
          <span>QUANTUM-TUNNEL · message bus</span>
          <span className="text-muted-foreground">{bus.length} msg</span>
        </div>
        <div className="max-h-64 overflow-y-auto p-2 font-mono text-[10px] space-y-0.5">
          {bus.length === 0 && (
            <div className="text-muted-foreground">// kein traffic — start drücken</div>
          )}
          {bus.map((m) => (
            <div key={m.id} className="flex gap-2">
              <span className="text-muted-foreground w-8">t{m.t}</span>
              <span className="w-28 truncate">{m.source}</span>
              <span className="text-muted-foreground">→</span>
              <span className="w-28 truncate">{m.target}</span>
              <span className="text-muted-foreground truncate">{m.payload}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RL policy heatmap */}
      <div className="border border-border p-3">
        <div className="text-xs font-medium mb-2">RL-POLICY · q-values</div>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-0.5">
          {ALL_MODULES.map((m) => {
            const q = policy[m] ?? 0;
            const shade = Math.floor(q * 255);
            return (
              <div
                key={m}
                title={`${m}: ${q.toFixed(3)}`}
                className="aspect-square border border-border/30"
                style={{ background: `rgb(${shade},${shade},${shade})` }}
              />
            );
          })}
        </div>
        <div className="text-[10px] text-muted-foreground mt-2 font-mono">
          schwarz=0 · weiß=1 · adaptive belohnung pro tunnel-message
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
        Konzepte: Aethel Sentient Core · Mega-UCL Mother Code · Seed Core · NCI Hyper-Zelle ·
        Lumina · Black Sultan Omega One · Nova Nexus
      </div>
    </div>
  );
}
