import { exactFetch, exactFetchAll } from "./exact-client";
import { FinancialSummary, MaandMargeData, MargeGroep, OpbrengstGroep, Receivable } from "@/types";

interface ExactResponse {
  d: { results: unknown[] };
}

export async function getFinancialSummary(jaar: number): Promise<FinancialSummary> {
  const lines = await exactFetchAll(
    `financialtransaction/TransactionLines?$select=GLAccountCode,AmountDC&$filter=FinancialYear eq ${jaar}`
  );

  let omzetSom = 0;
  let kostenSom = 0;

  for (const line of lines as Array<{ AmountDC: number; GLAccountCode: string; }>) {
    const code = Number(line.GLAccountCode);
    const amount = Number(line.AmountDC);
    // Gebruik gesigneerde som (geen Math.abs per regel), zodat correctieboekingen
    // het saldo verlagen in plaats van verhogen — net zoals Exact de W&V toont.
    if (code >= 8000 && code < 9000) {
      omzetSom += amount;
    } else if (code >= 4000 && code < 8000) {
      kostenSom += amount;
    }
  }

  const omzet = Math.abs(omzetSom);
  const kosten = Math.abs(kostenSom);

  return {
    omzet: Math.round(omzet * 100) / 100,
    kosten: Math.round(kosten * 100) / 100,
    winst: Math.round((omzet - kosten) * 100) / 100,
    jaar,
  };
}

export async function getOpbrengstGroepen(jaar: number): Promise<OpbrengstGroep[]> {
  const lines = await exactFetchAll(
    `financialtransaction/TransactionLines?$select=GLAccountCode,GLAccountDescription,AmountDC&$filter=FinancialYear eq ${jaar} and GLAccountCode ge '8000' and GLAccountCode lt '9000'`
  );
  const grouped = new Map<string, { omschrijving: string; bedrag: number }>();

  for (const line of lines as Array<{ AmountDC: number; GLAccountCode: string; GLAccountDescription: string }>) {
    const code = line.GLAccountCode;
    const existing = grouped.get(code);
    const amount = Number(line.AmountDC); // gesigneerd — abs pas aan het einde
    if (existing) {
      existing.bedrag += amount;
    } else {
      grouped.set(code, { omschrijving: line.GLAccountDescription || code, bedrag: amount });
    }
  }

  const totaal = Array.from(grouped.values()).reduce((s, g) => s + Math.abs(g.bedrag), 0);

  return Array.from(grouped.entries())
    .map(([code, g]) => ({
      code,
      omschrijving: g.omschrijving,
      bedrag: Math.round(Math.abs(g.bedrag) * 100) / 100,
      percentage: totaal > 0 ? Math.round((Math.abs(g.bedrag) / totaal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.bedrag - a.bedrag);
}

export async function getMargeDataPerMaand(jaar: number, maand: number): Promise<MaandMargeData> {
  const lines = await exactFetchAll(
    `financialtransaction/TransactionLines?$select=GLAccountCode,GLAccountDescription,AmountDC&$filter=FinancialYear eq ${jaar} and FinancialPeriod eq ${maand}`
  );
  const omzetMap = new Map<string, number>();
  const kostprijsMap = new Map<string, number>();
  let overigeKostenSom = 0;

  for (const line of lines as Array<{ AmountDC: number; GLAccountCode: string; GLAccountDescription: string }>) {
    const code = Number(line.GLAccountCode);
    const naam = line.GLAccountDescription || line.GLAccountCode;
    const amount = Number(line.AmountDC); // gesigneerd

    if (code >= 8000 && code < 9000) {
      omzetMap.set(naam, (omzetMap.get(naam) ?? 0) + amount);
    } else if (code >= 7000 && code < 8000) {
      kostprijsMap.set(naam, (kostprijsMap.get(naam) ?? 0) + amount);
    } else if (code >= 4000 && code < 7000) {
      overigeKostenSom += amount;
    }
  }

  const overigeKosten = Math.abs(overigeKostenSom);

  const alleNamen = new Set([...omzetMap.keys(), ...kostprijsMap.keys()]);
  const groepen: MargeGroep[] = Array.from(alleNamen)
    .map((naam) => {
      const omzet = Math.abs(omzetMap.get(naam) ?? 0);
      const kostprijs = Math.abs(kostprijsMap.get(naam) ?? 0);
      return {
        omschrijving: naam,
        omzet: Math.round(omzet * 100) / 100,
        kostprijs: Math.round(kostprijs * 100) / 100,
        brutomarge: Math.round((omzet - kostprijs) * 100) / 100,
      };
    })
    .sort((a, b) => b.omzet - a.omzet);

  const totaalOmzet = groepen.reduce((s, g) => s + g.omzet, 0);
  const totaalKostprijs = groepen.reduce((s, g) => s + g.kostprijs, 0);

  return {
    jaar,
    maand,
    groepen,
    overigeKosten: Math.round(overigeKosten * 100) / 100,
    totaalOmzet: Math.round(totaalOmzet * 100) / 100,
    totaalKostprijs: Math.round(totaalKostprijs * 100) / 100,
    totaalBrutomarge: Math.round((totaalOmzet - totaalKostprijs) * 100) / 100,
  };
}

export async function getOpenstaandeFacturen(): Promise<Receivable[]> {
  const data = await exactFetch(
    `cashflow/Receivables?$select=AccountName,InvoiceNumber,AmountDC,DueDate,InvoiceDate,Description&$filter=CloseDate eq null&$orderby=DueDate asc`
  ) as ExactResponse;

  return (data?.d?.results ?? []) as Receivable[];
}
