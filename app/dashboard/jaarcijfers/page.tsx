import { getResultaatAlleMandenVoorJaar } from "@/lib/exact-queries";
import KpiCard from "@/components/KpiCard";
import PaginaHeader from "@/components/PaginaHeader";
import StaafGrafiek from "@/components/StaafGrafiek";
import Link from "next/link";
import { MAANDEN, formatBedrag, verschilPct } from "@/lib/utils";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default async function JaarcijfersPage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string }>;
}) {
  const params = await searchParams;
  const huidigJaar = new Date().getFullYear();
  const geselecteerdJaar = Number(params.jaar) || huidigJaar;

  let alleMandenHuidig, alleMandenVorig;
  try {
    [alleMandenHuidig, alleMandenVorig] = await Promise.all([
      getResultaatAlleMandenVoorJaar(geselecteerdJaar),
      getResultaatAlleMandenVoorJaar(geselecteerdJaar - 1),
    ]);
  } catch (err) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <p className="text-red-600 font-semibold">Fout bij laden van jaarcijfers</p>
        <p className="text-gray-500 text-sm max-w-md">{String(err)}</p>
        <a href="/exact/connect" className="bg-[#001D3A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition">
          Exact Online opnieuw koppelen →
        </a>
      </div>
    );
  }

  const totaalOmzet = alleMandenHuidig.reduce((s, m) => s + m.omzet, 0);
  const totaalKosten = alleMandenHuidig.reduce((s, m) => s + m.kostprijs + m.overigeKosten, 0);
  const brutomarge = totaalOmzet - alleMandenHuidig.reduce((s, m) => s + m.kostprijs, 0);
  const nettoResultaat = alleMandenHuidig.reduce((s, m) => s + m.nettoResultaat, 0);

  const totaalOmzetVorig = alleMandenVorig.reduce((s, m) => s + m.omzet, 0);
  const totaalKostenVorig = alleMandenVorig.reduce((s, m) => s + m.kostprijs + m.overigeKosten, 0);
  const brutomargeVorig = totaalOmzetVorig - alleMandenVorig.reduce((s, m) => s + m.kostprijs, 0);
  const nettoResultaatVorig = alleMandenVorig.reduce((s, m) => s + m.nettoResultaat, 0);

  const grafiekData = MAANDEN.map((m, i) => ({
    maand: m,
    [`omzet${geselecteerdJaar}`]: alleMandenHuidig[i]?.omzet ?? 0,
    [`omzet${geselecteerdJaar - 1}`]: alleMandenVorig[i]?.omzet ?? 0,
  }));

  const staven = [
    { key: `omzet${geselecteerdJaar}`, kleur: "#6979D6", label: `${geselecteerdJaar}` },
    { key: `omzet${geselecteerdJaar - 1}`, kleur: "#BEC5FC", label: `${geselecteerdJaar - 1}` },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <PaginaHeader titel="Jaarcijfers" subtitel={`Volledig overzicht ${geselecteerdJaar}`}>
        <div className="flex gap-2">
          {[huidigJaar, huidigJaar - 1, huidigJaar - 2].map((j) => (
            <Link
              key={j}
              href={`/dashboard/jaarcijfers?jaar=${j}`}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Jaaromzet"
          waarde={formatBedrag(totaalOmzet)}
          sublabel={`Vorig jaar: ${formatBedrag(totaalOmzetVorig)}`}
          verschil={verschilPct(totaalOmzet, totaalOmzetVorig)}
        />
        <KpiCard
          label="Totale kosten"
          waarde={formatBedrag(totaalKosten)}
          sublabel={`Vorig jaar: ${formatBedrag(totaalKostenVorig)}`}
          verschil={verschilPct(totaalKosten, totaalKostenVorig)}
        />
        <KpiCard
          label="Bruto marge"
          waarde={formatBedrag(brutomarge)}
          sublabel={`Vorig jaar: ${formatBedrag(brutomargeVorig)}`}
          kleur={brutomarge < 0 ? "rood" : undefined}
          verschil={verschilPct(brutomarge, brutomargeVorig)}
        />
        <KpiCard
          label="Netto resultaat"
          waarde={formatBedrag(nettoResultaat)}
          sublabel={`Vorig jaar: ${formatBedrag(nettoResultaatVorig)}`}
          kleur={nettoResultaat < 0 ? "rood" : "groen"}
          verschil={verschilPct(nettoResultaat, nettoResultaatVorig)}
        />
      </div>

      {/* Staafgrafiek */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Omzet per maand — {geselecteerdJaar} vs {geselecteerdJaar - 1}
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <StaafGrafiek data={grafiekData} staven={staven} xKey="maand" hoogte={300} />
        </div>
      </section>

      {/* Maandentabel */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Alle maanden {geselecteerdJaar}</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#001D3A] text-white">
                <th className="px-4 py-3 text-left font-medium">Maand</th>
                <th className="px-4 py-3 text-right font-medium">Omzet</th>
                <th className="px-4 py-3 text-right font-medium">Kostprijs</th>
                <th className="px-4 py-3 text-right font-medium">Overige kosten</th>
                <th className="px-4 py-3 text-right font-medium">Netto resultaat</th>
              </tr>
            </thead>
            <tbody>
              {MAANDEN.map((m, i) => {
                const md = alleMandenHuidig[i];
                return (
                  <tr key={m} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                    <td className="px-4 py-2.5 font-medium">{m}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatEur(md?.omzet ?? 0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{formatEur(md?.kostprijs ?? 0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{formatEur(md?.overigeKosten ?? 0)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${(md?.nettoResultaat ?? 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatEur(md?.nettoResultaat ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                <td className="px-4 py-2.5">Totaal</td>
                <td className="px-4 py-2.5 text-right font-mono">{formatEur(totaalOmzet)}</td>
                <td className="px-4 py-2.5 text-right font-mono">{formatEur(alleMandenHuidig.reduce((s, m) => s + m.kostprijs, 0))}</td>
                <td className="px-4 py-2.5 text-right font-mono">{formatEur(alleMandenHuidig.reduce((s, m) => s + m.overigeKosten, 0))}</td>
                <td className={`px-4 py-2.5 text-right font-mono ${nettoResultaat < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatEur(nettoResultaat)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
