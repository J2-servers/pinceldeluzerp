import React from 'react';
import { cn } from '@/lib/utils';

export default function FilterBar({ children, className }) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4', className)}
      style={{
        background: 'var(--bg)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {children}
    </div>
  );
}