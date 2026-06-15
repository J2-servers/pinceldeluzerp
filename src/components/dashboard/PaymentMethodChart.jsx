import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import GlassCard from '@/components/ui/GlassCard';

const COLORS = ['var(--red)', 'var(--orange)', 'var(--green)', 'var(--accent)', 'var(--purple)', 'var(--yellow)'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--accent)' }}>
          R$ {payload[0].value?.toLocaleString('pt-BR')}
        </p>
      </div>);

  }
  return null;
};

export default function PaymentMethodChart({ data, delay = 0 }) {
  return (
    <GlassCard className="h-[300px]" delay={delay} accent="blue">
      <div className="mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Formas de Pagamento</h3>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Distribuição por método</p>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} layout="vertical" margin={{ left: 60, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--text-tertiary)" strokeOpacity={0.15} horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />

          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            width={60} />

          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data?.map((entry, index) =>
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GlassCard>);

}