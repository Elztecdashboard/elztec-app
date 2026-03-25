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

  if (!expired) {
    return NextResponse.json({ status: "token_valid", expires_at: data.expires_at, division: data.division });
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

    // Test de Exact API met de nieuwe token
    const testResp = await fetch(
      `https://start.exactonline.nl/api/v1/${DIVISION}/current/Me?$select=CurrentDivision,FullName`,
      { headers: { Authorization: `Bearer ${json.access_token}`, Accept: "application/json" } }
    );
    const testData = await testResp.text();

    return NextResponse.json({
      status: "refreshed",
      refresh_http_status: resp.status,
      new_expires_at: newExpiresAt,
      token_saved: savedOk,
      api_test_status: testResp.status,
      api_test_response: testData.substring(0, 300),
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
