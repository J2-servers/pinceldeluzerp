import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, ListChecks } from 'lucide-react';
import { money } from '@/lib/commercialLinePricing';

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function MiniRow({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-950',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  };
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className={`text-sm font-black ${tones[tone]}`}>{value}</span>
    </div>
  );
}

function SegmentButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition ${active ? 'bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-white'}`}
    >
      {children}
    </button>
  );
}

function PdfPreview({ totals, items, mode }) {
  const documentName = mode === 'sale' ? 'Pedido de venda' : 'Orcamento';
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-950 p-4 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">Previa do PDF</p>
        <h3 className="mt-1 text-lg font-black">{documentName}</h3>
        <p className="text-xs text-slate-300">Layout limpo, itemizado e pronto para cliente.</p>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Itens</p>
          <div className="mt-2 space-y-2">
            {items.slice(0, 4).map((item, index) => (
              <div key={`${item.product_name}-${index}`} className="flex justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-bold text-slate-800">{index + 1}. {item.product_name}</span>
                <span className="shrink-0 font-black text-slate-950">{money(item.total)}</span>
              </div>
            ))}
            {!items.length && <p className="text-xs text-slate-500">Adicione itens para montar a previa.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Total final</p>
          <p className="mt-1 text-2xl font-black text-emerald-700">{money(totals.totalFinal)}</p>
        </div>
      </div>
    </div>
  );
}

function ItemsMiniList({ items }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Itens neste documento</p>
      <div className="mt-2 space-y-2">
        {items.slice(0, 6).map((item, index) => (
          <div key={`${item.product_name}-${index}`} className="flex items-start justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="truncate font-black text-slate-900">{index + 1}. {item.product_name}</p>
              <p className="truncate text-slate-500">{item.quantity} {item.unit || 'un'}{item.width_mm && item.height_mm ? ` - ${item.width_mm}x${item.height_mm}mm` : ''}</p>
            </div>
            <span className="shrink-0 font-black text-slate-950">{money(item.total)}</span>
          </div>
        ))}
        {items.length > 6 && <p className="text-xs font-bold text-slate-500">+ {items.length - 6} itens adicionais no PDF</p>}
      </div>
    </div>
  );
}

export default function CommercialTotalsPanel({ totals, itemCount, alerts = [], mode, items = [] }) {
  const [view, setView] = useState('summary');
  const totalFinal = Number(totals.totalFinal || 0);
  const totalCost = Number(totals.totalCost || 0);
  const profit = totalFinal - totalCost;
  const margin = totalFinal > 0 ? (profit / totalFinal) * 100 : 0;
  const bad = profit < 0;
  const warning = !bad && margin < 20 && itemCount > 0;
  const documentName = mode === 'sale' ? 'venda' : 'orcamento';

  return (
    <aside className="rounded-[26px] border border-indigo-200 bg-gradient-to-b from-white to-indigo-50 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 rounded-2xl bg-indigo-100 p-1">
        <div className="flex gap-1">
          <SegmentButton active={view === 'summary'} onClick={() => setView('summary')}><ListChecks className="h-4 w-4" /> Resumo</SegmentButton>
          <SegmentButton active={view === 'pdf'} onClick={() => setView('pdf')}><FileText className="h-4 w-4" /> PDF</SegmentButton>
        </div>
      </div>

      {view === 'pdf' ? (
        <PdfPreview totals={totals} items={items} mode={mode} />
      ) : (
        <div>
          <div className="mb-3 px-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Fechamento</p>
            <h3 className="text-base font-black text-slate-950">Resumo do {documentName}</h3>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2">
            <MiniRow label="Linhas" value={itemCount} />
            <MiniRow label="Cliente paga" value={money(totalFinal)} tone="green" />
            <MiniRow label="Custo interno" value={money(totalCost)} />
            <MiniRow label="Resultado" value={money(profit)} tone={bad ? 'red' : warning ? 'amber' : 'green'} />
            <MiniRow label="Margem" value={pct(margin)} tone={bad ? 'red' : warning ? 'amber' : 'green'} />
          </div>

          <ItemsMiniList items={items} />

          <div className={`mt-3 rounded-2xl border p-3 text-sm ${bad ? 'border-red-200 bg-red-50 text-red-800' : warning ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {bad || warning ? <AlertTriangle className="mr-2 inline h-4 w-4" /> : <CheckCircle2 className="mr-2 inline h-4 w-4" />}
            {bad ? 'Abaixo do custo. Revise precificacao antes de salvar.' : warning ? 'Margem baixa. Confira tempos e tabelas.' : itemCount ? 'Pronto para salvar.' : 'Adicione pelo menos um item.'}
          </div>

          {!!alerts.length && (
            <div className="mt-3 space-y-2">
              {alerts.slice(0, 4).map((alert) => (
                <div key={alert} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                  {alert}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
