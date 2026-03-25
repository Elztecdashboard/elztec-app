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

  return NextResponse.json({
    status: expired ? "token_expired_refresh_attempted" : "token_valid",
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
