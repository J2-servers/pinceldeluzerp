import React from 'react';
import { cn } from '@/lib/utils';

const variants = {
  success: { bg: 'rgba(34,197,94,0.12)',  text: '#16a34a', border: 'rgba(34,197,94,0.35)',  dot: '#22c55e' },
  warning: { bg: 'rgba(234,179,8,0.12)',  text: '#ca8a04', border: 'rgba(234,179,8,0.35)',  dot: '#eab308' },
  danger:  { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626', border: 'rgba(239,68,68,0.35)',  dot: '#ef4444' },
  info:    { bg: 'rgba(59,130,246,0.12)', text: '#2563eb', border: 'rgba(59,130,246,0.35)', dot: '#3b82f6' },
  purple:  { bg: 'rgba(168,85,247,0.12)', text: '#7c3aed', border: 'rgba(168,85,247,0.35)', dot: '#a855f7' },
  orange:  { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.35)', dot: '#f97316' },
  pink:    { bg: 'rgba(236,72,153,0.12)', text: '#db2777', border: 'rgba(236,72,153,0.35)', dot: '#ec4899' },
  blue:    { bg: 'rgba(59,130,246,0.12)', text: '#2563eb', border: 'rgba(59,130,246,0.35)', dot: '#3b82f6' },
  cyan:    { bg: 'rgba(6,182,212,0.12)',  text: '#0891b2', border: 'rgba(6,182,212,0.35)',  dot: '#06b6d4' },
  gray:    { bg: 'rgba(100,116,139,0.1)', text: '#64748b', border: 'rgba(100,116,139,0.3)', dot: '#94a3b8' },
};

export default function ClayBadge({ children, variant = 'gray', dot = false, className }) {
  const v = variants[variant] || variants.gray;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', className)}
      style={{
        background: v.bg,
        color: v.text,
        border: `1.5px solid ${v.border}`,
        boxShadow: `2px 2px 8px ${v.bg}`,
      }}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: v.dot }} />
      )}
      {children}
    </span>
  );
}