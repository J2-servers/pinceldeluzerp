// Melhoria #7 — Widget de metas com progresso visual em tempo real
import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Target, CheckCircle, Clock } from 'lucide-react';
import moment from 'moment';

export default function MetasWidget({ goals = [], delay = 0 }) {
  const ativas = goals.filter(g => !g.completed).slice(0, 5);

  const calcProgress = (goal) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min(100, Math.round(((goal.current_value || 0) / goal.target_value) * 100));
  };

  const getColor = (pct) => {
    if (pct >= 80) return 'var(--green)';
    if (pct >= 50) return 'var(--yellow)';
    return 'var(--red)';
  };

  const getDaysLeft = (goal) => {
    if (!goal.deadline) return null;
    const diff = moment(goal.deadline).diff(moment(), 'days');
    return diff;
  };

  return (
    <GlassCard delay={delay} hover={false} accent="green">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: 'var(--red)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Progresso das Metas</h3>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{goals.filter(g => g.completed).length}/{goals.length} concluídas</span>
      </div>

      {ativas.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>Nenhuma meta ativa cadastrada</p>
      )}

      <div className="space-y-4">
        {ativas.map((goal) => {
          const pct = calcProgress(goal);
          const daysLeft = getDaysLeft(goal);
          return (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {goal.completed
                    ? <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--green)' }} />
                    : <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  }
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{goal.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {daysLeft !== null && (
                    <span className="text-xs" style={{ color: daysLeft < 7 ? 'var(--red)' : 'var(--text-tertiary)' }}>
                      {daysLeft < 0 ? 'Vencida' : `${daysLeft}d`}
                    </span>
                  )}
                  <span className="text-sm font-bold" style={{ color: getColor(pct) }}>{pct}%</span>
                </div>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'
                  }}
                />
              </div>
              {goal.target_value && (
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>Atual: {(goal.current_value || 0).toLocaleString('pt-BR')}</span>
                  <span>Meta: {goal.target_value.toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}