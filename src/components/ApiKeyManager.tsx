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

  const field = (id: keyof CustomKeys, hint: string) => {
    const src = KEY_SOURCES[id as string];
    return (
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <label className="text-xs font-medium">{src?.label ?? id}</label>
          {src && (
            <a href={src.url} target="_blank" rel="noreferrer" className="text-[10px] underline text-muted-foreground">
              Key holen
            </a>
          )}
        </div>
        {src && <p className="text-[10px] text-muted-foreground">{src.note}</p>}
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
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Key className="h-3 w-3" /> Keys
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API-Keys (auch kostenlose)</DialogTitle>
          <DialogDescription className="text-xs">
            Optional, nur lokal in diesem Browser gespeichert. Die oberen vier Anbieter haben ein
            kostenloses Kontingent (Gemma 3, Llama 3.3, Qwen3, DeepSeek R1, Mistral) und schalten
            die „(frei)“-Modelle in der Modellauswahl frei.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {field("google",     "AI...")}
          {field("groq",       "gsk_...")}
          {field("openrouter", "sk-or-...")}
          {field("cerebras",   "csk-...")}
          {field("mistral",    "...")}
          {field("openai",     "sk-...")}
          {field("deepseek",   "sk-...")}
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
