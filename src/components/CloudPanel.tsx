import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { listSessions, deleteSession, type CloudSession } from "@/lib/cloud";
import { downloadJson } from "@/lib/download";
import { Loader2, LogOut, Trash2, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

export function CloudPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<CloudSession[]>([]);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!user) { setRows([]); return; }
    try { setRows(await listSessions()); }
    catch (e) { toast({ variant: "destructive", title: "Laden fehlgeschlagen", description: (e as Error).message }); }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const auth = async (mode: "in" | "up") => {
    setBusy(true);
    try {
      const res = mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password: pw })
        : await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
      if (res.error) throw res.error;
      if (mode === "up" && !res.data.session)
        toast({ title: "Bestätigungsmail gesendet", description: "Link im Postfach öffnen, dann anmelden." });
    } catch (e) {
      toast({ variant: "destructive", title: "Auth-Fehler", description: (e as Error).message });
    } finally { setBusy(false); }
  };

  const shown = rows.filter(r => !filter || r.module.toLowerCase().includes(filter.toLowerCase()) || r.title.toLowerCase().includes(filter.toLowerCase()));

  if (!user) {
    return (
      <div className="h-full overflow-y-auto p-4 max-w-md mx-auto space-y-4">
        <header className="border-b border-border pb-3">
          <h1 className="text-lg font-medium">CLOUD</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Anmelden, um Modul-Ergebnisse, KI-Sitzungen und Formeln dauerhaft im Backend zu speichern (statt nur im Browser).
          </p>
        </header>
        <div className="space-y-2">
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail" type="email" autoComplete="email" />
          <Input value={pw} onChange={e => setPw(e.target.value)} placeholder="Passwort" type="password" autoComplete="current-password" />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !email || !pw} onClick={() => auth("in")}>
              {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Anmelden
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !email || !pw} onClick={() => auth("up")}>Registrieren</Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Zugriffsregeln serverseitig: jede Zeile ist an deine Nutzer-ID gebunden, fremde Daten sind auch bei direktem API-Zugriff unlesbar.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto space-y-4">
      <header className="border-b border-border pb-3 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium">CLOUD</h1>
          <p className="text-xs text-muted-foreground mt-1">{user.email} · {rows.length} gespeicherte Sitzungen</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3" /></Button>
          <Button size="sm" variant="outline" onClick={() => supabase.auth.signOut()}><LogOut className="h-3 w-3" /></Button>
        </div>
      </header>

      <div className="flex gap-2 items-center">
        <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter (Modul/Titel)" className="text-xs" />
        <Button size="sm" variant="outline" onClick={() => downloadJson(rows, "cloud-sessions")}>
          <Download className="h-3 w-3 mr-1" />Alles
        </Button>
      </div>

      {shown.length === 0 && <div className="text-xs text-muted-foreground border border-border rounded p-3">Noch keine Sitzungen. Module mit „Cloud ↑" speichern hier hinein.</div>}

      <div className="space-y-2">
        {shown.map(r => (
          <div key={r.id} className="border border-border rounded p-2 text-xs space-y-1">
            <div className="flex justify-between items-center gap-2">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">{r.module}</div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => downloadJson(r, `${r.module}-${r.id.slice(0, 8)}`)}><Download className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={async () => { await deleteSession(r.id); load(); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            <div>{r.title}</div>
            <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
            <pre className="text-[10px] font-mono max-h-24 overflow-auto bg-muted/20 p-1">{JSON.stringify(r.payload, null, 1).slice(0, 800)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
