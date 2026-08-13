import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, ArrowUpRight, Edit, History, Package, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;

const formatM2 = (value) => `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m2`;

export default function InventoryCardsGrid({ products, onEdit, onMovement, onDelete, onHistory }) {
  if (!products.length) return <div className="rounded-[24px] bg-white/70 border border-white p-10 text-center text-slate-500">Nenhum item encontrado.</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {products.map((p) => {
        const area = p.pricing_mode === 'area_m2' && !!p.track_area_stock;
        const low = p.track_stock !== false && Number(p.quantity || 0) <= (area ? Number(p.min_stock_m2 || 0) : Number(p.min_quantity || 1));
        return (
          <div key={p.id} className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black tracking-widest text-purple-600">{p.sku || p.category || 'ITEM'}</p><h3 className="text-lg font-black text-slate-800 truncate">{p.name}</h3><div className="flex flex-wrap items-center gap-1"><p className="text-sm text-slate-500 truncate">{p.category || 'Sem categoria'}</p>{p.variant_label && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{p.variant_label}</span>}{p.is_kit && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">Kit</span>}</div></div><div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${low ? 'bg-red-50' : 'bg-green-50'}`}><Package className={`w-5 h-5 ${low ? 'text-red-600' : 'text-green-600'}`} /></div></div>
            <div className="grid grid-cols-2 gap-2 my-4"><div className="rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Saldo{area ? ' (area)' : ''}</p><p className={low ? 'font-black text-red-600' : 'font-black text-green-600'}>{area ? formatM2(p.quantity) : `${p.quantity || 0} ${p.unit || 'un'}`}</p></div><div className="rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="text-xs text-slate-500">Preço</p><p className="font-black text-blue-600">{money(p.sale_price || p.price_per_m2)}</p></div></div>
            <div className="flex items-center justify-between gap-2"><p className="text-xs text-slate-500">Local: {p.location || '—'}</p><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => onMovement(p, 'entrada')}><ArrowUpRight className="w-3.5 h-3.5 text-green-600" /></Button><Button size="sm" variant="ghost" onClick={() => onMovement(p, 'saida')}><ArrowDownRight className="w-3.5 h-3.5 text-red-600" /></Button>{onHistory && <Button size="sm" variant="ghost" title="Historico" onClick={() => onHistory(p)}><History className="w-3.5 h-3.5 text-blue-600" /></Button>}<Button size="sm" variant="ghost" onClick={() => onEdit(p)}><Edit className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => onDelete(p)}><Trash2 className="w-3.5 h-3.5" /></Button></div></div>
          </div>
        );
      })}
    </div>
  );
}