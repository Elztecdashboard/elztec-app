import { createSupabaseServerClient } from "./supabase-server";
import { ExactTokenRow } from "@/types";

const BASE_URL = "https://start.exactonline.nl/api/v1";
const TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";
const DIVISION = Number(process.env.EXACT_DIVISION || 2377678);

async function getValidAccessToken(): Promise<{ token: string; division: number }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exact_tokens")
    .select("*")
    .eq("division", DIVISION)
    .single();

  if (error || !data) {
    throw new Error("Geen Exact Online koppeling gevonden. Ga naar /exact/connect.");
  }

  const row = data as ExactTokenRow;
  const expiresAt = new Date(row.expires_at).getTime();
  const now = Date.now();

  if (expiresAt > now + 60_000) {
    return { token: row.access_token, division: row.division };
  }

  // Refresh token
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
    client_id: process.env.EXACT_CLIENT_ID!,
    client_secret: process.env.EXACT_CLIENT_SECRET!,
  });

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[getValidAccessToken] Refresh failed:", resp.status, errText);
    throw new Error("Token vernieuwen mislukt. Koppel Exact Online opnieuw.");
  }

  const json = await resp.json();
  const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  await supabase.from("exact_tokens").upsert({
    division: DIVISION,
    company_name: row.company_name,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  });

  return { token: json.access_token, division: DIVISION };
}

export async function exactFetch(path: string): Promise<unknown> {
  const { token, division } = await getValidAccessToken();
  const url = `${BASE_URL}/${division}/${path}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (resp.status === 401) {
    // Force refresh and retry once
    const supabase = createSupabaseServerClient();
    await supabase.from("exact_tokens").update({ expires_at: new Date(0).toISOString() }).eq("division", DIVISION);
    const { token: newToken } = await getValidAccessToken();
    const retry = await fetch(url, {
      headers: { Authorization: `Bearer ${newToken}`, Accept: "application/json" },
    });
    return retry.json();
  }

  if (!resp.ok) {
    throw new Error(`Exact API fout: ${resp.status} ${path}`);
  }

  return resp.json();
}

export async function isExactGekoppeld(): Promise<boolean> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("exact_tokens")
      .select("division")
      .eq("division", DIVISION)
      .single();
    console.log("[isExactGekoppeld] DIVISION:", DIVISION, "data:", data, "error:", error?.message);
    return !!data;
  } catch (e) {
    console.error("[isExactGekoppeld] exception:", e);
    return false;
  }
}
