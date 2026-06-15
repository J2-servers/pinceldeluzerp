import React from 'react';

export default function SmartPanel({ title, icon: Icon, children, action, className = '', tone = '#4f79f5' }) {
  return (
    <div className={`rounded-[24px] p-4 bg-white/70 border border-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: tone }} />}
            <h3 className="font-black text-slate-800 truncate">{title}</h3>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}