export default function StatCard({ icon: Icon, label, value, hint, tone = 'text-cyan-300', dark = true }) {
  const bg = dark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white shadow-sm';
  const labelColor = dark ? 'text-slate-400' : 'text-slate-500';
  const hintColor = dark ? 'text-slate-500' : 'text-slate-400';
  const iconBg = dark ? 'bg-white/8 text-slate-200' : 'bg-slate-100 text-slate-600';
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.14em] ${labelColor}`}>{label}</p>
          <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
        </div>
        <div className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint && <p className={`mt-2 text-xs ${hintColor}`}>{hint}</p>}
    </div>
  );
}
