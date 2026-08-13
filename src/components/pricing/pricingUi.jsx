import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Blocos visuais compartilhados da area de precificacao.
// Mantem exatamente o estilo original de src/pages/Precificacao.jsx.

export function Field({ label, children, help }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</Label>
      {children}
      {help && <p className="text-[11px] leading-snug text-slate-500">{help}</p>}
    </div>
  );
}

export function EmptyHint({ children }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">{children}</div>;
}

export function RowCard({ title, subtitle, metrics = [], onEdit, onDelete }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-slate-900 break-words">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-500 break-words">{subtitle}</p>}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-2">
            {onEdit && (
              <Button type="button" variant="outline" size="sm" onClick={onEdit} className="text-blue-600" title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button type="button" variant="outline" size="sm" onClick={onDelete} className="text-red-600" title="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      {!!metrics.length && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-slate-500">{metric.label}</p>
              <p className="text-sm font-black text-slate-900">{metric.value}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function EditingNotice({ label }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900">
      Editando: {label || 'registro'} - ao salvar, o id e os vinculos existentes sao preservados.
    </div>
  );
}

export function CrudSection({ title, description, form, children }) {
  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {form}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
