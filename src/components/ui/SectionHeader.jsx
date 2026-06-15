import React from 'react';
import { cn } from '@/lib/utils';

/**
 * SectionHeader — título de seção padronizado com linha accent
 * Props: title, subtitle, accent (cor da linha), children (botões/ações à direita)
 */
export default function SectionHeader({ title, subtitle, accent = 'pink', children, className }) {
  const accentVar = {
    pink:   '--red',
    orange: '--orange',
    blue:   '--accent',
    green:  '--green',
    purple: '--purple',
    cyan:   '--teal',
  }[accent] || '--accent';

  return (
    <div className={cn('flex items-center justify-between mb-4 gap-3 flex-wrap', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="h-0.5 w-8 rounded-full shrink-0"
            style={{ background: `linear-gradient(to right, var(${accentVar}), transparent)` }}
          />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        </div>
        {subtitle && (
          <p className="text-xs mt-0.5 ml-11" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}