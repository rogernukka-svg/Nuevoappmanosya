export const JOB_SELECT = `
  id,
  client_id,
  worker_id,
  service_slug,
  title,
  description,
  status,
  city,
  address,
  lat,
  lng,
  budget_min,
  budget_max,
  scheduled_at,
  created_at,
  updated_at
`;

export async function fetchJobsForUser(supabase, userId, role = "client") {
  if (!supabase || !userId) return [];

  const column = role === "worker" ? "worker_id" : "client_id";
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq(column, userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createClientJob(supabase, payload) {
  if (!supabase) throw new Error("Supabase no configurado.");

  const { data, error } = await supabase
    .from("jobs")
    .insert(payload)
    .select(JOB_SELECT)
    .single();

  if (error) throw error;
  return data;
}
