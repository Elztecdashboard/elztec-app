"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Staaf {
  key: string;
  kleur: string;
  label: string;
}

interface Props {
  data: Record<string, unknown>[];
  staven: Staaf[];
  xKey: string;
  hoogte?: number;
  horizontaal?: boolean;
}

export default function StaafGrafiek({ data, staven, xKey, hoogte = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={hoogte}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => typeof v === 'number' ? `€${v.toLocaleString("nl-NL", { minimumFractionDigits: 0 })}` : v} />
        <Legend />
        {staven.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={s.kleur} name={s.label} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
