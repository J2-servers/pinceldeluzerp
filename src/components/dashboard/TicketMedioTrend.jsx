import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign } from 'lucide-react';
import moment from 'moment';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

export default function TicketMedioTrend({ salesOrders = [] }) {
  const data = Array.from({ length: 6 }, (_, i) => {
    const month = moment().subtract(5 - i, 'months');
    const mStr = month.format('YYYY-MM');
    const monthOrders = salesOrders.filter((o) => (o.created_date || '').startsWith(mStr));
    const total = monthOrders.reduce((a, o) => a + (o.total || 0), 0);
    const ticket = monthOrders.length > 0 ? total / monthOrders.length : 0;
    return { month: month.format('MMM'), ticket: Math.round(ticket), qty: monthOrders.length };
  });

  const current = data[data.length - 1]?.ticket || 0;
  const prev = data[data.length - 2]?.ticket || 0;
  const diff = current - prev;
  const pct = prev > 0 ? (diff / prev * 100).toFixed(1) : 0;

  return (
    <GlassCard accent="blue" delay={0.1}>
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)', boxShadow: 'var(--shadow-flat)' }}>
          <DollarSign className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Ticket Médio — Evolução</h3>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Últimos 6 meses</p>
        </div>
        <div className="ml-auto text-xs font-semibold" style={{ color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {diff >= 0 ? '+' : ''}{pct}% vs mês ant.
        </div>
      </div>
      <div className="text-2xl font-bold mb-3" style={{ color: 'var(--accent)' }}>{fmt(current)}</div>
      <ResponsiveContainer width="100%" height={70}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="ticketGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" hide />
          <Tooltip
            contentStyle={{ background: 'var(--bg)', border: 'none', boxShadow: 'var(--shadow-md)', borderRadius: 8 }}
            labelStyle={{ color: 'var(--text-tertiary)' }}
            formatter={(v) => [fmt(v), 'Ticket Médio']} />

          <Area type="monotone" dataKey="ticket" stroke="var(--accent)" fill="url(#ticketGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </GlassCard>);

}