import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CalendarDays, MessageCircle, Phone, Star, Target } from 'lucide-react';
import moment from 'moment';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function PanelBlock({ icon: Icon, title, children }) {
  return (
    <div className="rounded-[24px] p-4 bg-white/65 border border-white shadow-sm">
      <div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-blue-600" /><h3 className="font-black text-slate-800">{title}</h3></div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function QuoteDailyPanel({ expiring, highValue, followUps, withoutPhone, onWhatsApp, onView }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <PanelBlock icon={CalendarDays} title="Vencendo agora">
        {expiring.length === 0 && <p className="text-sm text-slate-500">Nada vencendo nos próximos dias.</p>}
        {expiring.slice(0, 5).map((quote) => <button key={quote.id} onClick={() => onView(quote)} className="w-full text-left rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="font-bold text-slate-800 truncate">{quote.client_name}</p><p className="text-xs text-orange-600">Validade: {quote.valid_days || 7} dias · {money(quote.final_price)}</p></button>)}
      </PanelBlock>

      <PanelBlock icon={Star} title="Altíssimo valor">
        {highValue.length === 0 && <p className="text-sm text-slate-500">Sem orçamento de alto valor.</p>}
        {highValue.slice(0, 5).map((quote) => <button key={quote.id} onClick={() => onView(quote)} className="w-full text-left rounded-2xl bg-green-50 border border-green-200 p-3"><p className="font-bold text-slate-800 truncate">{quote.client_name}</p><p className="text-xs text-green-700">{money(quote.final_price)} · {quote.quote_number}</p></button>)}
      </PanelBlock>

      <PanelBlock icon={Target} title="Follow-up comercial">
        {followUps.length === 0 && <p className="text-sm text-slate-500">Nenhum envio pendente de retorno.</p>}
        {followUps.slice(0, 5).map((quote) => <div key={quote.id} className="rounded-2xl bg-blue-50 border border-blue-200 p-3"><p className="font-bold text-slate-800 truncate">{quote.client_name}</p><p className="text-xs text-blue-700">Enviado em {quote.created_date ? moment(quote.created_date).format('DD/MM') : '—'}</p><Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => onWhatsApp(quote)}><MessageCircle className="w-3 h-3" /> Cobrar retorno</Button></div>)}
      </PanelBlock>

      <PanelBlock icon={AlertTriangle} title="Cadastro incompleto">
        {withoutPhone.length === 0 && <p className="text-sm text-slate-500">Todos com contato principal.</p>}
        {withoutPhone.slice(0, 5).map((quote) => <button key={quote.id} onClick={() => onView(quote)} className="w-full text-left rounded-2xl bg-red-50 border border-red-200 p-3"><p className="font-bold text-slate-800 truncate">{quote.client_name}</p><p className="text-xs text-red-700 flex items-center gap-1"><Phone className="w-3 h-3" /> Falta telefone/WhatsApp</p></button>)}
      </PanelBlock>
    </div>
  );
}