import { getOpbrengstGroepen, getOmzetPerKlant } from "@/lib/exact-queries";
import PaginaHeader from "@/components/PaginaHeader";
import StaafGrafiek from "@/components/StaafGrafiek";
import Link from "next/link";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default async function OmzetPage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const huidigJaar = new Date().getFullYear();
  const geselecteerdJaar = Number(params.jaar) || huidigJaar;
  const tab = params.tab || "soort";

  let opbrengstGroepen, omzetPerKlant;
  try {
    [opbrengstGroepen, omzetPerKlant] = await Promise.all([
      getOpbrengstGroepen(geselecteerdJaar),
      getOmzetPerKlant(geselecteerdJaar),
    ]);
  } catch (err) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <p className="text-red-600 font-semibold">Fout bij laden van omzetanalyse</p>
        <p className="text-gray-500 text-sm max-w-md">Er is een onverwachte fout opgetreden. Controleer de Exact Online koppeling.</p>
        <a href="/exact/connect" className="bg-[#001D3A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition">
          Exact Online opnieuw koppelen →
        </a>
      </div>
    );
  }

  const top8Soorten = opbrengstGroepen.slice(0, 8);
  const top10Klanten = omzetPerKlant.slice(0, 10);
  const top15Klanten = omzetPerKlant.slice(0, 15);

  const soortGrafiekData = top8Soorten.map((g) => ({
    naam: g.code,
    bedrag: g.bedrag,
  }));

  const klantGrafiekData = top10Klanten.map((k) => ({
    naam: k.naam.length > 15 ? k.naam.slice(0, 15) + "…" : k.naam,
    bedrag: k.bedrag,
  }));

  return (
    <div className="space-y-8 max-w-5xl">
      <PaginaHeader titel="Omzetanalyse" subtitel={`Jaar ${geselecteerdJaar}`}>
        <div className="flex gap-2">
          {[huidigJaar, huidigJaar - 1, huidigJaar - 2].map((j) => (
            <Link
              key={j}
              href={`/dashboard/omzet?jaar=${j}&tab=${tab}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                j === geselecteerdJaar
                  ? "bg-[#001D3A] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {j}
            </Link>
          ))}
        </div>
      </PaginaHeader>

      {/* Tab balk */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link
          href={`/dashboard/omzet?jaar=${geselecteerdJaar}&tab=soort`}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "soort" ? "border-[#6979D6] text-[#6979D6]" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Per soort
        </Link>
        <Link
          href={`/dashboard/omzet?jaar=${geselecteerdJaar}&tab=klant`}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "klant" ? "border-[#6979D6] text-[#6979D6]" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Per klant
        </Link>
      </div>

      {tab === "soort" ? (
        <div className="space-y-6">
          {/* Grafiek */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Top 8 categorieën</h2>
            <StaafGrafiek
              data={soortGrafiekData}
              staven={[{ key: "bedrag", kleur: "#6979D6", label: "Omzet" }]}
              xKey="naam"
              hoogte={280}
            />
          </div>

          {/* Tabel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#001D3A] text-white">
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Omschrijving</th>
                  <th className="px-4 py-3 text-right font-medium">Bedrag</th>
                  <th className="px-4 py-3 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {opbrengstGroepen.map((g, i) => (
                  <tr key={g.code} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                    <td className="px-4 py-2.5 font-mono text-gray-500">{g.code}</td>
                    <td className="px-4 py-2.5">{g.omschrijving}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatEur(g.bedrag)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{g.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grafiek top 10 klanten */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Top 10 klanten</h2>
            <StaafGrafiek
              data={klantGrafiekData}
              staven={[{ key: "bedrag", kleur: "#6979D6", label: "Omzet" }]}
              xKey="naam"
              hoogte={280}
            />
          </div>

          {/* Tabel top 15 klanten */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#001D3A] text-white">
                  <th className="px-4 py-3 text-left font-medium">Klant</th>
                  <th className="px-4 py-3 text-right font-medium">Omzet</th>
                  <th className="px-4 py-3 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {top15Klanten.map((k, i) => (
                  <tr key={k.naam} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                    <td className="px-4 py-2.5 font-medium">{k.naam}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatEur(k.bedrag)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{k.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
