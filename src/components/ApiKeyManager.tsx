import { useState } from "react";
import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { loadCustomKeys, saveCustomKeys, KEY_SOURCES, type CustomKeys } from "@/lib/aiModels";
import { useToast } from "@/hooks/use-toast";

export function ApiKeyManager({ onChange }: { onChange?: (k: CustomKeys) => void }) {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<CustomKeys>(loadCustomKeys());
  const { toast } = useToast();

  const save = () => {
    saveCustomKeys(keys);
    onChange?.(keys);
    toast({ title: "Gespeichert", description: "API-Keys lokal im Browser abgelegt." });
    setOpen(false);
  };

  const field = (id: keyof CustomKeys, label: string, hint: string) => (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <input
        type="password"
        value={keys[id] || ""}
        onChange={(e) => setKeys(p => ({ ...p, [id]: e.target.value }))}
        placeholder={hint}
        className="w-full text-xs bg-input border border-border rounded px-2 py-1.5 text-foreground font-mono"
        autoComplete="off"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Key className="h-3 w-3" /> Keys
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eigene API-Keys</DialogTitle>
          <DialogDescription className="text-xs">
            Optional. Nur lokal in diesem Browser gespeichert. Aktiviert die "eigener Key"-Modelle (OpenAI direkt, DeepSeek, Google).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {field("openai",   "OpenAI API-Key",   "sk-...")}
          {field("deepseek", "DeepSeek API-Key", "sk-...")}
          {field("google",   "Google AI Studio Key", "AI...")}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { setKeys({}); saveCustomKeys({}); onChange?.({}); toast({ title: "Geleert" }); }}>
            Alle löschen
          </Button>
          <Button size="sm" onClick={save}>Speichern</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
