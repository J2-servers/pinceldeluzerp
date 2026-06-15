// Melhoria #47 — Painel operacional TV mode para chão de fábrica
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, X, Clock } from 'lucide-react';
import moment from 'moment';

const statusColors = {
  aguardando: { borderColor: 'var(--yellow)', background: 'var(--yellow-muted)' },
  em_andamento: { borderColor: 'var(--green)', background: 'var(--green-muted)' },
  concluido: { borderColor: 'var(--text-tertiary)', background: 'var(--surface-2)' },
  pausado: { borderColor: 'var(--orange)', background: 'var(--orange-muted)' },
};

const priorityMap = {
  urgente: { background: 'var(--red-muted)', color: 'var(--red)' },
  alta: { background: 'var(--orange-muted)', color: 'var(--orange)' },
  normal: { background: 'var(--accent-muted)', color: 'var(--accent)' },
  baixa: { background: 'var(--surface-2)', color: 'var(--text-tertiary)' },
};

function TVScreen({ onClose }) {
  const { data: queue = [] } = useQuery({
    queryKey: ['productionQueue'],
    queryFn: () => erp.entities.ProductionQueue.list('priority', 50),
    refetchInterval: 15000,
  });

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const ativos = queue.filter(q => ['aguardando', 'em_andamento'].includes(q.status));

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col p-6 overflow-hidden" style={{ background: 'var(--surface-4)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>Painel de Produção</h1>
          <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>Pincel de Luz — Sistema ERP</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-mono font-bold" style={{ color: 'var(--red)' }}>
            {time.toLocaleTimeString('pt-BR')}
          </p>
          <p style={{ color: 'var(--text-tertiary)' }}>{moment().format('dddd, DD/MM/YYYY')}</p>
        </div>
        <Button variant="ghost" onClick={onClose} className="absolute top-4 right-4">
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Em Fila', value: queue.filter(q => q.status === 'aguardando').length, color: 'var(--yellow)' },
          { label: 'Em Andamento', value: queue.filter(q => q.status === 'em_andamento').length, color: 'var(--green)' },
          { label: 'Concluídas Hoje', value: queue.filter(q => q.status === 'concluido' && moment(q.completed_at).isSame(moment(), 'day')).length, color: 'var(--accent)' },
          { label: 'Total na Fila', value: ativos.length, color: 'var(--red)' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 text-center" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
            <p className="text-5xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Queue grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto">
        {ativos.map((item) => (
          <div key={item.id} className="rounded-2xl p-4" style={{ border: '2px solid', ...(statusColors[item.status] || {}) }}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{item.product_name || 'Item'}</h3>
              <Badge style={priorityMap[item.priority] || {}}>{item.priority}</Badge>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.order_number}</p>
            {item.client_name && <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{item.client_name}</p>}
            <div className="mt-3 flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {item.estimated_time ? `${item.estimated_time} min` : '—'}
              </span>
            </div>
            {item.machine && (
              <div className="mt-2">
                <Badge style={{ background: 'var(--purple-muted)', color: 'var(--purple)' }}>{item.machine}</Badge>
              </div>
            )}
            <div className="mt-3">
              <Badge className="text-base px-3 py-1" style={
                item.status === 'em_andamento' ? { background: 'var(--green-muted)', color: 'var(--green)' } : { background: 'var(--yellow-muted)', color: 'var(--yellow)' }
              }>
                {item.status === 'em_andamento' ? '▶ EM PRODUÇÃO' : '⏳ AGUARDANDO'}
              </Badge>
            </div>
          </div>
        ))}
        {ativos.length === 0 && (
          <div className="col-span-full text-center text-2xl py-20" style={{ color: 'var(--text-tertiary)' }}>
            Nenhum item na fila de produção
          </div>
        )}
      </div>
    </div>
  );
}

export default function PainelTVButton() {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button onClick={() => setShow(true)} variant="outline" style={{ color: 'var(--purple)' }}>
        <Monitor className="w-4 h-4 mr-2" />
        Modo TV
      </Button>
      {show && <TVScreen onClose={() => setShow(false)} />}
    </>
  );
}