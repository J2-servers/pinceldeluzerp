import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from '@/components/ui/GlassCard';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg)',
        borderRadius: '16px',
        padding: '12px 16px',
        boxShadow: '8px 8px 20px rgba(163,177,198,0.65), -5px -5px 14px rgba(255,255,255,0.95)',
      }}>
        <p style={{ color: '#8a9ab0', fontSize: '11px', marginBottom: '6px', fontWeight: 600 }}>{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span style={{ color: '#2d3d50', fontSize: '13px', fontWeight: 700 }}>
              R$ {entry.value?.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data, delay = 0 }) {
  return (
    <GlassCard className="h-[340px]" delay={delay}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Receitas vs Despesas</h3>
          <p className="text-xs" style={{ color: '#8a9ab0' }}>Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8)' }} />
            <span className="text-xs font-medium" style={{ color: '#8a9ab0' }}>Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#4ade80' }} />
            <span className="text-xs font-medium" style={{ color: '#8a9ab0' }}>Lucro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#fb923c' }} />
            <span className="text-xs font-medium" style={{ color: '#8a9ab0' }}>Despesas</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35}/>
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02}/>
            </linearGradient>
            <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fb923c" stopOpacity={0.28}/>
              <stop offset="95%" stopColor="#fb923c" stopOpacity={0.02}/>
            </linearGradient>
            <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.28}/>
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.2)" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="receitas" stroke="#60a5fa" strokeWidth={2.5}
            fillOpacity={1} fill="url(#gradReceitas)" dot={false} />
          <Area type="monotone" dataKey="despesas" stroke="#fb923c" strokeWidth={2}
            fillOpacity={1} fill="url(#gradDespesas)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}