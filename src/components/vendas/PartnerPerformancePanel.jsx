import React, { useMemo, useState } from 'react';
import moment from 'moment';
import { Trophy, Percent, Target } from 'lucide-react';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';
import { salesPerformanceByPartner, commissionRates } from '@/lib/salesCommission';

const partnerColor = { Maeli: 'var(--accent)', Wesley: 'var(--purple)', Juliano: 'var(--orange)' };

/**
 * Desempenho por sócio: vendas, faturamento, margem, comissão e progresso da
 * meta de vendas — tudo a partir das vendas reais. Período alternável.
 */
export default function PartnerPerformancePanel({ orders = [], commissions = [], goals = [], companyConfig }) {
  const [period, setPeriod] = useState('month');

  const range = useMemo(() => {
    if (period === 'all') return { start: null, end: null };
    return { start: moment().startOf('month'), end: moment().endOf('month') };
  }, [period]);

  const rows = useMemo(() => salesPerformanceByPartner(orders, commissions, range), [orders, commissions, range]);
  const rates = useMemo(() => commissionRates(companyConfig), [companyConfig]);

  // Meta de vendas por sócio (Goal.type=vendas, seller=partner).
  const goalFor = (partner) => goals.find((goal) => goal.type === 'vendas' && goal.seller === partner && !goal.completed);

  const totals = useMemo(() => ({
    sales: rows.reduce((sum, row) => sum + row.salesTotal, 0),
    commission: rows.reduce((sum, row) => sum + row.commission, 0),
    count: rows.reduce((sum, row) => sum + row.salesCount, 0),
  }), [rows]);

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={16} style={{ color: 'var(--orange)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Desempenho e comissão por sócio</h3>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{totals.count} vendas · {formatCurrency(totals.sales)} faturado · {formatCurrency(totals.commission)} em comissão</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: 'var(--surface-2)' }}>
          {[['month', 'Este mês'], ['all', 'Tudo']].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setPeriod(value)} className="rounded-full px-3 py-1 text-xs font-bold" style={period === value ? { background: 'var(--bg)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--text-tertiary)' }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {rows.map((row) => {
          const color = partnerColor[row.partner] || 'var(--text-secondary)';
          const goal = goalFor(row.partner);
          const target = parseDecimal(goal?.target_value);
          const progress = target > 0 ? Math.min(100, (row.salesTotal / target) * 100) : null;
          return (
            <div key={row.partner} className="rounded-2xl p-3" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{row.partner}</span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--bg)', color }}>
                  <Percent size={10} /> {rates[row.partner] ?? 5}%
                </span>
              </div>
              <p className="mt-2" style={{ fontSize: 22, fontWeight: 900, color }}>{formatCurrency(row.salesTotal)}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{row.salesCount} vendas · margem {row.marginPct}%</p>
              <div className="mt-2 flex items-center justify-between rounded-xl px-2 py-1.5" style={{ background: 'var(--bg)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Comissão</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{formatCurrency(row.commission)}</span>
              </div>
              {progress !== null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    <span className="inline-flex items-center gap-1"><Target size={11} /> Meta {formatCurrency(target)}</span>
                    <span style={{ fontWeight: 800, color: progress >= 100 ? 'var(--green)' : color }}>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? 'var(--green)' : color, borderRadius: 'var(--r-full)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
