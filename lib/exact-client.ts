import { cache } from "react";
import { createSupabaseServerClient } from "./supabase-server";
import { ExactTokenRow } from "@/types";

const BASE_URL = "https://start.exactonline.nl/api/v1";
const TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";
const DIVISION = Number(process.env.EXACT_DIVISION || 2377678);

// Cache TTL: 40 minuten. Cron-job.org warmt elke 10 minuten op → cache altijd warm.
const CACHE_TTL_MS = 40 * 60 * 1000;

export const EXACT_DISCONNECTED = "EXACT_DISCONNECTED";

// ─── Types voor gecachede datasets ────────────────────────────────────────────
export interface TransactionLine {
  GLAccountCode: string;
  GLAccountDescription: string;
  AmountDC: number;
  FinancialPeriod: number;
}

export interface SalesInvoiceLine {
  OrderedByName: string;
  AmountDC: number;
  InvoiceDate: string;
}

// ─── Token management ─────────────────────────────────────────────────────────
async function fetchNewTokens(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: string;
} | null> {
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

    // "access_token not expired" = token is nog geldig, geen actie nodig
    if (errText.includes("access_token not expired")) return null;

    // Race condition: een ander proces heeft dit refresh token net gebruikt.
    // De aanroeper kan dan het verse token opnieuw uit de database lezen.
    if (errText.includes("Old refresh token")) {
      throw new Error("RACE_CONDITION: ander proces refreshte het token net eerder");
    }

    // Refresh token is echt verlopen of ingetrokken → opnieuw koppelen vereist
    if (errText.includes("invalid_grant") || errText.includes("invalid_client") || resp.status === 400) {
      throw new Error(`${EXACT_DISCONNECTED}: Exact Online refresh token ongeldig. Ga naar /exact/connect.`);
    }

    throw new Error(`Exact token vernieuwen mislukt (${resp.status}). Probeer later opnieuw.`);
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Haalt een geldig access token op. Refresht het token als het bijna verlopen is.
// Race condition bescherming: als twee processen tegelijk proberen te refreshen,
// wint er één. De verliezer wacht even en leest het verse token dat de winnaar
// heeft opgeslagen — in plaats van te crashen.
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

  // Token is nog minstens 2 minuten geldig → direct gebruiken
  if (expiresAt > Date.now() + 2 * 60_000) {
    return { token: row.access_token, division: row.division };
  }

  // Token verloopt binnenkort (of is verlopen) → verversen
  console.log("[getValidAccessToken] Token verloopt binnenkort, wordt ververst...");
  try {
    const newTokens = await fetchNewTokens(row.refresh_token);
    if (!newTokens) {
      // Exact zei "nog niet verlopen" → gebruik het huidige token
      return { token: row.access_token, division: row.division };
    }
    await saveTokens(newTokens, row.company_name ?? "ElzTec B.V.");
    return { token: newTokens.access_token, division: DIVISION };
  } catch (e) {
    // Race condition: ander proces refreshte net eerder → lees het verse token
    if (String(e).includes("RACE_CONDITION")) {
      console.log("[getValidAccessToken] Race condition — lees vers token uit database...");
      await sleep(1500);
      const { data: fresh } = await supabase
        .from("exact_tokens")
        .select("access_token, division")
        .eq("division", DIVISION)
        .single();
      if (fresh?.access_token) {
        return { token: fresh.access_token, division: DIVISION };
      }
    }
    throw e;
  }
});

// ─── Supabase cache helpers ────────────────────────────────────────────────────
async function readCache<T>(cacheKey: string): Promise<T[] | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("exact_cache")
    .select("data")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return (data?.data as T[]) ?? null;
}

async function writeCache(cacheKey: string, data: unknown[]): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("exact_cache").upsert(
    {
      cache_key: cacheKey,
      data,
      expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    },
    { onConflict: "cache_key" }
  );
  if (error) console.error("[writeCache] Supabase upsert fout:", cacheKey, error.message);
}

// ─── Interne paginator (geen cache, geen side effects) ────────────────────────
async function fetchAllPages(path: string, token: string, division: number): Promise<unknown[]> {
  const results: unknown[] = [];
  let nextUrl: string | null = `${BASE_URL}/${division}/${path}`;

  while (nextUrl) {
    let resp: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      resp = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (resp.status !== 429) break;
      const retryAfter = Number(resp.headers.get("Retry-After") ?? 30);
      await sleep(Math.min(retryAfter, 45) * 1000);
    }
    if (!resp!.ok) throw new Error(`Exact API fout: ${resp!.status} ${path}`);
    const json = await resp!.json() as { d: { results: unknown[]; __next?: string } };
    results.push(...(json.d?.results ?? []));
    nextUrl = json.d?.__next ?? null;
  }

  return results;
}

// ─── Gecachede dataset-functies (gebruikt door dashboard-pagina's) ─────────────
export const getTransactionLinesForJaar = cache(async (jaar: number): Promise<TransactionLine[]> => {
  const cached = await readCache<TransactionLine>(`tx-${jaar}`);
  if (cached) return cached;

  console.log(`[exact-client] Cache koud voor tx-${jaar}, warmt op...`);
  const nu = new Date();
  const maxPeriode = jaar === nu.getFullYear() ? nu.getMonth() + 1 : 12;
  await warmTransactionLines(jaar, maxPeriode);
  return (await readCache<TransactionLine>(`tx-${jaar}`)) ?? [];
});

export const getSalesInvoicesForJaar = cache(async (jaar: number): Promise<SalesInvoiceLine[]> => {
  const cached = await readCache<SalesInvoiceLine>(`si-${jaar}`);
  if (cached) return cached;

  console.log(`[exact-client] Cache koud voor si-${jaar}, warmt op...`);
  await warmSalesInvoices(jaar);
  return (await readCache<SalesInvoiceLine>(`si-${jaar}`)) ?? [];
});

export const getReceivablesData = cache(async (): Promise<unknown[]> => {
  const cached = await readCache<unknown>("recv");
  if (cached) return cached;

  console.log(`[exact-client] Cache koud voor recv, warmt op...`);
  await warmReceivables();
  return (await readCache<unknown>("recv")) ?? [];
});

// ─── Cache warm-up functies (gebruikt door /api/exact/warm-cache) ──────────────

export async function warmTransactionLines(jaar: number, maxPeriode = 12): Promise<number> {
  const { token, division } = await getValidAccessToken();
  const nu = new Date();
  const isHuidigJaar = jaar === nu.getFullYear();
  const allLines: unknown[] = [];

  if (!isHuidigJaar) {
    // Vorig jaar: één jaarquery. Data is definitief, nooit meer dan ~500 regels
    // voor een klein bedrijf. Klaar in 1-3 seconden i.p.v. 12 losse aanroepen.
    const path = `financialtransaction/TransactionLines?$top=1000&$select=GLAccountCode,GLAccountDescription,AmountDC,FinancialPeriod&$filter=FinancialYear eq ${jaar}`;
    const lines = await fetchAllPages(path, token, division);
    allLines.push(...lines);
  } else {
    // Huidig jaar: per periode ophalen om Exact rate limits te respecteren.
    for (let periode = 1; periode <= maxPeriode; periode++) {
      if (periode > 1) await sleep(500);
      const path = `financialtransaction/TransactionLines?$top=1000&$select=GLAccountCode,GLAccountDescription,AmountDC,FinancialPeriod&$filter=FinancialYear eq ${jaar} and FinancialPeriod eq ${periode}`;
      const lines = await fetchAllPages(path, token, division);
      allLines.push(...lines);
    }
  }

  await writeCache(`tx-${jaar}`, allLines);
  return allLines.length;
}

export async function warmSalesInvoices(jaar: number): Promise<number> {
  const { token, division } = await getValidAccessToken();
  const path = `salesinvoice/SalesInvoices?$top=1000&$select=OrderedByName,AmountDC,InvoiceDate&$filter=InvoiceDate ge datetime'${jaar}-01-01T00:00:00' and InvoiceDate lt datetime'${jaar + 1}-01-01T00:00:00'`;
  const raw = await fetchAllPages(path, token, division);
  const invoices = convertODataDates(raw) as unknown[];
  await writeCache(`si-${jaar}`, invoices);
  return invoices.length;
}

export async function warmReceivables(): Promise<number> {
  const { token, division } = await getValidAccessToken();
  const url = `${BASE_URL}/${division}/cashflow/Receivables?$select=AccountName,InvoiceNumber,TransactionAmountDC,DueDate,InvoiceDate,Description,IsFullyPaid&$filter=IsFullyPaid eq false&$orderby=DueDate asc`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`Exact API fout: ${resp.status} cashflow/Receivables`);
  const data = await resp.json() as { d: unknown[] | { results: unknown[] } };
  const rawItems = Array.isArray(data?.d) ? data.d : ((data?.d as { results: unknown[] })?.results ?? []);
  const items = convertODataDates(rawItems) as unknown[];
  await writeCache("recv", items);
  return items.length;
}

// ─── OData datum-converter ────────────────────────────────────────────────────
function convertODataDates(obj: unknown): unknown {
  if (typeof obj === "string") {
    const m = obj.match(/^\/Date\((\d+)\)\/$/);
    return m ? new Date(Number(m[1])).toISOString() : obj;
  }
  if (Array.isArray(obj)) return obj.map(convertODataDates);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, convertODataDates(v)])
    );
  }
  return obj;
}

// ─── Low-level helpers ────────────────────────────────────────────────────────
export async function exactFetch(path: string): Promise<unknown> {
  const { token, division } = await getValidAccessToken();
  const url = `${BASE_URL}/${division}/${path}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`Exact API fout: ${resp.status} ${path}`);
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

// Geeft terug wanneer de cache voor het huidige jaar voor het laatst is bijgewerkt.
export async function getCacheStatus(): Promise<{ cachedAt: Date | null }> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("exact_cache")
    .select("expires_at")
    .eq("cache_key", `tx-${new Date().getFullYear()}`)
    .maybeSingle();

  if (!data?.expires_at) return { cachedAt: null };
  const cachedAt = new Date(new Date(data.expires_at).getTime() - CACHE_TTL_MS);
  return { cachedAt };
}
