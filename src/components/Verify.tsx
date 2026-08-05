import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { runVerification, type Check } from "@/lib/verify";
import { downloadJson, downloadMarkdown } from "@/lib/download";
import { saveSession } from "@/lib/cloud";
import { Check as CheckIcon, X, Loader2, Play, Download, CloudUpload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Verify() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const [ms, setMs] = useState(0);
  const { toast } = useToast();

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const t0 = performance.now();
      try {
        setChecks(runVerification());
      } catch (e) {
        toast({ variant: "destructive", title: "Abbruch", description: (e as Error).message });
      }
      setMs(performance.now() - t0);
      setRunning(false);
    }, 20);
  }, [toast]);

  const pass = checks.filter(c => c.ok).length;
  const fail = checks.length - pass;
  const groups = [...new Set(checks.map(c => c.group))];

  const md = () => {
    const l = [`# Verifikationsbericht`, ``, `Datum: ${new Date().toISOString()}`, `Bestanden: ${pass}/${checks.length} · Laufzeit: ${ms.toFixed(1)} ms`, ``];
    for (const g of groups) {
      l.push(`## ${g}`, ``, `| Test | Ergebnis | Referenz | Status |`, `|---|---|---|---|`);
      for (const c of checks.filter(x => x.group === g))
        l.push(`| ${c.name} | \`${c.got}\` | \`${c.want}\` | ${c.ok ? "PASS" : "FAIL"} |`);
      l.push(``);
    }
    return l.join("\n");
  };

  return (
    <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto space-y-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-lg font-medium">VERIFIKATION</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Beweislast statt Behauptung: alle Rechenkerne laufen gegen offizielle Referenzvektoren
          (secp256k1-Testpunkte, Sun-Zi-CRT, Carmichael-Zahlen, Basel-Reihe, Lyapunov-Exponenten).
          Exakte Arithmetik in BigInt – keine Fließkomma-Näherung, wo Exaktheit möglich ist.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" onClick={run} disabled={running}>
          {running ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
          Alle Tests ausführen
        </Button>
        {checks.length > 0 && (
          <>
            <span className={`text-xs font-mono ${fail ? "text-destructive" : "text-primary"}`}>
              {pass}/{checks.length} PASS · {ms.toFixed(1)} ms
            </span>
            <Button size="sm" variant="outline" onClick={() => downloadMarkdown(md(), "verifikation")}>
              <Download className="h-3 w-3 mr-1" />Bericht
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadJson({ ts: Date.now(), ms, pass, fail, checks }, "verifikation")}>
              <Download className="h-3 w-3 mr-1" />JSON
            </Button>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                await saveSession("VERIFIKATION", `${pass}/${checks.length} PASS`, { ms, checks });
                toast({ title: "In Cloud gespeichert" });
              } catch (e) { toast({ variant: "destructive", title: "Fehler", description: (e as Error).message }); }
            }}>
              <CloudUpload className="h-3 w-3 mr-1" />Cloud ↑
            </Button>
          </>
        )}
      </div>

      {groups.map(g => (
        <section key={g} className="border border-border rounded">
          <div className="text-[10px] uppercase tracking-wider px-2 py-1 border-b border-border text-muted-foreground">{g}</div>
          <div className="divide-y divide-border">
            {checks.filter(c => c.group === g).map((c, i) => (
              <div key={i} className="px-2 py-1.5 text-xs flex gap-2 items-start">
                {c.ok
                  ? <CheckIcon className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  : <X className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />}
                <div className="min-w-0 flex-1">
                  <div>{c.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground break-all">
                    ist: {c.got}
                    {!c.ok && <> · soll: {c.want}</>}
                    {c.note && <> · {c.note}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
