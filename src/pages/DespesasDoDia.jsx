import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { AlertCircle, Package, CreditCard, Clock, TrendingDown, ShoppingBag, DollarSign } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const TODAY = moment().format('YYYY-MM-DD');
const WEEK_END = moment().add(7, 'days').format('YYYY-MM-DD');
const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function SectionTitle({ icon: Icon, label, count, total, color }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-xl flex items-center justify-center"
        style={{ background: `${color}15`, boxShadow: `2px 2px 6px ${color}30` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {count !== undefined && (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
          {count}
        </span>
      )}
      {total && <span className="ml-auto text-xs font-bold" style={{ color }}>{total}</span>}
    </div>
  );
}

function ExpenseRow({ title, subtitle, date, amount, color }) {
  return (
    <div className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 transition-all"
      style={{
        background: 'var(--bg)',
        border: `1.5px solid ${color}25`,
        boxShadow: `4px 4px 14px rgba(174,190,220,0.3), -2px -2px 8px rgba(255,255,255,1)`,
      }}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: '#9aabbd' }}>{subtitle}</p>}
        {date && <p className="text-[10px] mt-0.5 font-semibold" style={{ color }}>{date}</p>}
      </div>
      <p className="font-bold text-sm shrink-0" style={{ color }}>{amount}</p>
    </div>
  );
}

function StockRow({ name, category, badge, badgeColor, sub }) {
  return (
    <div className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
      style={{
        background: 'var(--bg)',
        border: `1.5px solid rgba(200,215,235,0.9)`,
        boxShadow: `4px 4px 14px rgba(174,190,220,0.3), -2px -2px 8px rgba(255,255,255,1)`,
      }}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
        <p className="text-xs capitalize mt-0.5" style={{ color: '#9aabbd' }}>{category}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm" style={{ color: badgeColor }}>{badge}</p>
        {sub && <p className="text-[10px]" style={{ color: '#9aabbd' }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function DespesasDoDia() {
  const { data: payables = [] } = useQuery({ queryKey: ['accountsPayable'], queryFn: () => erp.entities.AccountPayable.list('due_date', 200) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list('name', 300) });
  const { data: fixedExpenses = [] } = useQuery({ queryKey: ['fixedExpenses'], queryFn: () => erp.entities.FixedExpense.list() });

  const overduePayables = useMemo(() => payables.filter(p => !p.paid && p.due_date < TODAY).sort((a, b) => a.due_date.localeCompare(b.due_date)), [payables]);
  const dueTodayPayables = useMemo(() => payables.filter(p => !p.paid && p.due_date === TODAY), [payables]);
  const dueWeekPayables = useMemo(() => payables.filter(p => !p.paid && p.due_date > TODAY && p.due_date <= WEEK_END).sort((a, b) => a.due_date.localeCompare(b.due_date)), [payables]);
  const lowStock = useMemo(() => products.filter(p => (p.quantity || 0) <= (p.min_quantity || 5)).sort((a, b) => (a.quantity || 0) - (b.quantity || 0)), [products]);

  const urgentStock = lowStock.filter(p => (p.quantity || 0) === 0);
  const criticalStock = lowStock.filter(p => (p.quantity || 0) > 0);
  const totalOverdue = overduePayables.reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const totalToday = dueTodayPayables.reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const totalWeek = dueWeekPayables.reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const todayFixedExpenses = fixedExpenses.filter(e => e.active && e.due_day === parseInt(moment().format('D')));

  const kpis = [
    { label: 'Vencidas', value: overduePayables.length, sub: fmt(totalOverdue), color: '#dc2626', icon: AlertCircle },
    { label: 'Vence Hoje', value: dueTodayPayables.length, sub: fmt(totalToday), color: '#f97316', icon: Clock },
    { label: 'Próx. 7 dias', value: dueWeekPayables.length, sub: fmt(totalWeek), color: '#ca8a04', icon: CreditCard },
    { label: 'Est. Crítico', value: lowStock.length, sub: `${urgentStock.length} zerados`, color: '#7c3aed', icon: Package },
  ];

  return (
    <div className="page-neu pt-6 pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)', boxShadow: '5px 5px 16px rgba(249,115,22,0.4)' }}>
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Despesas do Dia</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{moment().format('dddd, D [de] MMMM')} · Contas e estoque crítico</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'var(--bg)',
              border: `1.5px solid ${kpi.color}25`,
              boxShadow: `6px 6px 20px rgba(174,190,220,0.45), -3px -3px 12px rgba(255,255,255,1)`,
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${kpi.color}12`, boxShadow: `3px 3px 8px ${kpi.color}25` }}>
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: '#9aabbd' }}>{kpi.label}</p>
              <p className="font-bold text-2xl leading-tight" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
              <p className="text-[10px] font-bold" style={{ color: kpi.color }}>{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Vencidas */}
      {overduePayables.length > 0 && (
        <section>
          <SectionTitle icon={AlertCircle} label="Contas Vencidas" count={overduePayables.length} total={fmt(totalOverdue)} color="#dc2626" />
          <div className="space-y-2">
            {overduePayables.map(p => (
              <ExpenseRow key={p.id}
                title={p.description}
                subtitle={p.supplier_name}
                date={`Venceu em ${moment(p.due_date).format('DD/MM/YY')} (${moment(p.due_date).fromNow()})`}
                amount={fmt((p.amount || 0) - (p.amount_paid || 0))}
                color="#dc2626"
              />
            ))}
          </div>
        </section>
      )}

      {/* Vence Hoje */}
      {(dueTodayPayables.length > 0 || todayFixedExpenses.length > 0) && (
        <section>
          <SectionTitle icon={Clock} label="Vence Hoje" count={dueTodayPayables.length + todayFixedExpenses.length} color="#f97316" />
          <div className="space-y-2">
            {dueTodayPayables.map(p => (
              <ExpenseRow key={p.id} title={p.description} subtitle={p.supplier_name} amount={fmt((p.amount || 0) - (p.amount_paid || 0))} color="#f97316" />
            ))}
            {todayFixedExpenses.map(e => (
              <ExpenseRow key={e.id} title={e.name} subtitle="Despesa fixa recorrente" amount={fmt(e.amount)} color="#ca8a04" />
            ))}
          </div>
        </section>
      )}

      {/* Próximos 7 dias */}
      {dueWeekPayables.length > 0 && (
        <section>
          <SectionTitle icon={TrendingDown} label="Próximos 7 Dias" count={dueWeekPayables.length} total={fmt(totalWeek)} color="#ca8a04" />
          <div className="space-y-2">
            {dueWeekPayables.map(p => (
              <ExpenseRow key={p.id}
                title={p.description}
                date={moment(p.due_date).format('ddd, DD/MM')}
                amount={fmt((p.amount || 0) - (p.amount_paid || 0))}
                color="#ca8a04"
              />
            ))}
          </div>
        </section>
      )}

      {/* Estoque Crítico */}
      {lowStock.length > 0 && (
        <section>
          <SectionTitle icon={ShoppingBag} label="Compras Urgentes — Estoque Baixo" count={lowStock.length} color="#7c3aed" />
          <div className="space-y-2">
            {urgentStock.map(p => (
              <StockRow key={p.id} name={p.name} category={p.category} badge="ZERADO" badgeColor="#dc2626" sub={`mín ${p.min_quantity || 5} ${p.unit}`} />
            ))}
            {criticalStock.map(p => (
              <StockRow key={p.id} name={p.name} category={p.category} badge={`${p.quantity} ${p.unit}`} badgeColor="#7c3aed" sub={`mín ${p.min_quantity || 5}`} />
            ))}
          </div>
        </section>
      )}

      {overduePayables.length === 0 && dueTodayPayables.length === 0 && dueWeekPayables.length === 0 && lowStock.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(34,197,94,0.1)', boxShadow: '6px 6px 20px rgba(174,190,220,0.4), -3px -3px 12px rgba(255,255,255,1)' }}>
            <span className="text-3xl">?</span>
          </div>
          <p className="font-bold text-lg" style={{ color: '#16a34a' }}>Tudo em ordem!</p>
          <p className="text-sm mt-1" style={{ color: '#9aabbd' }}>Sem contas vencidas ou estoque crítico</p>
        </div>
      )}
    </div>
  );
}