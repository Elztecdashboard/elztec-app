import { getKostenPerCategorie, getResultaatAlleMandenVoorJaar } from "@/lib/exact-queries";
import ExactFout from "@/components/ExactFout";
import KpiCard from "@/components/KpiCard";
import PaginaHeader from "@/components/PaginaHeader";
import StaafGrafiek from "@/components/StaafGrafiek";
import Link from "next/link";
import { MAANDEN, formatBedrag, verschilPct } from "@/lib/utils";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default async function KostenPage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string }>;
}) {
  const params = await searchParams;
  const huidigJaar = new Date().getFullYear();
  const geselecteerdJaar = Number(params.jaar) || huidigJaar;

  let kostenHuidig, alleMandenHuidig, alleMandenVorig;
  try {
    [kostenHuidig, alleMandenHuidig, alleMandenVorig] = await Promise.all([
      getKostenPerCategorie(geselecteerdJaar),
      getResultaatAlleMandenVoorJaar(geselecteerdJaar),
      getResultaatAlleMandenVoorJaar(geselecteerdJaar - 1),
    ]);
  } catch (err) {
    void err;
    return <ExactFout />;
  }

  const kostprijs = kostenHuidig.filter((k) => k.categorie === "kostprijs");
  const overig = kostenHuidig.filter((k) => k.categorie === "overig");

  const totaalKostprijs = kostprijs.reduce((s, k) => s + k.bedrag, 0);
  const totaalOverig = overig.reduce((s, k) => s + k.bedrag, 0);
  const totaalKosten = totaalKostprijs + totaalOverig;

  const totaalKostprijsVorig = alleMandenVorig.reduce((s, m) => s + m.kostprijs, 0);
  const totaalOverigVorig = alleMandenVorig.reduce((s, m) => s + m.overigeKosten, 0);
  const totaalKostenVorig = totaalKostprijsVorig + totaalOverigVorig;

  const grafiekData = MAANDEN.map((m, i) => ({
    maand: m,
    [`kosten${geselecteerdJaar}`]: (alleMandenHuidig[i]?.kostprijs ?? 0) + (alleMandenHuidig[i]?.overigeKosten ?? 0),
    [`kosten${geselecteerdJaar - 1}`]: (alleMandenVorig[i]?.kostprijs ?? 0) + (alleMandenVorig[i]?.overigeKosten ?? 0),
  }));

  const staven = [
    { key: `kosten${geselecteerdJaar}`, kleur: "#6979D6", label: `${geselecteerdJaar}` },
    { key: `kosten${geselecteerdJaar - 1}`, kleur: "#BEC5FC", label: `${geselecteerdJaar - 1}` },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <PaginaHeader titel="Kostenanalyse" subtitel={`Jaar ${geselecteerdJaar}`}>
        <div className="flex gap-2">
          {[huidigJaar, huidigJaar - 1, huidigJaar - 2].map((j) => (
            <Link
              key={j}
              href={`/dashboard/kosten?jaar=${j}`}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Totale kostprijs (7xxx)"
          waarde={formatBedrag(totaalKostprijs)}
          sublabel={`Vorig jaar: ${formatBedrag(totaalKostprijsVorig)}`}
          verschil={verschilPct(totaalKostprijs, totaalKostprijsVorig)}
        />
        <KpiCard
          label="Overige bedrijfskosten (4-6xxx)"
          waarde={formatBedrag(totaalOverig)}
          sublabel={`Vorig jaar: ${formatBedrag(totaalOverigVorig)}`}
          verschil={verschilPct(totaalOverig, totaalOverigVorig)}
        />
        <KpiCard
          label="Totale kosten"
          waarde={formatBedrag(totaalKosten)}
          sublabel={`Vorig jaar: ${formatBedrag(totaalKostenVorig)}`}
          verschil={verschilPct(totaalKosten, totaalKostenVorig)}
        />
      </div>

      {/* Kostprijs van omzet */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Kostprijs van omzet (7xxx)</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#001D3A] text-white">
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Omschrijving</th>
                <th className="px-4 py-3 text-right font-medium">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {kostprijs.map((k, i) => (
                <tr key={k.code} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                  <td className="px-4 py-2.5 font-mono text-gray-500">{k.code}</td>
                  <td className="px-4 py-2.5">{k.omschrijving}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatEur(k.bedrag)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                <td className="px-4 py-2.5" colSpan={2}>Totaal</td>
                <td className="px-4 py-2.5 text-right font-mono">{formatEur(totaalKostprijs)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Overige bedrijfskosten */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Overige bedrijfskosten (4xxx–6xxx)</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#001D3A] text-white">
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Omschrijving</th>
                <th className="px-4 py-3 text-right font-medium">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {overig.map((k, i) => (
                <tr key={k.code} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                  <td className="px-4 py-2.5 font-mono text-gray-500">{k.code}</td>
                  <td className="px-4 py-2.5">{k.omschrijving}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatEur(k.bedrag)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                <td className="px-4 py-2.5" colSpan={2}>Totaal</td>
                <td className="px-4 py-2.5 text-right font-mono">{formatEur(totaalOverig)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Kosten per maand grafiek */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Kosten per maand — {geselecteerdJaar} vs {geselecteerdJaar - 1}
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <StaafGrafiek data={grafiekData} staven={staven} xKey="maand" hoogte={300} />
        </div>
      </section>
    </div>
  );
}
