import { exactFetch } from "./exact-client";
import { FinancialSummary, OpbrengstGroep, Receivable } from "@/types";

interface ExactResponse {
  d: { results: unknown[] };
}

export async function getFinancialSummary(jaar: number): Promise<FinancialSummary> {
  const data = await exactFetch(
    `financialtransaction/TransactionLines?$select=GLAccountCode,GLAccountDescription,Amount,Type&$filter=FinancialYear eq ${jaar}&$top=1000`
  ) as ExactResponse;

  const lines = data?.d?.results ?? [];
  let omzet = 0;
  let kosten = 0;

  for (const line of lines as Array<{ Amount: number; GLAccountCode: string }>) {
    const code = Number(line.GLAccountCode);
    const amount = Number(line.Amount);
    // NL boekhoudconventie: omzet codes 8xxx, kosten codes 4xxx-7xxx
    if (code >= 8000 && code < 9000) {
      omzet += Math.abs(amount);
    } else if (code >= 4000 && code < 8000) {
      kosten += Math.abs(amount);
    }
  }

  return {
    omzet: Math.round(omzet * 100) / 100,
    kosten: Math.round(kosten * 100) / 100,
    winst: Math.round((omzet - kosten) * 100) / 100,
    jaar,
  };
}

export async function getOpbrengstGroepen(jaar: number): Promise<OpbrengstGroep[]> {
  const data = await exactFetch(
    `financialtransaction/TransactionLines?$select=GLAccountCode,GLAccountDescription,Amount&$filter=FinancialYear eq ${jaar} and GLAccountCode ge '8000' and GLAccountCode lt '9000'&$top=1000`
  ) as ExactResponse;

  const lines = data?.d?.results ?? [];
  const grouped = new Map<string, { omschrijving: string; bedrag: number }>();

  for (const line of lines as Array<{ Amount: number; GLAccountCode: string; GLAccountDescription: string }>) {
    const code = line.GLAccountCode;
    const existing = grouped.get(code);
    const amount = Math.abs(Number(line.Amount));
    if (existing) {
      existing.bedrag += amount;
    } else {
      grouped.set(code, { omschrijving: line.GLAccountDescription || code, bedrag: amount });
    }
  }

  const totaal = Array.from(grouped.values()).reduce((s, g) => s + g.bedrag, 0);

  return Array.from(grouped.entries())
    .map(([code, g]) => ({
      code,
      omschrijving: g.omschrijving,
      bedrag: Math.round(g.bedrag * 100) / 100,
      percentage: totaal > 0 ? Math.round((g.bedrag / totaal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.bedrag - a.bedrag);
}

export async function getOpenstaandeFacturen(): Promise<Receivable[]> {
  const data = await exactFetch(
    `cashflow/Receivables?$select=AccountName,InvoiceNumber,Amount,DueDate,InvoiceDate,Description&$filter=CloseDate eq null&$orderby=DueDate asc`
  ) as ExactResponse;

  return (data?.d?.results ?? []) as Receivable[];
}
