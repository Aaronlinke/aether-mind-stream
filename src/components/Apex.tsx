import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { APEX_CONFIG, APEX_MD } from "@/data/apex";
import { downloadJson, downloadMarkdown } from "@/lib/download";

export function Apex() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <header className="border-b border-border pb-4">
          <h1 className="text-lg font-medium">APEX · SRIL-Engine v3</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Referenz-Dump: Koeffizienten, Riccati-DGL, CHRONOS-Evolution
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => downloadMarkdown(APEX_MD, "apex-sril")}>
              <Download className="h-3 w-3 mr-1" /> MD
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadJson(APEX_CONFIG, "apex-sril")}>
              <Download className="h-3 w-3 mr-1" /> JSON
            </Button>
          </div>
        </header>

        <section>
          <h2 className="text-sm font-medium mb-2">Koeffizienten</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {Object.entries(APEX_CONFIG.coefficients).map(([k, v]) => (
              <div key={k} className="border border-border rounded p-2">
                <div className="text-muted-foreground">{k}</div>
                <div className="font-mono text-foreground">{v}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-2">Matrix-Riccati-DGL</h2>
          <pre className="text-xs font-mono bg-muted/30 p-3 rounded border border-border overflow-x-auto">
{APEX_CONFIG.riccati.latex}
          </pre>
          <p className="text-xs text-muted-foreground mt-1">{APEX_CONFIG.riccati.description}</p>
          <p className="text-xs text-muted-foreground">Zustand: {APEX_CONFIG.riccati.state.join(", ")}</p>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-2">CHRONOS-Evolution</h2>
          <pre className="text-xs font-mono bg-muted/30 p-3 rounded border border-border overflow-x-auto">
{APEX_CONFIG.evolution.latex}
          </pre>
          <p className="text-xs text-muted-foreground mt-1">{APEX_CONFIG.evolution.description}</p>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-2">Pipeline</h2>
          <div className="text-xs font-mono space-y-1">
            <div><span className="text-muted-foreground">vorwärts: </span>{APEX_CONFIG.derivation.pipeline}</div>
            <div><span className="text-muted-foreground">rückwärts: </span>{APEX_CONFIG.derivation.inverse}</div>
            <div><span className="text-muted-foreground">nonce-reuse: </span>{APEX_CONFIG.derivation.nonceReuse}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
