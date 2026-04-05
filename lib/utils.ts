export const MAANDEN = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export const MAANDEN_LANG = [
  "", "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

export const formatBedrag = (n: number) =>
  `\u20AC\u00a0${Math.abs(n).toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const formatPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

export function verschilPct(huidig: number, vorig: number): number | undefined {
  if (!vorig || vorig === 0) return undefined;
  return Math.round(((huidig - vorig) / Math.abs(vorig)) * 1000) / 10;
}
