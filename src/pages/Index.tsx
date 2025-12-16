import { Database, Eye, Wrench, Cpu } from "lucide-react";
import { SystemHeader } from "@/components/SystemHeader";
import { CognitiveCore } from "@/components/CognitiveCore";
import { EventStream } from "@/components/EventStream";
import { ModuleCard } from "@/components/ModuleCard";
import { StateStore } from "@/components/StateStore";
import { DataFlowVisualization } from "@/components/DataFlowVisualization";

const Index = () => {
  return (
    <div className="min-h-screen bg-background cyber-grid">
      <SystemHeader />

      <main className="container mx-auto px-4 py-6">
        {/* Top Row: Core + Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Cognitive Core */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 scanline">
            <CognitiveCore />
          </div>

          {/* Data Flow Visualization */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4">
            <h3 className="font-display text-sm text-accent mb-3 px-1">DATA_FLOW</h3>
            <DataFlowVisualization />
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ModuleCard
            title="DATA_SOURCE"
            icon={<Database className="w-5 h-5" />}
            status="active"
            accentColor="primary"
            metrics={[
              { label: "FETCH_RATE", value: "1000ms" },
              { label: "LAST_VALUE", value: 42 },
              { label: "UPTIME", value: "99.9%" },
            ]}
          />
          <ModuleCard
            title="VISION_PROCESSOR"
            icon={<Eye className="w-5 h-5" />}
            status="processing"
            accentColor="secondary"
            metrics={[
              { label: "FRAME_ID", value: 1247 },
              { label: "OBJECTS", value: 3 },
              { label: "LATENCY", value: "45ms" },
            ]}
          />
          <ModuleCard
            title="TOOL_INTERFACE"
            icon={<Wrench className="w-5 h-5" />}
            status="idle"
            accentColor="accent"
            metrics={[
              { label: "EXEC_COUNT", value: 892 },
              { label: "SUCCESS_RATE", value: "98.2%" },
              { label: "QUEUE", value: 0 },
            ]}
          />
        </div>

        {/* Bottom Row: Event Stream + State Store */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Stream */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 h-[400px]">
            <EventStream />
          </div>

          {/* State Store */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 h-[400px]">
            <StateStore />
          </div>
        </div>

        {/* Footer Status */}
        <footer className="mt-6 pt-4 border-t border-border/30">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3" />
                SYSTEM: OPERATIONAL
              </span>
              <span className="text-glow-success">● ALL MODULES ONLINE</span>
            </div>
            <div className="flex items-center gap-4">
              <span>EVENT_BUS: ACTIVE</span>
              <span>ASYNC: ENABLED</span>
              <span className="text-primary">FRAMEWORK_STATUS: RUNNING</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
