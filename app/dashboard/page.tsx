import KpiCard from "@/components/KpiCard";
import { getFinancialSummary, getOpenstaandeFacturen } from "@/lib/exact-queries";
import { isExactGekoppeld } from "@/lib/exact-client";
import Link from "next/link";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ jaar?: string }> }) {
  const params = await searchParams;
  const jaar = Number(params.jaar) || new Date().getFullYear();
  const gekoppeld = await isExactGekoppeld();

  if (!gekoppeld) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-gray-500 mb-4">Exact Online is nog niet gekoppeld.</p>
        <Link href="/exact/connect" className="bg-[#1F4E79] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2E75B6] transition">
          Koppel Exact Online →
        </Link>
      </div>
    );
  }

  const [financials, facturenResult] = await Promise.allSettled([
    getFinancialSummary(jaar),
    getOpenstaandeFacturen(),
  ]);

  if (financials.status === "rejected") {
    console.error("[dashboard] getFinancialSummary mislukt:", financials.reason);
  }
  if (facturenResult.status === "rejected") {
    console.error("[dashboard] getOpenstaandeFacturen mislukt:", facturenResult.reason);
  }

  const financialsData = financials.status === "fulfilled" ? financials.value : null;
  const exactFout = financials.status === "rejected"
    ? String(financials.reason)
    : null;
  const facturen = facturenResult.status === "fulfilled" ? facturenResult.value : [];

  const totaalOpenstaand = facturen.reduce((s, f) => s + Number(f.AmountDC), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1F4E79]">Overzicht {jaar}</h1>
        <div className="flex gap-2">
          {[jaar - 1, jaar, jaar + 1].map((j) => (
            <Link
              key={j}
              href={`/dashboard?jaar=${j}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${j === jaar ? "bg-[#1F4E79] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {j}
            </Link>
          ))}
        </div>
      </div>

      {exactFout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Exact Online data kon niet worden opgehaald.{" "}
          <Link href="/exact/connect" className="underline font-medium">Koppeling vernieuwen →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Omzet" waarde={financialsData ? formatEur(financialsData.omzet) : "—"} sublabel={`YTD ${jaar}`} />
        <KpiCard label="Kosten" waarde={financialsData ? formatEur(financialsData.kosten) : "—"} sublabel={`YTD ${jaar}`} />
        <KpiCard label="Winst" waarde={financialsData ? formatEur(financialsData.winst) : "—"} sublabel={`YTD ${jaar}`} kleur={financialsData && financialsData.winst >= 0 ? "groen" : "rood"} />
        <KpiCard label="Openstaand" waarde={formatEur(totaalOpenstaand)} sublabel={`${facturen.length} facturen`} />
      </div>
    </div>
  );
}
