import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const typeConfig = {
  tarefa:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  entrega:    { color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  reuniao:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  cobranca:   { color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  manutencao: { color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
  outro:      { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};

export default function UpcomingEvents({ events, delay = 0 }) {
  const upcoming = events?.slice(0, 5) || [];

  return (
    <GlassCard delay={delay}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Próximos Eventos</h3>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--bg)', boxShadow: '3px 3px 8px rgba(163,177,198,0.5), -2px -2px 6px rgba(255,255,255,0.9)' }}>
          <Calendar className="w-4 h-4" style={{ color: '#8a9ab0' }} />
        </div>
      </div>

      <div className="space-y-2.5">
        {upcoming.map((event, index) => {
          const tc = typeConfig[event.type] || typeConfig.outro;
          return (
            <motion.div
              key={event.id || index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + index * 0.07 }}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{
                background: 'var(--bg)',
                boxShadow: '4px 4px 10px rgba(163,177,198,0.5), -3px -3px 8px rgba(255,255,255,0.9)',
              }}
            >
              {/* Date pill */}
              <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{ background: tc.bg, border: `1.5px solid ${tc.color}30` }}>
                <span className="text-sm font-black leading-none" style={{ color: tc.color }}>
                  {moment(event.date).format('DD')}
                </span>
                <span className="text-[9px] uppercase font-bold" style={{ color: tc.color, opacity: 0.7 }}>
                  {moment(event.date).format('MMM')}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: tc.bg, color: tc.color }}>
                    {event.type}
                  </span>
                  {event.time && (
                    <span className="text-[10px] flex items-center gap-1" style={{ color: '#8a9ab0' }}>
                      <Clock className="w-3 h-3" /> {event.time}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {upcoming.length === 0 && (
          <div className="text-center py-8" style={{ color: '#8a9ab0' }}>
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum evento próximo</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}