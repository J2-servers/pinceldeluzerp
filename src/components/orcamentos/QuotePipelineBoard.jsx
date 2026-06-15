import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Edit, Eye, FileText, Send, ShoppingCart } from 'lucide-react';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const columns = [
  ['rascunho', 'Rascunhos'], ['enviado', 'Enviados'], ['aprovado', 'Aprovados'], ['reprovado', 'Reprovados'], ['expirado', 'Expirados']
];

export default function QuotePipelineBoard({ quotes, onView, onEdit, onStatusChange, onConvert }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {columns.map(([status, label]) => {
        const items = quotes.filter((quote) => quote.status === status);
        const total = items.reduce((sum, quote) => sum + Number(quote.final_price || 0), 0);
        return (
          <div key={status} className="rounded-[24px] p-3 min-h-[320px]" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-black" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{items.length} · {money(total)}</p>
              </div>
              <StatusBadge status={status} />
            </div>
            <div className="space-y-3">
              {items.length === 0 && <div className="text-center text-xs rounded-2xl p-6" style={{ color: 'var(--text-tertiary)', border: '1px dashed var(--border-inner)' }}>Sem orçamentos</div>}
              {items.map((quote) => (
                <div key={quote.id} className="rounded-2xl p-3 space-y-2" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{quote.client_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{quote.quote_number} · {quote.product_name}</p>
                    </div>
                    <p className="text-sm font-black shrink-0" style={{ color: 'var(--green)' }}>{money(quote.final_price)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onView(quote)}><Eye className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => onEdit(quote)}><Edit className="w-3 h-3" /></Button>
                    {status === 'rascunho' && <Button size="sm" variant="ghost" onClick={() => onStatusChange(quote, 'enviado')}><Send className="w-3 h-3" /></Button>}
                    {status === 'enviado' && <Button size="sm" variant="ghost" onClick={() => onStatusChange(quote, 'aprovado')}><CheckCircle className="w-3 h-3" /></Button>}
                    {status === 'aprovado' && <Button size="sm" variant="ghost" onClick={() => onConvert(quote)}><ShoppingCart className="w-3 h-3" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => onView(quote)}><FileText className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}