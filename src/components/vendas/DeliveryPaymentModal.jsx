import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';

const paymentMethods = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartao credito' },
  { value: 'cartao_debito', label: 'Cartao debito' },
  { value: 'parcelado', label: 'Parcelado' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'crediario', label: 'Crediario' },
];

/**
 * Registro de entrega com recebimento REAL. Entregar nao significa mais "pago":
 * o usuario declara quanto entrou de fato (nada, parcial ou total), e so esse
 * valor vira uma entrada no financeiro.
 */
export default function DeliveryPaymentModal({ order, open, onClose, onConfirm }) {
  const total = parseDecimal(order?.total);
  const [paymentStatus, setPaymentStatus] = useState('pago');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [amountReceived, setAmountReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [partial, setPartial] = useState(false);
  const [deliveredQty, setDeliveredQty] = useState({});

  const { data: orderItems = [] } = useQuery({
    queryKey: ['salesOrderItems', order?.id],
    queryFn: () => erp.entities.SalesOrderItem.filter({ sales_order_id: order.id }),
    enabled: !!order && open,
  });

  useEffect(() => {
    if (!open) return;
    setPaymentStatus('pago');
    setPaymentMethod(order?.payment_method || 'pix');
    setAmountReceived(String(parseDecimal(order?.total) || ''));
    setSaving(false);
    setPartial(false);
    setDeliveredQty({});
  }, [open, order]);

  const deliveredLines = useMemo(() => orderItems.map((item) => {
    const ordered = parseDecimal(item.quantity) || 0;
    const raw = deliveredQty[item.id];
    const delivered = partial ? Math.min(parseDecimal(raw), ordered) : ordered;
    return { id: item.id, product_name: item.product_name, ordered, delivered: delivered > 0 ? delivered : (partial ? 0 : ordered) };
  }), [orderItems, deliveredQty, partial]);

  const allDelivered = deliveredLines.every((line) => line.delivered >= line.ordered);

  const effectiveAmount = useMemo(() => {
    if (paymentStatus === 'pago') return total;
    if (paymentStatus === 'pendente') return 0;
    return Math.min(parseDecimal(amountReceived), total);
  }, [paymentStatus, amountReceived, total]);

  const remaining = Math.max(0, total - effectiveAmount);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm({ paymentStatus, paymentMethod, amountReceived: effectiveAmount, deliveredLines: partial ? deliveredLines : null, allDelivered: partial ? allDelivered : true });
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-600" /> Registrar entrega
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pedido {order.order_number}</p>
            <p className="text-sm font-semibold text-slate-800">{order.client_name}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(total)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={partial} onChange={(event) => setPartial(event.target.checked)} />
              Entrega parcial (nem tudo saiu agora)
            </label>
            {partial && (
              <div className="mt-2 space-y-2">
                {orderItems.length === 0 && <p className="text-xs text-slate-500">Carregando itens...</p>}
                {orderItems.map((item) => {
                  const ordered = parseDecimal(item.quantity) || 0;
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{item.product_name} <span className="text-slate-400">({ordered} {item.unit || 'un'})</span></span>
                      <Input className="h-9 w-20 shrink-0 rounded-xl" type="number" min="0" max={ordered} step="any" value={deliveredQty[item.id] ?? ''} onChange={(event) => setDeliveredQty((prev) => ({ ...prev, [item.id]: event.target.value }))} placeholder="Entregue" />
                    </div>
                  );
                })}
                <p className="text-xs text-amber-700">{allDelivered ? 'Tudo entregue — o pedido sera fechado.' : 'Parcial — o pedido continua aberto com o restante.'}</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Recebimento</Label>
            <div className="grid grid-cols-3 gap-2">
              {[['pago', 'Recebido total'], ['parcial', 'Parcial'], ['pendente', 'Nao recebido']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentStatus(value)}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${paymentStatus === value ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {paymentStatus === 'parcial' && (
            <div className="space-y-1">
              <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Valor recebido agora (R$)</Label>
              <Input className="h-11 rounded-2xl" type="number" step="0.01" min="0" max={total} value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} />
              <p className="text-xs text-amber-700">Fica em aberto: {formatCurrency(remaining)}</p>
            </div>
          )}

          {paymentStatus !== 'pendente' && (
            <div className="space-y-1">
              <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>{paymentMethods.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Entra no financeiro agora</span>
              <span className="font-black text-emerald-700">{formatCurrency(effectiveAmount)}</span>
            </div>
            {remaining > 0 && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-slate-500">Continua a receber</span>
                <span className="font-black text-amber-700">{formatCurrency(remaining)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="button" className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleConfirm} disabled={saving}>
              {saving ? 'Registrando...' : 'Confirmar entrega'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
