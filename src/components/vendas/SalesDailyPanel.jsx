import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Banknote, CalendarDays, Factory, MessageCircle } from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;

function Block({ icon: Icon, title, children }) {
  return <div className="rounded-[24px] p-4 bg-white/65 border border-white shadow-sm"><div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-green-600" /><h3 className="font-black text-slate-800">{title}</h3></div><div className="space-y-2">{children}</div></div>;
}

export default function SalesDailyPanel({ late, pendingPayment, production, ready, onView, onWhatsApp }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <Block icon={AlertTriangle} title="Entregas atrasadas">{late.length === 0 && <p className="text-sm text-slate-500">Nenhuma entrega atrasada.</p>}{late.slice(0, 5).map((order) => <button key={order.id} onClick={() => onView(order)} className="w-full text-left rounded-2xl bg-red-50 border border-red-200 p-3"><p className="font-bold text-slate-800 truncate">{order.client_name}</p><p className="text-xs text-red-700">Entrega {moment(order.delivery_date).format('DD/MM')} · {money(order.total)}</p></button>)}</Block>
      <Block icon={Banknote} title="A receber">{pendingPayment.length === 0 && <p className="text-sm text-slate-500">Nenhum pagamento pendente.</p>}{pendingPayment.slice(0, 5).map((order) => <div key={order.id} className="rounded-2xl bg-orange-50 border border-orange-200 p-3"><p className="font-bold text-slate-800 truncate">{order.client_name}</p><p className="text-xs text-orange-700">{order.order_number} · {money(order.total)}</p><Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => onWhatsApp(order)}><MessageCircle className="w-3 h-3" /> Cobrar</Button></div>)}</Block>
      <Block icon={Factory} title="Em produção">{production.length === 0 && <p className="text-sm text-slate-500">Nada em produção.</p>}{production.slice(0, 5).map((order) => <button key={order.id} onClick={() => onView(order)} className="w-full text-left rounded-2xl bg-purple-50 border border-purple-200 p-3"><p className="font-bold text-slate-800 truncate">{order.client_name}</p><p className="text-xs text-purple-700">{order.order_number} · {order.line_items_count || 1} item(ns)</p></button>)}</Block>
      <Block icon={CalendarDays} title="Prontos para entregar">{ready.length === 0 && <p className="text-sm text-slate-500">Nenhum pedido pronto.</p>}{ready.slice(0, 5).map((order) => <button key={order.id} onClick={() => onView(order)} className="w-full text-left rounded-2xl bg-green-50 border border-green-200 p-3"><p className="font-bold text-slate-800 truncate">{order.client_name}</p><p className="text-xs text-green-700">{order.order_number} · {money(order.total)}</p></button>)}</Block>
    </div>
  );
}