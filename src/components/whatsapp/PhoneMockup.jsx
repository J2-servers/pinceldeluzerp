import { MessageCircle } from 'lucide-react';
import { fmtTime } from './helpers';

export default function PhoneMockup({ message, clientName }) {
  const text = message || 'Sua mensagem aparecerá aqui…';
  const now = fmtTime(new Date().toISOString());
  return (
    <div className="mx-auto flex w-64 flex-col rounded-[2.5rem] border-4 border-slate-700 bg-slate-800 shadow-2xl">
      <div className="flex flex-col rounded-t-[2rem] bg-emerald-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 grid place-items-center text-white font-bold text-sm">
            {(clientName || 'C')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{clientName || 'Cliente'}</p>
            <p className="text-[10px] text-emerald-200">online</p>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#0d1117] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjAuNSIgZmlsbD0iIzIyMjgzYSIvPjwvc3ZnPg==')] px-3 py-4 min-h-[160px]">
        <div className="ml-auto max-w-[85%] rounded-tl-2xl rounded-bl-2xl rounded-tr-sm rounded-br-2xl bg-emerald-700 p-3 shadow">
          <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{text.slice(0, 320)}{text.length > 320 ? '…' : ''}</p>
          <p className="mt-1 text-right text-[10px] text-emerald-200">{now} ✓✓</p>
        </div>
      </div>
      <div className="rounded-b-[2rem] bg-slate-900 px-3 py-2">
        <div className="flex items-center gap-2 rounded-full bg-slate-700 px-3 py-1.5">
          <p className="flex-1 text-xs text-slate-500">Mensagem</p>
          <MessageCircle className="h-4 w-4 text-emerald-500" />
        </div>
      </div>
    </div>
  );
}
