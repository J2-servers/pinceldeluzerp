import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Target } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ProjecaoCrescimento() {
  const [growthRate, setGrowthRate] = useState(10); // % ao mês
  const [targetRevenue, setTargetRevenue] = useState(0);
  const [months, setMonths] = useState(12);

  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => erp.entities.Transaction.list('-date', 500) });
  const { data: fixedExpenses = [] } = useQuery({ queryKey: ['fixedExpenses'], queryFn: () => erp.entities.FixedExpense.filter({ active: true }) });

  // Calculate average monthly revenue (last 3 months)
  const avgMonthlyRevenue = React.useMemo(() => {
    const last3 = [];
    for (let i = 0; i < 3; i++) {
      const mStr = moment().subtract(i, 'months').format('YYYY-MM');
      const rev = transactions.filter(t => t.type === 'entrada' && t.date?.startsWith(mStr)).reduce((a, t) => a + (t.amount || 0), 0);
      last3.push(rev);
    }
    return last3.reduce((a, v) => a + v, 0) / 3;
  }, [transactions]);

  const avgMonthlyCost = React.useMemo(() => {
    const last3 = [];
    for (let i = 0; i < 3; i++) {
      const mStr = moment().subtract(i, 'months').format('YYYY-MM');
      const cost = transactions.filter(t => t.type === 'saida' && t.date?.startsWith(mStr)).reduce((a, t) => a + (t.amount || 0), 0);
      last3.push(cost);
    }
    const fixed = fixedExpenses.reduce((a, e) => a + (e.amount || 0), 0);
    return last3.reduce((a, v) => a + v, 0) / 3 + fixed;
  }, [transactions, fixedExpenses]);

  // Historical data (last 6 months)
  const historical = React.useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = moment().subtract(5 - i, 'months');
      const mStr = m.format('YYYY-MM');
      const rev = transactions.filter(t => t.type === 'entrada' && t.date?.startsWith(mStr)).reduce((a, t) => a + (t.amount || 0), 0);
      const cost = transactions.filter(t => t.type === 'saida' && t.date?.startsWith(mStr)).reduce((a, t) => a + (t.amount || 0), 0);
      const fixed = fixedExpenses.reduce((a, e) => a + (e.amount || 0), 0);
      return { month: m.format('MMM/YY'), Receita: Math.round(rev), Custos: Math.round(cost + fixed), Lucro: Math.round(rev - cost - fixed), type: 'historical' };
    });
  }, [transactions, fixedExpenses]);

  // Projection
  const projection = React.useMemo(() => {
    const rate = (parseFloat(growthRate) || 0) / 100;
    return Array.from({ length: parseInt(months) || 12 }, (_, i) => {
      const m = moment().add(i + 1, 'months');
      const projRev = avgMonthlyRevenue * Math.pow(1 + rate, i + 1);
      const costGrowth = Math.max(0, rate * 0.4); // Assume costs grow 40% of revenue growth
      const projCost = avgMonthlyCost * Math.pow(1 + costGrowth, i + 1);
      const projLucro = projRev - projCost;
      return { month: m.format('MMM/YY'), Receita: Math.round(projRev), Custos: Math.round(projCost), Lucro: Math.round(projLucro), type: 'projection' };
    });
  }, [avgMonthlyRevenue, avgMonthlyCost, growthRate, months]);

  const allData = [...historical, ...projection];

  const endRevenue = projection[projection.length - 1]?.Receita || 0;
  const endLucro = projection[projection.length - 1]?.Lucro || 0;
  const totalProjectedRevenue = projection.reduce((a, p) => a + p.Receita, 0);

  const monthsToTarget = targetRevenue > avgMonthlyRevenue && growthRate > 0
    ? Math.ceil(Math.log(targetRevenue / avgMonthlyRevenue) / Math.log(1 + (parseFloat(growthRate) || 0) / 100))
    : null;

  return (
    <div className="space-y-6">
      <Header title="Projeção de Crescimento" subtitle="Cenários e simulação de crescimento" />

      {/* Controls */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-4">Parâmetros da Projeção</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Taxa de Crescimento Mensal (%)</Label>
            <Input type="number" step="0.1" value={growthRate} onChange={e => setGrowthRate(e.target.value)} className="bg-white/5 border-white/10" />
            <p className="text-xs text-gray-400">Crescimento esperado mês a mês</p>
          </div>
          <div className="space-y-2">
            <Label>Horizonte (meses)</Label>
            <Input type="number" value={months} onChange={e => setMonths(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Meta de Receita Mensal (R$)</Label>
            <Input type="number" step="100" value={targetRevenue} onChange={e => setTargetRevenue(parseFloat(e.target.value) || 0)} className="bg-white/5 border-white/10" />
          </div>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard delay={0}>
          <p className="text-xs text-gray-400 mb-1">Receita Atual (média 3m)</p>
          <p className="text-xl font-bold text-blue-400">{fmt(avgMonthlyRevenue)}/mês</p>
        </GlassCard>
        <GlassCard delay={0.1}>
          <p className="text-xs text-gray-400 mb-1">Receita Projetada (fim)</p>
          <p className="text-xl font-bold text-green-400">{fmt(endRevenue)}/mês</p>
          <p className="text-xs text-gray-500">+{((endRevenue / avgMonthlyRevenue - 1) * 100).toFixed(1)}% crescimento total</p>
        </GlassCard>
        <GlassCard delay={0.2}>
          <p className="text-xs text-gray-400 mb-1">Receita Total Projetada</p>
          <p className="text-xl font-bold text-pink-400">{fmt(totalProjectedRevenue)}</p>
          <p className="text-xs text-gray-500">Em {months} meses</p>
        </GlassCard>
        <GlassCard delay={0.3}>
          <p className="text-xs text-gray-400 mb-1">Lucro Projetado (fim)</p>
          <p className={`text-xl font-bold ${endLucro >= 0 ? 'text-orange-400' : 'text-red-400'}`}>{fmt(endLucro)}/mês</p>
        </GlassCard>
      </div>

      {targetRevenue > 0 && monthsToTarget && (
        <GlassCard className="border border-pink-500/30 bg-pink-500/5">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-pink-400" />
            <div>
              <p className="text-white font-semibold">Meta de {fmt(targetRevenue)}/mês</p>
              <p className="text-sm text-gray-400">
                {monthsToTarget <= parseInt(months)
                  ? `Atingida em ${monthsToTarget} meses com ${growthRate}% de crescimento mensal.`
                  : `Não atingida no horizonte configurado. Aumente a taxa de crescimento.`}
              </p>
            </div>
            <Badge className={monthsToTarget <= parseInt(months) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
              {monthsToTarget <= parseInt(months) ? `Mês ${monthsToTarget}` : 'Fora do horizonte'}
            </Badge>
          </div>
        </GlassCard>
      )}

      {/* Chart */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-4">
          Histórico + Projeção (
          <span className="text-blue-400">azul = histórico</span>,
          <span className="text-green-400"> verde = projeção</span>)
        </h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={allData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={v => fmt(v)} />
              <Legend formatter={v => <span className="text-gray-300 text-xs">{v}</span>} />
              <ReferenceLine x={historical[historical.length - 1]?.month} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" label={{ value: 'Hoje', fill: '#9ca3af', fontSize: 11 }} />
              {targetRevenue > 0 && <ReferenceLine y={targetRevenue} stroke="#ec4899" strokeDasharray="5 5" label={{ value: 'Meta', fill: '#ec4899', fontSize: 11 }} />}
              <Area type="monotone" dataKey="Receita" stroke="#22c55e" strokeWidth={2} fill="url(#colorReceita)" />
              <Area type="monotone" dataKey="Lucro" stroke="#ec4899" strokeWidth={2} fill="url(#colorLucro)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Scenarios */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-4">Cenários em {months} meses</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Pessimista', rate: Math.max(0, parseFloat(growthRate) - 5), color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            { label: 'Base', rate: parseFloat(growthRate), color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'Otimista', rate: parseFloat(growthRate) + 5, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          ].map(scenario => {
            const rate = scenario.rate / 100;
            const projRev = avgMonthlyRevenue * Math.pow(1 + rate, parseInt(months) || 12);
            return (
              <div key={scenario.label} className={`p-4 rounded-xl border ${scenario.bg} ${scenario.border}`}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-white font-semibold">{scenario.label}</p>
                  <Badge className={`${scenario.bg} ${scenario.color}`}>{scenario.rate.toFixed(1)}%/mês</Badge>
                </div>
                <p className={`text-2xl font-bold ${scenario.color}`}>{fmt(projRev)}</p>
                <p className="text-xs text-gray-400 mt-1">/mês ao final do período</p>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}