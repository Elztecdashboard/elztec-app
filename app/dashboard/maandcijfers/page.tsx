import { getResultaatPerMaand, getMargeDataPerMaand } from "@/lib/exact-queries";
import { MaandResultaat } from "@/types";
import PaginaHeader from "@/components/PaginaHeader";
import Link from "next/link";
import { MAANDEN_LANG } from "@/lib/utils";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function ResultaatKolom({
  titel,
  data,
  actief,
}: {
  titel: string;
  data: MaandResultaat | null;
  actief?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${actief ? "bg-[#001D3A] text-white border-[#001D3A]" : "bg-white border-gray-200"}`}>
      <p className={`text-xs font-semibold mb-3 uppercase tracking-wide ${actief ? "text-white/70" : "text-gray-400"}`}>{titel}</p>
      {data ? (
        <table className="w-full text-sm">
          <tbody>
            <tr className={`border-b ${actief ? "border-white/10" : "border-gray-100"}`}>
              <td className={`py-1.5 pr-3 ${actief ? "text-white/80" : "text-gray-600"}`}>Omzet</td>
              <td className={`py-1.5 text-right font-mono ${actief ? "text-white" : "text-gray-900"}`}>{formatEur(data.omzet)}</td>
            </tr>
            <tr className={`border-b ${actief ? "border-white/10" : "border-gray-100"}`}>
              <td className={`py-1.5 pr-3 ${actief ? "text-white/80" : "text-gray-600"}`}>Kostprijs van omzet</td>
              <td className={`py-1.5 text-right font-mono ${actief ? "text-white/80" : "text-gray-600"}`}>-{formatEur(data.kostprijs)}</td>
            </tr>
            <tr className={`border-b ${actief ? "border-white/10" : "border-gray-100"}`}>
              <td className={`py-1.5 pr-3 ${actief ? "text-white/80" : "text-gray-600"}`}>Overige kosten</td>
              <td className={`py-1.5 text-right font-mono ${actief ? "text-white/80" : "text-gray-600"}`}>-{formatEur(data.overigeKosten)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className={`pt-2 font-semibold ${actief ? "text-white" : "text-gray-900"}`}>Netto resultaat</td>
              <td className={`pt-2 text-right font-mono font-semibold ${data.nettoResultaat < 0 ? "text-red-400" : actief ? "text-green-300" : "text-green-600"}`}>
                {formatEur(data.nettoResultaat)}
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <p className={`text-sm ${actief ? "text-white/50" : "text-gray-400"}`}>Geen data</p>
      )}
    </div>
  );
}

export default async function MaandcijfersPage({
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

  const vorigeJaar = geselecteerdMaand === 1 ? geselecteerdJaar - 1 : geselecteerdJaar;
  const vorigeMaand = geselecteerdMaand === 1 ? 12 : geselecteerdMaand - 1;

  let huidig, vorig, vorigJaarData, margeData;
  try {
    [huidig, vorig, vorigJaarData, margeData] = await Promise.all([
      getResultaatPerMaand(geselecteerdJaar, geselecteerdMaand),
      getResultaatPerMaand(vorigeJaar, vorigeMaand).catch(() => null),
      getResultaatPerMaand(geselecteerdJaar - 1, geselecteerdMaand).catch(() => null),
      getMargeDataPerMaand(geselecteerdJaar, geselecteerdMaand).catch(() => null),
    ]);
  } catch (err) {
    huidig = null; vorig = null; vorigJaarData = null; margeData = null;
  }

  // Navigation links
  const vorigeNavJaar = geselecteerdMaand === 1 ? geselecteerdJaar - 1 : geselecteerdJaar;
  const vorigeNavMaand = geselecteerdMaand === 1 ? 12 : geselecteerdMaand - 1;
  const volgendeNavJaar = geselecteerdMaand === 12 ? geselecteerdJaar + 1 : geselecteerdJaar;
  const volgendeNavMaand = geselecteerdMaand === 12 ? 1 : geselecteerdMaand + 1;
  const isHuidig = geselecteerdJaar === huidigJaar && geselecteerdMaand === huidigMaand;

  return (
    <div className="space-y-8 max-w-5xl">
      <PaginaHeader
        titel="Maandcijfers"
        subtitel={`${MAANDEN_LANG[geselecteerdMaand]} ${geselecteerdJaar}`}
      >
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/maandcijfers?jaar=${vorigeNavJaar}&maand=${vorigeNavMaand}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            ← Vorige
          </Link>
          <span className="text-sm font-semibold text-[#001D3A] min-w-[160px] text-center">
            {MAANDEN_LANG[geselecteerdMaand]} {geselecteerdJaar}
          </span>
          <Link
            href={`/dashboard/maandcijfers?jaar=${volgendeNavJaar}&maand=${volgendeNavMaand}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Volgende →
          </Link>
          {!isHuidig && (
            <Link
              href="/dashboard/maandcijfers"
              className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#001D3A] text-white hover:bg-[#6979D6] transition"
            >
              Huidige maand
            </Link>
          )}
        </div>
      </PaginaHeader>

      {/* Drie kolommen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ResultaatKolom
          titel={`${MAANDEN_LANG[vorigeMaand]} ${vorigeJaar}`}
          data={vorig}
        />
        <ResultaatKolom
          titel={`${MAANDEN_LANG[geselecteerdMaand]} ${geselecteerdJaar}`}
          data={huidig}
          actief
        />
        <ResultaatKolom
          titel={`${MAANDEN_LANG[geselecteerdMaand]} ${geselecteerdJaar - 1}`}
          data={vorigJaarData}
        />
      </div>

      {/* Uitsplitsing margeGroepen */}
      {margeData && margeData.margeGroepen.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Uitsplitsing per categorie</h2>
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
                  const margePct = g.omzet > 0 ? ((g.brutomarge / g.omzet) * 100).toFixed(1) : "—";
                  return (
                    <tr key={g.omschrijving} className={i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}>
                      <td className="px-4 py-2.5 font-medium">{g.omschrijving}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatEur(g.omzet)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-500">{formatEur(g.kostprijs)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono ${g.brutomarge < 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatEur(g.brutomarge)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-700">{margePct}{margePct !== "—" ? "%" : ""}</td>
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
    </div>
  );
}
