import { Receivable } from "@/types";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bedrag);
}

function datumStatus(dueDate: string): "te-laat" | "bijna" | "ok" {
  const nu = Date.now();
  const verval = new Date(dueDate).getTime();
  const dagen = (verval - nu) / (1000 * 60 * 60 * 24);
  if (dagen < 0) return "te-laat";
  if (dagen <= 14) return "bijna";
  return "ok";
}

const BADGE: Record<string, string> = {
  "te-laat": "bg-red-100 text-red-700",
  bijna: "bg-amber-100 text-amber-700",
  ok: "bg-green-100 text-green-700",
};

const LABEL: Record<string, string> = {
  "te-laat": "Te laat",
  bijna: "Bijna verlopen",
  ok: "Op tijd",
};

export default function FacturenTable({ facturen }: { facturen: Receivable[] }) {
  if (facturen.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        Geen openstaande facturen gevonden.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#001D3A] text-white">
              <th className="px-4 py-2 text-left font-medium">Debiteur</th>
              <th className="px-4 py-2 text-left font-medium">Factuurnr.</th>
              <th className="px-4 py-2 text-center font-medium">Factuurdatum</th>
              <th className="px-4 py-2 text-center font-medium">Vervaldatum</th>
              <th className="px-4 py-2 text-right font-medium">Bedrag</th>
              <th className="px-4 py-2 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {facturen.map((f, i) => {
              const status = datumStatus(f.DueDate);
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-[#eef0fb]" : ""}>
                  <td className="px-4 py-2 font-medium">{f.AccountName}</td>
                  <td className="px-4 py-2 font-mono text-gray-500">{f.InvoiceNumber}</td>
                  <td className="px-4 py-2 text-center">{f.InvoiceDate ? new Date(f.InvoiceDate).toLocaleDateString("nl-NL") : "—"}</td>
                  <td className="px-4 py-2 text-center">{f.DueDate ? new Date(f.DueDate).toLocaleDateString("nl-NL") : "—"}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatEur(Number(f.TransactionAmountDC))}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[status]}`}>
                      {LABEL[status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
