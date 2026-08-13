import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { TrendingUp, Wrench,
  Package, AlertCircle, Clock, CheckCircle, ChevronRight
} from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/lib/numberFormat';

const fmt = formatCurrency;
const TODAY = moment().format('YYYY-MM-DD');

function salesAsRevenueRecords(salesOrders) {
  return salesOrders
    .filter((order) => order.status !== 'cancelado' && Number(order.total || 0) > 0)
    .map((order) => ({
      id: `sale-${order.id}`,
      type: 'entrada',
      amount: Number(order.total || 0),
      date: String(order.created_date || order.delivery_date || '').slice(0, 10),
      category: 'vendas',
      order_id: order.id,
      description: `Venda ${order.order_number || ''} — ${order.client_name || ''}`,
    }))
    .filter((item) => item.date);
}

function buildFinancialRecords(transactions, salesOrders) {
  const nonSalesTransactions = transactions.filter((item) => item.type !== 'entrada' || (item.category !== 'vendas' && !item.order_id));
  return [...nonSalesTransactions, ...salesAsRevenueRecords(salesOrders)];
}

export default function MobileDashboard() {
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions', 'list', '-date', 200], queryFn: () => erp.entities.Transaction.list('-date', 200) });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders', 'list', '-created_date', 100], queryFn: () => erp.entities.SalesOrder.list('-created_date', 100) });
  const { data: serviceOrders = [] } = useQuery({ queryKey: ['serviceOrders'], queryFn: () => erp.entities.ServiceOrder.list('-created_date', 100) });
  const { data: products = [] } = useQuery({ queryKey: ['products', 'list'], queryFn: () => erp.entities.Product.list() });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => erp.entities.Goal.list() });

  const financialRecords = useMemo(() => buildFinancialRecords(transactions, salesOrders), [transactions, salesOrders]);
  const currentMonth = moment().format('YYYY-MM');
  const { totalEntradas, totalSaidas, lucroLiquido } = useMemo(() => {
    const monthTx = financialRecords.filter(t => (t.date || '').startsWith(currentMonth));
    const entradas = monthTx.filter(t => t.type === 'entrada').reduce((a, t) => a + Number(t.amount || 0), 0);
    const saidas = monthTx.filter(t => t.type === 'saida').reduce((a, t) => a + Number(t.amount || 0), 0);
    return { totalEntradas: entradas, totalSaidas: saidas, lucroLiquido: entradas - saidas };
  }, [financialRecords, currentMonth]);
  const saldoGeral = useMemo(() => (
    financialRecords.filter(t => t.type === 'entrada').reduce((a, t) => a + Number(t.amount || 0), 0)
    - financialRecords.filter(t => t.type === 'saida').reduce((a, t) => a + Number(t.amount || 0), 0)
  ), [financialRecords]);

  const pendingOrders = useMemo(() => salesOrders.filter(o => o.payment_status === 'pendente'), [salesOrders]);
  const emProducao = useMemo(() => salesOrders.filter(o => o.status === 'em_producao'), [salesOrders]);
  const prontos = useMemo(() => salesOrders.filter(o => o.status === 'pronto'), [salesOrders]);
  const activeOS = useMemo(() => serviceOrders.filter(o => o.status === 'em_andamento'), [serviceOrders]);
  const lowStock = useMemo(() => products.filter(p => (p.quantity || 0) <= (p.min_quantity || 5)), [products]);
  const atrasados = useMemo(() => salesOrders.filter(o =>
    o.delivery_date && o.delivery_date < TODAY && !['entregue', 'cancelado'].includes(o.status)
  ), [salesOrders]);
  const recentOrders = salesOrders.slice(0, 5);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8EDF5', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-5">
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-tertiary)' }}>{moment().format('dddd, D [de] MMMM')}</p>
        <h1 className="font-bold text-2xl mt-1" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{moment().format('MMMM [de] YYYY')}</p>
      </div>

      {/* Saldo principal */}
      <div className="mx-4 mb-5 rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: '8px 8px 24px rgba(174,190,220,0.45), -4px -4px 14px rgba(255,255,255,0.95)',
        }}>
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: 'linear-gradient(90deg, #4f79f5, #7c3aed)' }} />
        <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>Saldo Acumulado</p>
        <p className="text-3xl font-bold" style={{ color: saldoGeral >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(saldoGeral)}</p>
        <div className="flex gap-4 mt-3 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Entradas (mês)</p>
            <p className="font-bold text-sm" style={{ color: '#16a34a' }}>{fmt(totalEntradas)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Saídas (mês)</p>
            <p className="font-bold text-sm" style={{ color: '#dc2626' }}>{fmt(totalSaidas)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Lucro</p>
            <p className="font-bold text-sm" style={{ color: lucroLiquido >= 0 ? '#4f79f5' : '#dc2626' }}>{fmt(lucroLiquido)}</p>
          </div>
        </div>
      </div>

      {/* KPIs operacionais */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Pgto Pendente', value: pendingOrders.length, sub: fmt(pendingOrders.reduce((a, o) => a + (o.total || 0), 0)), color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', icon: Clock, path: 'Vendas' },
          { label: 'Em Produção', value: emProducao.length, sub: `${prontos.length} prontos`, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', icon: Wrench, path: 'Vendas' },
          { label: 'OS Ativas', value: activeOS.length, sub: 'em andamento', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)', icon: TrendingUp, path: 'OrdensServico' },
          { label: 'Estoque Crítico', value: lowStock.length, sub: 'abaixo do mínimo', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', icon: Package, path: 'Estoque' },
        ].map(kpi => (
          <Link key={kpi.label} to={createPageUrl(kpi.path)}>
            <motion.div whileTap={{ scale: 0.97 }}
              className="rounded-2xl p-4"
              style={{ background: 'var(--bg)', border: `1.5px solid ${kpi.border}`, boxShadow: '6px 6px 18px rgba(174,190,220,0.35), -3px -3px 10px rgba(255,255,255,1)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: '#c0cce0' }} />
              </div>
              <p className="font-bold text-2xl leading-none" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
              <p className="text-[10px] mt-0.5 font-bold" style={{ color: kpi.color }}>{kpi.sub}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Alertas */}
      {atrasados.length > 0 && (
        <div className="mx-4 mb-5 rounded-2xl p-4"
          style={{ background: 'var(--bg)', border: '1.5px solid rgba(239,68,68,0.35)', boxShadow: '6px 6px 18px rgba(239,68,68,0.12)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" style={{ color: '#dc2626' }} />
            <p className="font-semibold text-sm" style={{ color: '#dc2626' }}>{atrasados.length} pedido{atrasados.length > 1 ? 's' : ''} atrasado{atrasados.length > 1 ? 's' : ''}!</p>
          </div>
          {atrasados.slice(0, 3).map(o => (
            <div key={o.id} className="flex justify-between text-xs py-1.5 border-b last:border-0" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
              <span className="truncate max-w-[200px]" style={{ color: '#2d3d50' }}>{o.client_name}</span>
              <span className="shrink-0 ml-2 font-bold" style={{ color: '#dc2626' }}>{moment(o.delivery_date).format('DD/MM')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pedidos Recentes */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Pedidos Recentes</h2>
          <Link to={createPageUrl('Vendas')} className="text-xs font-bold" style={{ color: '#4f79f5' }}>Ver todos ?</Link>
        </div>
        <div className="space-y-2">
          {recentOrders.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>Nenhum pedido ainda</p>
          )}
          {recentOrders.map(o => {
            const statusColors = { novo: '#3b82f6', em_producao: '#f97316', pronto: '#22c55e', entregue: '#7a8a9e', cancelado: '#ef4444' };
            const color = statusColors[o.status] || '#7a8a9e';
            return (
              <div key={o.id} className="rounded-2xl p-3.5 flex items-center justify-between gap-3"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '4px 4px 12px rgba(174,190,220,0.3), -2px -2px 8px rgba(255,255,255,1)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
                  </div>
                  <p className="text-[10px] mt-0.5 truncate ml-4" style={{ color: 'var(--text-tertiary)' }}>{o.items?.slice(0, 60)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm" style={{ color: '#16a34a' }}>{fmt(o.total)}</p>
                  <p className="text-[10px]" style={{ color: '#9aabbd' }}>{moment(o.created_date).fromNow()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metas */}
      {goals.length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Metas</h2>
            <Link to={createPageUrl('Metas')} className="text-xs font-bold" style={{ color: '#4f79f5' }}>Ver todas ?</Link>
          </div>
          <div className="space-y-2">
            {goals.slice(0, 3).map(g => {
              const pct = Math.min(100, g.target_value > 0 ? ((g.current_value || 0) / g.target_value) * 100 : 0);
              return (
                <div key={g.id} className="rounded-2xl p-3.5"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '4px 4px 12px rgba(174,190,220,0.3), -2px -2px 8px rgba(255,255,255,1)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g.title}</p>
                    {g.completed && <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#16a34a' }} />}
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg,#4f79f5,#7c3aed)' }} />
                  </div>
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--text-tertiary)' }}>{pct.toFixed(0)}% · Meta: {fmt(g.target_value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}