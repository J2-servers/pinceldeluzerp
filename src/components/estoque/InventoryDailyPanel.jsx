import React from 'react';
import { AlertTriangle, DollarSign, PackageX, Tags } from 'lucide-react';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function Block({ icon: Icon, title, children }) {
  return <div className="rounded-[24px] p-4 bg-white/65 border border-white shadow-sm"><div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-purple-600" /><h3 className="font-black text-slate-800">{title}</h3></div><div className="space-y-2">{children}</div></div>;
}

export default function InventoryDailyPanel({ lowStock, noPrice, zeroStock, topValue }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <Block icon={AlertTriangle} title="Estoque crítico">{lowStock.length === 0 && <p className="text-sm text-slate-500">Nenhum item crítico.</p>}{lowStock.slice(0, 5).map((p) => <div key={p.id} className="rounded-2xl bg-red-50 border border-red-200 p-3"><p className="font-bold text-slate-800 truncate">{p.name}</p><p className="text-xs text-red-700">Saldo {p.quantity || 0} · mínimo {p.min_quantity || 1}</p></div>)}</Block>
      <Block icon={Tags} title="Sem preço">{noPrice.length === 0 && <p className="text-sm text-slate-500">Tudo precificado.</p>}{noPrice.slice(0, 5).map((p) => <div key={p.id} className="rounded-2xl bg-orange-50 border border-orange-200 p-3"><p className="font-bold text-slate-800 truncate">{p.name}</p><p className="text-xs text-orange-700">Definir preço de venda</p></div>)}</Block>
      <Block icon={PackageX} title="Zerados">{zeroStock.length === 0 && <p className="text-sm text-slate-500">Nenhum item zerado.</p>}{zeroStock.slice(0, 5).map((p) => <div key={p.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="font-bold text-slate-800 truncate">{p.name}</p><p className="text-xs text-slate-500">Sem saldo disponível</p></div>)}</Block>
      <Block icon={DollarSign} title="Maior valor parado">{topValue.length === 0 && <p className="text-sm text-slate-500">Sem valores calculados.</p>}{topValue.slice(0, 5).map((p) => <div key={p.id} className="rounded-2xl bg-green-50 border border-green-200 p-3"><p className="font-bold text-slate-800 truncate">{p.name}</p><p className="text-xs text-green-700">{money(Number(p.quantity || 0) * Number(p.cost_price || 0))}</p></div>)}</Block>
    </div>
  );
}