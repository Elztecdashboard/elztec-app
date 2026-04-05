export interface ExactTokenRow {
  division: number;
  company_name: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  updated_at: string;
}

export interface ExactCacheRow {
  id: string;
  data: unknown;
  cached_at: string;
}

export interface Receivable {
  AccountName: string;
  InvoiceNumber: string;
  AmountDC: number;
  DueDate: string;
  InvoiceDate: string;
  Description: string;
}

export interface SalesInvoice {
  InvoiceNumber: string;
  OrderedBy: string;
  OrderedByName: string;
  AmountDC: number;
  StatusDescription: string;
  YourRef: string;
  InvoiceDate: string;
  DueDate: string;
}

export interface TransactionLine {
  GLAccount: string;
  GLAccountCode: string;
  GLAccountDescription: string;
  AmountDC: number;
  FinancialYear: number;
  FinancialPeriod: number;
  Type: number;
}

export interface FinancialSummary {
  omzet: number;
  kosten: number;
  winst: number;
  jaar: number;
}

export interface OpbrengstGroep {
  code: string;
  omschrijving: string;
  bedrag: number;
  percentage: number;
}

export interface MargeGroep {
  omschrijving: string;
  omzet: number;
  kostprijs: number;
  brutomarge: number;
}

export interface MaandResultaat {
  jaar: number;
  maand: number;
  omzet: number;
  kostprijs: number;
  overigeKosten: number;
  nettoResultaat: number;
}

export interface MaandMargeData {
  jaar: number;
  maand: number;
  groepen: MargeGroep[];
  margeGroepen: MargeGroep[];
  overigeKosten: number;
  totaalOmzet: number;
  totaalKostprijs: number;
  totaalBrutomarge: number;
}
