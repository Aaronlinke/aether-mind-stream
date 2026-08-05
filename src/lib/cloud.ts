// Cloud-Persistenz: Modul-Sitzungen im Backend (RLS: nur eigene Daten).
import { supabase } from "@/integrations/supabase/client";

export interface CloudSession {
  id: string;
  module: string;
  title: string;
  payload: unknown;
  created_at: string;
  updated_at: string;
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function saveSession(module: string, title: string, payload: unknown): Promise<CloudSession> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Nicht eingeloggt – im Tab CLOUD anmelden.");
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: uid, module, title, payload: payload as never })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as CloudSession;
}

export async function listSessions(module?: string, limit = 100): Promise<CloudSession[]> {
  let q = supabase.from("sessions").select("*").order("created_at", { ascending: false }).limit(limit);
  if (module) q = q.eq("module", module);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CloudSession[];
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
