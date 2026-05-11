import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase para uso en API routes (server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type ClientRecord = {
  id: string;
  name: string;
  state: string;
  state_code: string;
  ghl_location_id: string;
  ghl_tag: string;
  calendar_english_id: string;
  calendar_spanish_id: string;
  sale_value: number;
  fee_per_sale: number;
  active: boolean;
  ad_accounts: { id: string; ad_account_id: string; label: string; is_default: boolean }[];
};

export async function getActiveClients(): Promise<ClientRecord[]> {
  const { data: clients, error: clientsError } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("active", true)
    .order("name");

  if (clientsError) {
    console.error("Error fetching clients:", clientsError);
    return [];
  }

  const { data: adAccounts, error: adError } = await supabaseAdmin
    .from("ad_accounts")
    .select("*");

  if (adError) {
    console.error("Error fetching ad accounts:", adError);
    return [];
  }

  return (clients || []).map((c) => ({
    ...c,
    ad_accounts: (adAccounts || []).filter((a) => a.client_id === c.id),
  }));
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const { data: adAccounts } = await supabaseAdmin
    .from("ad_accounts")
    .select("*")
    .eq("client_id", id);

  return { ...data, ad_accounts: adAccounts || [] };
}