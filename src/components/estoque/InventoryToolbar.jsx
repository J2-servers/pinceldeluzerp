import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, SlidersHorizontal } from 'lucide-react';

export default function InventoryToolbar({ filters, setFilters, categories, view, setView }) {
  const update = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="rounded-[24px] p-4 bg-white/65 border border-white shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <Input value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Buscar item, SKU, categoria, fornecedor, local, cor..." className="h-11 flex-1" />
        <div className="flex flex-wrap gap-2">
          <Button variant={view === 'table' ? 'default' : 'outline'} onClick={() => setView('table')} className="h-10">Tabela</Button>
          <Button variant={view === 'cards' ? 'default' : 'outline'} onClick={() => setView('cards')} className="h-10">Cards</Button>
          <Button variant={view === 'movements' ? 'default' : 'outline'} onClick={() => setView('movements')} className="h-10">Movimentos</Button>
          <Button variant={view === 'repor' ? 'default' : 'outline'} onClick={() => setView('repor')} className="h-10">Repor</Button>
          <Button variant={view === 'inventario' ? 'default' : 'outline'} onClick={() => setView('inventario')} className="h-10">Inventario</Button>
          <Button variant={view === 'retalhos' ? 'default' : 'outline'} onClick={() => setView('retalhos')} className="h-10">Retalhos</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <select className="clay-select" value={filters.category} onChange={(e) => update('category', e.target.value)}><option value="all">Todas categorias</option>{categories.map((c) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}</select>
        <select className="clay-select" value={filters.stock} onChange={(e) => update('stock', e.target.value)}><option value="all">Todos saldos</option><option value="low">Crítico</option><option value="zero">Zerado</option><option value="positive">Com saldo</option><option value="no_track">Sem controle</option></select>
        <select className="clay-select" value={filters.behavior} onChange={(e) => update('behavior', e.target.value)}><option value="all">Todos usos</option><option value="sell">Vendável</option><option value="quote">Orçável</option><option value="asset">Patrimônio</option><option value="dimensional">Com medidas</option></select>
        <select className="clay-select" value={filters.sort} onChange={(e) => update('sort', e.target.value)}><option value="name">Nome A-Z</option><option value="qty_asc">Menor estoque</option><option value="qty_desc">Maior estoque</option><option value="cost_desc">Maior custo</option><option value="sale_desc">Maior venda</option></select>
        <Input type="number" value={filters.minQty} onChange={(e) => update('minQty', e.target.value)} placeholder="Qtd mínima" className="h-11" />
        <label className="flex items-center gap-2 rounded-xl px-3 h-11 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-600"><input type="checkbox" checked={filters.onlyNoPrice} onChange={(e) => update('onlyNoPrice', e.target.checked)} /> Sem preço</label>
        <label className="flex items-center gap-2 rounded-xl px-3 h-11 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-600"><input type="checkbox" checked={filters.onlyLow} onChange={(e) => update('onlyLow', e.target.checked)} /> Baixo</label>
        <Button variant="outline" onClick={() => setFilters({ search: '', category: 'all', stock: 'all', behavior: 'all', sort: 'name', minQty: '', onlyNoPrice: false, onlyLow: false })} className="h-11"><RefreshCw className="w-4 h-4" /> Limpar</Button>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500 border-t border-slate-200 pt-3"><SlidersHorizontal className="w-4 h-4" /> Filtros por saldo, preço, categoria, comportamento, dimensão e ordenação.</div>
    </div>
  );
}