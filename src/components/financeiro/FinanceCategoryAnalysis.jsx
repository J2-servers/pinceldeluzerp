import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon, Target } from 'lucide-react';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const colors = ['#4f79f5', '#7c3aed', '#16a34a', '#f97316', '#dc2626', '#0891b2', '#db2777', '#64748b'];

export default function FinanceCategoryAnalysis({ categoryData, paymentData }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm xl:col-span-2">
        <div className="flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-red-600" /><h3 className="font-black text-slate-800">Despesas por categoria</h3></div>
        <div className="space-y-3">
          {categoryData.length === 0 && <p className="text-sm text-slate-500">Sem despesas no período.</p>}
          {categoryData.map((item, index) => (
            <div key={item.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-bold text-slate-700 capitalize">{item.name.replace(/_/g, ' ')}</span>
                <span className="font-black text-slate-800">{money(item.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${item.percent}%`, background: colors[index % colors.length] }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm">
        <div className="flex items-center gap-2 mb-4"><PieIcon className="w-4 h-4 text-blue-600" /><h3 className="font-black text-slate-800">Formas de pagamento</h3></div>
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={3}>
              {paymentData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => money(value)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1 mt-2">{paymentData.slice(0, 5).map((item, index) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="font-bold text-slate-600"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: colors[index % colors.length] }} />{item.name.replace(/_/g, ' ')}</span><span className="text-slate-500">{money(item.value)}</span></div>)}</div>
      </div>
    </div>
  );
}