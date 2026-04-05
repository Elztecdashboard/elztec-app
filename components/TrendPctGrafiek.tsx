"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DataPunt {
  maand: string;
  [key: string]: number | string;
}

interface Lijn {
  key: string;
  kleur: string;
  label: string;
}

interface Props {
  data: DataPunt[];
  lijnen: Lijn[];
  hoogte?: number;
}

export default function TrendPctGrafiek({ data, lijnen, hoogte = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={hoogte}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="maand" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}%` : String(v)} />
        <Legend />
        {lijnen.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.kleur}
            name={l.label}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
