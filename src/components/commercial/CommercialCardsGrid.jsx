import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Edit, Eye } from 'lucide-react';

/**
 * CommercialCardsGrid — shared "cards" view for the Vendas (SalesOrder) and
 * Orcamentos (ProductQuote) pages. View/Edit are always the first two actions
 * (identical on both entities); everything entity-specific (code/title/subtitle
 * fields, the two metric tiles, an optional secondary status badge, and the
 * remaining action buttons) is supplied via `config`.
 *
 * config shape:
 * {
 *   emptyMessage: string,
 *   getCode: (item) => string,
 *   getSubtitle: (item) => string,
 *   metrics: (item) => [{ label: string, value: string|number }, { label: string, value: string|number }],
 *   getSecondaryStatus?: (item) => string,
 *   extraActions: (item) => Array<{ key: string, icon: LucideIcon, onClick: () => void }>,
 * }
 */
export default function CommercialCardsGrid({ items, onView, onEdit, config }) {
  const { emptyMessage, getCode, getSubtitle, metrics, getSecondaryStatus, extraActions } = config;

  if (!items.length) return <div className="rounded-[24px] bg-white/70 border border-white p-10 text-center text-slate-500">{emptyMessage}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => {
        const actions = [
          { key: 'view', icon: Eye, onClick: () => onView(item) },
          { key: 'edit', icon: Edit, onClick: () => onEdit(item) },
          ...extraActions(item),
        ];
        const actionButtons = actions.map(({ key, icon: Icon, onClick }) => (
          <Button key={key} size="sm" variant="ghost" onClick={onClick}><Icon className="w-3.5 h-3.5" /></Button>
        ));

        return (
          <div key={item.id} className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black tracking-widest text-blue-600">{getCode(item)}</p>
                <h3 className="text-lg font-black text-slate-800 truncate">{item.client_name}</h3>
                <p className="text-sm text-slate-500 truncate">{getSubtitle(item)}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 my-4">
              {metrics(item).map((metric, index) => (
                <div key={metric.label} className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">{metric.label}</p>
                  <p className={index === 0 ? 'font-black text-green-600' : 'font-black text-slate-800'}>{metric.value}</p>
                </div>
              ))}
            </div>
            {getSecondaryStatus ? (
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={getSecondaryStatus(item)} />
                <div className="flex flex-wrap gap-1">{actionButtons}</div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">{actionButtons}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
