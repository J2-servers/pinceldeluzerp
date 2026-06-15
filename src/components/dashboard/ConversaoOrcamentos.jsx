import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ConversaoOrcamentos({ quotes = [] }) {
  const total = quotes.length;
  const aprovados = quotes.filter((q) => q.status === 'aprovado').length;
  const recusados = quotes.filter((q) => q.status === 'recusado').length;
  const pendentes = quotes.filter((q) => q.status === 'enviado').length;
  const taxa = total > 0 ? (aprovados / total * 100).toFixed(0) : 0;

  const valorAprovado = quotes.filter((q) => q.status === 'aprovado').reduce((a, q) => a + (q.total || 0), 0);
  const valorPendente = quotes.filter((q) => q.status === 'enviado').reduce((a, q) => a + (q.total || 0), 0);

  const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  return (
    <GlassCard accent="green" delay={0.1}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green-muted)', boxShadow: 'var(--shadow-flat)' }}>
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--green)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Taxa de Conversão</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Orçamentos → Pedidos</p>
          </div>
        </div>
        <Link to={createPageUrl('Orcamentos')} className="text-xs" style={{ color: 'var(--green)' }}>Ver todos →</Link>
      </div>

      {/* Big number */}
      <div className="flex items-end gap-3 mb-4">
        <span className="text-4xl font-bold" style={{ color: 'var(--green)' }}>{taxa}%</span>
        <span className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>de conversão</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${taxa}%`, background: 'var(--green)' }} />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
          <CheckCircle className="w-3 h-3 mx-auto mb-1" style={{ color: 'var(--green)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--green)' }}>{aprovados}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Aprovados</p>
          <p className="text-xs" style={{ color: 'var(--green)' }}>{fmt(valorAprovado)}</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
          <Clock className="w-3 h-3 mx-auto mb-1" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{pendentes}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pendentes</p>
          <p className="text-xs" style={{ color: 'var(--accent)' }}>{fmt(valorPendente)}</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
          <XCircle className="w-3 h-3 mx-auto mb-1" style={{ color: 'var(--red)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--red)' }}>{recusados}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Recusados</p>
          <p className="text-xs" style={{ color: 'var(--red)' }}>—</p>
        </div>
      </div>
    </GlassCard>);

}