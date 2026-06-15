// Melhoria #46 — Timer em tempo real para cada item na fila de produção
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { useQueryClient } from '@tanstack/react-query';

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerProducao({ item, onUpdate }) {
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(item.status === 'em_andamento');
  const intervalRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const handleStart = async () => {
    setRunning(true);
    await erp.entities.ProductionQueue.update(item.id, {
      status: 'em_andamento',
      started_at: new Date().toISOString(),
    });
    qc.invalidateQueries(['productionQueue']);
    onUpdate?.();
  };

  const handlePause = () => {
    setRunning(false);
  };

  const handleStop = async () => {
    setRunning(false);
    const horasReais = elapsed / 3600;
    await erp.entities.ProductionQueue.update(item.id, {
      status: 'concluido',
      completed_at: new Date().toISOString(),
      actual_hours: horasReais,
    });
    qc.invalidateQueries(['productionQueue']);
    onUpdate?.();
  };

  const custoEstimado = item.machine_cost_per_minute
    ? ((elapsed / 60) * item.machine_cost_per_minute).toFixed(2)
    : null;

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
      <div className="text-lg font-mono font-bold" style={{ color: running ? 'var(--green)' : 'var(--text-tertiary)' }}>
        {formatTime(elapsed)}
      </div>
      {custoEstimado && (
        <span className="text-xs" style={{ color: 'var(--orange)' }}>R$ {custoEstimado}</span>
      )}
      <div className="flex gap-1">
        {!running && item.status !== 'concluido' && (
          <Button size="sm" variant="ghost" onClick={handleStart}>
            <Play className="w-3 h-3" style={{ color: 'var(--green)' }} />
          </Button>
        )}
        {running && (
          <Button size="sm" variant="ghost" onClick={handlePause}>
            <Pause className="w-3 h-3" style={{ color: 'var(--yellow)' }} />
          </Button>
        )}
        {(running || elapsed > 0) && item.status !== 'concluido' && (
          <Button size="sm" variant="ghost" onClick={handleStop}>
            <Square className="w-3 h-3" style={{ color: 'var(--red)' }} />
          </Button>
        )}
      </div>
    </div>
  );
}