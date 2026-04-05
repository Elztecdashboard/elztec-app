import { getKlantenVergelijking, getOpenstaandeFacturen } from "@/lib/exact-queries";
import PaginaHeader from "@/components/PaginaHeader";
import Link from "next/link";
import { formatBedrag } from "@/lib/utils";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default async function KlantenPage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string }>;
}) {
  const params = await searchParams;
  const huidigJaar = new Date().getFullYear();
  const geselecteerdJaar = Number(params.jaar) || huidigJaar;

  let vergelijking, facturen;
  try {
    [vergelijking, facturen] = await Promise.all([
      getKlantenVergelijking(geselecteerdJaar, geselecteerdJaar - 1),
      getOpenstaandeFacturen(),
    ]);
  } catch (err) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <p className="text-red-600 font-semibold">Fout bij laden van klantanalyse</p>
        <p className="text-gray-500 text-sm max-w-md">{String(err)}</p>
        <a href="/exact/connect" className="bg-[#001D3A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition">
          Exact Online opnieuw koppelen →
        </a>
      </div>
    );
  }

  // Build top klanten vergelijking
  const vorigMap = new Map(vergelijking.vorig.map((k) => [k.naam, k.bedrag]));
  const topKlanten = vergelijking.huidig.slice(0, 20).map((k) => {
    const vorigBedrag = vorigMap.get(k.naam) ?? 0;
    const diffEur = k.bedrag - vorigBedrag;
    const diffPct = vorigBedrag > 0 ? ((k.bedrag - vorigBedrag) / vorigBedrag) * 100 : undefined;
    return { ...k, vorigBedrag, diffEur, diffPct };
  });

  // Openstaande facturen grouped per klant
  const facturenPerKlant = new Map<string, { bedrag: number; oudste: string }>();
  for (const f of facturen) {
    const naam = f.AccountName || "Onbekend";
    const existing = facturenPerKlant.get(naam);
    if (existing) {
      existing.bedrag += Number(f.AmountDC);
      if (!existing.oudste || f.InvoiceDate < existing.oudste) existing.oudste = f.InvoiceDate;
    } else {
      facturenPerKlant.set(naam, { bedrag: Number(f.AmountDC), oudste: f.InvoiceDate });
    }
  }
  const facturenLijst = Array.from(facturenPerKlant.entries())
    .map(([naam, v]) => ({ naam, ...v }))
    .sort((a, b) => b.bedrag - a.bedrag);

  return (
    <div className="space-y-8 max-w-5xl">
      <PaginaHeader titel="Klantanalyse" subtitel={`Jaar ${geselecteerdJaar}`}>
        <div className="flex gap-2">
          {[huidigJaar, huidigJaar - 1, huidigJaar - 2].map((j) => (
            <Link
              key={j}
              href={`/dashboard/klanten?jaar=${j}`}
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

      {/* Top klanten */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Top klanten</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#001D3A] text-white">
                <th className="px-4 py-3 text-left font-medium">Klant</th>
                <th className="px-4 py-3 text-right font-medium">Omzet {geselecteerdJaar}</th>
                <th className="px-4 py-3 text-right font-medium">Omzet {geselecteerdJaar - 1}</th>
                <th className="px-4 py-3 text-right font-medium">Verschil €</th>
                <th className="px-4 py-3 text-right font-medium">Verschil %</th>
              </tr>
            </thead>
            <tbody>
              {topKlanten.map((k, i) => (
                <tr key={k.naam} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                  <td className="px-4 py-2.5 font-medium">{k.naam}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatEur(k.bedrag)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-500">{formatEur(k.vorigBedrag)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${k.diffEur >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {k.diffEur >= 0 ? "+" : ""}{formatEur(k.diffEur)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${(k.diffPct ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {k.diffPct !== undefined ? `${k.diffPct >= 0 ? "+" : ""}${k.diffPct.toFixed(1)}%` : "Nieuw"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Nieuwe klanten */}
      {vergelijking.nieuw.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nieuwe klanten</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              {vergelijking.nieuw.length} nieuw
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#001D3A] text-white">
                  <th className="px-4 py-3 text-left font-medium">Klant</th>
                  <th className="px-4 py-3 text-right font-medium">Omzet {geselecteerdJaar}</th>
                  <th className="px-4 py-3 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {vergelijking.nieuw.map((k, i) => (
                  <tr key={k.naam} className={i % 2 === 0 ? "bg-green-50/40" : ""}>
                    <td className="px-4 py-2.5 font-medium">
                      {k.naam}
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Nieuw</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatEur(k.bedrag)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{k.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Verloren klanten */}
      {vergelijking.verloren.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Verloren klanten</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              {vergelijking.verloren.length} verloren
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#001D3A] text-white">
                  <th className="px-4 py-3 text-left font-medium">Klant</th>
                  <th className="px-4 py-3 text-right font-medium">Omzet {geselecteerdJaar - 1}</th>
                </tr>
              </thead>
              <tbody>
                {vergelijking.verloren.map((k, i) => (
                  <tr key={k.naam} className={i % 2 === 0 ? "bg-red-50/40" : ""}>
                    <td className="px-4 py-2.5 font-medium">
                      {k.naam}
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Verloren</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{formatEur(k.bedrag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Openstaande facturen */}
      {facturenLijst.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Openstaande facturen — {formatBedrag(facturen.reduce((s, f) => s + Number(f.AmountDC), 0))} totaal
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#001D3A] text-white">
                  <th className="px-4 py-3 text-left font-medium">Klant</th>
                  <th className="px-4 py-3 text-right font-medium">Openstaand bedrag</th>
                  <th className="px-4 py-3 text-right font-medium">Oudste factuur</th>
                </tr>
              </thead>
              <tbody>
                {facturenLijst.map((k, i) => (
                  <tr key={k.naam} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                    <td className="px-4 py-2.5 font-medium">{k.naam}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatEur(k.bedrag)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {k.oudste ? new Date(k.oudste).toLocaleDateString("nl-NL") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
