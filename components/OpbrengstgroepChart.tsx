import { OpbrengstGroep } from "@/types";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default function OpbrengstgroepChart({ groepen }: { groepen: OpbrengstGroep[] }) {
  if (groepen.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        Geen opbrengstgegevens gevonden voor dit jaar.
      </div>
    );
  }

  const top = groepen.slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Top opbrengstgroepen</h2>
      {top.map((g) => (
        <div key={g.code} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 truncate max-w-[60%]">{g.omschrijving}</span>
            <span className="font-mono font-medium text-[#1F4E79]">{formatEur(g.bedrag)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2E75B6] rounded-full"
              style={{ width: `${Math.min(g.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
