import FacturenTable from "@/components/FacturenTable";
import { getOpenstaandeFacturen } from "@/lib/exact-queries";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bedrag);
}

export default async function FacturenPage() {
  const facturen = await getOpenstaandeFacturen().catch(() => []);
  const totaal = facturen.reduce((s, f) => s + Number(f.Amount), 0);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1F4E79]">Openstaande facturen</h1>
        <div className="text-right">
          <p className="text-xs text-gray-500">Totaal openstaand</p>
          <p className="text-xl font-bold text-[#1F4E79]">{formatEur(totaal)}</p>
        </div>
      </div>

      <FacturenTable facturen={facturen} />
    </div>
  );
}
