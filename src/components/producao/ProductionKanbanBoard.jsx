import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronLeft, PackageCheck, Truck } from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;
const columns = [['novo', 'Novos'], ['em_producao', 'Em produção'], ['pronto', 'Prontos'], ['entregue', 'Entregues']];

export default function ProductionKanbanBoard({ orders, onStatus, onDeliver }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {columns.map(([status, label]) => {
        const items = orders.filter((order) => order.status === status);
        return <div key={status} className="rounded-[24px] p-3 min-h-[360px]" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}><div className="flex items-center justify-between mb-3"><div><p className="font-black" style={{ color: 'var(--text-primary)' }}>{label}</p><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{items.length} pedidos</p></div><StatusBadge status={status} /></div><div className="space-y-3">{items.length === 0 && <div className="text-center text-xs rounded-2xl p-6" style={{ color: 'var(--text-tertiary)', border: '1px dashed var(--border)' }}>Sem pedidos</div>}{items.map((order) => { const late = order.delivery_date && order.delivery_date < moment().format('YYYY-MM-DD') && !['entregue', 'cancelado'].includes(order.status); return <div key={order.id} className="rounded-2xl p-3 space-y-2" style={{ background: late ? 'var(--red-muted)' : 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)' }}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{order.client_name}</p><p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{order.order_number} · {order.items}</p></div><p className="text-sm font-black shrink-0" style={{ color: 'var(--green)' }}>{money(order.total)}</p></div><p className="text-xs font-bold" style={{ color: late ? 'var(--red)' : 'var(--text-tertiary)' }}>{order.delivery_date ? `Entrega ${moment(order.delivery_date).format('DD/MM')}` : 'Sem entrega'}</p><div className="flex flex-wrap gap-1">{status === 'em_producao' && <Button size="sm" variant="ghost" onClick={() => onStatus(order, 'novo')}><ChevronLeft className="w-3 h-3" /></Button>}{status === 'pronto' && <Button size="sm" variant="ghost" onClick={() => onStatus(order, 'em_producao')}><ChevronLeft className="w-3 h-3" /></Button>}{status === 'novo' && <Button size="sm" variant="outline" onClick={() => onStatus(order, 'em_producao')}><PackageCheck className="w-3 h-3" /> Iniciar</Button>}{status === 'em_producao' && <Button size="sm" variant="outline" onClick={() => onStatus(order, 'pronto')}><CheckCircle className="w-3 h-3" /> Pronto</Button>}{status === 'pronto' && <Button size="sm" variant="outline" onClick={() => onDeliver(order)}><Truck className="w-3 h-3" /> Entregar</Button>}</div></div>; })}</div></div>;
      })}
    </div>
  );
}