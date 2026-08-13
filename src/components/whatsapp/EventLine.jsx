export default function EventLine({ item }) {
  const colors = { success: 'bg-emerald-400', error: 'bg-rose-400', warn: 'bg-amber-400' };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${colors[item.type] || 'bg-cyan-400'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
        {item.detail && <p className="mt-0.5 text-xs text-slate-400 break-words">{item.detail}</p>}
      </div>
      <span className="text-[11px] text-slate-500 flex-shrink-0">{item.time}</span>
    </div>
  );
}
