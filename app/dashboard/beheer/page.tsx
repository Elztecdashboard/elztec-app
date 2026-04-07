"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Gebruiker {
  id: string;
  email: string | null;
  naam: string | null;
  role: string;
  created_at: string;
  last_sign_in: string | null;
}

function RolBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#6979D6] text-white">
        admin
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      lezer
    </span>
  );
}

function formatDatum(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function BeheerPage() {
  const [gebruikers, setGebruikers] = useState<Gebruiker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toegang, setToegang] = useState(true);
  const [huidigId, setHuidigId] = useState<string | null>(null);

  // Uitnodiging formulier
  const [uitnodigNaam, setUitnodigNaam] = useState("");
  const [uitnodigEmail, setUitnodigEmail] = useState("");
  const [uitnodigRole, setUitnodigRole] = useState<"admin" | "lezer">("lezer");
  const [uitnodigBezig, setUitnodigBezig] = useState(false);
  const [uitnodigFout, setUitnodigFout] = useState<string | null>(null);
  const [uitnodigSucces, setUitnodigSucces] = useState(false);

  async function laadGebruikers() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users");
    if (res.status === 403) {
      setToegang(false);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Kon gebruikers niet laden.");
      setLoading(false);
      return;
    }
    const data: Gebruiker[] = await res.json();
    setGebruikers(data);
    setLoading(false);
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHuidigId(session.user.id);
    });
    laadGebruikers();
  }, []);

  async function wijzigRol(user_id: string, role: string) {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, role }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Fout bij opslaan.");
      return;
    }
    setGebruikers((prev) =>
      prev.map((g) => (g.id === user_id ? { ...g, role } : g))
    );
  }

  async function verwijderGebruiker(user_id: string, email: string | null) {
    if (
      !confirm(
        `Weet je zeker dat je ${email ?? "deze gebruiker"} wilt verwijderen?`
      )
    )
      return;

    const res = await fetch(`/api/admin/users?user_id=${user_id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Fout bij verwijderen.");
      return;
    }
    setGebruikers((prev) => prev.filter((g) => g.id !== user_id));
  }

  async function uitnodigen(e: React.FormEvent) {
    e.preventDefault();
    setUitnodigBezig(true);
    setUitnodigFout(null);
    setUitnodigSucces(false);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: uitnodigEmail,
        naam: uitnodigNaam || null,
        role: uitnodigRole,
      }),
    });

    const data = await res.json();
    setUitnodigBezig(false);

    if (!res.ok) {
      setUitnodigFout(data.error ?? "Fout bij uitnodigen.");
      return;
    }

    setUitnodigSucces(true);
    setUitnodigNaam("");
    setUitnodigEmail("");
    setUitnodigRole("lezer");
    laadGebruikers();
  }

  if (!toegang) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500">Geen toegang. Alleen admins kunnen deze pagina bekijken.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#001D3A]">Gebruikersbeheer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Beheer toegang tot het Elztec Dashboard.
        </p>
      </div>

      {/* Gebruikerstabel */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-[#001D3A]">Gebruikers</h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-sm text-gray-400">Laden…</div>
        ) : error ? (
          <div className="px-6 py-8 text-sm text-red-500">{error}</div>
        ) : gebruikers.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-400">Geen gebruikers gevonden.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="px-6 py-3 font-medium">Naam</th>
                <th className="px-6 py-3 font-medium">E-mail</th>
                <th className="px-6 py-3 font-medium">Rol</th>
                <th className="px-6 py-3 font-medium">Laatste login</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {gebruikers.map((g) => {
                const isZelf = g.id === huidigId;
                return (
                  <tr key={g.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3 text-gray-700">
                      {g.naam ?? <span className="text-gray-400 italic">—</span>}
                      {isZelf && (
                        <span className="ml-2 text-xs text-gray-400">(jij)</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{g.email ?? "—"}</td>
                    <td className="px-6 py-3">
                      {isZelf ? (
                        <RolBadge role={g.role} />
                      ) : (
                        <select
                          value={g.role}
                          onChange={(e) => wijzigRol(g.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#6979D6]"
                        >
                          <option value="lezer">lezer</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatDatum(g.last_sign_in)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {!isZelf && (
                        <button
                          onClick={() => verwijderGebruiker(g.id, g.email)}
                          className="text-xs text-red-400 hover:text-red-600 transition"
                        >
                          Verwijderen
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Uitnodigingsformulier */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-[#001D3A]">Gebruiker uitnodigen</h2>
        </div>
        <form onSubmit={uitnodigen} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Naam
              </label>
              <input
                type="text"
                value={uitnodigNaam}
                onChange={(e) => setUitnodigNaam(e.target.value)}
                placeholder="Jan de Vries"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6979D6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                E-mailadres <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={uitnodigEmail}
                onChange={(e) => setUitnodigEmail(e.target.value)}
                placeholder="jan@elztec.nl"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6979D6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rol <span className="text-red-400">*</span>
              </label>
              <select
                value={uitnodigRole}
                onChange={(e) => setUitnodigRole(e.target.value as "admin" | "lezer")}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6979D6]"
              >
                <option value="lezer">lezer</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>

          {uitnodigFout && (
            <p className="text-xs text-red-500">{uitnodigFout}</p>
          )}
          {uitnodigSucces && (
            <p className="text-xs text-green-600">Uitnodiging verstuurd.</p>
          )}

          <div>
            <button
              type="submit"
              disabled={uitnodigBezig}
              className="px-4 py-2 text-sm font-medium bg-[#6979D6] text-white rounded-lg hover:bg-[#5868c5] transition disabled:opacity-50"
            >
              {uitnodigBezig ? "Bezig…" : "Uitnodigen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
