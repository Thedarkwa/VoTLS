import { supabase } from "@/integrations/supabase/client";

// Members
export async function fetchMembers() {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("first_name");
  if (error) throw error;
  return data;
}

export async function addMember(member: {
  first_name: string;
  last_name: string;
  part: "Soprano" | "Alto" | "Tenor" | "Bass" | "Director";
  phone?: string;
  email?: string;
  join_date?: string;
}) {
  const { data, error } = await supabase.from("members").insert([member]).select().single();
  if (error) throw error;
  return data;
}

export async function updateMember(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("members").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteMember(id: string) {
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}

// Attendance
export async function fetchAttendance(date?: string) {
  let query = supabase.from("attendance").select("*");
  if (date) query = query.eq("date", date);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchAllAttendance() {
  const { data, error } = await supabase.from("attendance").select("*");
  if (error) throw error;
  return data;
}

export async function markAttendance(member_id: string, date: string, status: string) {
  const { error } = await supabase
    .from("attendance")
    .upsert({ member_id, date, status }, { onConflict: "member_id,date" });
  if (error) throw error;
}

export async function deleteAttendance(id: string) {
  const { error } = await supabase.from("attendance").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkMarkAbsent(memberIds: string[], date: string) {
  const records = memberIds.map((member_id) => ({
    member_id,
    date,
    status: "Absent",
  }));
  const { error } = await supabase
    .from("attendance")
    .upsert(records, { onConflict: "member_id,date" });
  if (error) throw error;
}

// Welfare Contributions
export async function fetchWelfare() {
  const { data, error } = await supabase
    .from("welfare_contributions")
    .select("*")
    .order("contribution_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addWelfare(record: {
  member_id: string;
  amount: number;
  contribution_date: string;
  purpose?: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("welfare_contributions")
    .insert([record])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWelfare(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("welfare_contributions").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteWelfare(id: string) {
  const { error } = await supabase.from("welfare_contributions").delete().eq("id", id);
  if (error) throw error;
}
