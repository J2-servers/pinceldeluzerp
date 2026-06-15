import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { AlertTriangle, Clock, Package, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';

export default function AlertasPrazo({ salesOrders = [] }) {
  const hoje = moment();

  const atrasados = salesOrders.filter(o =>
    o.delivery_date &&
    moment(o.delivery_date).isBefore(hoje, 'day') &&
    !['entregue', 'cancelado'].includes(o.status)
  );

  const vencendoHoje = salesOrders.filter(o =>
    o.delivery_date &&
    moment(o.delivery_date).isSame(hoje, 'day') &&
    !['entregue', 'cancelado'].includes(o.status)
  );

  const vencendoAmanha = salesOrders.filter(o =>
    o.delivery_date &&
    moment(o.delivery_date).isSame(moment().add(1, 'day'), 'day') &&
    !['entregue', 'cancelado'].includes(o.status)
  );

  const total = atrasados.length + vencendoHoje.length + vencendoAmanha.length;

  if (total === 0) return null;

  return (
    <GlassCard accent="red" delay={0.05}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg animate-pulse" style={{ background: 'var(--red-muted)', boxShadow: 'var(--shadow-flat)' }}>
          <AlertTriangle className="w-4 h-4" style={{ color: 'var(--red)' }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Alertas de Prazo de Entrega</h3>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{total} pedido(s) requerem atenção</p>
        </div>
        <Link to={createPageUrl('Vendas')} className="ml-auto text-xs" style={{ color: 'var(--red)' }}>Ver pedidos →</Link>
      </div>

      <div className="space-y-2">
        {atrasados.slice(0, 3).map(o => (
          <div key={o.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
            <div className="flex items-center gap-2">
              <Truck className="w-3 h-3" style={{ color: 'var(--red)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{o.order_number}</span>
              <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-tertiary)' }}>{o.client_name}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--red)' }}>
              {moment(o.delivery_date).fromNow()} (atrasado)
            </span>
          </div>
        ))}
        {vencendoHoje.slice(0, 2).map(o => (
          <div key={o.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" style={{ color: 'var(--orange)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{o.order_number}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{o.client_name}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--orange)' }}>Entrega HOJE</span>
          </div>
        ))}
        {vencendoAmanha.slice(0, 2).map(o => (
          <div key={o.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
            <div className="flex items-center gap-2">
              <Package className="w-3 h-3" style={{ color: 'var(--yellow)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{o.order_number}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{o.client_name}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--yellow)' }}>Entrega Amanhã</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}