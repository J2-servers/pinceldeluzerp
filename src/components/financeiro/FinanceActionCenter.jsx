import React from 'react';
import { AlertOctagon, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;

function ActionBlock({ icon: Icon, title, items, emptyText, tone }) {
  return (
    <div className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: tone }} />
        <h3 className="font-black text-slate-800">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-500">{emptyText}</p>}
        {items.slice(0, 5).map((item) => (
          <div key={item.id} className="rounded-2xl p-3 border" style={{ background: `${tone}10`, borderColor: `${tone}30` }}>
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{item.title}</p>
                <p className="text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <p className="font-black shrink-0" style={{ color: tone }}>{money(item.amount)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FinanceActionCenter({ overduePayables, overdueReceivables, dueSoonPayables, dueSoonReceivables }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <ActionBlock icon={ShieldAlert} title="Pagar vencidos" items={overduePayables} emptyText="Nenhuma conta vencida." tone="#dc2626" />
      <ActionBlock icon={AlertOctagon} title="Cobrar vencidos" items={overdueReceivables} emptyText="Nenhum recebimento vencido." tone="#ea580c" />
      <ActionBlock icon={Clock3} title="Pagar em 7 dias" items={dueSoonPayables} emptyText="Sem pagamentos urgentes." tone="#d97706" />
      <ActionBlock icon={CheckCircle2} title="Receber em 7 dias" items={dueSoonReceivables} emptyText="Sem recebimentos próximos." tone="#16a34a" />
    </div>
  );
}