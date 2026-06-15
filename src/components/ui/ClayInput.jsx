import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

export function ClayInput({ label, icon: Icon, className, containerClassName, id, ...rest }) {
  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--text-tertiary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:'#8a9ab0' }} />
        )}
        <input
          id={id}
          className={cn(
            'w-full rounded-[14px] transition-all duration-200 outline-none',
            'px-4 py-3 text-[0.9rem] min-h-[44px]',
            Icon && 'pl-10',
            className
          )}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            boxShadow: 'inset 2px 2px 6px rgba(174,190,220,0.2), inset -1px -1px 4px rgba(255,255,255,1)',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(79,121,245,0.65)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,121,245,0.12), inset 1px 1px 4px rgba(174,190,220,0.15)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(200,215,235,0.9)';
            e.currentTarget.style.boxShadow = 'inset 2px 2px 6px rgba(174,190,220,0.2), inset -1px -1px 4px rgba(255,255,255,1)';
          }}
          {...rest}
        />
      </div>
    </div>
  );
}

export function ClaySearch({ className, containerClassName, placeholder, ...rest }) {
  return (
    <ClayInput
      icon={Search}
      containerClassName={containerClassName}
      className={className}
      placeholder={placeholder || 'Buscar...'}
      {...rest}
    />
  );
}

export default ClayInput;