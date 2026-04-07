import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";

async function getIsAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { session } } = await sessionClient.auth.getSession();
    if (!session) return false;

    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();
    return data?.role === "admin";
  } catch {
    return false;
  }
}

export default async function ExactFout() {
  const isAdmin = await getIsAdmin();

  if (isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-5 py-20">
        <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-gray-800 font-semibold text-lg">Exact Online koppeling verlopen</p>
          <p className="text-gray-500 text-sm max-w-sm">
            De verbinding met Exact Online moet opnieuw worden ingesteld.
            Dit is een eenmalige handeling.
          </p>
        </div>
        <Link
          href="/exact/connect"
          className="bg-[#001D3A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition"
        >
          Exact Online opnieuw koppelen →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="space-y-2">
        <p className="text-gray-700 font-semibold text-lg">Dashboard tijdelijk niet beschikbaar</p>
        <p className="text-gray-500 text-sm max-w-sm">
          De financiële data is momenteel niet bereikbaar.
          De beheerder is op de hoogte gesteld.
          Probeer het later opnieuw.
        </p>
      </div>
    </div>
  );
}
