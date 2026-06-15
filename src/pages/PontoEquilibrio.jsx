import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from
'recharts';
import { Target, DollarSign, Percent, TrendingUp } from 'lucide-react';

export default function PontoEquilibrio() {
  const [precoVenda, setPrecoVenda] = useState(100);
  const [custVariavel, setCustVariavel] = useState(40);
  const [unidadesAtual, setUnidadesAtual] = useState(50);

  const { data: fixedExpenses = [] } = useQuery({
    queryKey: ['fixedExpenses'],
    queryFn: () => erp.entities.FixedExpense.filter({ active: true })
  });

  const totalFixo = fixedExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const margemContribuicao = precoVenda - custVariavel;
  const mcPercent = precoVenda > 0 ? margemContribuicao / precoVenda * 100 : 0;
  const pontoEquilibrio = margemContribuicao > 0 ? Math.ceil(totalFixo / margemContribuicao) : 0;
  const peValor = pontoEquilibrio * precoVenda;

  const receitaAtual = unidadesAtual * precoVenda;
  const margem = peValor > 0 ? (receitaAtual - peValor) / peValor * 100 : 0;

  // Chart data: vary units from 0 to 2x ponto equilibrio
  const maxUnits = Math.max(pontoEquilibrio * 2, unidadesAtual * 1.5, 10);
  const chartData = [];
  for (let i = 0; i <= Math.ceil(maxUnits); i += Math.ceil(maxUnits / 20)) {
    const receita = i * precoVenda;
    const custoVar = i * custVariavel;
    const custoTotal = custoVar + totalFixo;
    chartData.push({
      unidades: i,
      receita: Math.round(receita),
      custoTotal: Math.round(custoTotal),
      lucro: Math.round(receita - custoTotal)
    });
  }

  return (
    <div className="space-y-6">
      <Header title="Ponto de Equilíbrio" subtitle="Análise do break-even da empresa" />

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GlassCard delay={0}>
          <h3 className="text-slate-700 mb-4 font-semibold">Parâmetros</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preço de Venda (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(parseFloat(e.target.value) || 0)}
                className="bg-white/5 border-white/10" />

            </div>
            <div className="space-y-2">
              <Label>Custo Variável Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={custVariavel}
                onChange={(e) => setCustVariavel(parseFloat(e.target.value) || 0)}
                className="bg-white/5 border-white/10" />

            </div>
            <div className="space-y-2">
              <Label>Unidades Vendidas/Mês</Label>
              <Input
                type="number"
                value={unidadesAtual}
                onChange={(e) => setUnidadesAtual(parseInt(e.target.value) || 0)}
                className="bg-white/5 border-white/10" />

            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-gray-400">Despesas Fixas (auto)</p>
              <p className="text-slate-600 font-bold">
                R$ {totalFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Results */}
        <div className="md:col-span-1 lg:col-span-2 grid grid-cols-2 gap-4">
          <GlassCard delay={0.1}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-pink-400" />
              <p className="text-xs text-gray-400">Ponto de Equilíbrio</p>
            </div>
            <p className="text-2xl font-bold text-pink-400">{pontoEquilibrio} un.</p>
            <p className="text-sm text-gray-400 mt-1">
              R$ {peValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </GlassCard>

          <GlassCard delay={0.2}>
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-gray-400">Margem de Contribuição</p>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              R$ {margemContribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-400 mt-1">{mcPercent.toFixed(1)}% do preço</p>
          </GlassCard>

          <GlassCard delay={0.3}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <p className="text-xs text-gray-400">Margem de Segurança</p>
            </div>
            <p className={`text-2xl font-bold ${margem >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {margem.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {unidadesAtual > pontoEquilibrio ? `${unidadesAtual - pontoEquilibrio} un. acima do PE` : `${pontoEquilibrio - unidadesAtual} un. abaixo do PE`}
            </p>
          </GlassCard>

          <GlassCard delay={0.4}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-gray-400">Lucro/Prejuízo Mensal</p>
            </div>
            <p className={`text-2xl font-bold ${receitaAtual - unidadesAtual * custVariavel - totalFixo >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
              R$ {(receitaAtual - unidadesAtual * custVariavel - totalFixo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Chart */}
      <GlassCard delay={0.5} className="h-[350px]">
        <h3 className="text-slate-600 mb-4 text-lg font-semibold">Gráfico de Equilíbrio</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="unidades" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Unidades', position: 'insideBottom', fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(v, n) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, n]} />

            <Legend formatter={(v) => <span className="text-gray-300 text-xs capitalize">{v}</span>} />
            <ReferenceLine x={pontoEquilibrio} stroke="#ec4899" strokeDasharray="5 5" label={{ value: 'PE', fill: '#ec4899', fontSize: 12 }} />
            <Line type="monotone" dataKey="receita" stroke="#22c55e" strokeWidth={2} dot={false} name="Receita" />
            <Line type="monotone" dataKey="custoTotal" stroke="#ef4444" strokeWidth={2} dot={false} name="Custo Total" />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>);

}