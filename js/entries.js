import { supabase } from "./supabaseClient.js";

export async function listEntries(ownerId) {
  const query = supabase.from("entries").select("*").order("entry_date", { ascending: false });
  if (ownerId) query.eq("owner_id", ownerId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getEntry(id) {
  const { data, error } = await supabase.from("entries").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createEntry(entry) {
  const { data, error } = await supabase.from("entries").insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function updateEntry(id, entry) {
  const { data, error } = await supabase.from("entries").update(entry).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(id) {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw error;
}

export async function listOwnersObservedByMe() {
  // Beobachter: welche owner_ids darf ich (über shares) lesen?
  const { data, error } = await supabase.from("shares").select("owner_id, invited_email");
  if (error) throw error;
  return data;
}

export async function listMyShares(ownerId) {
  const { data, error } = await supabase.from("shares").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function inviteObserver(ownerId, email) {
  const { data, error } = await supabase
    .from("shares")
    .insert({ owner_id: ownerId, invited_email: email.trim().toLowerCase() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeObserver(shareId) {
  const { error } = await supabase.from("shares").delete().eq("id", shareId);
  if (error) throw error;
}
