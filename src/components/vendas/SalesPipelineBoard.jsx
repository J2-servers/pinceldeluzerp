import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Edit, Eye, PackageCheck, Receipt, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;
const columns = [['novo', 'Novos'], ['em_producao', 'Produção'], ['pronto', 'Prontos'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados']];

export default function SalesPipelineBoard({ orders, onView, onEdit, onStatusChange, onInvoice }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {columns.map(([status, label]) => {
        const items = orders.filter((order) => order.status === status);
        const total = items.reduce((sum, order) => sum + Number(order.total || 0), 0);
        return (
          <div key={status} className="rounded-[24px] p-3 min-h-[320px]" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
            <div className="flex items-center justify-between mb-3"><div><p className="font-black" style={{ color: 'var(--text-primary)' }}>{label}</p><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{items.length} · {money(total)}</p></div><StatusBadge status={status} /></div>
            <div className="space-y-3">
              {items.length === 0 && <div className="text-center text-xs rounded-2xl p-6" style={{ color: 'var(--text-tertiary)', border: '1px dashed var(--border-inner)' }}>Sem pedidos</div>}
              {items.map((order) => (
                <div key={order.id} className="rounded-2xl p-3 space-y-2" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)' }}>
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{order.client_name}</p><p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{order.order_number} · {order.items}</p></div><p className="text-sm font-black shrink-0" style={{ color: 'var(--green)' }}>{money(order.total)}</p></div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onView(order)}><Eye className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => onEdit(order)}><Edit className="w-3 h-3" /></Button>
                    {status === 'novo' && <Button size="sm" variant="ghost" onClick={() => onStatusChange(order, 'em_producao')}><PackageCheck className="w-3 h-3" /></Button>}
                    {status === 'em_producao' && <Button size="sm" variant="ghost" onClick={() => onStatusChange(order, 'pronto')}><CheckCircle className="w-3 h-3" /></Button>}
                    {status === 'pronto' && <Button size="sm" variant="ghost" onClick={() => onStatusChange(order, 'entregue')}><Truck className="w-3 h-3" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => onInvoice(order)}><Receipt className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}