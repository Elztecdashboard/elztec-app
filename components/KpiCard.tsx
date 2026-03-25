interface Props {
  label: string;
  waarde: string;
  sublabel?: string;
  kleur?: "groen" | "rood";
}

export default function KpiCard({ label, waarde, sublabel, kleur }: Props) {
  const kleurClass = kleur === "groen" ? "text-green-600" : kleur === "rood" ? "text-red-600" : "text-[#1F4E79]";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${kleurClass}`}>{waarde}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
  );
}
