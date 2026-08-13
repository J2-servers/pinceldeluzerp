import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import {
  ShoppingCart, Wrench, AlertCircle, CheckCircle,
  ChevronRight, RefreshCw, Calendar
} from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/lib/numberFormat';

const TODAY = moment().format('YYYY-MM-DD');

const STATUS_COLORS = {
  novo:         { label: 'Novo',         color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  em_producao:  { label: 'Em Produção',  color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
  pronto:       { label: 'Pronto',       color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
  entregue:     { label: 'Entregue',     color: 'var(--text-tertiary)', bg: 'rgba(120,140,160,0.1)', border: 'rgba(120,140,160,0.2)' },
  cancelado:    { label: 'Cancelado',    color: '#dc2626', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
  aguardando:   { label: 'Aguardando',   color: '#ca8a04', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)' },
  em_andamento: { label: 'Em Andamento', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  pausada:      { label: 'Pausada',      color: 'var(--text-tertiary)', bg: 'rgba(120,140,160,0.1)', border: 'rgba(120,140,160,0.2)' },
  concluida:    { label: 'Concluída',    color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
};

const NEXT = {
  SalesOrder:   { novo: 'em_producao', em_producao: 'pronto', pronto: 'entregue' },
  ServiceOrder: { aguardando: 'em_andamento', em_andamento: 'concluida', pausada: 'em_andamento' },
};

const fmt = formatCurrency;

function ProjectCard({ item, type, onStatusChange }) {
  const sc = STATUS_COLORS[item.status] || STATUS_COLORS.novo;
  const next = NEXT[type]?.[item.status];
  const isOverdue = (item.delivery_date || item.deadline || '') < TODAY && !['entregue', 'cancelado', 'concluida'].includes(item.status) && (item.delivery_date || item.deadline);
  const isToday = (item.delivery_date || item.deadline) === TODAY;

  return (
    <div className="rounded-2xl p-4"
      style={{
        background: 'var(--bg)',
        border: `1.5px solid ${isOverdue ? 'rgba(239,68,68,0.4)' : isToday ? 'rgba(249,115,22,0.35)' : 'rgba(200,215,235,0.9)'}`,
        boxShadow: isOverdue
          ? '5px 5px 16px rgba(239,68,68,0.1), -2px -2px 8px rgba(255,255,255,1)'
          : '5px 5px 16px rgba(174,190,220,0.35), -2px -2px 8px rgba(255,255,255,1)',
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sc.color }} />
            <p className="font-semibold text-sm truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
              {type === 'SalesOrder' ? item.client_name : item.title || item.client_name}
            </p>
            {isOverdue && (
              <span className="text-[9px] font-bold flex items-center gap-0.5" style={{ color: '#dc2626' }}>
                <AlertCircle className="w-2.5 h-2.5" />ATRASADO
              </span>
            )}
            {isToday && !isOverdue && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}>?? HOJE</span>
            )}
          </div>
          <p className="text-xs leading-snug line-clamp-2 ml-3.5" style={{ color: 'var(--text-tertiary)' }}>
            {type === 'SalesOrder' ? item.items?.slice(0, 80) : item.description?.slice(0, 80)}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap ml-3.5">
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              {sc.label}
            </span>
            {(item.delivery_date || item.deadline) && (
              <span className="text-[9px] flex items-center gap-0.5 font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                <Calendar className="w-2.5 h-2.5" />{moment(item.delivery_date || item.deadline).format('DD/MM')}
              </span>
            )}
            {type === 'SalesOrder' && item.total && (
              <span className="text-[9px] font-bold" style={{ color: '#16a34a' }}>{fmt(item.total)}</span>
            )}
          </div>
        </div>
        {next && (
          <button onClick={() => onStatusChange(item.id, next, type)}
            className="shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-0.5 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f79f5, #7c3aed)', color: '#fff', border: 'none', boxShadow: '3px 3px 10px rgba(79,121,245,0.3)' }}>
            <ChevronRight className="w-3 h-3" />
            {STATUS_COLORS[next]?.label}
          </button>
        )}
      </div>
    </div>
  );
}

const FILTERS = [
  { value: 'ativos', label: 'Ativos' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'all', label: 'Todos' },
  { value: 'em_producao', label: 'Produção' },
  { value: 'pronto', label: 'Prontos' },
];

export default function MobileProjetosDoDia() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('ativos');

  const { data: salesOrders = [], isLoading: l1 } = useQuery({ queryKey: ['salesOrdersAll'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 200) });
  const { data: serviceOrders = [], isLoading: l2 } = useQuery({ queryKey: ['serviceOrdersAll'], queryFn: () => erp.entities.ServiceOrder.list('-created_date', 200) });

  const updateSalesOrder = useMutation({
    mutationFn: ({ id, data }) => erp.entities.SalesOrder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['salesOrdersAll']),
  });
  const updateServiceOrder = useMutation({
    mutationFn: ({ id, data }) => erp.entities.ServiceOrder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['serviceOrdersAll']),
  });

  const handleStatusChange = (id, newStatus, type) => {
    if (type === 'SalesOrder') updateSalesOrder.mutate({ id, data: { status: newStatus } });
    else updateServiceOrder.mutate({ id, data: { status: newStatus } });
  };

  const allItems = useMemo(() => {
    const sales = salesOrders.map(o => ({ ...o, _type: 'SalesOrder' }));
    const services = serviceOrders.map(o => ({ ...o, _type: 'ServiceOrder' }));
    return [...sales, ...services].sort((a, b) => {
      const aDate = a.delivery_date || a.deadline || '';
      const bDate = b.delivery_date || b.deadline || '';
      const aOver = aDate && aDate < TODAY;
      const bOver = bDate && bDate < TODAY;
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      const aToday = aDate === TODAY;
      const bToday = bDate === TODAY;
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      const p = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
      return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
    });
  }, [salesOrders, serviceOrders]);

  const filtered = useMemo(() => allItems.filter(item => {
    if (filterStatus === 'ativos') return !['entregue', 'cancelado', 'concluida'].includes(item.status);
    if (filterStatus === 'hoje') return (item.delivery_date || item.deadline || '') === TODAY;
    if (filterStatus !== 'all') return item.status === filterStatus;
    return true;
  }), [allItems, filterStatus]);

  const ativos = allItems.filter(i => !['entregue', 'cancelado', 'concluida'].includes(i.status));
  const atrasados = ativos.filter(i => { const d = i.delivery_date || i.deadline || ''; return d && d < TODAY; });
  const hoje = ativos.filter(i => (i.delivery_date || i.deadline || '') === TODAY);

  const salesItems = filtered.filter(i => i._type === 'SalesOrder');
  const serviceItems = filtered.filter(i => i._type === 'ServiceOrder');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8EDF5', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-tertiary)' }}>{moment().format('dddd, D [de] MMMM')}</p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Projetos do Dia</h1>
          <button
            onClick={() => { queryClient.invalidateQueries(['salesOrdersAll']); queryClient.invalidateQueries(['serviceOrdersAll']); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '3px 3px 8px rgba(174,190,220,0.3), -2px -2px 6px rgba(255,255,255,1)' }}>
            <RefreshCw className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>
      </div>

      {/* KPIs row */}
      <div className="px-4 grid grid-cols-4 gap-2 mb-5">
        {[
          { label: 'Abertos', value: ativos.length, color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
          { label: 'Hoje', value: hoje.length, color: '#f97316', border: 'rgba(249,115,22,0.3)' },
          { label: 'Atrasados', value: atrasados.length, color: '#dc2626', border: 'rgba(239,68,68,0.3)' },
          { label: 'Total', value: allItems.length, color: '#7c3aed', border: 'rgba(124,58,237,0.3)' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-3 text-center"
            style={{ background: 'var(--bg)', border: `1.5px solid ${k.border}`, boxShadow: '4px 4px 10px rgba(174,190,220,0.3), -2px -2px 6px rgba(255,255,255,1)' }}>
            <p className="font-bold text-xl leading-none" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
            <p className="text-[9px] mt-0.5 font-bold" style={{ color: k.color }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="px-4 mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
            style={{
              background: filterStatus === f.value ? 'linear-gradient(135deg, #4f79f5, #7c3aed)' : '#ffffff',
              border: filterStatus === f.value ? 'none' : '1.5px solid rgba(200,215,235,0.9)',
              color: filterStatus === f.value ? '#fff' : '#7a8a9e',
              boxShadow: filterStatus === f.value
                ? '4px 4px 12px rgba(79,121,245,0.35)'
                : '3px 3px 8px rgba(174,190,220,0.3), -2px -2px 6px rgba(255,255,255,1)',
            }}>
            {f.label}
          </button>
        ))}
        <span className="shrink-0 text-xs self-center ml-1 font-semibold" style={{ color: '#9aabbd' }}>{filtered.length} itens</span>
      </div>

      {/* Loading */}
      {(l1 || l2) && (
        <div className="text-center py-12 text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>Carregando...</div>
      )}

      {/* Empty */}
      {!l1 && !l2 && filtered.length === 0 && (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg)', boxShadow: '8px 8px 24px rgba(174,190,220,0.45), -4px -4px 14px rgba(255,255,255,0.95)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#16a34a' }} />
          </div>
          <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Nada pendente!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Todos os projetos em dia ?</p>
        </div>
      )}

      {/* Pedidos */}
      {salesItems.length > 0 && (
        <section className="px-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4" style={{ color: '#4f79f5' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Pedidos de Venda</h2>
            <span className="text-xs font-bold ml-auto px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(79,121,245,0.1)', color: '#4f79f5' }}>{salesItems.length}</span>
          </div>
          <div className="space-y-2.5">
            {salesItems.map(i => (
              <ProjectCard key={i.id + '_s'} item={i} type="SalesOrder" onStatusChange={handleStatusChange} />
            ))}
          </div>
        </section>
      )}

      {/* OS */}
      {serviceItems.length > 0 && (
        <section className="px-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4" style={{ color: '#7c3aed' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Ordens de Serviço</h2>
            <span className="text-xs font-bold ml-auto px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>{serviceItems.length}</span>
          </div>
          <div className="space-y-2.5">
            {serviceItems.map(i => (
              <ProjectCard key={i.id + '_os'} item={i} type="ServiceOrder" onStatusChange={handleStatusChange} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}