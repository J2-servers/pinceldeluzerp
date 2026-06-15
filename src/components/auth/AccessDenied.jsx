import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

/** Mostrado quando o usuário não tem permissão de leitura no módulo. */
export default function AccessDenied({ pageKey, required }) {
  return (
    <div className="page-container flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="card p-10 max-w-md text-center" style={{ borderRadius: 'var(--r-2xl)' }}>
        <div className="w-16 h-16 mx-auto rounded-[20px] flex items-center justify-center mb-5"
          style={{ background: 'var(--red-muted)', boxShadow: 'var(--shadow-flat)' }}>
          <ShieldOff className="w-8 h-8" style={{ color: 'var(--red)' }} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Acesso restrito</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Você não tem permissão para acessar <strong>{pageKey}</strong>.
          Fale com um administrador se precisar deste módulo.
        </p>
        {required && (
          <p className="text-[11px] mt-2 font-mono" style={{ color: 'var(--text-tertiary)' }}>
            Permissão necessária: {required}
          </p>
        )}
        <Link to={createPageUrl('Dashboard')}
          className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-[14px] text-sm font-semibold"
          style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)', color: 'var(--accent)' }}>
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
