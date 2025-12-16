import { useState, useEffect } from "react";

interface StateEntry {
  key: string;
  value: string;
  timestamp: number;
  changed: boolean;
}

const initialState: StateEntry[] = [
  { key: "lastEvent", value: '{"type":"data"}', timestamp: Date.now(), changed: false },
  { key: "lastFeedback", value: '{"status":"ok"}', timestamp: Date.now(), changed: false },
  { key: "frameCount", value: "0", timestamp: Date.now(), changed: false },
  { key: "connectionStatus", value: '"connected"', timestamp: Date.now(), changed: false },
  { key: "processingQueue", value: "[]", timestamp: Date.now(), changed: false },
];

export const StateStore = () => {
  const [state, setState] = useState<StateEntry[]>(initialState);

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        const newState = [...prev];

        // Update a random entry
        const entry = newState[idx];
        let newValue = entry.value;

        if (entry.key === "frameCount") {
          newValue = String(parseInt(entry.value) + 1);
        } else if (entry.key === "lastEvent") {
          const types = ["data", "vision", "tool"];
          newValue = `{"type":"${types[Math.floor(Math.random() * types.length)]}"}`;
        } else if (entry.key === "processingQueue") {
          const len = Math.floor(Math.random() * 5);
          newValue = `[${Array(len).fill('"task"').join(",")}]`;
        }

        newState[idx] = {
          ...entry,
          value: newValue,
          timestamp: Date.now(),
          changed: true,
        };

        // Reset changed flag after animation
        setTimeout(() => {
          setState((s) =>
            s.map((e, i) => (i === idx ? { ...e, changed: false } : e))
          );
        }, 500);

        return newState;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <h3 className="font-display text-sm text-secondary text-glow-secondary mb-3 px-1">
        STATE_STORE
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2">
        {state.map((entry) => (
          <div
            key={entry.key}
            className={`p-3 bg-card border rounded font-mono text-xs transition-all duration-300 ${
              entry.changed
                ? "border-secondary/60 bg-secondary/5"
                : "border-border/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-secondary font-medium">{entry.key}</span>
              <span className="text-muted-foreground text-[10px]">
                {new Date(entry.timestamp).toISOString().split("T")[1].slice(0, 8)}
              </span>
            </div>
            <div
              className={`text-foreground/70 break-all transition-all ${
                entry.changed ? "text-secondary" : ""
              }`}
            >
              {entry.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>ENTRIES: {state.length}</span>
          <span>MEM: {(JSON.stringify(state).length / 1024).toFixed(2)}KB</span>
        </div>
      </div>
    </div>
  );
};
