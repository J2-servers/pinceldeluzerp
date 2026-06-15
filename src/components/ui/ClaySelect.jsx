import React from 'react';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function ClaySelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Selecionar...',
  className,
  containerClassName,
  accentColor = 'blue',
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--text-tertiary)' }}>
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn('rounded-[14px] min-h-[44px] px-4 text-[0.9rem] font-medium transition-all duration-200', className)}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-flat)',
          }}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}