import {
  getTransactionLinesForJaar,
  getSalesInvoicesForJaar,
  getReceivablesData,
  TransactionLine,
} from "./exact-client";
import {
  FinancialSummary,
  MaandMargeData,
  MaandResultaat,
  MargeGroep,
  OpbrengstGroep,
  Receivable,
} from "@/types";

// ─── TransactionLine helpers ──────────────────────────────────────────────────
// Alle financiële berekeningen werken op de gecachede TransactionLine dataset.
// Er wordt slechts één Exact Online call per jaar gemaakt (door Make.com vooraf).

export async function berekenResultaat(
  lines: Array<{ AmountDC: number; GLAccountCode: string }>,
  jaar: number,
  maand: number
): Promise<MaandResultaat> {
  let omzetSom = 0;
  let kostprijsSom = 0;
  let overigeKostenSom = 0;

  for (const line of lines) {
    const code = Number(line.GLAccountCode);
    const amount = Number(line.AmountDC);
    if (code >= 8000 && code < 9000) omzetSom += amount;
    else if (code >= 7000 && code < 8000) kostprijsSom += amount;
    else if (code >= 4000 && code < 7000) overigeKostenSom += amount;
  }

  const omzet = Math.round(Math.abs(omzetSom) * 100) / 100;
  const kostprijs = Math.round(Math.abs(kostprijsSom) * 100) / 100;
  const overigeKosten = Math.round(Math.abs(overigeKostenSom) * 100) / 100;
  return {
    jaar,
    maand,
    omzet,
    kostprijs,
    overigeKosten,
    nettoResultaat: Math.round((omzet - kostprijs - overigeKosten) * 100) / 100,
  };
}

// ─── Financieel overzicht ──────────────────────────────────────────────────────
export async function getFinancialSummary(jaar: number): Promise<FinancialSummary> {
  const lines = await getTransactionLinesForJaar(jaar);

  let omzetSom = 0;
  let kostenSom = 0;

  for (const line of lines) {
    const code = Number(line.GLAccountCode);
    const amount = Number(line.AmountDC);
    if (code >= 8000 && code < 9000) omzetSom += amount;
    else if (code >= 4000 && code < 8000) kostenSom += amount;
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

// ─── Resultaat per maand (gefilterd client-side uit gecachede dataset) ─────────
export async function getResultaatPerMaand(jaar: number, maand: number): Promise<MaandResultaat> {
  const lines = await getTransactionLinesForJaar(jaar);
  const maandLines = lines.filter((l) => l.FinancialPeriod === maand);
  return berekenResultaat(maandLines, jaar, maand);
}

export async function getResultaatYTD(jaar: number, totMaand: number): Promise<MaandResultaat> {
  const lines = await getTransactionLinesForJaar(jaar);
  const ytdLines = lines.filter((l) => l.FinancialPeriod >= 1 && l.FinancialPeriod <= totMaand);
  return berekenResultaat(ytdLines, jaar, totMaand);
}

export async function getResultaatAlleMandenVoorJaar(jaar: number): Promise<MaandResultaat[]> {
  const lines = await getTransactionLinesForJaar(jaar);

  const byPeriod = new Map<number, TransactionLine[]>();
  for (const line of lines) {
    const p = line.FinancialPeriod ?? 0;
    if (!byPeriod.has(p)) byPeriod.set(p, []);
    byPeriod.get(p)!.push(line);
  }

  return Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const maand = i + 1;
      return berekenResultaat(byPeriod.get(maand) ?? [], jaar, maand);
    })
  );
}

// ─── Omzetgroepen ─────────────────────────────────────────────────────────────
export async function getOpbrengstGroepen(jaar: number): Promise<OpbrengstGroep[]> {
  const lines = await getTransactionLinesForJaar(jaar);
  const grouped = new Map<string, { omschrijving: string; bedrag: number }>();

  for (const line of lines) {
    const code = Number(line.GLAccountCode);
    if (code < 8000 || code >= 9000) continue;
    const existing = grouped.get(line.GLAccountCode);
    const amount = Number(line.AmountDC);
    if (existing) {
      existing.bedrag += amount;
    } else {
      grouped.set(line.GLAccountCode, {
        omschrijving: line.GLAccountDescription || line.GLAccountCode,
        bedrag: amount,
      });
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

// ─── Margedata per maand ───────────────────────────────────────────────────────
export async function getMargeDataPerMaand(jaar: number, maand: number): Promise<MaandMargeData> {
  const lines = await getTransactionLinesForJaar(jaar);
  const maandLines = lines.filter((l) => l.FinancialPeriod === maand);

  const omzetMap = new Map<string, number>();
  const kostprijsMap = new Map<string, number>();
  let overigeKostenSom = 0;

  for (const line of maandLines) {
    const code = Number(line.GLAccountCode);
    const naam = line.GLAccountDescription || line.GLAccountCode;
    const amount = Number(line.AmountDC);

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

  const omzetEntries = Array.from(omzetMap.entries()).map(([naam, som]) => ({
    naam,
    keyword: naam.replace(/^omzet\s+/i, "").trim(),
    omzet: Math.abs(som),
  }));

  const kostprijsPerGroep = new Map<string, number>();
  let ongekoppeldeKostprijs = 0;
  for (const [kNaam, kSom] of kostprijsMap.entries()) {
    const kLower = kNaam.toLowerCase();
    let matched = false;
    for (const og of omzetEntries) {
      if (og.keyword && kLower.includes(og.keyword.toLowerCase())) {
        kostprijsPerGroep.set(og.naam, (kostprijsPerGroep.get(og.naam) ?? 0) + Math.abs(kSom));
        matched = true;
        break;
      }
    }
    if (!matched) ongekoppeldeKostprijs += Math.abs(kSom);
  }

  const margeGroepen: MargeGroep[] = omzetEntries
    .map(({ naam, omzet }) => {
      const omzetR = Math.round(omzet * 100) / 100;
      const kostprijs = Math.round((kostprijsPerGroep.get(naam) ?? 0) * 100) / 100;
      return {
        omschrijving: naam,
        omzet: omzetR,
        kostprijs,
        brutomarge: Math.round((omzetR - kostprijs) * 100) / 100,
      };
    })
    .sort((a, b) => b.omzet - a.omzet);

  if (ongekoppeldeKostprijs > 0) {
    const kp = Math.round(ongekoppeldeKostprijs * 100) / 100;
    margeGroepen.push({
      omschrijving: "Overige",
      omzet: 0,
      kostprijs: kp,
      brutomarge: Math.round(-kp * 100) / 100,
    });
  }

  const totaalOmzet = Array.from(omzetMap.values()).reduce((s, v) => s + Math.abs(v), 0);
  const totaalKostprijs = Array.from(kostprijsMap.values()).reduce((s, v) => s + Math.abs(v), 0);

  return {
    jaar,
    maand,
    groepen,
    margeGroepen,
    overigeKosten: Math.round(overigeKosten * 100) / 100,
    totaalOmzet: Math.round(totaalOmzet * 100) / 100,
    totaalKostprijs: Math.round(totaalKostprijs * 100) / 100,
    totaalBrutomarge: Math.round((totaalOmzet - totaalKostprijs) * 100) / 100,
  };
}

// ─── Openstaande facturen ──────────────────────────────────────────────────────
export async function getOpenstaandeFacturen(): Promise<Receivable[]> {
  const items = await getReceivablesData();
  return items as Receivable[];
}

// ─── Kosten per categorie ──────────────────────────────────────────────────────
export async function getKostenPerCategorie(
  jaar: number,
  maand?: number
): Promise<{ code: string; omschrijving: string; bedrag: number; categorie: "kostprijs" | "overig" }[]> {
  const lines = await getTransactionLinesForJaar(jaar);
  const filtered = maand ? lines.filter((l) => l.FinancialPeriod === maand) : lines;

  const map = new Map<string, { omschrijving: string; bedrag: number; categorie: "kostprijs" | "overig" }>();
  for (const line of filtered) {
    const code = Number(line.GLAccountCode);
    if (code < 4000 || code >= 8000) continue;
    const cat: "kostprijs" | "overig" = code >= 7000 ? "kostprijs" : "overig";
    const existing = map.get(line.GLAccountCode);
    if (existing) {
      existing.bedrag += Math.abs(line.AmountDC);
    } else {
      map.set(line.GLAccountCode, {
        omschrijving: line.GLAccountDescription,
        bedrag: Math.abs(line.AmountDC),
        categorie: cat,
      });
    }
  }

  return Array.from(map.entries())
    .map(([code, v]) => ({ code, ...v }))
    .sort((a, b) => b.bedrag - a.bedrag);
}

// ─── Omzet per klant ──────────────────────────────────────────────────────────
export async function getOmzetPerKlant(
  jaar: number,
  maand?: number
): Promise<{ naam: string; bedrag: number; percentage: number }[]> {
  const invoices = await getSalesInvoicesForJaar(jaar);

  // Optioneel filteren op maand (client-side, uit gecachede dataset)
  const filtered = maand
    ? invoices.filter((inv) => {
        const d = new Date(inv.InvoiceDate);
        return d.getMonth() + 1 === maand;
      })
    : invoices;

  const map = new Map<string, number>();
  for (const inv of filtered) {
    const naam = inv.OrderedByName || "Onbekend";
    map.set(naam, (map.get(naam) ?? 0) + Math.abs(inv.AmountDC));
  }

  const totaal = Array.from(map.values()).reduce((a, b) => a + b, 0);
  return Array.from(map.entries())
    .map(([naam, bedrag]) => ({
      naam,
      bedrag,
      percentage: totaal > 0 ? Math.round((bedrag / totaal) * 100) : 0,
    }))
    .sort((a, b) => b.bedrag - a.bedrag);
}

export async function getKlantenVergelijking(jaarHuidig: number, jaarVorig: number) {
  const [huidig, vorig] = await Promise.all([
    getOmzetPerKlant(jaarHuidig),
    getOmzetPerKlant(jaarVorig),
  ]);
  const huidigNamen = new Set(huidig.map((k) => k.naam));
  const vorigNamen = new Set(vorig.map((k) => k.naam));
  return {
    nieuw: huidig.filter((k) => !vorigNamen.has(k.naam)),
    verloren: vorig.filter((k) => !huidigNamen.has(k.naam)),
    huidig,
    vorig,
  };
}
