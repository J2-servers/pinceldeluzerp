import React from 'react';

export default function ModuleHero({ eyebrow, title, subtitle, icon: Icon, actions, children, tone = '#4f79f5' }) {
  return (
    <div className="rounded-[30px] p-5 md:p-7 relative overflow-hidden" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
      <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full blur-3xl opacity-35" style={{ background: `radial-gradient(circle, ${tone} 0%, transparent 70%)` }} />
      <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-3" style={{ color: tone, background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
            {Icon && <Icon className="w-3.5 h-3.5" />}{eyebrow}
          </div>
          <h2 className="text-2xl md:text-4xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          {subtitle && <p className="text-sm md:text-base mt-3" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
      {children && <div className="relative z-10 mt-6">{children}</div>}
    </div>
  );
}