import { useEffect, useState } from "react";

export const CognitiveCore = () => {
  const [pulseIntensity, setPulseIntensity] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIntensity((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex items-center justify-center h-full min-h-[300px]">
      {/* Outer rings */}
      <div className="absolute w-64 h-64 rounded-full border border-primary/20 animate-rotate-slow" />
      <div
        className="absolute w-56 h-56 rounded-full border border-secondary/30"
        style={{ animation: "rotate-slow 15s linear infinite reverse" }}
      />
      <div className="absolute w-48 h-48 rounded-full border border-accent/20 animate-rotate-slow" />

      {/* Pulsing rings */}
      <div className="absolute w-40 h-40 rounded-full bg-primary/5 animate-pulse-ring" />
      <div
        className="absolute w-40 h-40 rounded-full bg-secondary/5 animate-pulse-ring"
        style={{ animationDelay: "0.5s" }}
      />

      {/* Core */}
      <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 glow-primary flex items-center justify-center">
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-card border border-primary/50" />

        {/* Inner core with activity indicator */}
        <div
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
          style={{
            boxShadow: `0 0 ${20 + pulseIntensity / 5}px hsl(var(--primary) / ${0.5 + pulseIntensity / 200})`,
          }}
        >
          <span className="font-display text-xs text-primary-foreground font-bold">AI</span>
        </div>
      </div>

      {/* Data connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Connection lines to corners */}
        <line x1="50%" y1="50%" x2="10%" y2="10%" stroke="url(#lineGrad)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="90%" y2="10%" stroke="url(#lineGrad)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="10%" y2="90%" stroke="url(#lineGrad)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="90%" y2="90%" stroke="url(#lineGrad)" strokeWidth="1" />
      </svg>

      {/* Status label */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-card/80 border border-primary/30 rounded text-xs font-mono">
        <span className="text-glow-success text-glow">●</span>
        <span className="ml-2 text-muted-foreground">COGNITIVE_CORE</span>
        <span className="ml-2 text-primary">ACTIVE</span>
      </div>
    </div>
  );
};
