import { useState, useEffect } from "react";

export const SystemHeader = () => {
  const [time, setTime] = useState(new Date());
  const [cpuLoad, setCpuLoad] = useState(42);
  const [memUsage, setMemUsage] = useState(67);

  useEffect(() => {
    const timeInterval = setInterval(() => setTime(new Date()), 1000);
    const metricsInterval = setInterval(() => {
      setCpuLoad((prev) => Math.min(100, Math.max(20, prev + Math.random() * 10 - 5)));
      setMemUsage((prev) => Math.min(100, Math.max(40, prev + Math.random() * 6 - 3)));
    }, 2000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <span className="font-display font-bold text-primary-foreground text-sm">Ψ</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-glow-success animate-pulse" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                HYBRID<span className="text-primary text-glow">_</span>AI
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider">
                REAL-TIME COGNITIVE FRAMEWORK v1.0.0
              </p>
            </div>
          </div>

          {/* System Metrics */}
          <div className="hidden md:flex items-center gap-6">
            {/* CPU */}
            <div className="text-right">
              <div className="text-[10px] font-mono text-muted-foreground mb-1">CPU_LOAD</div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                    style={{ width: `${cpuLoad}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-foreground w-10">
                  {cpuLoad.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Memory */}
            <div className="text-right">
              <div className="text-[10px] font-mono text-muted-foreground mb-1">MEM_USAGE</div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-secondary to-accent transition-all duration-500"
                    style={{ width: `${memUsage}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-foreground w-10">
                  {memUsage.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Time */}
            <div className="pl-6 border-l border-border/50">
              <div className="text-[10px] font-mono text-muted-foreground">SYSTEM_TIME</div>
              <div className="font-mono text-lg text-primary text-glow tabular-nums">
                {time.toTimeString().slice(0, 8)}
              </div>
            </div>
          </div>

          {/* Mobile time */}
          <div className="md:hidden font-mono text-sm text-primary">
            {time.toTimeString().slice(0, 8)}
          </div>
        </div>
      </div>
    </header>
  );
};
