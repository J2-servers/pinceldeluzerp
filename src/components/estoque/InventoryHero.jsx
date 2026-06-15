import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, PackagePlus, RefreshCw, Sparkles } from 'lucide-react';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function InventoryHero({ stats, onCreate, onMovement, onExport }) {
  return (
    <div className="rounded-[28px] p-5 md:p-6" style={{ background: 'var(--bg)', boxShadow: '8px 8px 20px rgba(163,177,198,0.65), -5px -5px 14px rgba(255,255,255,0.95)' }}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Estoque operacional
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">Produtos, matéria-prima, saldo, custo e alerta em uma única central.</h2>
          <p className="text-sm md:text-base text-slate-600 mt-2">Controle entradas, saídas, estoque mínimo, valor parado, itens sem preço, materiais com dimensão e histórico de movimentação.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <Button onClick={onCreate} className="h-12 px-5 font-bold"><PackagePlus className="w-4 h-4" /> Novo item</Button>
          <Button onClick={onMovement} variant="outline" className="h-12 px-5 font-bold"><RefreshCw className="w-4 h-4" /> Movimentar</Button>
          <Button onClick={onExport} variant="outline" className="h-12 px-5 font-bold"><Download className="w-4 h-4" /> Exportar</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-6">
        {[
          ['Itens', stats.total, 'text-blue-600'],
          ['Críticos', stats.lowStock, 'text-red-600'],
          ['Sem preço', stats.noPrice, 'text-orange-600'],
          ['Com medidas', stats.dimensional, 'text-purple-600'],
          ['Custo parado', money(stats.costValue), 'text-slate-800'],
          ['Venda potencial', money(stats.saleValue), 'text-green-600'],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-2xl p-4 bg-white/70 border border-white shadow-sm">
            <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500">{label}</p>
            <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}