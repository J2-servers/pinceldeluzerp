import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CalendarDays } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;

export default function FinanceCashFlowChart({ monthlyData, projectionData }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-blue-600" /><h3 className="font-black text-slate-800">Resultado por mês</h3></div>
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 14, border: '1px solid #dbe4f0' }} />
            <Legend />
            <Bar dataKey="entradas" name="Entradas" fill="#16a34a" radius={[6, 6, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="#dc2626" radius={[6, 6, 0, 0]} />
            <Bar dataKey="resultado" name="Resultado" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm">
        <div className="flex items-center gap-2 mb-4"><CalendarDays className="w-4 h-4 text-purple-600" /><h3 className="font-black text-slate-800">Projeção de caixa 30 dias</h3></div>
        <ResponsiveContainer width="100%" height={270}>
          <AreaChart data={projectionData}>
            <defs>
              <linearGradient id="cashFlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.32}/>
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 14, border: '1px solid #dbe4f0' }} />
            <Area type="monotone" dataKey="saldo" name="Saldo projetado" stroke="#7c3aed" strokeWidth={3} fill="url(#cashFlow)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}