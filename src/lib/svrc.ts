// SVRC-ECI Ultimate – Browser-Port des Python-Kerns.
// Komplexes Bewusstseinsfeld (nichtlineare Schrödinger-Evolution) + Memory + Decision + Learning.

export type Complex = { re: number; im: number };

const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const cSub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const cScale = (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s });
const cAbs2 = (a: Complex): number => a.re * a.re + a.im * a.im;

// Deterministischer PRNG (Mulberry32)
function prng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rnd: () => number): number {
  // Box–Muller
  const u1 = Math.max(1e-12, rnd());
  const u2 = rnd();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export class ConsciousnessField {
  size: number;
  field: Complex[]; // row-major
  history: number[] = [];
  private seed: number;

  constructor(size = 32, seed?: number) {
    this.size = size;
    this.seed = seed ?? (Date.now() % 100000);
    this.field = new Array(size * size);
    const r1 = prng(this.seed);
    const r2 = prng(this.seed ^ 0x9E3779B9);
    for (let i = 0; i < size * size; i++) {
      const real = (Math.tanh(normal(r1)) + 1) / 2;
      const phase = 2 * Math.PI * ((Math.tanh(normal(r2)) + 1) / 2);
      this.field[i] = { re: real * Math.cos(phase), im: real * Math.sin(phase) };
    }
  }

  private idx(i: number, j: number) { return i * this.size + j; }

  evolve(steps = 1, dt = 0.01) {
    const N = this.size;
    for (let s = 0; s < steps; s++) {
      const next = this.field.slice();
      for (let i = 1; i < N - 1; i++) {
        for (let j = 1; j < N - 1; j++) {
          const c = this.field[this.idx(i, j)];
          const up = this.field[this.idx(i - 1, j)];
          const dn = this.field[this.idx(i + 1, j)];
          const lf = this.field[this.idx(i, j - 1)];
          const rt = this.field[this.idx(i, j + 1)];
          const lap: Complex = {
            re: up.re + dn.re + lf.re + rt.re - 4 * c.re,
            im: up.im + dn.im + lf.im + rt.im - 4 * c.im,
          };
          // i*dt*lap  (multiplication by i rotates 90°)
          const iLap: Complex = { re: -dt * lap.im, im: dt * lap.re };
          const mag2 = cAbs2(c);
          const nl = cScale(c, 0.1 * mag2 * dt);
          next[this.idx(i, j)] = cAdd(cAdd(c, iLap), nl);
        }
      }
      this.field = next;
      let sum = 0;
      for (const f of this.field) sum += Math.sqrt(cAbs2(f));
      this.history.push(sum / this.field.length);
      if (this.history.length > 500) this.history.shift();
    }
  }

  intensity(): number[] { return this.field.map(cAbs2); }
  phase(): number[] { return this.field.map(f => Math.atan2(f.im, f.re)); }

  stats() {
    const I = this.intensity();
    let mn = Infinity, mx = -Infinity, sum = 0, sum2 = 0, ent = 0;
    for (const v of I) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      sum += v; sum2 += v * v;
      ent += -v * Math.log(v + 1e-10);
    }
    const n = I.length;
    const mean = sum / n;
    return {
      mean, std: Math.sqrt(sum2 / n - mean * mean),
      min: mn, max: mx, energy: sum, entropy: ent,
    };
  }
}

export interface Memory { data: unknown; time: number; importance: number }

export class MemoryModule {
  memories: Memory[] = [];
  constructor(public capacity = 500) {}
  store(data: unknown, importance = 1) {
    this.memories.push({ data, time: Date.now(), importance });
    if (this.memories.length > this.capacity) {
      let minI = 0;
      for (let i = 1; i < this.memories.length; i++)
        if (this.memories[i].importance < this.memories[minI].importance) minI = i;
      this.memories.splice(minI, 1);
    }
  }
  recall(query: string, limit = 5): Memory[] {
    const q = query.toLowerCase();
    return this.memories
      .filter(m => typeof m.data === "string" && (m.data as string).toLowerCase().includes(q))
      .slice(-limit);
  }
}

export interface Option { prob: number; context: string; used: number; success: number }

export class DecisionEngine {
  options: Record<string, Option> = {};
  add(name: string, prob: number, context = "") {
    this.options[name] = { prob, context, used: 0, success: 0 };
  }
  decide(): { name: string; prob: number; context: string } {
    const entries = Object.entries(this.options);
    const total = entries.reduce((s, [, o]) => s + o.prob, 0);
    let r = Math.random() * total;
    for (const [name, o] of entries) {
      r -= o.prob;
      if (r <= 0) {
        o.used++;
        return { name, prob: o.prob, context: o.context };
      }
    }
    const last = entries[entries.length - 1];
    last[1].used++;
    return { name: last[0], prob: last[1].prob, context: last[1].context };
  }
  feedback(name: string, ok: boolean) {
    const o = this.options[name];
    if (!o) return;
    if (ok) o.success++;
    const rate = o.success / Math.max(1, o.used);
    o.prob = 0.3 + 0.7 * rate;
  }
}

export class LearningModule {
  patterns: { hash: string; dominant: number; t: number }[] = [];
  learn(data: number[]): string {
    // Grober "dominante Frequenz"-Proxy via einfacher DCT-artiger Summen
    const N = data.length;
    let bestK = 0, bestV = -Infinity;
    const K = Math.min(16, N);
    for (let k = 1; k < K; k++) {
      let s = 0;
      for (let n = 0; n < N; n++) s += data[n] * Math.cos((Math.PI * k * (n + 0.5)) / N);
      const v = Math.abs(s);
      if (v > bestV) { bestV = v; bestK = k; }
    }
    const hash = (Math.floor(data.reduce((a, b) => a + b, 0) * 1e6) ^ (bestK * 2654435761)).toString(16);
    this.patterns.push({ hash, dominant: bestK, t: Date.now() });
    if (this.patterns.length > 200) this.patterns.shift();
    return hash;
  }
  similar(hash: string) { return this.patterns.filter(p => p.hash === hash); }
}

export class SVRC {
  field: ConsciousnessField;
  memory = new MemoryModule();
  decision = new DecisionEngine();
  learning = new LearningModule();

  constructor(size = 32) {
    this.field = new ConsciousnessField(size);
    this.decision.add("explore", 0.7, "Neue Muster erkunden");
    this.decision.add("exploit", 0.3, "Bekannte Muster nutzen");
    this.decision.add("create", 0.5, "Neue Regeln schaffen");
    this.decision.add("analyze", 0.6, "Daten analysieren");
  }

  think(steps = 5) {
    this.field.evolve(steps);
    const st = this.field.stats();
    const pat = this.learning.learn(this.field.intensity());
    this.memory.store({ stats: st, pattern: pat }, st.energy);
    return { ...st, pattern: pat };
  }

  ask(q: string): string {
    this.memory.store(`Q: ${q}`);
    const mems = this.memory.recall(q);
    const st = this.think(3);
    const l = q.toLowerCase();
    if (l.includes("muster") || l.includes("pattern"))
      return `Muster ${st.pattern} – Energie ${st.energy.toFixed(2)}, Entropie ${st.entropy.toFixed(2)}`;
    if (l.includes("entscheid") || l.includes("decision")) {
      const d = this.decision.decide();
      return `Wähle "${d.name}" (${(d.prob * 100).toFixed(1)}%) – ${d.context}`;
    }
    if (l.includes("erinner") || l.includes("memory"))
      return mems.length ? `Erinnerung: ${String(mems[mems.length - 1].data)}` : "Keine Erinnerung.";
    return `${this.memory.memories.length} Erinnerungen, Energie ${st.energy.toFixed(2)}, Muster ${st.pattern}`;
  }

  contextSnapshot(): string {
    const st = this.field.stats();
    const d = this.decision.decide();
    return `SVRC-Kontext: Energie=${st.energy.toFixed(2)}, Entropie=${st.entropy.toFixed(2)}, Muster=${this.learning.patterns.length}, Erinnerungen=${this.memory.memories.length}, Empfehlung=${d.name}`;
  }
}

// Globaler, geteilter Kern – so kann jede KI (Chat, Debatte, Quad, Kollektiv) darauf zugreifen.
let _global: SVRC | null = null;
export function getSVRC(): SVRC {
  if (!_global) _global = new SVRC(32);
  return _global;
}
