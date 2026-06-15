import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import moment from 'moment';

export default function InventoryMovementsList({ movements }) {
  if (!movements.length) {
    return (
      <div className="rounded-[24px] bg-white/70 border border-white p-10 text-center text-slate-500">
        Nenhuma movimentacao registrada.
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-white/65 border border-white shadow-sm overflow-hidden">
      <div className="w-full overflow-hidden">
        <table className="erp-responsive-table w-full table-fixed text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Data', 'Item', 'Tipo', 'Quantidade', 'Motivo'].map((heading) => (
                <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest text-slate-500 font-black">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => {
              const isEntry = movement.type === 'entrada';
              return (
                <tr key={movement.id} className="border-b border-slate-100">
                  <td data-label="Data" className="p-3 text-slate-600">
                    {movement.date ? moment(movement.date).format('DD/MM/YY') : '-'}
                  </td>
                  <td data-label="Item" className="p-3 font-bold text-slate-800 break-words">
                    {movement.product_name || '-'}
                  </td>
                  <td data-label="Tipo" className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                        isEntry ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {isEntry ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {movement.type}
                    </span>
                  </td>
                  <td data-label="Quantidade" className="p-3 font-black text-slate-800">
                    {movement.quantity}
                  </td>
                  <td data-label="Motivo" className="p-3 text-slate-500 break-words">
                    {movement.reason || '-'}
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
