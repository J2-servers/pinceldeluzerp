import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Edit, Eye, PackageCheck, Receipt, Truck } from 'lucide-react';
import moment from 'moment';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SalesCardsGrid({ orders, onView, onEdit, onStatusChange, onInvoice }) {
  if (!orders.length) return <div className="rounded-[24px] bg-white/70 border border-white p-10 text-center text-slate-500">Nenhum pedido encontrado.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {orders.map((order) => (
        <div key={order.id} className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm hover:shadow-lg transition-all">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black tracking-widest text-blue-600">{order.order_number}</p><h3 className="text-lg font-black text-slate-800 truncate">{order.client_name}</h3><p className="text-sm text-slate-500 truncate">{order.items}</p></div><StatusBadge status={order.status} /></div>
          <div className="grid grid-cols-2 gap-2 my-4"><div className="rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Total</p><p className="font-black text-green-600">{money(order.total)}</p></div><div className="rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Entrega</p><p className="font-black text-slate-800">{order.delivery_date ? moment(order.delivery_date).format('DD/MM') : '—'}</p></div></div>
          <div className="flex items-center justify-between gap-2"><StatusBadge status={order.payment_status} /><div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" onClick={() => onView(order)}><Eye className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => onEdit(order)}><Edit className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => onStatusChange(order, 'em_producao')}><PackageCheck className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => onStatusChange(order, 'pronto')}><CheckCircle className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => onStatusChange(order, 'entregue')}><Truck className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => onInvoice(order)}><Receipt className="w-3.5 h-3.5" /></Button></div></div>
        </div>
      ))}
    </div>
  );
}