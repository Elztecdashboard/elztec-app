import { cache } from "react";
import { createSupabaseServerClient } from "./supabase-server";
import { ExactTokenRow } from "@/types";

const BASE_URL = "https://start.exactonline.nl/api/v1";
const TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";
const DIVISION = Number(process.env.EXACT_DIVISION || 2377678);

async function fetchNewTokens(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: string;
}> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.EXACT_CLIENT_ID!,
    client_secret: process.env.EXACT_CLIENT_SECRET!,
  });

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[fetchNewTokens] Refresh mislukt:", resp.status, errText);
    throw new Error("Token vernieuwen mislukt. Koppel Exact Online opnieuw via /exact/connect.");
  }

  const json = await resp.json();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

async function saveTokens(
  tokens: { access_token: string; refresh_token: string; expires_at: string },
  companyName: string
) {
  const supabase = createSupabaseServerClient();
  await supabase.from("exact_tokens").upsert({
    division: DIVISION,
    company_name: companyName,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
    updated_at: new Date().toISOString(),
  });
}

// cache() deduplicates calls binnen één React render tree (= één request).
// Hierdoor roepen Promise.all([getFinancialSummary, getOpenstaandeFacturen])
// slechts één keer getValidAccessToken aan, ook al gaat elk via exactFetch.
// Dit voorkomt de race condition waarbij twee concurrent refreshes het
// Exact Online rotating refresh token allebei proberen te gebruiken.
const getValidAccessToken = cache(async (): Promise<{ token: string; division: number }> => {
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

  if (expiresAt > Date.now() + 60_000) {
    return { token: row.access_token, division: row.division };
  }

  // Token verloopt binnen 60 seconden of is al verlopen → refresh
  const newTokens = await fetchNewTokens(row.refresh_token);
  await saveTokens(newTokens, row.company_name ?? "ElzTec B.V.");
  return { token: newTokens.access_token, division: DIVISION };
});

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
    // Exact heeft het token geweigerd — forceer een verse refresh en probeer opnieuw
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("exact_tokens")
      .select("*")
      .eq("division", DIVISION)
      .single();
    if (!data) throw new Error("Geen token voor force-refresh");

    const row = data as ExactTokenRow;
    const newTokens = await fetchNewTokens(row.refresh_token);
    await saveTokens(newTokens, row.company_name ?? "ElzTec B.V.");

    const retry = await fetch(url, {
      headers: { Authorization: `Bearer ${newTokens.access_token}`, Accept: "application/json" },
    });
    if (!retry.ok) throw new Error(`Exact API fout na retry: ${retry.status} ${path}`);
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
    const { data } = await supabase
      .from("exact_tokens")
      .select("division")
      .eq("division", DIVISION)
      .single();
    return !!data;
  } catch {
    return false;
  }
}

// Wordt aangeroepen door de /api/exact/refresh cron route
// om het token proactief te vernieuwen voordat het verloopt
export async function refreshExactTokenProactive(): Promise<{ refreshed: boolean }> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("exact_tokens")
    .select("*")
    .eq("division", DIVISION)
    .single();

  if (!data) throw new Error("Geen token gevonden in Supabase");

  const row = data as ExactTokenRow;
  const expiresAt = new Date(row.expires_at).getTime();

  // Alleen refreshen als het token binnen 2 minuten verloopt
  // (cron draait elke 8 minuten, token geldig ~10 minuten)
  if (expiresAt > Date.now() + 120_000) {
    return { refreshed: false };
  }

  const newTokens = await fetchNewTokens(row.refresh_token);
  await saveTokens(newTokens, row.company_name ?? "ElzTec B.V.");
  return { refreshed: true };
}
