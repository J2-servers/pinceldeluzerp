import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

export default function RecentTransactions({ transactions, delay = 0 }) {
  const recent = [...(transactions || [])].sort((a, b) => String(b.date || b.created_date || '').localeCompare(String(a.date || a.created_date || ''))).slice(0, 5);

  return (
    <GlassCard delay={delay}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Atividade Recente</h3>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Últimas 5</span>
      </div>

      <div className="space-y-2.5">
        {recent.map((t, index) => (
          <motion.div
            key={t.id || index}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + index * 0.07 }}
            className="flex items-center gap-3 p-3 rounded-2xl transition-all duration-200"
            style={{
              background: 'var(--bg)',
              boxShadow: 'var(--shadow-flat)',
            }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: t.type === 'entrada' ? 'var(--green-muted)' : 'var(--red-muted)',
                boxShadow: 'var(--shadow-flat)',
              }}
            >
              {t.type === 'entrada'
                ? <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--green)' }} />
                : <ArrowDownRight className="w-4 h-4" style={{ color: 'var(--red)' }} />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {t.description || 'Transação'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {(t.category || 'movimento').replace(/_/g, ' ')} • {moment(t.date || t.created_date).format('DD MMM')}
              </p>
            </div>

            <span className="text-sm font-bold flex-shrink-0"
              style={{ color: t.type === 'entrada' ? 'var(--green)' : 'var(--red)' }}>
              {t.type === 'entrada' ? '+' : '-'}R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </motion.div>
        ))}

        {recent.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-sm">Nenhuma transação encontrada</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}