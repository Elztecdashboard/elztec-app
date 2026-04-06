import FacturenTabs from "@/components/FacturenTabs";
import FacturenExport from "@/components/FacturenExport";
import { getOpenstaandeFacturen } from "@/lib/exact-queries";
import { CACHE_KOUD } from "@/lib/exact-client";
import DataLaadtBanner from "@/components/DataLaadtBanner";
import PaginaHeader from "@/components/PaginaHeader";
import { Receivable } from "@/types";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bedrag);
}

function dagentot(dueDate: string): number {
  // Verwerk zowel ISO-strings als OData /Date(ms)/ formaat
  const m = dueDate?.match(/\/Date\((\d+)\)\//);
  const ts = m ? Number(m[1]) : new Date(dueDate).getTime();
  return (ts - Date.now()) / (1000 * 60 * 60 * 24);
}

export default async function FacturenPage() {
  let facturen: Receivable[];
  try {
    facturen = await getOpenstaandeFacturen();
  } catch (err) {
    if (String(err).includes(CACHE_KOUD)) return <DataLaadtBanner />;
    facturen = [];
  }
  const totaal = facturen.reduce((s, f) => s + Number(f.TransactionAmountDC), 0);

  // Aging buckets
  const bucket030 = facturen.filter((f) => dagentot(f.DueDate) >= 0 && dagentot(f.DueDate) <= 30);
  const bucket3060 = facturen.filter((f) => dagentot(f.DueDate) > -30 && dagentot(f.DueDate) < 0);
  const bucket60plus = facturen.filter((f) => dagentot(f.DueDate) <= -30);

  const totaal030 = bucket030.reduce((s, f) => s + Number(f.TransactionAmountDC), 0);
  const totaal3060 = bucket3060.reduce((s, f) => s + Number(f.TransactionAmountDC), 0);
  const totaal60plus = bucket60plus.reduce((s, f) => s + Number(f.TransactionAmountDC), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <PaginaHeader titel="Openstaande facturen" subtitel={`${facturen.length} facturen — totaal ${formatEur(totaal)}`}>
        <FacturenExport facturen={facturen} />
      </PaginaHeader>

      {/* Aging KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">0–30 dagen</p>
          <p className="text-xl font-bold text-green-600">{formatEur(totaal030)}</p>
          <p className="text-xs text-gray-400 mt-1">{bucket030.length} facturen</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">30–60 dagen te laat</p>
          <p className="text-xl font-bold text-amber-600">{formatEur(totaal3060)}</p>
          <p className="text-xs text-gray-400 mt-1">{bucket3060.length} facturen</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">60+ dagen te laat</p>
          <p className="text-xl font-bold text-red-600">{formatEur(totaal60plus)}</p>
          <p className="text-xs text-gray-400 mt-1">{bucket60plus.length} facturen</p>
        </div>
      </div>

      <FacturenTabs facturen={facturen} />
    </div>
  );
}
