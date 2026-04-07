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

function WachtwoordWijzigen({ userId, email }: { userId: string; email: string | null }) {
  const [open, setOpen] = useState(false);
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    if (wachtwoord.length < 6) {
      setFout("Wachtwoord moet minimaal 6 tekens zijn.");
      return;
    }
    setBezig(true);
    setFout(null);
    setSucces(false);

    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, wachtwoord }),
    });

    setBezig(false);
    if (!res.ok) {
      const data = await res.json();
      setFout(data.error ?? "Fout bij opslaan.");
      return;
    }
    setSucces(true);
    setWachtwoord("");
    setTimeout(() => { setOpen(false); setSucces(false); }, 1500);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#6979D6] hover:text-[#5868c5] transition"
      >
        Wachtwoord
      </button>
    );
  }

  return (
    <form onSubmit={opslaan} className="flex items-center gap-2">
      <input
        type="password"
        value={wachtwoord}
        onChange={(e) => setWachtwoord(e.target.value)}
        placeholder="Nieuw wachtwoord"
        autoFocus
        className="text-xs border border-gray-200 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-[#6979D6]"
      />
      {fout && <span className="text-xs text-red-500">{fout}</span>}
      {succes && <span className="text-xs text-green-600">Opgeslagen</span>}
      {!fout && !succes && (
        <>
          <button
            type="submit"
            disabled={bezig}
            className="text-xs bg-[#6979D6] text-white px-2 py-1 rounded hover:bg-[#5868c5] transition disabled:opacity-50"
          >
            {bezig ? "…" : "Opslaan"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setWachtwoord(""); setFout(null); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Annuleren
          </button>
        </>
      )}
    </form>
  );
}

export default function BeheerPage() {
  const [gebruikers, setGebruikers] = useState<Gebruiker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toegang, setToegang] = useState(true);
  const [huidigId, setHuidigId] = useState<string | null>(null);

  // Aanmaken formulier
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "lezer">("lezer");
  const [wachtwoord, setWachtwoord] = useState("");
  const [toonWachtwoord, setToonWachtwoord] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

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

  async function wijzigRol(user_id: string, newRole: string) {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Fout bij opslaan.");
      return;
    }
    setGebruikers((prev) =>
      prev.map((g) => (g.id === user_id ? { ...g, role: newRole } : g))
    );
  }

  async function verwijderGebruiker(user_id: string, userEmail: string | null) {
    if (!confirm(`Weet je zeker dat je ${userEmail ?? "deze gebruiker"} wilt verwijderen?`)) return;

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

  async function aanmaken(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    setSucces(false);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, naam: naam || null, role, wachtwoord }),
    });

    const data = await res.json();
    setBezig(false);

    if (!res.ok) {
      setFout(data.error ?? "Fout bij aanmaken.");
      return;
    }

    setSucces(true);
    setNaam("");
    setEmail("");
    setRole("lezer");
    setWachtwoord("");
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
                <th className="px-6 py-3 font-medium">Wachtwoord</th>
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
                    <td className="px-6 py-3">
                      <WachtwoordWijzigen userId={g.id} email={g.email} />
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

      {/* Aanmaakformulier */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-[#001D3A]">Gebruiker aanmaken</h2>
        </div>
        <form onSubmit={aanmaken} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Naam</label>
              <input
                type="text"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@elztec.nl"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6979D6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Wachtwoord <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={toonWachtwoord ? "text" : "password"}
                  required
                  minLength={6}
                  value={wachtwoord}
                  onChange={(e) => setWachtwoord(e.target.value)}
                  placeholder="Minimaal 6 tekens"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-[#6979D6]"
                />
                <button
                  type="button"
                  onClick={() => setToonWachtwoord((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {toonWachtwoord ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rol <span className="text-red-400">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "lezer")}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6979D6]"
              >
                <option value="lezer">lezer</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>

          {fout && <p className="text-xs text-red-500">{fout}</p>}
          {succes && <p className="text-xs text-green-600">Gebruiker aangemaakt.</p>}

          <div>
            <button
              type="submit"
              disabled={bezig}
              className="px-4 py-2 text-sm font-medium bg-[#6979D6] text-white rounded-lg hover:bg-[#5868c5] transition disabled:opacity-50"
            >
              {bezig ? "Bezig…" : "Aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
