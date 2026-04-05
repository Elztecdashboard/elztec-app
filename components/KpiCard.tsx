interface Props {
  label: string;
  waarde: string;
  sublabel?: string;
  kleur?: "groen" | "rood";
  verschil?: number;
}

export default function KpiCard({ label, waarde, sublabel, kleur, verschil }: Props) {
  const kleurClass = kleur === "groen" ? "text-green-600" : kleur === "rood" ? "text-red-600" : "text-[#001D3A]";
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className={`text-2xl font-bold ${kleurClass}`}>{waarde}</p>
        {verschil !== undefined && (
          <span className={`text-sm font-medium ${verschil >= 0 ? "text-green-600" : "text-red-600"}`}>
            {verschil >= 0 ? "▲" : "▼"} {Math.abs(verschil).toFixed(1)}%
          </span>
        )}
      </div>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
  );
}
