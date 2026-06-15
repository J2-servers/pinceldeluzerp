// Melhoria #6 — Gráfico de tendência 12 meses (rolling) com linha de média
import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from
'recharts';
import moment from 'moment';

function fmt(v) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p, i) =>
      <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      )}
    </div>);

};

export default function TrendingRevenueChart({ transactions = [], delay = 0 }) {
  const data = React.useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const label = month.format('MMM/YY');
      const start = month.clone().startOf('month').format('YYYY-MM-DD');
      const end = month.clone().endOf('month').format('YYYY-MM-DD');

      const receitas = transactions.
      filter((t) => t.type === 'entrada' && t.date >= start && t.date <= end).
      reduce((a, t) => a + (t.amount || 0), 0);

      const despesas = transactions.
      filter((t) => t.type === 'saida' && t.date >= start && t.date <= end).
      reduce((a, t) => a + (t.amount || 0), 0);

      months.push({ mes: label, receitas, despesas, lucro: receitas - despesas });
    }
    return months;
  }, [transactions]);

  const mediaReceita = data.reduce((a, d) => a + d.receitas, 0) / (data.length || 1);

  return (
    <GlassCard delay={delay} hover={false} accent="pink">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Tendência 12 Meses</h3>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Faturamento rolling anual</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Média mensal</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>{fmt(mediaReceita)}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--red)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--text-tertiary)" strokeOpacity={0.15} />
          <XAxis dataKey="mes" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: 'var(--text-tertiary)', fontSize: 11 }} />
          <Bar dataKey="receitas" name="Receitas" fill="var(--red)" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesas" name="Despesas" fill="var(--orange)" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="lucro" name="Lucro" stroke="var(--green)" strokeWidth={2} dot={false} />
          <ReferenceLine y={mediaReceita} stroke="var(--red)" strokeDasharray="6 3" label={{ value: 'Média', fill: 'var(--red)', fontSize: 10 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </GlassCard>);

}