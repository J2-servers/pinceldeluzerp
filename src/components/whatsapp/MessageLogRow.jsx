import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmtDT } from './helpers';

export default function MessageLogRow({ log, onDetail }) {
  const sent = log.status === 'sent';
  const prepared = log.status === 'prepared';
  return (
    <div className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md">
      <div className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${sent ? 'bg-emerald-400' : prepared ? 'bg-blue-400' : 'bg-rose-400'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="font-bold text-slate-900 text-sm">{log.client_name || 'Contato sem nome'}</p>
          <Badge className={`text-[11px] ${sent ? 'bg-emerald-100 text-emerald-700' : prepared ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
            {sent ? 'enviada' : prepared ? 'preparada' : 'falhou'}
          </Badge>
          <Badge variant="outline" className="text-[11px]">{log.channel || 'canal indefinido'}</Badge>
          {log.template && <Badge variant="outline" className="text-[11px]">{log.template}</Badge>}
        </div>
        <p className="text-xs text-slate-500 mb-2">{log.phone || 'sem telefone'} · {fmtDT(log.created_date)} · {log.source || 'sistema'}</p>
        <p className="line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{log.message || 'sem conteúdo'}</p>
        {log.reason && <p className="mt-1.5 text-xs text-rose-600">⚠ {log.reason}</p>}
      </div>
      <Button size="sm" variant="ghost" onClick={() => onDetail(log)} className="opacity-0 group-hover:opacity-100 transition flex-shrink-0">
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}
