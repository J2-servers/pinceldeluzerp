import React from 'react';
import { CheckCircle, PackageCheck, Truck } from 'lucide-react';
import moment from 'moment';

import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;

export default function ProductionList({ orders, onStatus, onDeliver }) {
  if (!orders.length) {
    return (
      <div className="rounded-[24px] bg-white/70 border border-white p-10 text-center text-slate-500">
        Nenhum pedido na producao.
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-white/65 border border-white shadow-sm overflow-hidden">
      <div className="w-full overflow-hidden">
        <table className="erp-responsive-table w-full table-fixed text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Pedido', 'Cliente', 'Itens', 'Valor', 'Entrega', 'Status', 'Acoes'].map((heading) => (
                <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest text-slate-500 font-black">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const late =
                order.delivery_date &&
                order.delivery_date < moment().format('YYYY-MM-DD') &&
                !['entregue', 'cancelado'].includes(order.status);

              return (
                <tr key={order.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                  <td data-label="Pedido" className="p-3 font-black text-blue-600 break-words">
                    {order.order_number}
                  </td>
                  <td data-label="Cliente" className="p-3 font-bold text-slate-800 break-words">
                    {order.client_name}
                  </td>
                  <td data-label="Itens" className="p-3 text-slate-600 break-words">
                    {order.items}
                  </td>
                  <td data-label="Valor" className="p-3 font-black text-green-600">
                    {money(order.total)}
                  </td>
                  <td data-label="Entrega" className="p-3">
                    <span className={late ? 'font-black text-red-600' : 'font-bold text-slate-600'}>
                      {order.delivery_date ? moment(order.delivery_date).format('DD/MM/YY') : '-'}
                    </span>
                  </td>
                  <td data-label="Status" className="p-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td data-label="Acoes" className="p-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {order.status === 'novo' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onStatus(order, 'em_producao')}
                          aria-label={`Iniciar producao do pedido ${order.order_number}`}
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {order.status === 'em_producao' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onStatus(order, 'pronto')}
                          aria-label={`Marcar pedido ${order.order_number} como pronto`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {order.status === 'pronto' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDeliver(order)}
                          aria-label={`Entregar pedido ${order.order_number}`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
