// Melhoria #36 — Pipeline de vendas visual (kanban) por status
import React from 'react';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

const COLUNAS = [
  { key: 'pendente', label: 'Pendente', color: 'var(--yellow)' },
  { key: 'aprovado', label: 'Aprovado', color: 'var(--accent)' },
  { key: 'producao', label: 'Em Produção', color: 'var(--purple)' },
  { key: 'entregue', label: 'Entregue', color: 'var(--green)' },
  { key: 'cancelado', label: 'Cancelado', color: 'var(--red)' },
];

function OrderCard({ order }) {
  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)' }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{order.client_name || 'Cliente'}</p>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {order.id?.slice(-4) || '---'}
        </span>
      </div>
      {order.total && (
        <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
          R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{moment(order.created_date).format('DD/MM')}</span>
        {order.payment_method && (
          <Badge className="text-xs border-0" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{order.payment_method.replace(/_/g, ' ')}</Badge>
        )}
      </div>
    </div>
  );
}

export default function PipelineKanban({ orders = [] }) {
  const porStatus = (status) => orders.filter(o => o.status === status);
  const totalPorStatus = (status) => porStatus(status).reduce((a, o) => a + (o.total || 0), 0);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Pipeline de Vendas</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto">
        {COLUNAS.map(col => {
          const items = porStatus(col.key);
          const total = totalPorStatus(col.key);
          return (
            <div
              key={col.key}
              className="rounded-xl p-3 min-h-48 space-y-3"
              style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: col.color }}>{col.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{items.length} pedidos</p>
                {total > 0 && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>}
              </div>
              <div className="space-y-2">
                {items.map(o => <OrderCard key={o.id} order={o} />)}
                {items.length === 0 && (
                  <p className="text-center text-xs py-6" style={{ color: 'var(--text-tertiary)' }}>Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
