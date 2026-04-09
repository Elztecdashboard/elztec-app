import { isExactGekoppeld } from "@/lib/exact-client";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";

const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").trim().replace(/\/$/, "");
const AUTH_URL =
  `https://start.exactonline.nl/api/oauth2/auth` +
  `?client_id=${process.env.EXACT_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(baseUrl + "/exact/callback")}` +
  `&response_type=code` +
  `&force_login=0`;

const FOUT_BERICHTEN: Record<string, string> = {
  geen_code: "Exact Online stuurde geen autorisatiecode terug.",
  token_fout: "De autorisatiecode kon niet worden ingewisseld voor tokens.",
  token_onvolledig: "Exact Online stuurde een onvolledige tokenset terug.",
  supabase_fout: "De tokens konden niet worden opgeslagen in de database.",
  access_denied: "Je hebt de toegang tot Exact Online geweigerd.",
};

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function ExactConnectPage({ searchParams }: Props) {
  const params = await searchParams;
  const fout = params.fout ?? null;
  const detail = params.detail ?? params.omschrijving ?? null;
  const status = params.status ?? null;

  const gekoppeld = await isExactGekoppeld();
  let updatedAt: string | null = null;

  if (gekoppeld) {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("exact_tokens")
      .select("updated_at")
      .eq("division", Number(process.env.EXACT_DIVISION || 2377678))
      .single();
    updatedAt = data?.updated_at ?? null;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-[#001D3A]">Exact Online koppeling</h1>

      {/* Foutmelding bij mislukte koppeling */}
      {fout && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          <p className="font-semibold text-red-700">Koppeling mislukt</p>
          <p className="text-sm text-red-600">
            {FOUT_BERICHTEN[fout] ?? `Onbekende fout: ${fout}`}
          </p>
          {status && (
            <p className="text-xs text-red-500">HTTP status: {status}</p>
          )}
          {detail && (
            <p className="text-xs text-red-500 font-mono break-all">{detail}</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${gekoppeld ? "bg-green-500" : "bg-gray-300"}`} />
          <p className="font-medium">{gekoppeld ? "Verbinding actief" : "Niet gekoppeld"}</p>
        </div>

        {gekoppeld && updatedAt && (
          <p className="text-sm text-gray-500">
            Laatste synchronisatie: {new Date(updatedAt).toLocaleString("nl-NL")}
          </p>
        )}

        {gekoppeld ? (
          <Link
            href={AUTH_URL}
            className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Opnieuw koppelen
          </Link>
        ) : (
          <Link
            href={AUTH_URL}
            className="inline-block bg-[#001D3A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition"
          >
            Koppel Exact Online →
          </Link>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-600">Debug info</p>
        <p>Redirect URI: <span className="font-mono">{baseUrl}/exact/callback</span></p>
        <p>Division: <span className="font-mono">{process.env.EXACT_DIVISION ?? "2377678 (default)"}</span></p>
      </div>
    </div>
  );
}
