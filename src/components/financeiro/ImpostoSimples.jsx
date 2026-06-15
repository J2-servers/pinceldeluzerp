// Melhoria #17 — Calculadora de Impostos Simples Nacional por faixa
import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';

const TABELA_SIMPLES_NACIONAL = [
  { faixa: 1, min: 0, max: 180000, aliquota: 4.0, deducao: 0 },
  { faixa: 2, min: 180000.01, max: 360000, aliquota: 7.3, deducao: 5940 },
  { faixa: 3, min: 360000.01, max: 720000, aliquota: 9.5, deducao: 13860 },
  { faixa: 4, min: 720000.01, max: 1800000, aliquota: 10.7, deducao: 22500 },
  { faixa: 5, min: 1800000.01, max: 3600000, aliquota: 14.3, deducao: 87300 },
  { faixa: 6, min: 3600000.01, max: 4800000, aliquota: 19.0, deducao: 378000 },
];

export default function ImpostoSimples({ receitaAnual = 0 }) {
  const [rbt12, setRbt12] = useState(receitaAnual || 0);
  const [receitaMes, setReceitaMes] = useState(0);

  const faixa = TABELA_SIMPLES_NACIONAL.find(f => rbt12 >= f.min && rbt12 <= f.max) || TABELA_SIMPLES_NACIONAL[0];
  const aliquotaEfetiva = rbt12 > 0 ? (((rbt12 * (faixa.aliquota / 100)) - faixa.deducao) / rbt12) * 100 : 0;
  const impostoMes = receitaMes > 0 ? receitaMes * (aliquotaEfetiva / 100) : 0;

  return (
    <GlassCard hover={false}>
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Calculadora Simples Nacional</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <Label className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Receita Bruta 12 meses (RBT12)</Label>
          <Input
            type="number"
            value={rbt12}
            onChange={e => setRbt12(parseFloat(e.target.value) || 0)}
            placeholder="Ex: 500000"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Receita do Mês Atual</Label>
          <Input
            type="number"
            value={receitaMes}
            onChange={e => setReceitaMes(parseFloat(e.target.value) || 0)}
            placeholder="Ex: 45000"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl p-3 text-center" style={{ boxShadow: 'var(--shadow-pressed)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Faixa</p>
          <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{faixa.faixa}ª</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ boxShadow: 'var(--shadow-pressed)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Alíquota Efetiva</p>
          <p className="text-xl font-bold" style={{ color: 'var(--yellow)' }}>{aliquotaEfetiva.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ boxShadow: 'var(--shadow-pressed)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Imposto do Mês</p>
          <p className="text-xl font-bold" style={{ color: 'var(--orange)' }}>
            R$ {impostoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      <div className="space-y-1">
        {TABELA_SIMPLES_NACIONAL.map(f => (
          <div
            key={f.faixa}
            className="flex justify-between items-center px-3 py-1.5 rounded-lg text-xs transition-all"
            style={faixa.faixa === f.faixa ? { background: 'var(--accent-muted)' } : { boxShadow: 'var(--shadow-flat)' }}
          >
            <span style={{ color: 'var(--text-tertiary)' }}>Faixa {f.faixa}: até R$ {f.max.toLocaleString('pt-BR')}</span>
            <span className={faixa.faixa === f.faixa ? 'font-bold' : ''} style={{ color: faixa.faixa === f.faixa ? 'var(--accent)' : 'var(--text-tertiary)' }}>{f.aliquota}%</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}