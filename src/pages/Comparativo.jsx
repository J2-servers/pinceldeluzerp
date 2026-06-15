import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function VariationBadge({ current, previous }) {
  if (!previous) return <Badge className="bg-gray-500/20 text-gray-400">N/A</Badge>;
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1"><ArrowUp className="w-3 h-3" />{pct.toFixed(1)}%</Badge>;
  if (pct < 0) return <Badge className="bg-red-500/20 text-red-400 flex items-center gap-1"><ArrowDown className="w-3 h-3" />{Math.abs(pct).toFixed(1)}%</Badge>;
  return <Badge className="bg-gray-500/20 text-gray-400 flex items-center gap-1"><Minus className="w-3 h-3" />0%</Badge>;
}

export default function Comparativo() {
  const [mode, setMode] = useState('month'); // month, quarter, year

  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => erp.entities.Transaction.list('-date', 1000) });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 500) });
  const { data: fixedExpenses = [] } = useQuery({ queryKey: ['fixedExpenses'], queryFn: () => erp.entities.FixedExpense.filter({ active: true }) });

  const getPeriodData = (offset = 0) => {
    let start, end;
    if (mode === 'month') {
      start = moment().subtract(offset, 'months').startOf('month').format('YYYY-MM-DD');
      end = moment().subtract(offset, 'months').endOf('month').format('YYYY-MM-DD');
    } else if (mode === 'quarter') {
      start = moment().subtract(offset, 'quarters').startOf('quarter').format('YYYY-MM-DD');
      end = moment().subtract(offset, 'quarters').endOf('quarter').format('YYYY-MM-DD');
    } else {
      start = moment().subtract(offset, 'years').startOf('year').format('YYYY-MM-DD');
      end = moment().subtract(offset, 'years').endOf('year').format('YYYY-MM-DD');
    }

    const tx = transactions.filter(t => t.date >= start && t.date <= end);
    const entradas = tx.filter(t => t.type === 'entrada').reduce((a, t) => a + (t.amount || 0), 0);
    const saidas = tx.filter(t => t.type === 'saida').reduce((a, t) => a + (t.amount || 0), 0);
    const despFixed = fixedExpenses.reduce((a, e) => a + (e.amount || 0), 0) * (mode === 'month' ? 1 : mode === 'quarter' ? 3 : 12);
    const lucro = entradas - saidas - despFixed;
    const margem = entradas > 0 ? (lucro / entradas) * 100 : 0;
    const orders = salesOrders.filter(o => o.created_date >= start && o.created_date <= end);
    const ticketMedio = orders.length > 0 ? orders.reduce((a, o) => a + (o.total || 0), 0) / orders.length : 0;

    return { entradas, saidas, despFixed, lucro, margem, orders: orders.length, ticketMedio, start, end };
  };

  const current = getPeriodData(0);
  const previous = getPeriodData(1);
  const twoBack = getPeriodData(2);

  const periodLabel = (offset) => {
    if (mode === 'month') return moment().subtract(offset, 'months').format('MMMM/YY');
    if (mode === 'quarter') return `Q${moment().subtract(offset, 'quarters').quarter()}/${moment().subtract(offset, 'quarters').year()}`;
    return String(moment().subtract(offset, 'years').year());
  };

  const comparisonData = [
    { name: periodLabel(2), Entradas: Math.round(twoBack.entradas), Saídas: Math.round(twoBack.saidas), Lucro: Math.round(twoBack.lucro) },
    { name: periodLabel(1), Entradas: Math.round(previous.entradas), Saídas: Math.round(previous.saidas), Lucro: Math.round(previous.lucro) },
    { name: periodLabel(0), Entradas: Math.round(current.entradas), Saídas: Math.round(current.saidas), Lucro: Math.round(current.lucro) },
  ];

  const metrics = [
    { label: 'Receita Total', current: current.entradas, previous: previous.entradas },
    { label: 'Saídas', current: current.saidas, previous: previous.saidas },
    { label: 'Lucro', current: current.lucro, previous: previous.lucro },
    { label: 'Pedidos', current: current.orders, previous: previous.orders, isCount: true },
    { label: 'Ticket Médio', current: current.ticketMedio, previous: previous.ticketMedio },
    { label: 'Margem %', current: current.margem, previous: previous.margem, isPercent: true },
  ];

  return (
    <div className="space-y-6">
      <Header title="Análise Comparativa" subtitle="Compare períodos e identifique tendências" />

      {/* Mode selector */}
      <GlassCard>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">Comparar por:</span>
          {['month', 'quarter', 'year'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${mode === m ? 'gradient-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {m === 'month' ? 'Mês' : m === 'quarter' ? 'Trimestre' : 'Ano'}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Comparison table */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-4">Comparativo: {periodLabel(1)} → {periodLabel(0)}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 pb-3 font-medium">Indicador</th>
                <th className="text-right text-gray-400 pb-3 font-medium">{periodLabel(1)}</th>
                <th className="text-right text-gray-400 pb-3 font-medium">{periodLabel(0)}</th>
                <th className="text-right text-gray-400 pb-3 font-medium">Variação</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 text-white font-medium">{m.label}</td>
                  <td className="py-3 text-right text-gray-400">
                    {m.isCount ? m.previous : m.isPercent ? `${(m.previous || 0).toFixed(1)}%` : fmt(m.previous)}
                  </td>
                  <td className={`py-3 text-right font-semibold ${m.current >= m.previous ? 'text-green-400' : 'text-red-400'}`}>
                    {m.isCount ? m.current : m.isPercent ? `${(m.current || 0).toFixed(1)}%` : fmt(m.current)}
                  </td>
                  <td className="py-3 text-right">
                    <VariationBadge current={m.current} previous={m.previous} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Chart */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-4">Visão Comparativa — 3 Períodos</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={v => fmt(v)} />
              <Legend formatter={v => <span className="text-gray-300 text-xs">{v}</span>} />
              <Bar dataKey="Entradas" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Saídas" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Lucro" fill="#ec4899" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Crescimento de Receita', value: previous.entradas > 0 ? ((current.entradas - previous.entradas) / previous.entradas) * 100 : 0, suffix: '%', positive: true },
          { label: 'Variação de Custos', value: previous.saidas > 0 ? ((current.saidas - previous.saidas) / previous.saidas) * 100 : 0, suffix: '%', positive: false },
          { label: 'Variação de Margem', value: current.margem - previous.margem, suffix: 'pp', positive: true },
        ].map((insight, i) => (
          <GlassCard key={i}>
            <p className="text-gray-400 text-sm mb-2">{insight.label}</p>
            <p className={`text-3xl font-bold ${insight.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {insight.value >= 0 ? '+' : ''}{insight.value.toFixed(1)}{insight.suffix}
            </p>
            <p className="text-xs text-gray-500 mt-1">{periodLabel(1)} → {periodLabel(0)}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}