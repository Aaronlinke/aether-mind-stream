import { useEffect, useState } from "react";

interface DataNode {
  id: string;
  label: string;
  type: "source" | "processor" | "core" | "tool";
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
  active: boolean;
}

const nodes: DataNode[] = [
  { id: "api", label: "API_STREAM", type: "source", x: 10, y: 25 },
  { id: "vision", label: "VISION", type: "processor", x: 10, y: 75 },
  { id: "core", label: "CORE", type: "core", x: 50, y: 50 },
  { id: "tool1", label: "TOOL_1", type: "tool", x: 90, y: 25 },
  { id: "tool2", label: "TOOL_2", type: "tool", x: 90, y: 75 },
];

const connections: Connection[] = [
  { from: "api", to: "core", active: false },
  { from: "vision", to: "core", active: false },
  { from: "core", to: "tool1", active: false },
  { from: "core", to: "tool2", active: false },
];

const typeColors = {
  source: "from-primary/80 to-primary/40",
  processor: "from-secondary/80 to-secondary/40",
  core: "from-accent/80 to-accent/40",
  tool: "from-glow-success/80 to-glow-success/40",
};

const typeBorders = {
  source: "border-primary/50",
  processor: "border-secondary/50",
  core: "border-accent/50",
  tool: "border-glow-success/50",
};

export const DataFlowVisualization = () => {
  const [activeConnections, setActiveConnections] = useState<Connection[]>(connections);
  const [pulsingNode, setPulsingNode] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly activate a connection
      const idx = Math.floor(Math.random() * connections.length);
      setActiveConnections((prev) =>
        prev.map((c, i) => (i === idx ? { ...c, active: true } : c))
      );
      setPulsingNode(connections[idx].to);

      // Deactivate after animation
      setTimeout(() => {
        setActiveConnections((prev) =>
          prev.map((c, i) => (i === idx ? { ...c, active: false } : c))
        );
        setPulsingNode(null);
      }, 800);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const getNodePosition = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  return (
    <div className="relative h-full min-h-[200px] bg-card/30 rounded-lg border border-border/30 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 cyber-grid opacity-30" />

      {/* SVG for connections */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {activeConnections.map((conn, idx) => {
          const from = getNodePosition(conn.from);
          const to = getNodePosition(conn.to);
          return (
            <g key={idx}>
              {/* Base line */}
              <line
                x1={`${from.x}%`}
                y1={`${from.y}%`}
                x2={`${to.x}%`}
                y2={`${to.y}%`}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              {/* Active line */}
              {conn.active && (
                <line
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${to.x}%`}
                  y2={`${to.y}%`}
                  stroke="url(#flowGradient)"
                  strokeWidth="2"
                  filter="url(#glow)"
                  className="animate-pulse"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => (
        <div
          key={node.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <div
            className={`relative px-3 py-2 rounded border bg-gradient-to-br ${typeColors[node.type]} ${typeBorders[node.type]} transition-all duration-300 ${
              pulsingNode === node.id ? "scale-110" : ""
            }`}
          >
            {pulsingNode === node.id && (
              <div className="absolute inset-0 rounded bg-foreground/20 animate-ping" />
            )}
            <span className="font-mono text-[10px] text-foreground whitespace-nowrap relative z-10">
              {node.label}
            </span>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex gap-3 text-[9px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-primary/60" /> SOURCE
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-secondary/60" /> PROCESSOR
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-glow-success/60" /> TOOL
        </span>
      </div>
    </div>
  );
};
