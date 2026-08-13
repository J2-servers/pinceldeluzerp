import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyHint } from '@/components/pricing/pricingUi';
import {
  PRICE_FIELD_LABELS,
  PRICE_LOG_ENTITY_LABELS,
  formatLogValue,
  parseChangedFields,
} from '@/components/pricing/priceChangeLog';

const ACTION_STYLES = {
  create: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  update: 'border-blue-200 bg-blue-50 text-blue-700',
  delete: 'border-red-200 bg-red-50 text-red-700',
};

const ACTION_LABELS = {
  create: 'Criacao',
  update: 'Edicao',
  delete: 'Exclusao',
};

function formatLogDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function ChangeLine({ action, change }) {
  const label = PRICE_FIELD_LABELS[change.field] || change.field;
  let text;
  if (action === 'create') text = formatLogValue(change.new);
  else if (action === 'delete') text = formatLogValue(change.old);
  else text = `${formatLogValue(change.old)} -> ${formatLogValue(change.new)}`;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
      <span className="font-bold">{label}:</span> {text}
    </div>
  );
}

// Lista os ultimos 100 registros do PriceChangeLog com filtro por tabela.
export default function PriceChangeHistorySection() {
  const [entityFilter, setEntityFilter] = useState('all');
  const logsQuery = useQuery({
    queryKey: ['PriceChangeLog'],
    queryFn: () => erp.entities.PriceChangeLog.list('-created_date', 100),
    initialData: [],
  });

  const logs = useMemo(() => (
    entityFilter === 'all'
      ? logsQuery.data
      : logsQuery.data.filter((log) => log.entity_name === entityFilter)
  ), [logsQuery.data, entityFilter]);

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Historico de alteracoes</h2>
            <p className="mt-1 text-sm text-slate-500">Ultimos 100 registros de criacao, edicao e exclusao das tabelas de precificacao: quem mudou, o que mudou e quando.</p>
          </div>
          <div className="w-full md:w-64">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger><SelectValue placeholder="Todas as tabelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tabelas</SelectItem>
                {Object.entries(PRICE_LOG_ENTITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {logs.length ? logs.map((log) => {
          const changes = parseChangedFields(log.changed_fields);
          return (
            <article key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase ${ACTION_STYLES[log.action] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <span className="text-sm font-black text-slate-900">{PRICE_LOG_ENTITY_LABELS[log.entity_name] || log.entity_name}</span>
                {log.record_label && <span className="text-sm text-slate-600 break-words">{log.record_label}</span>}
                <span className="ml-auto text-xs text-slate-500">{formatLogDate(log.created_date)}</span>
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Por {log.user_name || 'Sistema'}</p>
              {!!changes.length && (
                <div className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {changes.map((change) => (
                    <ChangeLine key={change.field} action={log.action} change={change} />
                  ))}
                </div>
              )}
            </article>
          );
        }) : (
          <EmptyHint>Nenhuma alteracao registrada ainda. Criacoes, edicoes e exclusoes das tabelas de precificacao aparecem aqui automaticamente.</EmptyHint>
        )}
      </div>
    </section>
  );
}
