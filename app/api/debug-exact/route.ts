import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";
const DIVISION = Number(process.env.EXACT_DIVISION || 2377678);

export async function GET() {
  const supabase = createSupabaseServerClient();

  // Haal token op uit DB
  const { data, error } = await supabase
    .from("exact_tokens")
    .select("division, expires_at, updated_at")
    .eq("division", DIVISION)
    .single();

  if (error || !data) {
    return NextResponse.json({ status: "no_token", error: error?.message });
  }

  const expiresAt = new Date(data.expires_at).getTime();
  const now = Date.now();
  const expired = expiresAt <= now + 60_000;

  // Altijd de API testen — haal huidige access token op
  const { data: tokenRow } = await supabase.from("exact_tokens").select("access_token").eq("division", DIVISION).single();
  if (!expired && tokenRow?.access_token) {
    const jaar = 2026;
    const meResp = await fetch(
      `https://start.exactonline.nl/api/v1/current/Me?$select=CurrentDivision,FullName`,
      { headers: { Authorization: `Bearer ${tokenRow.access_token}`, Accept: "application/json" } }
    );
    const meData = await meResp.text();

    // Test de financiële endpoint
    const finResp = await fetch(
      `https://start.exactonline.nl/api/v1/${DIVISION}/financialtransaction/TransactionLines?$select=GLAccountCode,Amount&$filter=FinancialYear eq ${jaar}&$top=5`,
      { headers: { Authorization: `Bearer ${tokenRow.access_token}`, Accept: "application/json" } }
    );
    const finData = await finResp.text();

    // Test openstaande facturen
    const facResp = await fetch(
      `https://start.exactonline.nl/api/v1/${DIVISION}/receivable/OutstandingReceivables?$select=AccountName,Amount,InvoiceDate&$top=3`,
      { headers: { Authorization: `Bearer ${tokenRow.access_token}`, Accept: "application/json" } }
    );
    const facData = await facResp.text();

    return NextResponse.json({
      status: "token_valid",
      expires_at: data.expires_at,
      division: data.division,
      me_test: { status: meResp.status, body: meData.substring(0, 300) },
      financials_test: { status: finResp.status, body: finData.substring(0, 500) },
      facturen_test: { status: facResp.status, body: facData.substring(0, 500) },
    });
  }

  // Probeer refresh
  const { data: fullRow } = await supabase
    .from("exact_tokens")
    .select("*")
    .eq("division", DIVISION)
    .single();

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: fullRow?.refresh_token ?? "",
    client_id: process.env.EXACT_CLIENT_ID!,
    client_secret: process.env.EXACT_CLIENT_SECRET!,
  });

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const respText = await resp.text();

  let newAccessToken = null;
  let savedOk = false;
  if (resp.ok) {
    const json = JSON.parse(respText);
    newAccessToken = json.access_token ? json.access_token.substring(0, 20) + "..." : null;
    const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();
    const { error: upsertErr } = await supabase.from("exact_tokens").upsert({
      division: DIVISION,
      company_name: fullRow?.company_name,
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    });
    savedOk = !upsertErr;

    // Test de Exact API: Me zonder division (correct voor dit endpoint)
    const meResp = await fetch(
      `https://start.exactonline.nl/api/v1/current/Me?$select=CurrentDivision,FullName`,
      { headers: { Authorization: `Bearer ${json.access_token}`, Accept: "application/json" } }
    );
    const meData = await meResp.text();

    // Test met division
    const meResp2 = await fetch(
      `https://start.exactonline.nl/api/v1/${DIVISION}/current/Me?$select=CurrentDivision,FullName`,
      { headers: { Authorization: `Bearer ${json.access_token}`, Accept: "application/json" } }
    );
    const meData2 = await meResp2.text();

    return NextResponse.json({
      status: "refreshed",
      refresh_http_status: resp.status,
      new_expires_at: newExpiresAt,
      token_saved: savedOk,
      division_used: DIVISION,
      me_without_division: { status: meResp.status, body: meData.substring(0, 400) },
      me_with_division: { status: meResp2.status, body: meData2.substring(0, 400) },
    });
  }

  return NextResponse.json({
    status: "refresh_failed",
    refresh_http_status: resp.status,
    refresh_response: respText.substring(0, 500),
    expires_at: data.expires_at,
    division: data.division,
    env_check: {
      client_id: process.env.EXACT_CLIENT_ID ? "set" : "MISSING",
      client_secret: process.env.EXACT_CLIENT_SECRET ? "set" : "MISSING",
      division_env: process.env.EXACT_DIVISION ?? "not set (using default)",
      service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
    }
  });
}
