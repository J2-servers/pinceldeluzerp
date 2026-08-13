import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackageCheck, Truck, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import moment from 'moment';
import { toast } from '@/components/ui/app-toast';
import { erp } from '@/api/erpClient';
import { createAuditLog } from '@/lib/erpCoreSync';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';
import { parsePurchaseItems, receivePurchaseOrder } from '@/lib/purchasing';

const statusMap = {
  rascunho: 'bg-slate-100 text-slate-700 border border-slate-200',
  enviado: 'bg-blue-100 text-blue-700 border border-blue-200',
  recebido: 'bg-green-100 text-green-700 border border-green-200',
};

export default function PurchaseOrdersDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => erp.entities.PurchaseOrder.list('-created_date', 100),
    enabled: open,
  });

  const receive = useMutation({
    mutationFn: async (po) => {
      const user = erp.auth.getCachedUser?.();
      const result = await receivePurchaseOrder(po, { userName: user?.name || user?.email || '' });
      await createAuditLog({ module: 'inventory', entity_name: 'PurchaseOrder', entity_id: po.id, action: 'purchase_received', document_number: po.supplier_name || po.id, metadata: { items: result.received, total: po.total } });
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      setBusyId(null);
      toast.success(`Recebido: ${result.received} ${result.received === 1 ? 'item deu' : 'itens deram'} entrada no estoque`);
    },
    onError: (error) => { setBusyId(null); toast.error(error.message || 'Não foi possível receber o pedido'); },
  });

  const remove = useMutation({
    mutationFn: async (po) => {
      await createAuditLog({ module: 'inventory', entity_name: 'PurchaseOrder', entity_id: po.id, action: 'purchase_delete', document_number: po.supplier_name || po.id, metadata: { total: po.total } });
      return erp.entities.PurchaseOrder.delete(po.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Pedido excluído');
    },
    onError: (error) => toast.error(error.message || 'Não foi possível excluir'),
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-2xl max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-600" /> Pedidos de compra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading && <p className="text-xs text-slate-500">Carregando pedidos...</p>}
          {!isLoading && orders.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">Nenhum pedido de compra. Gere um a partir do painel de reposição.</p>
          )}

          {orders.map((po) => {
            const items = parsePurchaseItems(po);
            const received = po.status === 'recebido';
            return (
              <div key={po.id} className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <button type="button" onClick={() => setExpandedId((prev) => (prev === po.id ? null : po.id))} className="flex items-center gap-1 text-sm font-black text-slate-800">
                    {expandedId === po.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {po.supplier_name || 'Sem fornecedor'}
                  </button>
                  <Badge className={statusMap[po.status] || statusMap.rascunho}>{po.status || 'rascunho'}</Badge>
                  <span className="text-xs text-slate-400">{po.order_date ? moment(po.order_date).format('DD/MM/YY') : ''} · {items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                  <span className="ml-auto text-sm font-black text-slate-900">{formatCurrency(parseDecimal(po.total))}</span>
                </div>

                {expandedId === po.id && (
                  <div className="border-t border-slate-200 px-3 py-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 py-0.5 text-xs">
                        <span className="min-w-0 flex-1 truncate text-slate-600">{item.product_name} <span className="text-slate-400">+{parseDecimal(item.quantity)} {item.unit || 'un'}</span></span>
                        <span className="shrink-0 font-semibold text-slate-700">{formatCurrency(parseDecimal(item.total))}</span>
                      </div>
                    ))}
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" className="h-8 rounded-xl text-xs text-red-600" onClick={() => remove.mutate(po)} disabled={received}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                      </Button>
                      <Button type="button" size="sm" className="h-8 rounded-xl bg-green-600 text-xs text-white hover:bg-green-700" onClick={() => { setBusyId(po.id); receive.mutate(po); }} disabled={received || busyId === po.id}>
                        <PackageCheck className="mr-1 h-3.5 w-3.5" /> {received ? 'Recebido' : busyId === po.id ? 'Recebendo...' : 'Receber no estoque'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
