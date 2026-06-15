import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { AlertTriangle, CheckCircle, Info, XCircle, Bell } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const ALERT_TYPES = {
  critical: {
    color: '#dc2626', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)',
    iconBg: 'rgba(239,68,68,0.12)', label: 'Crítico', icon: XCircle,
  },
  warning: {
    color: '#ca8a04', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.3)',
    iconBg: 'rgba(234,179,8,0.12)', label: 'Atenção', icon: AlertTriangle,
  },
  info: {
    color: '#2563eb', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)',
    iconBg: 'rgba(59,130,246,0.12)', label: 'Info', icon: Info,
  },
  success: {
    color: '#16a34a', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)',
    iconBg: 'rgba(34,197,94,0.12)', label: 'OK', icon: CheckCircle,
  },
};

function AlertCard({ alert }) {
  const type = ALERT_TYPES[alert.level] || ALERT_TYPES.info;
  const Icon = type.icon;
  return (
    <div className="rounded-2xl p-4 flex items-start gap-4 transition-all"
      style={{
        background: 'var(--bg)',
        border: `1.5px solid ${type.border}`,
        boxShadow: `5px 5px 16px rgba(174,190,220,0.3), -2px -2px 8px rgba(255,255,255,1)`,
      }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: type.iconBg }}>
        <Icon className="w-5 h-5" style={{ color: type.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: type.bg, color: type.color, border: `1px solid ${type.border}` }}>
            {type.label}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(99,130,255,0.08)', color: '#4f79f5', border: '1px solid rgba(79,121,245,0.2)' }}>
            {alert.module}
          </span>
        </div>
        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{alert.title}</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{alert.description}</p>
        {alert.value && (
          <p className="text-sm font-bold mt-1" style={{ color: type.color }}>{alert.value}</p>
        )}
      </div>
      <span className="text-xs shrink-0 font-semibold" style={{ color: '#9aabbd' }}>{alert.time}</span>
    </div>
  );
}

export default function Alertas() {
  const [filter, setFilter] = useState('all');

  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => erp.entities.Transaction.list('-date', 200) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list() });
  const { data: payables = [] } = useQuery({ queryKey: ['accountsPayable'], queryFn: () => erp.entities.AccountPayable.filter({ paid: false }) });
  const { data: receivables = [] } = useQuery({ queryKey: ['accountsReceivable'], queryFn: () => erp.entities.AccountReceivable.filter({ received: false }) });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 100) });
  const { data: serviceOrders = [] } = useQuery({ queryKey: ['serviceOrders'], queryFn: () => erp.entities.ServiceOrder.list('-created_date', 50) });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => erp.entities.Goal.list() });

  const alerts = useMemo(() => {
    const list = [];
    const today = moment().format('YYYY-MM-DD');
    const todayDate = moment();

    // Financeiro
    const overduePayables = payables.filter(p => p.due_date < today);
    const overdueReceivables = receivables.filter(r => r.due_date < today);

    if (overduePayables.length > 0) {
      const total = overduePayables.reduce((a, p) => a + (p.amount || 0), 0);
      list.push({ level: 'critical', module: 'Financeiro', title: `${overduePayables.length} conta(s) a pagar VENCIDA(S)`, description: 'Pagamentos em atraso podem gerar juros e danos ao relacionamento com fornecedores.', value: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, time: 'Agora' });
    }
    if (overdueReceivables.length > 0) {
      const total = overdueReceivables.reduce((a, r) => a + (r.amount || 0), 0);
      list.push({ level: 'warning', module: 'Financeiro', title: `${overdueReceivables.length} conta(s) a receber vencida(s)`, description: 'Clientes com pagamentos em atraso. Considere ação de cobrança.', value: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, time: 'Agora' });
    }
    const soonPayables = payables.filter(p => { const diff = moment(p.due_date).diff(todayDate, 'days'); return diff >= 0 && diff <= 7; });
    if (soonPayables.length > 0) {
      list.push({ level: 'warning', module: 'Financeiro', title: `${soonPayables.length} conta(s) vencendo em 7 dias`, description: 'Programe seus pagamentos para evitar atrasos.', value: `R$ ${soonPayables.reduce((a, p) => a + (p.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, time: 'Previsão' });
    }
    const totalIn = transactions.filter(t => t.type === 'entrada').reduce((a, t) => a + (t.amount || 0), 0);
    const totalOut = transactions.filter(t => t.type === 'saida').reduce((a, t) => a + (t.amount || 0), 0);
    if (totalIn - totalOut < 0) {
      list.push({ level: 'critical', module: 'Financeiro', title: 'Saldo geral negativo', description: 'As saídas superam as entradas. Revise seus custos e receitas.', value: `R$ ${(totalIn - totalOut).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, time: 'Agora' });
    }

    // Estoque
    const criticalStock = products.filter(p => (p.quantity || 0) === 0);
    const lowStock = products.filter(p => (p.quantity || 0) > 0 && (p.quantity || 0) <= (p.min_quantity || 5));
    if (criticalStock.length > 0) list.push({ level: 'critical', module: 'Estoque', title: `${criticalStock.length} produto(s) com estoque ZERADO`, description: criticalStock.map(p => p.name).slice(0, 3).join(', '), value: null, time: 'Agora' });
    if (lowStock.length > 0) list.push({ level: 'warning', module: 'Estoque', title: `${lowStock.length} produto(s) com estoque baixo`, description: lowStock.map(p => p.name).slice(0, 3).join(', '), value: null, time: 'Agora' });

    // Vendas
    const pendingOrders = salesOrders.filter(o => o.payment_status === 'pendente');
    if (pendingOrders.length > 5) list.push({ level: 'warning', module: 'Vendas', title: `${pendingOrders.length} pedidos com pagamento pendente`, description: 'Alto volume de pedidos sem confirmação de pagamento.', value: `R$ ${pendingOrders.reduce((a, o) => a + (o.total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, time: 'Agora' });
    const lateOrders = salesOrders.filter(o => o.deadline && o.deadline < today && !['entregue', 'cancelado'].includes(o.status));
    if (lateOrders.length > 0) list.push({ level: 'critical', module: 'Vendas', title: `${lateOrders.length} pedido(s) com entrega em atraso`, description: 'Pedidos cujo prazo de entrega já foi ultrapassado.', value: null, time: 'Agora' });

    // Produção
    const activeOS = serviceOrders.filter(o => o.status === 'em_andamento');
    if (activeOS.length > 0) list.push({ level: 'info', module: 'Produção', title: `${activeOS.length} OS em andamento`, description: 'Ordens de serviço ativas no momento.', value: null, time: 'Agora' });
    const overdueOS = serviceOrders.filter(o => o.deadline && o.deadline < today && !['concluida', 'cancelada'].includes(o.status));
    if (overdueOS.length > 0) list.push({ level: 'critical', module: 'Produção', title: `${overdueOS.length} OS com prazo vencido`, description: 'Ordens de serviço que ultrapassaram o prazo.', value: null, time: 'Agora' });

    // Metas
    const overdueGoals = goals.filter(g => !g.completed && g.deadline && g.deadline < today);
    if (overdueGoals.length > 0) list.push({ level: 'warning', module: 'Metas', title: `${overdueGoals.length} meta(s) com prazo vencido`, description: 'Metas que ultrapassaram a data limite sem serem concluídas.', value: null, time: 'Agora' });
    const nearGoals = goals.filter(g => !g.completed && g.target_value && ((g.current_value || 0) / g.target_value) >= 0.9);
    if (nearGoals.length > 0) list.push({ level: 'success', module: 'Metas', title: `${nearGoals.length} meta(s) quase concluída(s)`, description: nearGoals.map(g => g.title).join(', '), value: null, time: 'Agora' });

    if (list.length === 0) list.push({ level: 'success', module: 'Sistema', title: 'Tudo em ordem!', description: 'Nenhum alerta crítico identificado no momento.', value: null, time: 'Agora' });

    return list;
  }, [transactions, products, payables, receivables, salesOrders, serviceOrders, goals]);

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.level === filter);
  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;
  const infoCount = alerts.filter(a => a.level === 'info').length;
  const successCount = alerts.filter(a => a.level === 'success').length;

  const summaryCards = [
    { label: 'Críticos', count: criticalCount, level: 'critical', color: '#dc2626', border: 'rgba(239,68,68,0.35)', activeBg: 'rgba(239,68,68,0.06)' },
    { label: 'Atenção', count: warningCount, level: 'warning', color: '#ca8a04', border: 'rgba(234,179,8,0.35)', activeBg: 'rgba(234,179,8,0.06)' },
    { label: 'Informativos', count: infoCount, level: 'info', color: '#2563eb', border: 'rgba(59,130,246,0.35)', activeBg: 'rgba(59,130,246,0.06)' },
    { label: 'OK', count: successCount, level: 'success', color: '#16a34a', border: 'rgba(34,197,94,0.35)', activeBg: 'rgba(34,197,94,0.06)' },
  ];

  return (
    <div className="page-neu pt-6 pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4f79f5, #7c3aed)', boxShadow: '5px 5px 16px rgba(79,121,245,0.4)' }}>
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Central de Alertas</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Monitoramento inteligente do sistema</p>
        </div>
        <div className="ml-auto text-xs font-semibold" style={{ color: '#9aabbd' }}>
          Atualizado {moment().format('HH:mm')}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(s => {
          const isActive = filter === s.level;
          return (
            <button key={s.level} onClick={() => setFilter(isActive ? 'all' : s.level)}
              className="p-4 rounded-2xl text-left transition-all active:scale-97"
              style={{
                background: isActive ? s.activeBg : '#ffffff',
                border: `1.5px solid ${isActive ? s.border : 'rgba(200,215,235,0.9)'}`,
                boxShadow: isActive
                  ? `6px 6px 20px rgba(174,190,220,0.35), -3px -3px 10px rgba(255,255,255,1)`
                  : `6px 6px 20px rgba(174,190,220,0.45), -3px -3px 12px rgba(255,255,255,1)`,
              }}>
              <p className="text-3xl font-bold" style={{ color: s.color }}>{s.count}</p>
              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '6px 6px 20px rgba(174,190,220,0.4), -3px -3px 12px rgba(255,255,255,1)' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: '#4f79f5' }} />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{filtered.length} alerta(s)</span>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')}
              className="text-xs px-2.5 py-1 rounded-xl font-semibold transition-all"
              style={{ background: 'rgba(79,121,245,0.08)', color: '#4f79f5', border: '1px solid rgba(79,121,245,0.2)' }}>
              Limpar filtro
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {summaryCards.map(s => (
            <button key={s.level} onClick={() => setFilter(filter === s.level ? 'all' : s.level)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all"
              style={{
                background: filter === s.level ? s.activeBg : 'transparent',
                color: filter === s.level ? s.color : '#9aabbd',
                border: `1.5px solid ${filter === s.level ? s.border : 'rgba(200,215,235,0.7)'}`,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.map((alert, i) => <AlertCard key={i} alert={alert} />)}
      </div>
    </div>
  );
}