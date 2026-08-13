import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;
const methods = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'parcelado', 'boleto', 'crediario'];

export default function DeliveryModal({ order, open, onClose, onConfirm }) {
  const [paymentStatus, setPaymentStatus] = useState('pago');
  const [paymentMethod, setPaymentMethod] = useState(order?.payment_method || 'pix');
  return <Dialog open={open} onOpenChange={onClose}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /> Entregar pedido</DialogTitle></DialogHeader><div className="space-y-4"><div className="rounded-2xl p-3 bg-slate-50 border border-slate-200"><p className="text-xs text-slate-500">Pedido</p><p className="font-bold text-slate-800">{order?.order_number} — {order?.client_name}</p><p className="font-black text-green-600 text-lg">{money(order?.total)}</p></div><div className="space-y-1.5"><Label>Status do pagamento</Label><Select value={paymentStatus} onValueChange={setPaymentStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pago">Pago</SelectItem><SelectItem value="parcial">Parcial</SelectItem><SelectItem value="pendente">Pendente</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label>Forma de pagamento</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => onConfirm({ paymentStatus, paymentMethod })}>Confirmar</Button></DialogFooter></DialogContent></Dialog>;
}