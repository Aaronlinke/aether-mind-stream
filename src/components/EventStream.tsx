import { useEffect, useState, useRef } from "react";

interface Event {
  id: string;
  type: "data" | "vision" | "tool" | "decision";
  timestamp: number;
  payload: string;
}

const eventTypes = ["data", "vision", "tool", "decision"] as const;
const payloads = {
  data: ["API_FETCH: value=42", "STREAM_UPDATE: ts=now", "SENSOR_READ: temp=23.5"],
  vision: ["FRAME_ANALYZED: objects=[person,ball]", "DETECTION: confidence=0.95", "TRACKING: id=obj_001"],
  tool: ["EXECUTE: action=process", "FEEDBACK: status=ok", "COMMAND: type=analyze"],
  decision: ["ROUTING: target=tool_1", "PRIORITY: level=high", "CONTEXT: updated"],
};

const generateEvent = (): Event => {
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const typePayloads = payloads[type];
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    timestamp: Date.now(),
    payload: typePayloads[Math.floor(Math.random() * typePayloads.length)],
  };
};

const typeColors = {
  data: "text-primary",
  vision: "text-secondary",
  tool: "text-accent",
  decision: "text-glow-warning",
};

const typeBg = {
  data: "bg-primary/10 border-primary/30",
  vision: "bg-secondary/10 border-secondary/30",
  tool: "bg-accent/10 border-accent/30",
  decision: "bg-glow-warning/10 border-glow-warning/30",
};

export const EventStream = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setEvents((prev) => {
        const newEvents = [...prev, generateEvent()].slice(-50);
        return newEvents;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-display text-sm text-primary text-glow">EVENT_STREAM</h3>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`px-3 py-1 text-xs font-mono border rounded transition-all ${
            isRunning
              ? "border-glow-success/50 text-glow-success bg-glow-success/10"
              : "border-destructive/50 text-destructive bg-destructive/10"
          }`}
        >
          {isRunning ? "● LIVE" : "○ PAUSED"}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-primary/20"
      >
        {events.map((event, index) => (
          <div
            key={event.id}
            className={`p-2 border rounded text-xs font-mono transition-all ${typeBg[event.type]}`}
            style={{
              animation: index === events.length - 1 ? "fadeIn 0.3s ease-out" : undefined,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-bold uppercase ${typeColors[event.type]}`}>
                [{event.type}]
              </span>
              <span className="text-muted-foreground text-[10px]">
                {new Date(event.timestamp).toISOString().split("T")[1].slice(0, 12)}
              </span>
            </div>
            <div className="text-foreground/80 pl-2 border-l border-muted">
              {event.payload}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
