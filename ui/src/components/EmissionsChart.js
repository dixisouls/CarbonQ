import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: '#1a1b26',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: '#8b8d98', fontSize: '11px', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#4ade80', fontSize: '16px', fontWeight: 700 }}>
        {payload[0].value.toFixed(1)}g CO₂
      </p>
    </div>
  );
}

export default function EmissionsChart({ data }) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#5c5e6a', fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#5c5e6a', fontSize: 12 }}
            dx={-4}
            tickFormatter={(v) => `${v}g`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(74,222,128,0.2)' }} />
          <Area
            type="monotone"
            dataKey="carbon"
            stroke="#4ade80"
            strokeWidth={2.5}
            fill="url(#carbonGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: '#4ade80',
              stroke: '#0a0b0f',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
