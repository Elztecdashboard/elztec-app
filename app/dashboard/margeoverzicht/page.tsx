import { getMargeDataPerMaand } from "@/lib/exact-queries";
import { MaandMargeData, MargeGroep } from "@/types";

const MAANDEN = ["", "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December"];

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function GroepenTabel({ data, veld }: {
  data: MaandMargeData;
  veld: keyof Pick<MargeGroep, "omzet" | "kostprijs" | "brutomarge">;
}) {
  const totaal = veld === "omzet" ? data.totaalOmzet
    : veld === "kostprijs" ? data.totaalKostprijs
    : data.totaalBrutomarge;

  const groepen = data.groepen.filter((g) => g[veld] !== 0);

  return (
    <table className="w-full text-sm">
      <tbody>
        {groepen.length === 0 ? (
          <tr>
            <td colSpan={2} className="py-2 text-xs text-gray-400">Geen data</td>
          </tr>
        ) : (
          groepen.map((g) => (
            <tr key={g.omschrijving} className="border-b border-gray-100">
              <td className="py-1.5 pr-3 text-gray-700">{g.omschrijving}</td>
              <td className={`py-1.5 text-right font-mono whitespace-nowrap ${veld === "brutomarge" && g.brutomarge < 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatEur(g[veld])}
              </td>
            </tr>
          ))
        )}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-gray-200 font-semibold">
          <td className="pt-2 text-gray-900">Totaal</td>
          <td className={`pt-2 text-right font-mono ${veld === "brutomarge" && totaal < 0 ? "text-red-600" : "text-gray-900"}`}>
            {formatEur(totaal)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function KolomKaart({ titel, data, veld, actief }: {
  titel: string;
  data: MaandMargeData | null;
  veld: keyof Pick<MargeGroep, "omzet" | "kostprijs" | "brutomarge">;
  actief?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${actief ? "border-[#1F4E79]/40" : "border-gray-200"}`}>
      <p className={`text-xs font-semibold mb-3 ${actief ? "text-[#1F4E79]" : "text-gray-400"}`}>{titel}</p>
      {data ? (
        <GroepenTabel data={data} veld={veld} />
      ) : (
        <p className="text-sm text-gray-400">Geen data</p>
      )}
    </div>
  );
}

export default async function MargeoverzichtPage() {
  const nu = new Date();
  const huidigJaar = nu.getFullYear();
  const huidigMaand = nu.getMonth() + 1;

  const vorigeJaar = huidigMaand === 1 ? huidigJaar - 1 : huidigJaar;
  const vorigeMaand = huidigMaand === 1 ? 12 : huidigMaand - 1;

  const [r1, r2, r3] = await Promise.allSettled([
    getMargeDataPerMaand(huidigJaar, huidigMaand),
    getMargeDataPerMaand(vorigeJaar, vorigeMaand),
    getMargeDataPerMaand(huidigJaar - 1, huidigMaand),
  ]);

  const huidig = r1.status === "fulfilled" ? r1.value : null;
  const vorig = r2.status === "fulfilled" ? r2.value : null;
  const vorigJaar = r3.status === "fulfilled" ? r3.value : null;

  const kolommen = [
    { label: `${MAANDEN[huidigMaand]} ${huidigJaar}`, data: huidig, actief: true },
    { label: `${MAANDEN[vorigeMaand]} ${vorigeJaar}`, data: vorig },
    { label: `${MAANDEN[huidigMaand]} ${huidigJaar - 1}`, data: vorigJaar },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-[#1F4E79]">Margeoverzicht</h1>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Omzet per opbrengstgroep</h2>
        <div className="grid grid-cols-3 gap-4">
          {kolommen.map((k) => (
            <KolomKaart key={k.label} titel={k.label} data={k.data} veld="omzet" actief={k.actief} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Kostprijs per groep</h2>
        <div className="grid grid-cols-3 gap-4">
          {kolommen.map((k) => (
            <KolomKaart key={k.label} titel={k.label} data={k.data} veld="kostprijs" actief={k.actief} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-4">
          {kolommen.map((k) => (
            <div key={k.label} className="flex justify-between items-center rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-sm">
              <span className="text-gray-500">Overige kosten</span>
              <span className="font-mono font-medium text-gray-900">
                {k.data ? formatEur(k.data.overigeKosten) : "—"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bruto marge per groep</h2>
        <div className="grid grid-cols-3 gap-4">
          {kolommen.map((k) => (
            <KolomKaart key={k.label} titel={k.label} data={k.data} veld="brutomarge" actief={k.actief} />
          ))}
        </div>
      </section>
    </div>
  );
}
