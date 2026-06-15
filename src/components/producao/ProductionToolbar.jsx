import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, SlidersHorizontal } from 'lucide-react';

export default function ProductionToolbar({ filters, setFilters, view, setView }) {
  const update = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="rounded-[24px] p-4 bg-white/65 border border-white shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between"><Input value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Buscar pedido, cliente, item, observação..." className="h-11 flex-1" /><div className="flex flex-wrap gap-2"><Button variant={view === 'kanban' ? 'default' : 'outline'} onClick={() => setView('kanban')} className="h-10">Kanban</Button><Button variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')} className="h-10">Lista</Button></div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        <select className="clay-select" value={filters.status} onChange={(e) => update('status', e.target.value)}><option value="open">Em aberto</option><option value="all">Todos</option><option value="novo">Novo</option><option value="em_producao">Em produção</option><option value="pronto">Pronto</option><option value="entregue">Entregue</option></select>
        <select className="clay-select" value={filters.period} onChange={(e) => update('period', e.target.value)}><option value="all">Qualquer entrega</option><option value="today">Hoje</option><option value="late">Atrasados</option><option value="week">Esta semana</option></select>
        <select className="clay-select" value={filters.payment} onChange={(e) => update('payment', e.target.value)}><option value="all">Todo pagamento</option><option value="pendente">Pendente</option><option value="parcial">Parcial</option><option value="pago">Pago</option></select>
        <select className="clay-select" value={filters.sort} onChange={(e) => update('sort', e.target.value)}><option value="delivery">Entrega</option><option value="recent">Mais recentes</option><option value="value_desc">Maior valor</option><option value="client">Cliente A-Z</option></select>
        <label className="flex items-center gap-2 rounded-xl px-3 h-11 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-600"><input type="checkbox" checked={filters.onlyLate} onChange={(e) => update('onlyLate', e.target.checked)} /> Atrasados</label>
        <label className="flex items-center gap-2 rounded-xl px-3 h-11 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-600"><input type="checkbox" checked={filters.onlyReady} onChange={(e) => update('onlyReady', e.target.checked)} /> Prontos</label>
        <Button variant="outline" onClick={() => setFilters({ search: '', status: 'open', period: 'all', payment: 'all', sort: 'delivery', onlyLate: false, onlyReady: false })} className="h-11"><RefreshCw className="w-4 h-4" /> Limpar</Button>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500 border-t border-slate-200 pt-3"><SlidersHorizontal className="w-4 h-4" /> Fila operacional por status, entrega, atraso, pagamento e prioridade real.</div>
    </div>
  );
}