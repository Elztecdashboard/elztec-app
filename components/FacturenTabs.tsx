"use client";

import { useState } from "react";
import { Receivable } from "@/types";

function formatEur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bedrag);
}

function dagentot(dueDate: string): number {
  return (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

function FacturenTabel({ facturen }: { facturen: Receivable[] }) {
  if (facturen.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        Geen facturen in deze categorie.
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
              <th className="px-4 py-2 text-center font-medium">Dagen</th>
            </tr>
          </thead>
          <tbody>
            {facturen.map((f, i) => {
              const dagen = Math.round(dagentot(f.DueDate));
              const vervallen = dagen < 0;
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-[#eef0fb]" : ""}>
                  <td className="px-4 py-2 font-medium">{f.AccountName}</td>
                  <td className="px-4 py-2 font-mono text-gray-500">{f.InvoiceNumber}</td>
                  <td className="px-4 py-2 text-center">{f.InvoiceDate ? new Date(f.InvoiceDate).toLocaleDateString("nl-NL") : "—"}</td>
                  <td className="px-4 py-2 text-center">{f.DueDate ? new Date(f.DueDate).toLocaleDateString("nl-NL") : "—"}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatEur(Number(f.TransactionAmountDC))}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vervallen ? "bg-red-100 text-red-700" : dagen <= 14 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                      {vervallen ? `${Math.abs(dagen)} dgn te laat` : `nog ${dagen} dgn`}
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

export default function FacturenTabs({ facturen }: { facturen: Receivable[] }) {
  const [actief, setActief] = useState<"vervallen" | "niet-vervallen">("vervallen");

  const vervallen = facturen.filter((f) => dagentot(f.DueDate) < 0)
    .sort((a, b) => new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime());
  const nietVervallen = facturen.filter((f) => dagentot(f.DueDate) >= 0)
    .sort((a, b) => new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime());

  const totaalVervallen = vervallen.reduce((s, f) => s + Number(f.TransactionAmountDC), 0);
  const totaalNiet = nietVervallen.reduce((s, f) => s + Number(f.TransactionAmountDC), 0);

  const tabs = [
    { id: "vervallen" as const, label: "Vervallen", count: vervallen.length, totaal: totaalVervallen, kleur: "text-red-600" },
    { id: "niet-vervallen" as const, label: "Niet vervallen", count: nietVervallen.length, totaal: totaalNiet, kleur: "text-gray-900" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActief(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              actief === tab.id
                ? "border-[#6979D6] text-[#6979D6]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${actief === tab.id ? "bg-[#6979D6]/10 text-[#6979D6]" : "bg-gray-100 text-gray-500"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {actief === "vervallen" ? vervallen.length : nietVervallen.length} facturen
        </p>
        <p className="text-sm font-semibold text-gray-900">
          Totaal:{" "}
          <span className={actief === "vervallen" ? "text-red-600" : "text-gray-900"}>
            {formatEur(actief === "vervallen" ? totaalVervallen : totaalNiet)}
          </span>
        </p>
      </div>

      <FacturenTabel facturen={actief === "vervallen" ? vervallen : nietVervallen} />
    </div>
  );
}
