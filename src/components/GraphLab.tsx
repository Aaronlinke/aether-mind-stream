import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH LAB · Interaktive Graphentheorie · BFS · DFS · Dijkstra · MST
// ═══════════════════════════════════════════════════════════════════════════════

type Node = { id: number; x: number; y: number };
type Edge = { from: number; to: number; weight: number };
type Algo = "bfs" | "dfs" | "dijkstra" | "mst";

const COLORS = {
  node: "hsl(var(--muted-foreground))",
  start: "hsl(var(--primary))",
  visited: "hsl(142 70% 45%)",
  current: "hsl(45 95% 55%)",
  edge: "hsl(var(--border))",
  edgeActive: "hsl(var(--primary))",
};

function dist(a: Node, b: Node) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
}

export function GraphLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([
    { id: 0, x: 80, y: 80 },
    { id: 1, x: 240, y: 60 },
    { id: 2, x: 360, y: 160 },
    { id: 3, x: 280, y: 280 },
    { id: 4, x: 120, y: 240 },
  ]);
  const [edges, setEdges] = useState<Edge[]>([
    { from: 0, to: 1, weight: 0 },
    { from: 1, to: 2, weight: 0 },
    { from: 2, to: 3, weight: 0 },
    { from: 3, to: 4, weight: 0 },
    { from: 4, to: 0, weight: 0 },
    { from: 0, to: 2, weight: 0 },
  ]);
  const [start, setStart] = useState(0);
  const [target, setTarget] = useState(3);
  const [algo, setAlgo] = useState<Algo>("dijkstra");
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [path, setPath] = useState<number[]>([]);
  const [mode, setMode] = useState<"select" | "addNode" | "addEdge">("select");
  const [edgeFrom, setEdgeFrom] = useState<number | null>(null);
  const [result, setResult] = useState<string>("");

  // Recompute weights when nodes move
  useEffect(() => {
    setEdges((es) =>
      es.map((e) => {
        const a = nodes.find((n) => n.id === e.from);
        const b = nodes.find((n) => n.id === e.to);
        return a && b ? { ...e, weight: dist(a, b) } : e;
      })
    );
  }, [nodes]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);

    // edges
    edges.forEach((e) => {
      const a = nodes.find((n) => n.id === e.from);
      const b = nodes.find((n) => n.id === e.to);
      if (!a || !b) return;
      const inPath =
        path.includes(e.from) &&
        path.includes(e.to) &&
        Math.abs(path.indexOf(e.from) - path.indexOf(e.to)) === 1;
      ctx.strokeStyle = inPath ? COLORS.edgeActive : COLORS.edge;
      ctx.lineWidth = inPath ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = "hsl(var(--muted-foreground))";
      ctx.font = "9px monospace";
      ctx.fillText(String(e.weight), (a.x + b.x) / 2 + 4, (a.y + b.y) / 2 - 4);
    });

    // nodes
    nodes.forEach((n) => {
      let color = COLORS.node;
      if (n.id === start) color = COLORS.start;
      else if (n.id === target) color = "hsl(0 70% 55%)";
      else if (visited.has(n.id)) color = COLORS.visited;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "hsl(var(--background))";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n.id), n.x, n.y);
    });

    if (edgeFrom !== null) {
      const a = nodes.find((n) => n.id === edgeFrom);
      if (a) {
        ctx.strokeStyle = COLORS.edgeActive;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(a.x, a.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [nodes, edges, visited, path, start, target, edgeFrom]);

  useEffect(() => {
    draw();
  }, [draw]);

  const findNodeAt = (x: number, y: number) =>
    nodes.find((n) => Math.hypot(n.x - x, n.y - y) < 18);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height;
    const hit = findNodeAt(x, y);

    if (mode === "addNode" && !hit) {
      setNodes([...nodes, { id: nodes.length, x, y }]);
    } else if (mode === "addEdge" && hit) {
      if (edgeFrom === null) setEdgeFrom(hit.id);
      else if (edgeFrom !== hit.id) {
        const exists = edges.some(
          (e) =>
            (e.from === edgeFrom && e.to === hit.id) ||
            (e.from === hit.id && e.to === edgeFrom)
        );
        if (!exists) {
          const a = nodes.find((n) => n.id === edgeFrom)!;
          setEdges([...edges, { from: edgeFrom, to: hit.id, weight: dist(a, hit) }]);
        }
        setEdgeFrom(null);
      }
    } else if (mode === "select" && hit) {
      if (e.shiftKey) setTarget(hit.id);
      else setStart(hit.id);
    }
  };

  const adjacency = useCallback(() => {
    const adj: Map<number, { to: number; w: number }[]> = new Map();
    nodes.forEach((n) => adj.set(n.id, []));
    edges.forEach((e) => {
      adj.get(e.from)?.push({ to: e.to, w: e.weight });
      adj.get(e.to)?.push({ to: e.from, w: e.weight });
    });
    return adj;
  }, [nodes, edges]);

  const runAlgo = () => {
    const adj = adjacency();
    const v = new Set<number>();
    let p: number[] = [];
    let info = "";

    if (algo === "bfs") {
      const q = [start];
      const prev: Map<number, number> = new Map();
      v.add(start);
      while (q.length) {
        const u = q.shift()!;
        if (u === target) break;
        for (const { to } of adj.get(u) || []) {
          if (!v.has(to)) {
            v.add(to);
            prev.set(to, u);
            q.push(to);
          }
        }
      }
      let cur: number | undefined = target;
      while (cur !== undefined && cur !== start) {
        p.unshift(cur);
        cur = prev.get(cur);
      }
      if (v.has(target)) p.unshift(start);
      info = `BFS · ${v.size} Knoten besucht · Pfadlänge: ${p.length}`;
    } else if (algo === "dfs") {
      const stack = [start];
      const prev: Map<number, number> = new Map();
      while (stack.length) {
        const u = stack.pop()!;
        if (v.has(u)) continue;
        v.add(u);
        if (u === target) break;
        for (const { to } of adj.get(u) || []) {
          if (!v.has(to)) {
            prev.set(to, u);
            stack.push(to);
          }
        }
      }
      let cur: number | undefined = target;
      while (cur !== undefined && cur !== start) {
        p.unshift(cur);
        cur = prev.get(cur);
      }
      if (v.has(target)) p.unshift(start);
      info = `DFS · ${v.size} Knoten besucht`;
    } else if (algo === "dijkstra") {
      const d: Map<number, number> = new Map();
      const prev: Map<number, number> = new Map();
      nodes.forEach((n) => d.set(n.id, Infinity));
      d.set(start, 0);
      const pq = new Set(nodes.map((n) => n.id));
      while (pq.size) {
        let u = -1;
        let best = Infinity;
        pq.forEach((id) => {
          const dv = d.get(id)!;
          if (dv < best) {
            best = dv;
            u = id;
          }
        });
        if (u === -1) break;
        pq.delete(u);
        v.add(u);
        if (u === target) break;
        for (const { to, w } of adj.get(u) || []) {
          const alt = d.get(u)! + w;
          if (alt < d.get(to)!) {
            d.set(to, alt);
            prev.set(to, u);
          }
        }
      }
      let cur: number | undefined = target;
      while (cur !== undefined && cur !== start) {
        p.unshift(cur);
        cur = prev.get(cur);
      }
      if (d.get(target)! < Infinity) p.unshift(start);
      info = `Dijkstra · Distanz ${start}→${target}: ${
        d.get(target) === Infinity ? "∞" : d.get(target)
      }`;
    } else if (algo === "mst") {
      // Prim's algorithm
      const inMst = new Set<number>([start]);
      const mstEdges: Edge[] = [];
      let total = 0;
      while (inMst.size < nodes.length) {
        let best: Edge | null = null;
        for (const e of edges) {
          const inA = inMst.has(e.from);
          const inB = inMst.has(e.to);
          if (inA !== inB && (!best || e.weight < best.weight)) best = e;
        }
        if (!best) break;
        mstEdges.push(best);
        inMst.add(best.from);
        inMst.add(best.to);
        total += best.weight;
      }
      mstEdges.forEach((e) => {
        v.add(e.from);
        v.add(e.to);
      });
      // Build path through MST edges for visualization
      p = mstEdges.flatMap((e) => [e.from, e.to]);
      info = `MST (Prim) · ${mstEdges.length} Kanten · Gesamtgewicht: ${total}`;
    }

    setVisited(v);
    setPath(p);
    setResult(info);
  };

  const reset = () => {
    setVisited(new Set());
    setPath([]);
    setResult("");
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">GRAPH LAB</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Interaktive Graphentheorie · BFS · DFS · Dijkstra · Prim-MST
        </p>
      </header>

      <div className="p-2 border-b border-border flex flex-wrap gap-1">
        {(["select", "addNode", "addEdge"] as const).map((m) => (
          <Badge
            key={m}
            variant={mode === m ? "default" : "outline"}
            className="cursor-pointer text-[9px]"
            onClick={() => {
              setMode(m);
              setEdgeFrom(null);
            }}
          >
            {m === "select" ? "Auswählen" : m === "addNode" ? "+ Knoten" : "+ Kante"}
          </Badge>
        ))}
        <div className="flex-1" />
        {(["bfs", "dfs", "dijkstra", "mst"] as const).map((a) => (
          <Badge
            key={a}
            variant={algo === a ? "default" : "outline"}
            className="cursor-pointer text-[9px] uppercase"
            onClick={() => setAlgo(a)}
          >
            {a}
          </Badge>
        ))}
      </div>

      <div className="flex-1 overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          width={440}
          height={340}
          onClick={handleClick}
          className="w-full h-full max-h-[340px] cursor-crosshair"
        />
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <div className="flex gap-1 text-[10px] text-muted-foreground">
          <span>
            Start: <span className="text-primary font-bold">{start}</span>
          </span>
          <span>·</span>
          <span>
            Ziel: <span className="text-destructive font-bold">{target}</span>
          </span>
          <span>·</span>
          <span>Klick = Start, Shift+Klick = Ziel</span>
        </div>
        {result && <div className="text-[10px] font-mono">{result}</div>}
        <div className="flex gap-1">
          <Button size="sm" onClick={runAlgo} className="text-[10px] h-7 flex-1">
            Ausführen
          </Button>
          <Button size="sm" variant="outline" onClick={reset} className="text-[10px] h-7">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
