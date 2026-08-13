import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Estado padrao de carregamento/erro para telas com useQuery.
 * Sem isLoading/isError, uma falha de rede vira silenciosamente "R$ 0,00"
 * ou "0 itens" — indistinguivel de "sem dados de verdade".
 */
export default function QueryState({ isLoading, isError, error, onRetry, children, loadingLabel = 'Carregando...', minimal = false }) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: minimal ? '24px 0' : '64px 0', gap: '10px' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{loadingLabel}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '10px', textAlign: 'center' }}>
        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--red)' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '360px' }}>
          {'Não foi possível carregar os dados' + (error?.message ? `: ${error.message}` : '.')}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: 'var(--r-md)',
              background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)',
              color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700,
              border: 'none', cursor: 'pointer',
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar de novo
          </button>
        )}
      </div>
    );
  }

  return children;
}
