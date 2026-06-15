import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MiniSparkline({ current = 0, previous = 0, label = '' }) {
  const diff = current - previous;
  const pct = previous > 0 ? ((diff / previous) * 100).toFixed(1) : 0;
  const up = diff > 0;
  const neutral = diff === 0;

  return (
    <div className="flex items-center gap-1 text-xs font-medium" style={{ color: neutral ? 'var(--text-tertiary)' : up ? 'var(--green)' : 'var(--red)' }}>
      {neutral ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{up && '+'}{pct}%</span>
      {label && <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>{label}</span>}
    </div>
  );
}