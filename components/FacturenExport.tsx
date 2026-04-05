"use client";

import { Receivable } from "@/types";

export default function FacturenExport({ facturen }: { facturen: Receivable[] }) {
  const download = () => {
    const header = "Klant,Factuurnummer,Factuurdatum,Vervaldatum,Bedrag";
    const rows = facturen.map(
      (f) =>
        `"${f.AccountName}","${f.InvoiceNumber}","${f.InvoiceDate}","${f.DueDate}","${f.AmountDC}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "facturen.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={download}
      className="px-3 py-1.5 text-sm bg-[#6979D6] text-white rounded hover:bg-[#5568c4] transition"
    >
      ↓ CSV
    </button>
  );
}
