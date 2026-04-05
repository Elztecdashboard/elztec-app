import { getMargeDataPerMaand, getResultaatAlleMandenVoorJaar } from "@/lib/exact-queries";
import KpiCard from "@/components/KpiCard";
import PaginaHeader from "@/components/PaginaHeader";
import TrendPctGrafiek from "@/components/TrendPctGrafiek";
import Link from "next/link";
import { MAANDEN, MAANDEN_LANG, formatBedrag } from "@/lib/utils";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default async function MargePage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string; maand?: string }>;
}) {
  const params = await searchParams;
  const nu = new Date();
  const huidigJaar = nu.getFullYear();
  const huidigMaand = nu.getMonth() + 1;

  const geselecteerdJaar = Number(params.jaar) || huidigJaar;
  const geselecteerdMaand = Number(params.maand) || huidigMaand;

  const [margeData, alleMaanden] = await Promise.all([
    getMargeDataPerMaand(geselecteerdJaar, geselecteerdMaand).catch(() => null),
    getResultaatAlleMandenVoorJaar(geselecteerdJaar),
  ]);

  const margePct = margeData && margeData.totaalOmzet > 0
    ? (margeData.totaalBrutomarge / margeData.totaalOmzet) * 100
    : 0;

  // Trend: marge% per maand
  const trendData = MAANDEN.map((m, i) => {
    const md = alleMaanden[i];
    const pct = md && md.omzet > 0 ? ((md.omzet - md.kostprijs) / md.omzet) * 100 : 0;
    return { maand: m, margePct: Math.round(pct * 10) / 10 };
  });

  // Navigation
  const vorigeNavJaar = geselecteerdMaand === 1 ? geselecteerdJaar - 1 : geselecteerdJaar;
  const vorigeNavMaand = geselecteerdMaand === 1 ? 12 : geselecteerdMaand - 1;
  const volgendeNavJaar = geselecteerdMaand === 12 ? geselecteerdJaar + 1 : geselecteerdJaar;
  const volgendeNavMaand = geselecteerdMaand === 12 ? 1 : geselecteerdMaand + 1;
  const isHuidig = geselecteerdJaar === huidigJaar && geselecteerdMaand === huidigMaand;

  return (
    <div className="space-y-8 max-w-5xl">
      <PaginaHeader
        titel="Margeanalyse"
        subtitel={`${MAANDEN_LANG[geselecteerdMaand]} ${geselecteerdJaar}`}
      >
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/marge?jaar=${vorigeNavJaar}&maand=${vorigeNavMaand}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            ← Vorige
          </Link>
          <span className="text-sm font-semibold text-[#001D3A] min-w-[160px] text-center">
            {MAANDEN_LANG[geselecteerdMaand]} {geselecteerdJaar}
          </span>
          <Link
            href={`/dashboard/marge?jaar=${volgendeNavJaar}&maand=${volgendeNavMaand}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Volgende →
          </Link>
          {!isHuidig && (
            <Link
              href="/dashboard/marge"
              className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#001D3A] text-white hover:bg-[#6979D6] transition"
            >
              Huidige maand
            </Link>
          )}
        </div>
      </PaginaHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Totale omzet" waarde={formatBedrag(margeData?.totaalOmzet ?? 0)} />
        <KpiCard label="Totale kostprijs" waarde={formatBedrag(margeData?.totaalKostprijs ?? 0)} />
        <KpiCard
          label="Bruto marge"
          waarde={formatBedrag(margeData?.totaalBrutomarge ?? 0)}
          kleur={(margeData?.totaalBrutomarge ?? 0) < 0 ? "rood" : "groen"}
        />
        <KpiCard
          label="Marge %"
          waarde={`${margePct.toFixed(1)}%`}
          kleur={margePct < 0 ? "rood" : margePct > 20 ? "groen" : undefined}
        />
      </div>

      {/* Marge groepen tabel */}
      {margeData && margeData.margeGroepen.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Marge per categorie</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#001D3A] text-white">
                  <th className="px-4 py-3 text-left font-medium">Categorie</th>
                  <th className="px-4 py-3 text-right font-medium">Omzet</th>
                  <th className="px-4 py-3 text-right font-medium">Kostprijs</th>
                  <th className="px-4 py-3 text-right font-medium">Bruto marge</th>
                  <th className="px-4 py-3 text-right font-medium">Marge %</th>
                </tr>
              </thead>
              <tbody>
                {margeData.margeGroepen.map((g, i) => {
                  const pct = g.omzet > 0 ? ((g.brutomarge / g.omzet) * 100).toFixed(1) : "—";
                  return (
                    <tr key={g.omschrijving} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                      <td className="px-4 py-2.5 font-medium">{g.omschrijving}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatEur(g.omzet)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-500">{formatEur(g.kostprijs)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono ${g.brutomarge < 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatEur(g.brutomarge)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-700">{pct}{pct !== "—" ? "%" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                  <td className="px-4 py-2.5">Totaal</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatEur(margeData.totaalOmzet)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatEur(margeData.totaalKostprijs)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${margeData.totaalBrutomarge < 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatEur(margeData.totaalBrutomarge)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {margeData.totaalOmzet > 0
                      ? `${((margeData.totaalBrutomarge / margeData.totaalOmzet) * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Trend marge% per maand */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Marge% per maand {geselecteerdJaar}</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <TrendPctGrafiek
            data={trendData}
            lijnen={[{ key: "margePct", kleur: "#6979D6", label: "Bruto marge %" }]}
            hoogte={280}
          />
        </div>
      </section>
    </div>
  );
}
