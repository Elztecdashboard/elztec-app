import { isExactGekoppeld } from "@/lib/exact-client";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";

const AUTH_URL =
  `https://start.exactonline.nl/api/oauth2/auth` +
  `?client_id=${process.env.EXACT_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_BASE_URL + "/exact/callback")}` +
  `&response_type=code` +
  `&force_login=0`;

export default async function ExactConnectPage() {
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
    </div>
  );
}
