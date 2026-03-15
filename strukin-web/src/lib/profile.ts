import { createClient } from "./supabase";
import type { Profile } from "@/types/api";

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, monthly_budget, updated_at")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function updateProfile(updates: { full_name?: string; monthly_budget?: number }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
