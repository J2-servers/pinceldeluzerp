import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { AlertCircle, Package, CreditCard, Clock, TrendingDown, ShoppingBag, CheckCircle } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const TODAY = moment().format('YYYY-MM-DD');
const WEEK_END = moment().add(7, 'days').format('YYYY-MM-DD');
const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function MobileDespesasDoDia() {
  const queryClient = useQueryClient();

  const { data: payables = [] } = useQuery({ queryKey: ['accountsPayable'], queryFn: () => erp.entities.AccountPayable.list('due_date', 200) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list('name', 300) });
  const { data: fixedExpenses = [] } = useQuery({ queryKey: ['fixedExpenses'], queryFn: () => erp.entities.FixedExpense.list() });

  const markPaid = useMutation({
    mutationFn: (id) => erp.entities.AccountPayable.update(id, { paid: true, paid_date: TODAY }),
    onSuccess: () => queryClient.invalidateQueries(['accountsPayable']),
  });

  const overduePayables = useMemo(() => payables.filter(p => !p.paid && p.due_date < TODAY).sort((a, b) => a.due_date.localeCompare(b.due_date)), [payables]);
  const dueTodayPayables = useMemo(() => payables.filter(p => !p.paid && p.due_date === TODAY), [payables]);
  const dueWeekPayables = useMemo(() => payables.filter(p => !p.paid && p.due_date > TODAY && p.due_date <= WEEK_END).sort((a, b) => a.due_date.localeCompare(b.due_date)), [payables]);
  const lowStock = useMemo(() => products.filter(p => (p.quantity || 0) <= (p.min_quantity || 5)).sort((a, b) => (a.quantity || 0) - (b.quantity || 0)), [products]);

  const urgentStock = lowStock.filter(p => (p.quantity || 0) === 0);
  const criticalStock = lowStock.filter(p => (p.quantity || 0) > 0);
  const todayFixedExpenses = fixedExpenses.filter(e => e.active && e.due_day === parseInt(moment().format('D')));

  const totalOverdue = overduePayables.reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const totalToday = dueTodayPayables.reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const totalWeek = dueWeekPayables.reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const tudo_ok = overduePayables.length === 0 && dueTodayPayables.length === 0 && lowStock.length === 0;

  const cardStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    boxShadow: '4px 4px 12px rgba(174,190,220,0.3), -2px -2px 8px rgba(255,255,255,1)',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8EDF5', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-tertiary)' }}>{moment().format('dddd, D [de] MMMM')}</p>
        <h1 className="font-bold text-2xl mt-1" style={{ color: 'var(--text-primary)' }}>Despesas do Dia</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Contas e estoque crítico</p>
      </div>

      {/* KPIs */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Vencidas', value: overduePayables.length, sub: fmt(totalOverdue), color: '#ef4444', border: 'rgba(239,68,68,0.3)', icon: AlertCircle },
          { label: 'Vence Hoje', value: dueTodayPayables.length, sub: fmt(totalToday), color: '#f97316', border: 'rgba(249,115,22,0.3)', icon: Clock },
          { label: 'Próx. 7 dias', value: dueWeekPayables.length, sub: fmt(totalWeek), color: '#ca8a04', border: 'rgba(234,179,8,0.3)', icon: CreditCard },
          { label: 'Estoque Crítico', value: lowStock.length, sub: `${urgentStock.length} zerados`, color: '#7c3aed', border: 'rgba(124,58,237,0.3)', icon: Package },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'var(--bg)', border: `1.5px solid ${kpi.border}`, boxShadow: '6px 6px 18px rgba(174,190,220,0.35), -3px -3px 10px rgba(255,255,255,1)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${kpi.color}15` }}>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
            </div>
            <div>
              <p className="font-bold text-xl leading-tight" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
              <p className="text-[10px] font-bold" style={{ color: kpi.color }}>{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {tudo_ok && (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg)', boxShadow: '8px 8px 24px rgba(174,190,220,0.45), -4px -4px 14px rgba(255,255,255,0.95)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#16a34a' }} />
          </div>
          <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Tudo em ordem!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Sem contas vencidas ou estoque crítico</p>
        </div>
      )}

      {/* Vencidas */}
      {overduePayables.length > 0 && (
        <section className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: '#dc2626' }} />
              <h2 className="font-bold text-sm" style={{ color: '#dc2626' }}>Vencidas ({overduePayables.length})</h2>
            </div>
            <span className="text-xs font-bold" style={{ color: '#dc2626' }}>{fmt(totalOverdue)}</span>
          </div>
          <div className="space-y-2">
            {overduePayables.map(p => (
              <div key={p.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.3)' }}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.description}</p>
                    {p.supplier_name && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{p.supplier_name}</p>}
                    <p className="text-[10px] mt-1 font-semibold" style={{ color: '#dc2626' }}>
                      Venceu {moment(p.due_date).format('DD/MM/YY')} · {moment(p.due_date).fromNow()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: '#dc2626' }}>{fmt((p.amount || 0) - (p.amount_paid || 0))}</p>
                    <button
                      onClick={() => markPaid.mutate(p.id)}
                      disabled={markPaid.isPending}
                      className="mt-1.5 text-[10px] px-3 py-1 rounded-xl font-bold active:scale-95 transition-all"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.35)', color: '#16a34a' }}>
                      ? Pago
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vence Hoje */}
      {(dueTodayPayables.length > 0 || todayFixedExpenses.length > 0) && (
        <section className="px-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: '#ea580c' }} />
            <h2 className="font-bold text-sm" style={{ color: '#ea580c' }}>Vence Hoje</h2>
            <span className="text-xs font-bold ml-auto" style={{ color: '#ea580c' }}>{fmt(totalToday)}</span>
          </div>
          <div className="space-y-2">
            {dueTodayPayables.map(p => (
              <div key={p.id} className="rounded-2xl p-4 flex justify-between items-center" style={{ ...cardStyle, borderColor: 'rgba(249,115,22,0.3)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.description}</p>
                  {p.supplier_name && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.supplier_name}</p>}
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-bold text-sm" style={{ color: '#ea580c' }}>{fmt((p.amount || 0) - (p.amount_paid || 0))}</p>
                  <button onClick={() => markPaid.mutate(p.id)} disabled={markPaid.isPending}
                    className="mt-1.5 text-[10px] px-3 py-1 rounded-xl font-bold active:scale-95"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.35)', color: '#16a34a' }}>
                    ? Pago
                  </button>
                </div>
              </div>
            ))}
            {todayFixedExpenses.map(e => (
              <div key={e.id} className="rounded-2xl p-4 flex justify-between items-center" style={{ ...cardStyle, borderColor: 'rgba(234,179,8,0.3)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{e.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Despesa fixa recorrente</p>
                </div>
                <p className="font-bold text-sm shrink-0 ml-3" style={{ color: '#ca8a04' }}>{fmt(e.amount)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Próximos 7 dias */}
      {dueWeekPayables.length > 0 && (
        <section className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" style={{ color: '#ca8a04' }} />
              <h2 className="font-bold text-sm" style={{ color: '#ca8a04' }}>Próximos 7 Dias</h2>
            </div>
            <span className="text-xs font-bold" style={{ color: '#ca8a04' }}>{fmt(totalWeek)}</span>
          </div>
          <div className="space-y-2">
            {dueWeekPayables.map(p => (
              <div key={p.id} className="rounded-2xl p-4 flex justify-between items-center" style={{ ...cardStyle, borderColor: 'rgba(234,179,8,0.25)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.description}</p>
                  <p className="text-[10px] font-bold" style={{ color: '#ca8a04' }}>{moment(p.due_date).format('ddd, DD/MM')}</p>
                </div>
                <p className="font-semibold text-sm shrink-0 ml-3" style={{ color: '#ca8a04' }}>{fmt((p.amount || 0) - (p.amount_paid || 0))}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Estoque Crítico */}
      {lowStock.length > 0 && (
        <section className="px-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-4 h-4" style={{ color: '#7c3aed' }} />
            <h2 className="font-bold text-sm" style={{ color: '#7c3aed' }}>Compras Urgentes</h2>
          </div>
          <div className="space-y-2">
            {urgentStock.map(p => (
              <div key={p.id} className="rounded-2xl p-4 flex justify-between items-center" style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.3)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                  <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm" style={{ color: '#dc2626' }}>ZERADO</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>mín {p.min_quantity || 5} {p.unit}</p>
                </div>
              </div>
            ))}
            {criticalStock.map(p => (
              <div key={p.id} className="rounded-2xl p-4 flex justify-between items-center" style={{ ...cardStyle, borderColor: 'rgba(124,58,237,0.25)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                  <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm" style={{ color: '#7c3aed' }}>{p.quantity} {p.unit}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>mín {p.min_quantity || 5}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}