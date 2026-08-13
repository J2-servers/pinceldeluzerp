import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';

const reasons = [
  { value: 'defeito', label: 'Defeito de fabricacao' },
  { value: 'medida_errada', label: 'Medida/spec errada' },
  { value: 'troca', label: 'Troca' },
  { value: 'desistencia', label: 'Desistencia do cliente' },
  { value: 'outro', label: 'Outro' },
];

/**
 * Devolucao/troca de itens de uma venda entregue: escolhe itens e quantidades,
 * calcula o reembolso proporcional e devolve ao estoque.
 */
export default function ReturnModal({ order, open, onClose, onConfirm, saving }) {
  const { data: items = [] } = useQuery({
    queryKey: ['salesOrderItems', order?.id],
    queryFn: () => erp.entities.SalesOrderItem.filter({ sales_order_id: order.id }),
    enabled: !!order && open,
  });

  const [returnQty, setReturnQty] = useState({});
  const [reason, setReason] = useState('defeito');
  const [refundMethod, setRefundMethod] = useState('pix');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) { setReturnQty({}); setReason('defeito'); setRefundMethod(order?.payment_method || 'pix'); setNotes(''); }
  }, [open, order]);

  const lines = useMemo(() => items.map((item) => {
    const sold = parseDecimal(item.quantity) || 0;
    const qty = Math.min(parseDecimal(returnQty[item.id]), sold);
    const unit = sold > 0 ? parseDecimal(item.total) / sold : parseDecimal(item.unit_price);
    return { item, sold, qty: qty > 0 ? qty : 0, unit, refund: (qty > 0 ? qty : 0) * unit };
  }), [items, returnQty]);

  const totalRefund = lines.reduce((sum, line) => sum + line.refund, 0);
  const anySelected = lines.some((line) => line.qty > 0);

  const handleConfirm = () => {
    const returnedLines = lines.filter((line) => line.qty > 0).map((line) => ({
      product_id: line.item.product_id,
      product_name: line.item.product_name,
      pricing_mode: line.item.pricing_mode,
      quantity: line.qty,
      width_mm: line.item.width_mm,
      height_mm: line.item.height_mm,
      material_waste_pct: line.item.material_waste_pct,
      unit_price: line.unit,
      refund: line.refund,
    }));
    const refundAmount = refundMethod === 'sem_reembolso' ? 0 : totalRefund;
    onConfirm({ returnedLines, reason, refundAmount, refundMethod, notes });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-purple-600" /> Devolucao / troca
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-sm">
            <p className="font-bold text-slate-800">Pedido {order.order_number} · {order.client_name}</p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lines.length === 0 && <p className="text-sm text-slate-500">Carregando itens do pedido...</p>}
            {lines.map((line) => (
              <div key={line.item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{line.item.product_name}</p>
                  <p className="text-xs text-slate-500">Vendido: {line.sold} {line.item.unit || 'un'} · {formatCurrency(line.unit)}/un</p>
                </div>
                <Input
                  className="h-10 w-24 shrink-0 rounded-xl"
                  type="number"
                  min="0"
                  max={line.sold}
                  step="any"
                  value={returnQty[line.item.id] ?? ''}
                  onChange={(event) => setReturnQty((prev) => ({ ...prev, [line.item.id]: event.target.value }))}
                  placeholder="Devolver"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Motivo</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>{reasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Reembolso via</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="credito_loja">Credito na loja</SelectItem>
                  <SelectItem value="sem_reembolso">Sem reembolso (troca)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea className="min-h-16 rounded-2xl" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observacao (opcional)" />

          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Reembolso ao cliente</span>
              <span className="font-black text-purple-700">{formatCurrency(refundMethod === 'sem_reembolso' ? 0 : totalRefund)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Itens devolvidos voltam ao estoque automaticamente.</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="button" className="rounded-2xl bg-purple-600 text-white hover:bg-purple-700" onClick={handleConfirm} disabled={saving || !anySelected}>
              {saving ? 'Registrando...' : 'Confirmar devolucao'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
