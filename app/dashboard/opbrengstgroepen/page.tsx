import OpbrengstgroepChart from "@/components/OpbrengstgroepChart";
import { getOpbrengstGroepen } from "@/lib/exact-queries";
import Link from "next/link";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default async function OpbrengstgroepenPage({ searchParams }: { searchParams: Promise<{ jaar?: string }> }) {
  const params = await searchParams;
  const jaar = Number(params.jaar) || new Date().getFullYear();
  const groepen = await getOpbrengstGroepen(jaar).catch(() => []);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1F4E79]">Opbrengstgroepen {jaar}</h1>
        <div className="flex gap-2">
          {[jaar - 1, jaar].map((j) => (
            <Link
              key={j}
              href={`/dashboard/opbrengstgroepen?jaar=${j}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${j === jaar ? "bg-[#1F4E79] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {j}
            </Link>
          ))}
        </div>
      </div>

      <OpbrengstgroepChart groepen={groepen} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#2E75B6] text-white">
              <th className="px-4 py-2 text-left font-medium">Code</th>
              <th className="px-4 py-2 text-left font-medium">Omschrijving</th>
              <th className="px-4 py-2 text-right font-medium">Bedrag</th>
              <th className="px-4 py-2 text-right font-medium">% van totaal</th>
            </tr>
          </thead>
          <tbody>
            {groepen.map((g, i) => (
              <tr key={g.code} className={i % 2 === 0 ? "bg-[#EBF3FB]" : ""}>
                <td className="px-4 py-2 font-mono text-gray-500">{g.code}</td>
                <td className="px-4 py-2">{g.omschrijving}</td>
                <td className="px-4 py-2 text-right font-mono">{formatEur(g.bedrag)}</td>
                <td className="px-4 py-2 text-right text-gray-500">{g.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
