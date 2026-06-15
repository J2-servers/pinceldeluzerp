import React from 'react';

export default function MetricCard({ icon: Icon, label, value, hint, color = '#4f79f5' }) {
  return (
    <div className="rounded-[22px] bg-white/70 border border-white p-4 shadow-sm min-w-0">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color }} />}
        <p className="text-[11px] uppercase tracking-widest text-slate-500 font-black truncate">{label}</p>
      </div>
      <p className="text-xl font-black truncate" style={{ color }}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1 truncate">{hint}</p>}
    </div>
  );
}