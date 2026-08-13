import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, RotateCcw, FileText, ChevronDown, ChevronRight, Star } from 'lucide-react';
import moment from 'moment';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';
import { listQuoteRevisions, parseRevisionSnapshot } from '@/lib/quoteVersioning';

const kindLabel = {
  revision: { label: 'Revisão', cls: 'bg-slate-100 text-slate-700 border border-slate-200' },
  approved: { label: 'Aprovada', cls: 'bg-green-100 text-green-700 border border-green-200' },
  restore_point: { label: 'Restauração', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
};

/**
 * Histórico de revisões do orçamento. Cada versão pode ser vista (itens),
 * exportada em PDF (o snapshot daquela época) ou restaurada como versão atual.
 */
export default function QuoteRevisionsPanel({ quote, onRestore, onPdf, restoringId }) {
  const [expandedId, setExpandedId] = useState(null);
  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['quoteRevisions', quote?.id],
    queryFn: () => listQuoteRevisions(quote.id),
    enabled: !!quote?.id,
  });

  if (!quote?.id) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <History className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-black text-slate-800">Histórico de revisões</p>
        <Badge variant="outline" className="ml-auto">{revisions.length}</Badge>
      </div>

      {isLoading && <p className="text-xs text-slate-500">Carregando revisões...</p>}
      {!isLoading && revisions.length === 0 && (
        <p className="text-xs text-slate-500">Ainda não há revisões. Ao editar um orçamento já enviado ou aprovado, a versão anterior fica guardada aqui.</p>
      )}

      <div className="space-y-2">
        {revisions.map((rev) => {
          const meta = kindLabel[rev.kind] || kindLabel.revision;
          const snapshot = expandedId === rev.id ? parseRevisionSnapshot(rev) : null;
          const items = snapshot?.items || [];
          return (
            <div key={rev.id} className="rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex flex-wrap items-center gap-2 p-2.5">
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === rev.id ? null : rev.id))}
                  className="flex items-center gap-1 text-xs font-black text-slate-700"
                  title="Ver itens desta revisão"
                >
                  {expandedId === rev.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Rev. {rev.revision_number}
                </button>
                <Badge className={meta.cls}>{meta.label}</Badge>
                {rev.is_approved && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
                <span className="text-xs text-slate-500">{rev.created_date ? moment(rev.created_date).format('DD/MM/YY HH:mm') : ''}</span>
                {rev.created_by && <span className="text-xs text-slate-400">· {rev.created_by}</span>}
                <span className="ml-auto text-sm font-black text-slate-800">{formatCurrency(parseDecimal(rev.final_price))}</span>
              </div>
              {rev.note && <p className="px-2.5 pb-1.5 text-xs text-slate-500">{rev.note}</p>}
              {expandedId === rev.id && (
                <div className="border-t border-slate-200 px-2.5 py-2">
                  {items.length === 0 && <p className="text-xs text-slate-400">Sem itens no snapshot.</p>}
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 py-0.5 text-xs">
                      <span className="min-w-0 flex-1 truncate text-slate-600">{item.product_name || item.description || 'Item'} <span className="text-slate-400">×{parseDecimal(item.quantity) || 1}</span></span>
                      <span className="shrink-0 font-semibold text-slate-700">{formatCurrency(parseDecimal(item.total))}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className="h-8 rounded-xl text-xs" onClick={() => onPdf?.(rev)}>
                      <FileText className="mr-1 h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 rounded-xl text-xs" onClick={() => onRestore?.(rev)} disabled={restoringId === rev.id}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> {restoringId === rev.id ? 'Restaurando...' : 'Restaurar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
