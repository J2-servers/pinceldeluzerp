import React from 'react';
import { AlertTriangle, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/commercialLinePricing';

function itemMargin(item) {
  const total = Number(item.total || 0);
  if (total <= 0) return 0;
  return ((total - Number(item.total_cost || 0)) / total) * 100;
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

export default function LineItemsSummaryList({ items, onEdit, onRemove }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Nenhum item na lista. Adicione produto, medidas e operacao para liberar o fechamento.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const profit = Number(item.total || 0) - Number(item.total_cost || 0);
        const margin = itemMargin(item);
        const belowCost = profit < 0;
        const lowMargin = !belowCost && margin < 20;
        const statusClass = belowCost ? 'border-red-200 bg-red-50 text-red-700' : lowMargin ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
        const cardTones = [
          'border-sky-200 bg-sky-50',
          'border-emerald-200 bg-emerald-50',
          'border-violet-200 bg-violet-50',
          'border-amber-200 bg-amber-50',
        ];
        const cardTone = belowCost ? 'border-red-200 bg-red-50' : cardTones[index % cardTones.length];

        return (
          <article key={`${item.product_id || item.product_name}-${index}`} className={`rounded-[22px] border p-3 shadow-sm ${cardTone}`}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[34px_1.2fr_1.5fr_130px_104px] lg:items-center">
              <span className={`grid h-8 w-8 place-items-center rounded-full border ${statusClass}`}>
                {belowCost || lowMargin ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{index + 1}. {item.product_name || `Item ${index + 1}`}</p>
                <p className="truncate text-xs text-slate-500">
                  {item.quantity} {item.unit || 'un'}{item.width_mm && item.height_mm ? ` - ${item.width_mm} x ${item.height_mm} mm` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Detail label="Venda" value={money(item.total)} />
                <Detail label="Custo" value={money(item.total_cost)} />
                <Detail label="Margem" value={`${margin.toFixed(1)}%`} />
                <Detail label="Resultado" value={money(profit)} />
              </div>

              <p className="line-clamp-2 text-xs leading-snug text-slate-500">
                {item.art_description || item.item_notes || 'Sem observacao adicional.'}
              </p>

              <div className="flex items-center gap-1.5 lg:justify-end">
                <Button type="button" className="bg-blue-600 text-white shadow-sm hover:bg-blue-700" size="icon" aria-label="Editar linha" onClick={() => onEdit(index)}><Pencil className="h-4 w-4" /></Button>
                <Button type="button" className="bg-rose-600 text-white shadow-sm hover:bg-rose-700" size="icon" aria-label="Remover linha" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
