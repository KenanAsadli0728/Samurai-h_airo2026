import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingDown } from 'lucide-react';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-cyan-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        {payload[0].value}
      </p>
    </div>
  );
}

export default function RiskTrendChart({ data }) {
  const first = data[0]?.score ?? 0;
  const last = data[data.length - 1]?.score ?? 0;
  const delta = first - last;

  return (
    <div data-testid="risk-trend-chart" className="rounded-xl bg-slate-900 border border-slate-800 p-6 h-full fade-in-up fade-in-up-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Org Risk Trend</h2>
          <p className="text-sm text-slate-500 mt-1">8-week rolling average — trending in the right direction</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            -{delta} pts
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: '#475569', fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          <YAxis
            domain={[35, 75]}
            tick={{ fill: '#475569', fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
          <ReferenceLine y={70} stroke="#f87171" strokeDasharray="4 3" strokeOpacity={0.35} />
          <ReferenceLine y={40} stroke="#34d399" strokeDasharray="4 3" strokeOpacity={0.35} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={{ fill: '#06b6d4', r: 3.5, strokeWidth: 0 }}
            activeDot={{ r: 5.5, fill: '#06b6d4', stroke: '#0e7490', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-400/40 rounded" style={{ borderTop: '1px dashed rgba(248,113,113,0.4)' }} />
          <span className="text-xs text-slate-600">High risk threshold (70)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-emerald-400/40 rounded" />
          <span className="text-xs text-slate-600">Low risk threshold (40)</span>
        </div>
      </div>
    </div>
  );
}
