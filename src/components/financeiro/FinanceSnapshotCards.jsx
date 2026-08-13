import React from 'react';
import { BadgeDollarSign, Building2, HandCoins, Percent, TrendingUp, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;

export default function FinanceSnapshotCards({ summary }) {
  const items = [
    { icon: Percent, label: 'Margem do mês', value: `${summary.margin.toFixed(1)}%`, color: '#7c3aed' },
    { icon: HandCoins, label: 'Inadimplência', value: money(summary.overdueReceivableValue), color: '#dc2626' },
    { icon: BadgeDollarSign, label: 'Vencidos a pagar', value: money(summary.overduePayableValue), color: '#ea580c' },
    { icon: Building2, label: 'Despesas fixas', value: money(summary.fixedExpenses), color: '#64748b' },
    { icon: Users, label: 'Capital sócios', value: money(summary.partnerCapital), color: '#0891b2' },
    { icon: TrendingUp, label: 'Receita anual', value: money(summary.yearIncome), color: '#16a34a' },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="rounded-[22px] bg-white/70 border border-white p-4 shadow-sm">
          <Icon className="w-4 h-4 mb-2" style={{ color }} />
          <p className="text-[11px] uppercase tracking-widest text-slate-500 font-black">{label}</p>
          <p className="text-lg font-black mt-1" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}