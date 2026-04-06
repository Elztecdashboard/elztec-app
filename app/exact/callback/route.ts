import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";
const BASE_URL = "https://start.exactonline.nl/api/v1";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/exact/connect?fout=geen_code", req.url));
  }

  // Wissel code voor tokens
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${(process.env.NEXT_PUBLIC_BASE_URL ?? "").trim()}/exact/callback`,
    client_id: process.env.EXACT_CLIENT_ID!,
    client_secret: process.env.EXACT_CLIENT_SECRET!,
  });

  const tokenResp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenResp.ok) {
    return NextResponse.redirect(new URL("/exact/connect?fout=token_fout", req.url));
  }

  const tokens = await tokenResp.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Altijd de geconfigureerde division gebruiken als opslagsleutel.
  // CurrentDivision uit de API kan afwijken (bijv. ander bedrijf/testomgeving).
  const division = Number(process.env.EXACT_DIVISION ?? 2377678);

  // Sla tokens op
  const supabase = createSupabaseServerClient();
  await supabase.from("exact_tokens").upsert({
    division,
    company_name: "ElzTec B.V.",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
