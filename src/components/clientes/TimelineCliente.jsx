// Melhoria #73 — Linha do tempo completa por cliente (pedidos, pagamentos, contatos)
import React from 'react';
import { ShoppingCart, DollarSign, MessageCircle, Package, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

const typeConfig = {
  pedido: { icon: ShoppingCart, color: 'var(--accent)', bg: 'var(--accent-muted)', label: 'Pedido' },
  pagamento: { icon: DollarSign, color: 'var(--green)', bg: 'var(--green-muted)', label: 'Pagamento' },
  mensagem: { icon: MessageCircle, color: 'var(--purple)', bg: 'var(--purple-muted)', label: 'Contato' },
  entrega: { icon: Package, color: 'var(--orange)', bg: 'var(--orange-muted)', label: 'Entrega' },
  concluido: { icon: CheckCircle, color: 'var(--red)', bg: 'var(--red-muted)', label: 'Concluído' },
};

export default function TimelineCliente({ orders = [], transactions = [] }) {
  const events = [
    ...orders.map(o => ({
      date: o.created_date,
      type: 'pedido',
      title: `Pedido ${o.order_number || ''}`,
      value: o.total,
      desc: o.client_name,
    })),
    ...orders.filter(o => o.status === 'entregue').map(o => ({
      date: o.updated_date || o.created_date,
      type: 'entrega',
      title: `Entrega ${o.order_number || ''}`,
      value: o.total,
      desc: o.client_name,
    })),
    ...transactions.map(t => ({
      date: t.date,
      type: 'pagamento',
      title: t.description,
      value: t.amount,
      desc: t.payment_method,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
      {events.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>Nenhuma atividade registrada</p>
      )}
      {events.map((ev, i) => {
        const cfg = typeConfig[ev.type] || typeConfig.pedido;
        const Icon = cfg.icon;
        return (
          <div key={i} className="flex gap-3 items-start">
            <div className="p-2 rounded-lg flex-shrink-0" style={{ background: cfg.bg, boxShadow: 'var(--shadow-flat)' }}>
              <Icon className="w-3 h-3" style={{ color: cfg.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                {ev.value && (
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: ev.type === 'pagamento' ? 'var(--green)' : 'var(--red)' }}>
                    R$ {(ev.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{moment(ev.date).format('DD/MM/YYYY')}</span>
                <Badge className="text-xs" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}