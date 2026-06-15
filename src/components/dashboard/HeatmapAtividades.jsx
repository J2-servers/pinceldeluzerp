// Melhoria #14 — Mapa de calor de atividades por dia da semana
import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import moment from 'moment';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export default function HeatmapAtividades({ transactions = [], salesOrders = [], delay = 0 }) {
  const matrix = React.useMemo(() => {
    // Build 7x11 matrix (day x hour)
    const m = Array.from({ length: 7 }, () => Array(HOURS.length).fill(0));
    const allItems = [
    ...transactions.map((t) => t.created_date || t.date),
    ...salesOrders.map((o) => o.created_date)].
    filter(Boolean);

    allItems.forEach((dateStr) => {
      const d = moment(dateStr);
      if (!d.isValid()) return;
      const day = d.day(); // 0=Sun
      const hour = d.hour();
      const hi = HOURS.indexOf(hour);
      if (hi >= 0) m[day][hi]++;
    });
    return m;
  }, [transactions, salesOrders]);

  const maxVal = Math.max(...matrix.flat(), 1);

  const getColor = (val) => {
    if (val === 0) return 'var(--purple-muted)';
    const intensity = val / maxVal;
    if (intensity > 0.7) return 'var(--purple)';
    if (intensity > 0.4) return 'color-mix(in srgb, var(--purple) 60%, transparent)';
    if (intensity > 0.1) return 'color-mix(in srgb, var(--purple) 35%, transparent)';
    return 'color-mix(in srgb, var(--purple) 18%, transparent)';
  };

  return (
    <GlassCard delay={delay} hover={false} accent="purple">
      <h3 className="mb-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Atividade por Dia/Hora</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Mapa de calor de transações e pedidos</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="font-normal w-8 pr-1 text-right"></th>
              {HOURS.map((h) =>
              <th key={h} className="font-normal text-center pb-1" style={{ color: 'var(--text-tertiary)' }}>{h}h</th>
              )}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, di) =>
            <tr key={day}>
                <td className="pr-2 text-right text-xs py-0.5" style={{ color: 'var(--text-tertiary)' }}>{day}</td>
                {HOURS.map((h, hi) =>
              <td key={h} className="text-center py-0.5">
                    <div
                  className="w-full h-6 rounded-md mx-auto"
                  style={{ background: getColor(matrix[di][hi]), minWidth: 28 }}
                  title={`${day} ${h}h: ${matrix[di][hi]} atividades`} />

                  </td>
              )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Menos</span>
        {['var(--purple-muted)', 'color-mix(in srgb, var(--purple) 18%, transparent)', 'color-mix(in srgb, var(--purple) 35%, transparent)', 'color-mix(in srgb, var(--purple) 60%, transparent)', 'var(--purple)'].map((c, i) =>
        <div key={i} className="w-4 h-4 rounded" style={{ background: c }} />
        )}
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Mais</span>
      </div>
    </GlassCard>);

}