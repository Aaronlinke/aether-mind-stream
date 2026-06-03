import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download } from "lucide-react";
import { VOLLRECHNUNG_MD, VOLLRECHNUNG_JSON } from "@/data/vollrechnung";
import { downloadJson, downloadMarkdown } from "@/lib/download";

export const Vollrechnung = () => {
  return (
    <div className="h-full flex flex-col bg-background">
      <header className="border-b border-border p-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium">VOLLRECHNUNG</h1>
          <p className="text-xs text-muted-foreground mt-1">
            A → Z · secp256k1 · OMNIGENESIS · d = 3 · hin & zurück
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadMarkdown(VOLLRECHNUNG_MD, "vollrechnung")}
          >
            <Download className="w-3 h-3 mr-1" /> MD
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadJson(VOLLRECHNUNG_JSON, "vollrechnung")}
          >
            <Download className="w-3 h-3 mr-1" /> JSON
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <pre className="p-4 text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
          {VOLLRECHNUNG_MD}
        </pre>
      </ScrollArea>
    </div>
  );
};
