import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const errorDesc = req.nextUrl.searchParams.get("error_description");

  // Exact Online stuurde een fout terug (bijv. gebruiker keurde niet goed)
  if (error) {
    console.error("[callback] Exact OAuth fout:", error, errorDesc);
    return NextResponse.redirect(
      new URL(`/exact/connect?fout=${encodeURIComponent(error)}&omschrijving=${encodeURIComponent(errorDesc ?? "")}`, req.url)
    );
  }

  if (!code) {
    console.error("[callback] Geen code ontvangen");
    return NextResponse.redirect(new URL("/exact/connect?fout=geen_code", req.url));
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").trim().replace(/\/$/, "");
  const redirectUri = `${baseUrl}/exact/callback`;

  console.log("[callback] code ontvangen, wissel voor tokens. redirect_uri:", redirectUri);

  // Wissel code voor tokens
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.EXACT_CLIENT_ID!,
    client_secret: process.env.EXACT_CLIENT_SECRET!,
  });

  const tokenResp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    console.error("[callback] Token exchange mislukt:", tokenResp.status, errText);
    return NextResponse.redirect(
      new URL(`/exact/connect?fout=token_fout&status=${tokenResp.status}`, req.url)
    );
  }

  const tokens = await tokenResp.json();

  if (!tokens.access_token || !tokens.refresh_token) {
    console.error("[callback] Tokens ontvangen maar onvolledig:", JSON.stringify(tokens));
    return NextResponse.redirect(new URL("/exact/connect?fout=token_onvolledig", req.url));
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const division = Number(process.env.EXACT_DIVISION ?? 2377678);

  console.log("[callback] Tokens ontvangen, sla op voor division:", division);

  // Sla tokens op
  const supabase = createSupabaseServerClient();
  const { error: upsertError } = await supabase.from("exact_tokens").upsert({
    division,
    company_name: "ElzTec B.V.",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    console.error("[callback] Supabase upsert mislukt:", upsertError.message, upsertError.code);
    return NextResponse.redirect(
      new URL(`/exact/connect?fout=supabase_fout&detail=${encodeURIComponent(upsertError.message)}`, req.url)
    );
  }

  console.log("[callback] Tokens opgeslagen, redirect naar dashboard");
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
