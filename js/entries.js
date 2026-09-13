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

const PHOTOS_BUCKET = "entry-photos";

export async function uploadAttachment(ownerId, entryId, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${ownerId}/${entryId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return { path, name: file.name, size: file.size, type: file.type };
}

export async function removeAttachment(path) {
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getAttachmentSignedUrl(path, expiresIn = 300) {
  const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
