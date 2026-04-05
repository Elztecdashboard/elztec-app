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
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number) => string;
}

export default function TrendLijnGrafiek({ data, lijnen, hoogte = 280, yFormatter, tooltipFormatter }: Props) {
  const defaultYFormatter = (v: number) => `€${(v / 1000).toFixed(0)}k`;
  const defaultTooltipFormatter = (v: number) => `€${v.toLocaleString("nl-NL", { minimumFractionDigits: 0 })}`;
  return (
    <ResponsiveContainer width="100%" height={hoogte}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="maand" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={yFormatter ?? defaultYFormatter} />
        <Tooltip formatter={(v) => typeof v === 'number' ? (tooltipFormatter ?? defaultTooltipFormatter)(v) : String(v)} />
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
