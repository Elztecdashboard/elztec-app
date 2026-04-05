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
    // Exact Online weigert refresh als het token nog niet verlopen is → gooi null terug
    if (errText.includes("access_token not expired")) {
      return null as unknown as { access_token: string; refresh_token: string; expires_at: string };
    }
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

  // Token verloopt binnen 60 seconden of is al verlopen → probeer refresh
  const newTokens = await fetchNewTokens(row.refresh_token);
  // Als Exact Online zegt dat het token nog niet verlopen is, gebruik het gewoon
  if (!newTokens) {
    return { token: row.access_token, division: row.division };
  }
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
    next: { revalidate: 300 },
  });

  if (resp.status === 401) {
    // Re-read token from Supabase — a concurrent request may have already refreshed it
    const supabase2 = createSupabaseServerClient();
    const { data: freshData } = await supabase2
      .from("exact_tokens")
      .select("*")
      .eq("division", DIVISION)
      .single();
    if (!freshData) throw new Error("Geen token voor force-refresh");

    const freshRow = freshData as ExactTokenRow;
    const recentlyRefreshed = Date.now() - new Date(freshRow.updated_at).getTime() < 30_000;

    let accessToken: string;
    if (recentlyRefreshed) {
      // Another request already refreshed — use the new token directly
      accessToken = freshRow.access_token;
    } else {
      const newTokens = await fetchNewTokens(freshRow.refresh_token);
      if (!newTokens) {
        // Exact Online says token not expired yet — use the existing token
        accessToken = freshRow.access_token;
      } else {
        await saveTokens(newTokens, freshRow.company_name ?? "ElzTec B.V.");
        accessToken = newTokens.access_token;
      }
    }

    const retry = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!retry.ok) throw new Error(`Exact API fout na retry: ${retry.status} ${path}`);
    return retry.json();
  }

  if (!resp.ok) {
    throw new Error(`Exact API fout: ${resp.status} ${path}`);
  }

  return resp.json();
}

// Haalt alle pagina's op door de __next link te volgen.
// Exact Online geeft standaard max. 60 records per pagina terug;
// zonder paginering missen we records bij grotere datasets.
export async function exactFetchAll(path: string): Promise<unknown[]> {
  const { token, division } = await getValidAccessToken();
  const results: unknown[] = [];

  let nextUrl: string | null = `${BASE_URL}/${division}/${path}`;

  while (nextUrl) {
    const resp = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!resp.ok) throw new Error(`Exact API fout: ${resp.status} ${path}`);

    const json = await resp.json() as { d: { results: unknown[]; __next?: string } };
    results.push(...(json.d?.results ?? []));
    nextUrl = json.d?.__next ?? null;
  }

  return results;
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
