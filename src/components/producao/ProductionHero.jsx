import React from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, RefreshCw, Sparkles } from 'lucide-react';

export default function ProductionHero({ stats, onRefresh, onTV }) {
  return (
    <div className="rounded-[28px] p-5 md:p-6" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-3" style={{ color: 'var(--orange)', background: 'var(--orange-muted)', boxShadow: 'var(--shadow-flat)' }}><Sparkles className="w-3.5 h-3.5" /> Produção do dia</div>
          <h2 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>Fila clara para começar, produzir, finalizar e entregar.</h2>
          <p className="text-sm md:text-base mt-2" style={{ color: 'var(--text-secondary)' }}>Controle pedidos novos, em produção, prontos, atrasados, responsáveis, entregas e lançamentos financeiros na conclusão.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto"><Button onClick={onRefresh} variant="outline" className="h-12 px-5 font-bold"><RefreshCw className="w-4 h-4" /> Atualizar</Button><Button onClick={onTV} className="h-12 px-5 font-bold"><Monitor className="w-4 h-4" /> Modo TV</Button></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-6">
        {[
          ['Novos', stats.newOrders, 'var(--accent)'], ['Produção', stats.production, 'var(--orange)'], ['Prontos', stats.ready, 'var(--purple)'], ['Atrasados', stats.late, 'var(--red)'], ['Hoje', stats.today, 'var(--green)'], ['Abertos', stats.open, 'var(--text-primary)']
        ].map(([label, value, color]) => <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)' }}><p className="text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-tertiary)' }}>{label}</p><p className="text-xl font-black mt-1" style={{ color }}>{value}</p></div>)}
      </div>
    </div>
  );
}