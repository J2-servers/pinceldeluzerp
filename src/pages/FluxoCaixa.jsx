import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
'@/components/ui/select';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from
'recharts';
import { TrendingUp, AlertTriangle, DollarSign, Download } from 'lucide-react';
import moment from 'moment';

export default function FluxoCaixa() {
  const [months, setMonths] = useState('3');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => erp.entities.Transaction.list('-date', 500)
  });

  const { data: payables = [] } = useQuery({
    queryKey: ['accountsPayable'],
    queryFn: () => erp.entities.AccountPayable.filter({ paid: false })
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ['accountsReceivable'],
    queryFn: () => erp.entities.AccountReceivable.filter({ received: false })
  });

  const { data: fixedExpenses = [] } = useQuery({
    queryKey: ['fixedExpenses'],
    queryFn: () => erp.entities.FixedExpense.filter({ active: true })
  });

  // Current balance
  const totalIn = transactions.filter((t) => t.type === 'entrada').reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalOut = transactions.filter((t) => t.type === 'saida').reduce((acc, t) => acc + (t.amount || 0), 0);
  const currentBalance = totalIn - totalOut;

  // Generate projection for next N months
  const projection = React.useMemo(() => {
    const numMonths = parseInt(months);
    const data = [];
    let runningBalance = currentBalance;

    for (let i = 0; i <= numMonths; i++) {
      const month = moment().add(i, 'months');
      const monthLabel = i === 0 ? 'Atual' : month.format('MMM/YY');

      if (i === 0) {
        data.push({
          month: monthLabel,
          saldo: runningBalance,
          entradas: 0,
          saidas: 0
        });
        continue;
      }

      // Expected receivables for this month
      const monthStr = month.format('YYYY-MM');
      const expectedIn = receivables.
      filter((r) => r.due_date?.startsWith(monthStr)).
      reduce((acc, r) => acc + (r.amount || 0), 0);

      // Expected payables for this month
      const expectedOut = payables.
      filter((p) => p.due_date?.startsWith(monthStr)).
      reduce((acc, p) => acc + (p.amount || 0), 0);

      // Fixed expenses always apply
      const fixedOut = fixedExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

      runningBalance = runningBalance + expectedIn - expectedOut - fixedOut;

      data.push({
        month: monthLabel,
        saldo: runningBalance,
        entradas: expectedIn,
        saidas: expectedOut + fixedOut
      });
    }

    return data;
  }, [months, currentBalance, receivables, payables, fixedExpenses]);

  const lowestBalance = Math.min(...projection.map((p) => p.saldo));
  const isNegative = lowestBalance < 0;

  const exportCSV = () => {
    const headers = ['Mês', 'Entradas Previstas', 'Saídas Previstas', 'Saldo Projetado'];
    const rows = projection.map((p) => [p.month, p.entradas.toFixed(2), p.saidas.toFixed(2), p.saldo.toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fluxo-caixa-projecao.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <Header title="Fluxo de Caixa" subtitle="Projeção e controle do fluxo de caixa" />

      {/* Alert */}
      {isNegative &&
      <GlassCard neonBorder className="border-red-500/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg animate-pulse">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">⚠️ Alerta de Caixa Negativo!</p>
              <p className="text-sm text-gray-400">
                A projeção indica saldo negativo de R$ {Math.abs(lowestBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
              </p>
            </div>
          </div>
        </GlassCard>
      }

      {/* Controls */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Projeção para:</span>
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger className="bg-white/5 border-white/10 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 mês</SelectItem>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </GlassCard>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard delay={0}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Saldo Atual</p>
              <p className={`text-lg font-bold ${currentBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.1}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">A Receber (total)</p>
              <p className="text-lg font-bold text-green-400">
                R$ {receivables.reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.2}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isNegative ? 'bg-red-500/20' : 'bg-pink-500/20'}`}>
              <DollarSign className={`w-5 h-5 ${isNegative ? 'text-red-400' : 'text-pink-400'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Saldo Projetado (final)</p>
              <p className={`text-lg font-bold ${projection[projection.length - 1]?.saldo >= 0 ? 'text-pink-400' : 'text-red-400'}`}>
                R$ {(projection[projection.length - 1]?.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Chart */}
      <GlassCard delay={0.3} className="h-[350px]">
        <h3 className="text-slate-600 mb-4 text-lg font-semibold">Projeção de Saldo</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={projection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />

            <Tooltip
              contentStyle={{ background: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo']} />

            <ReferenceLine y={0} stroke="rgba(239,68,68,0.5)" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="saldo" stroke="#ec4899" strokeWidth={2} fill="url(#colorSaldo)" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Projection Table */}
      <GlassCard delay={0.4}>
        <h3 className="text-slate-600 mb-4 text-lg font-semibold">Detalhamento da Projeção</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 pb-3">Mês</th>
                <th className="text-right text-gray-400 pb-3">Entradas Prev.</th>
                <th className="text-right text-gray-400 pb-3">Saídas Prev.</th>
                <th className="text-right text-gray-400 pb-3">Saldo Projetado</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((p, i) =>
              <tr key={i} className={`border-b border-white/5 hover:bg-white/5 ${p.saldo < 0 ? 'bg-red-500/10' : ''}`}>
                  <td className="py-3 text-white font-medium">{p.month}</td>
                  <td className="py-3 text-right text-green-400">
                    {i === 0 ? '-' : `R$ ${p.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </td>
                  <td className="py-3 text-right text-red-400">
                    {i === 0 ? '-' : `R$ ${p.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </td>
                  <td className={`py-3 text-right font-bold ${p.saldo >= 0 ? 'text-pink-400' : 'text-red-400'}`}>
                    R$ {p.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>);

}