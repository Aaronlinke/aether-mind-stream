import { ReactNode, useState, useEffect } from "react";

interface ModuleCardProps {
  title: string;
  icon: ReactNode;
  status: "active" | "idle" | "processing";
  metrics: { label: string; value: string | number }[];
  accentColor: "primary" | "secondary" | "accent";
}

const statusConfig = {
  active: { label: "ACTIVE", color: "text-glow-success", bg: "bg-glow-success" },
  idle: { label: "IDLE", color: "text-muted-foreground", bg: "bg-muted-foreground" },
  processing: { label: "PROCESSING", color: "text-glow-warning", bg: "bg-glow-warning" },
};

const accentBorders = {
  primary: "border-primary/30 hover:border-primary/60",
  secondary: "border-secondary/30 hover:border-secondary/60",
  accent: "border-accent/30 hover:border-accent/60",
};

const accentGlows = {
  primary: "hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)]",
  secondary: "hover:shadow-[0_0_30px_hsl(var(--secondary)/0.2)]",
  accent: "hover:shadow-[0_0_30px_hsl(var(--accent)/0.2)]",
};

export const ModuleCard = ({ title, icon, status, metrics, accentColor }: ModuleCardProps) => {
  const [animatedMetrics, setAnimatedMetrics] = useState(metrics);

  useEffect(() => {
    if (status !== "processing") return;

    const interval = setInterval(() => {
      setAnimatedMetrics((prev) =>
        prev.map((m) => ({
          ...m,
          value: typeof m.value === "number" ? m.value + Math.floor(Math.random() * 10) - 5 : m.value,
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  return (
    <div
      className={`relative p-4 bg-card border rounded-lg transition-all duration-300 ${accentBorders[accentColor]} ${accentGlows[accentColor]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded bg-${accentColor}/10 text-${accentColor}`}>
            {icon}
          </div>
          <div>
            <h4 className="font-display text-sm text-foreground">{title}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusConfig[status].bg} ${
                  status === "processing" ? "animate-pulse" : ""
                }`}
              />
              <span className={`text-[10px] font-mono ${statusConfig[status].color}`}>
                {statusConfig[status].label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        {animatedMetrics.map((metric, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-mono">{metric.label}</span>
            <span className="font-mono text-foreground tabular-nums">{metric.value}</span>
          </div>
        ))}
      </div>

      {/* Processing indicator */}
      {status === "processing" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-lg">
          <div
            className={`h-full bg-gradient-to-r from-transparent via-${accentColor} to-transparent`}
            style={{
              animation: "shimmer 1.5s ease-in-out infinite",
              width: "50%",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};
