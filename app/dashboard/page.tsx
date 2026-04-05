import {
  getResultaatYTD,
  getResultaatAlleMandenVoorJaar,
  getOpenstaandeFacturen,
} from "@/lib/exact-queries";
import { isExactGekoppeld } from "@/lib/exact-client";
import KpiCard from "@/components/KpiCard";
import PaginaHeader from "@/components/PaginaHeader";
import TrendLijnGrafiek from "@/components/TrendLijnGrafiek";
import Link from "next/link";
import { MAANDEN, formatBedrag, verschilPct } from "@/lib/utils";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default async function DashboardPage() {
  const nu = new Date();
  const jaar = nu.getFullYear();
  const maand = nu.getMonth() + 1;

  const gekoppeld = await isExactGekoppeld();

  if (!gekoppeld) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-gray-500 mb-4">Exact Online is nog niet gekoppeld.</p>
        <Link
          href="/exact/connect"
          className="bg-[#001D3A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition"
        >
          Koppel Exact Online →
        </Link>
      </div>
    );
  }

  let ytdHuidig, ytdVorig, alleMandenHuidig, alleMandenVorig, facturen;
  try {
    // Sequentieel ipv Promise.all om Exact Online rate limits (429) te voorkomen
    ytdHuidig = await getResultaatYTD(jaar, maand);
    ytdVorig = await getResultaatYTD(jaar - 1, maand);
    alleMandenHuidig = await getResultaatAlleMandenVoorJaar(jaar);
    alleMandenVorig = await getResultaatAlleMandenVoorJaar(jaar - 1);
    facturen = await getOpenstaandeFacturen();
  } catch (err) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <p className="text-red-600 font-semibold">Fout bij laden van Exact Online data</p>
        <p className="text-gray-500 text-sm max-w-md">{String(err)}</p>
        <Link href="/exact/connect" className="bg-[#001D3A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition">
          Exact Online opnieuw koppelen →
        </Link>
      </div>
    );
  }

  const totaalOpenstaand = facturen.reduce((s, f) => s + Number(f.TransactionAmountDC), 0);

  const omzetVerschil = verschilPct(ytdHuidig.omzet, ytdVorig.omzet);
  const margeHuidig = ytdHuidig.omzet > 0 ? ((ytdHuidig.omzet - ytdHuidig.kostprijs) / ytdHuidig.omzet) * 100 : 0;
  const margeVorig = ytdVorig.omzet > 0 ? ((ytdVorig.omzet - ytdVorig.kostprijs) / ytdVorig.omzet) * 100 : 0;
  const margeVerschil = verschilPct(margeHuidig, margeVorig);
  const nettoVerschil = verschilPct(ytdHuidig.nettoResultaat, ytdVorig.nettoResultaat);

  // Build trend data
  const trendData = MAANDEN.map((m, i) => {
    const idx = i; // 0-based
    const huidig = alleMandenHuidig[idx];
    const vorig = alleMandenVorig[idx];
    return {
      maand: m,
      [`omzet${jaar}`]: huidig?.omzet ?? 0,
      [`omzet${jaar - 1}`]: vorig?.omzet ?? 0,
    };
  });

  const trendLijnen = [
    { key: `omzet${jaar}`, kleur: "#6979D6", label: `Omzet ${jaar}` },
    { key: `omzet${jaar - 1}`, kleur: "#BEC5FC", label: `Omzet ${jaar - 1}` },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <PaginaHeader titel="Overzicht" subtitel={`Dashboard ${jaar}`} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="YTD Omzet"
          waarde={formatBedrag(ytdHuidig.omzet)}
          sublabel={`vs ${jaar - 1}: ${formatBedrag(ytdVorig.omzet)}`}
          verschil={omzetVerschil}
        />
        <KpiCard
          label="YTD Bruto Marge"
          waarde={`${margeHuidig.toFixed(1)}%`}
          sublabel={`vs ${jaar - 1}: ${margeVorig.toFixed(1)}%`}
          verschil={margeVerschil}
        />
        <KpiCard
          label="YTD Netto Resultaat"
          waarde={formatBedrag(ytdHuidig.nettoResultaat)}
          sublabel={`vs ${jaar - 1}: ${formatBedrag(ytdVorig.nettoResultaat)}`}
          kleur={ytdHuidig.nettoResultaat < 0 ? "rood" : "groen"}
          verschil={nettoVerschil}
        />
        <KpiCard
          label="Openstaande Facturen"
          waarde={formatEur(totaalOpenstaand)}
          sublabel={`${facturen.length} facturen`}
        />
      </div>

      {/* Trend grafiek */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Omzettrend {jaar} vs {jaar - 1}</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <TrendLijnGrafiek data={trendData} lijnen={trendLijnen} hoogte={300} />
        </div>
      </section>

      {/* Maandoverzicht tabel */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Maandoverzicht</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#001D3A] text-white">
                <th className="px-4 py-3 text-left font-medium">Maand</th>
                <th className="px-4 py-3 text-right font-medium">Omzet {jaar}</th>
                <th className="px-4 py-3 text-right font-medium">Omzet {jaar - 1}</th>
                <th className="px-4 py-3 text-right font-medium">Verschil</th>
                <th className="px-4 py-3 text-right font-medium">Netto {jaar}</th>
              </tr>
            </thead>
            <tbody>
              {MAANDEN.map((m, i) => {
                const h = alleMandenHuidig[i];
                const v = alleMandenVorig[i];
                const diff = (h?.omzet ?? 0) - (v?.omzet ?? 0);
                return (
                  <tr key={m} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                    <td className="px-4 py-2.5 font-medium">{m}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatEur(h?.omzet ?? 0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{formatEur(v?.omzet ?? 0)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {diff >= 0 ? "+" : ""}{formatEur(diff)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono ${(h?.nettoResultaat ?? 0) < 0 ? "text-red-600" : "text-gray-900"}`}>
                      {formatEur(h?.nettoResultaat ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
