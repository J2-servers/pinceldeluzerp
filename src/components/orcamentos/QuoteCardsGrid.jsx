import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Download, Edit, Eye, Mail, MessageCircle, ShoppingCart } from 'lucide-react';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuoteCardsGrid({ quotes, onView, onEdit, onConvert, onPdf, onEmail, onWhatsApp }) {
  if (!quotes.length) return <div className="rounded-[24px] bg-white/70 border border-white p-10 text-center text-slate-500">Nenhum orçamento encontrado.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {quotes.map((quote) => (
        <div key={quote.id} className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm hover:shadow-lg transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black tracking-widest text-blue-600">{quote.quote_number || 'ORÇAMENTO'}</p>
              <h3 className="text-lg font-black text-slate-800 truncate">{quote.client_name}</h3>
              <p className="text-sm text-slate-500 truncate">{quote.product_name}</p>
            </div>
            <StatusBadge status={quote.status} />
          </div>
          <div className="grid grid-cols-2 gap-2 my-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Valor</p><p className="font-black text-green-600">{money(quote.final_price)}</p></div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Itens</p><p className="font-black text-slate-800">{quote.line_items_count || 1}</p></div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={() => onView(quote)}><Eye className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onEdit(quote)}><Edit className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onPdf(quote)}><Download className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onEmail(quote)}><Mail className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onWhatsApp(quote)}><MessageCircle className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onConvert(quote)}><ShoppingCart className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
