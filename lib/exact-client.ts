import { cache } from "react";
import { createSupabaseServerClient } from "./supabase-server";
import { ExactTokenRow } from "@/types";

const BASE_URL = "https://start.exactonline.nl/api/v1";
const TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";
const DIVISION = Number(process.env.EXACT_DIVISION || 2377678);

// Cache TTL: 20 minuten. Make.com warmt de cache op elke 8 minuten
// → cache is altijd warm, gebruikers raken nooit een cold start.
const CACHE_TTL_MS = 20 * 60 * 1000;

// Vertraging tussen gepagineerde Exact Online calls (rate limit bescherming).
// 800ms per pagina = max ~6s voor 8 pagina's, ruim binnen Vercel's 10s timeout.
const PAGE_DELAY_MS = 800;

// Marker voor "cache koud" fouten — dashboard toont een vriendelijk banner
// in plaats van een rode foutmelding. Alleen Make.com vult de cache.
export const CACHE_KOUD = "CACHE_KOUD";

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
    if (errText.includes("access_token not expired")) return null;
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

// TOKEN KEEPER PATROON:
// Make.com vernieuwt het token elke 8 minuten proactief. Gebruikers refreshen nooit
// actief — zij lezen alleen een vers token uit Supabase.
// Race condition guard: als updated_at < 30s geleden, heeft een ander proces het token
// net ververst. Gebruik dat token direct, ook al lijkt het bijna verlopen.
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
  const updatedAt = new Date(row.updated_at).getTime();
  const recentlyRefreshed = Date.now() - updatedAt < 30_000;

  if (expiresAt > Date.now() + 180_000 || recentlyRefreshed) {
    return { token: row.access_token, division: row.division };
  }

  // Noodgeval: token verlopen én niet recent ververst (Make.com heeft het gemist)
  console.warn("[getValidAccessToken] Noodfallback: token niet op tijd ververst door Make.com");
  const newTokens = await fetchNewTokens(row.refresh_token);
  if (!newTokens) return { token: row.access_token, division: row.division };
  await saveTokens(newTokens, row.company_name ?? "ElzTec B.V.");
  return { token: newTokens.access_token, division: DIVISION };
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
  await supabase.from("exact_cache").upsert({
    cache_key: cacheKey,
    data,
    expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  });
}

// ─── Interne paginator (geen cache, geen side effects) ────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      const retryAfter = Number(resp.headers.get("Retry-After") ?? 2);
      await sleep(Math.min(retryAfter, 5) * 1000);
    }
    if (!resp!.ok) throw new Error(`Exact API fout: ${resp!.status} ${path}`);
    const json = await resp!.json() as { d: { results: unknown[]; __next?: string } };
    results.push(...(json.d?.results ?? []));
    nextUrl = json.d?.__next ?? null;

    // Vertraging tussen pagina's om Exact Online rate limits te voorkomen
    if (nextUrl) await sleep(PAGE_DELAY_MS);
  }

  return results;
}

// ─── Gecachede dataset-functies (gebruikt door dashboard-pagina's) ─────────────
// React cache() zorgt dat binnen één render dezelfde dataset maar één keer
// uit Supabase gelezen wordt, ook al roepen meerdere functies hem aan.

export const getTransactionLinesForJaar = cache(async (jaar: number): Promise<TransactionLine[]> => {
  const cached = await readCache<TransactionLine>(`tx-${jaar}`);
  if (cached) return cached;

  // Cache leeg — alleen Make.com (via /api/exact/warm-cache) mag Exact Online aanroepen.
  // Het dashboard toont een vriendelijke "data wordt geladen" melding.
  throw new Error(`${CACHE_KOUD}:tx-${jaar}`);
});

export const getSalesInvoicesForJaar = cache(async (jaar: number): Promise<SalesInvoiceLine[]> => {
  const cached = await readCache<SalesInvoiceLine>(`si-${jaar}`);
  if (cached) return cached;

  throw new Error(`${CACHE_KOUD}:si-${jaar}`);
});

export const getReceivablesData = cache(async (): Promise<unknown[]> => {
  const cached = await readCache<unknown>("recv");
  if (cached) return cached;

  throw new Error(`${CACHE_KOUD}:recv`);
});

// ─── Cache warm-up functies (gebruikt door /api/exact/warm-cache) ──────────────
// Deze functies slaan de cache read over en halen altijd vers data op,
// zodat Make.com de cache kan opwarmen vóór hij verloopt.

export async function warmTransactionLines(jaar: number): Promise<number> {
  const { token, division } = await getValidAccessToken();
  const path = `financialtransaction/TransactionLines?$select=GLAccountCode,GLAccountDescription,AmountDC,FinancialPeriod&$filter=FinancialYear eq ${jaar}`;
  const lines = await fetchAllPages(path, token, division);
  await writeCache(`tx-${jaar}`, lines);
  return lines.length;
}

export async function warmSalesInvoices(jaar: number): Promise<number> {
  const { token, division } = await getValidAccessToken();
  const path = `salesinvoice/SalesInvoices?$select=OrderedByName,AmountDC,InvoiceDate&$filter=InvoiceDate ge datetime'${jaar}-01-01T00:00:00' and InvoiceDate lt datetime'${jaar + 1}-01-01T00:00:00'`;
  const invoices = await fetchAllPages(path, token, division);
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
  const items = Array.isArray(data?.d) ? data.d : ((data?.d as { results: unknown[] })?.results ?? []);
  await writeCache("recv", items as unknown[]);
  return (items as unknown[]).length;
}

// ─── Low-level helpers (voor backwards compat en /exact/callback) ──────────────
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

// Wordt aangeroepen door de /api/exact/refresh cron route (Make.com, elke 8 min)
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

  if (expiresAt > Date.now() + 180_000) {
    return { refreshed: false };
  }

  const newTokens = await fetchNewTokens(row.refresh_token);
  if (!newTokens) return { refreshed: false };
  await saveTokens(newTokens, row.company_name ?? "ElzTec B.V.");
  return { refreshed: true };
}
