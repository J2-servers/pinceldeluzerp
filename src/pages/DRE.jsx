import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
'@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from
'recharts';
import { TrendingUp, DollarSign, Percent, Download, ChevronRight, ChevronDown } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const pct = (v, base) => base > 0 ? `${(v / base * 100).toFixed(1)}%` : '0.0%';

function DRERow({ label, value, base, level = 0, bold, colorClass, sub, expandable, expanded, onToggle, highlight }) {
  const indent = level * 16;
  return (
    <tr
      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${highlight ? 'bg-pink-500/10' : ''}`}
      onClick={expandable ? onToggle : undefined}
      style={{ cursor: expandable ? 'pointer' : 'default' }}>

      <td className={`py-2.5 ${bold ? 'font-bold' : ''}`} style={{ paddingLeft: 12 + indent }}>
        <div className="flex items-center gap-1">
          {expandable && (expanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />)}
          <span className={colorClass || (sub ? 'text-gray-400' : 'text-white')} style={{ fontSize: sub ? 12 : 13 }}>
            {label}
          </span>
        </div>
      </td>
      <td className={`py-2.5 text-right text-sm ${colorClass || (value >= 0 ? 'text-green-400' : 'text-red-400')} ${bold ? 'font-bold' : ''}`}>
        {fmt(value)}
      </td>
      <td className="py-2.5 text-right text-xs text-gray-500">{pct(value, base)}</td>
    </tr>);

}

export default function DRE() {
  const [year, setYear] = useState(moment().year());
  const [view, setView] = useState('anual');
  const [expandCMV, setExpandCMV] = useState(false);
  const [expandDesp, setExpandDesp] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => erp.entities.Transaction.list('-date', 1000)
  });

  const { data: fixedExpenses = [] } = useQuery({
    queryKey: ['fixedExpenses'],
    queryFn: () => erp.entities.FixedExpense.filter({ active: true })
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => erp.entities.SalesOrder.list('-created_date', 500)
  });

  const dreData = React.useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const monthDate = moment().year(year).month(m);
      const monthStart = monthDate.clone().startOf('month').format('YYYY-MM-DD');
      const monthEnd = monthDate.clone().endOf('month').format('YYYY-MM-DD');

      const txMonth = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);

      // Receita Bruta
      const receitaVendas = txMonth.filter((t) => t.type === 'entrada' && t.category === 'vendas').reduce((a, t) => a + (t.amount || 0), 0);
      const receitaServicos = txMonth.filter((t) => t.type === 'entrada' && t.category === 'servicos').reduce((a, t) => a + (t.amount || 0), 0);
      const receitaOutras = txMonth.filter((t) => t.type === 'entrada' && !['vendas', 'servicos'].includes(t.category)).reduce((a, t) => a + (t.amount || 0), 0);
      const receitaBruta = receitaVendas + receitaServicos + receitaOutras;

      // Deduções (impostos)
      const deducoes = txMonth.filter((t) => t.type === 'saida' && t.category === 'impostos').reduce((a, t) => a + (t.amount || 0), 0);
      const receitaLiquida = receitaBruta - deducoes;

      // CMV
      const cmvMateriais = txMonth.filter((t) => t.type === 'saida' && t.category === 'materiais').reduce((a, t) => a + (t.amount || 0), 0);
      const cmvFornecedores = txMonth.filter((t) => t.type === 'saida' && t.category === 'fornecedores').reduce((a, t) => a + (t.amount || 0), 0);
      const cmv = cmvMateriais + cmvFornecedores;
      const lucroBruto = receitaLiquida - cmv;

      // Despesas Operacionais
      const despSalarios = txMonth.filter((t) => t.type === 'saida' && t.category === 'salarios').reduce((a, t) => a + (t.amount || 0), 0);
      const despAluguel = txMonth.filter((t) => t.type === 'saida' && t.category === 'aluguel').reduce((a, t) => a + (t.amount || 0), 0);
      const despManutencao = txMonth.filter((t) => t.type === 'saida' && t.category === 'manutencao').reduce((a, t) => a + (t.amount || 0), 0);
      const despFixas = fixedExpenses.reduce((a, e) => a + (e.amount || 0), 0);
      const despOutras = txMonth.filter((t) => t.type === 'saida' && !['impostos', 'materiais', 'fornecedores', 'salarios', 'aluguel', 'manutencao'].includes(t.category)).reduce((a, t) => a + (t.amount || 0), 0);
      const totalDespOp = despSalarios + despAluguel + despManutencao + despOutras + despFixas;

      const ebitda = lucroBruto - totalDespOp;
      const lucroLiquido = ebitda; // simplificado
      const margem = receitaBruta > 0 ? lucroLiquido / receitaBruta * 100 : 0;
      const margemBruta = receitaLiquida > 0 ? lucroBruto / receitaLiquida * 100 : 0;

      months.push({
        month: monthDate.format('MMM'),
        monthFull: monthDate.format('MMMM'),
        receitaBruta, receitaVendas, receitaServicos, receitaOutras,
        deducoes, receitaLiquida,
        cmv, cmvMateriais, cmvFornecedores,
        lucroBruto, margemBruta,
        despSalarios, despAluguel, despManutencao, despFixas, despOutras, totalDespOp,
        ebitda, lucroLiquido, margem
      });
    }
    return months;
  }, [transactions, fixedExpenses, year]);

  const totals = dreData.reduce((acc, m) => ({
    receitaBruta: acc.receitaBruta + m.receitaBruta,
    receitaVendas: acc.receitaVendas + m.receitaVendas,
    receitaServicos: acc.receitaServicos + m.receitaServicos,
    receitaOutras: acc.receitaOutras + m.receitaOutras,
    deducoes: acc.deducoes + m.deducoes,
    receitaLiquida: acc.receitaLiquida + m.receitaLiquida,
    cmv: acc.cmv + m.cmv,
    cmvMateriais: acc.cmvMateriais + m.cmvMateriais,
    cmvFornecedores: acc.cmvFornecedores + m.cmvFornecedores,
    lucroBruto: acc.lucroBruto + m.lucroBruto,
    totalDespOp: acc.totalDespOp + m.totalDespOp,
    despSalarios: acc.despSalarios + m.despSalarios,
    despAluguel: acc.despAluguel + m.despAluguel,
    despManutencao: acc.despManutencao + m.despManutencao,
    despFixas: acc.despFixas + m.despFixas,
    ebitda: acc.ebitda + m.ebitda,
    lucroLiquido: acc.lucroLiquido + m.lucroLiquido
  }), {
    receitaBruta: 0, receitaVendas: 0, receitaServicos: 0, receitaOutras: 0,
    deducoes: 0, receitaLiquida: 0, cmv: 0, cmvMateriais: 0, cmvFornecedores: 0,
    lucroBruto: 0, totalDespOp: 0, despSalarios: 0, despAluguel: 0, despManutencao: 0, despFixas: 0,
    ebitda: 0, lucroLiquido: 0
  });

  const margemLiquida = totals.receitaBruta > 0 ? totals.lucroLiquido / totals.receitaBruta * 100 : 0;
  const margemBrutaTotal = totals.receitaLiquida > 0 ? totals.lucroBruto / totals.receitaLiquida * 100 : 0;
  const margemEbitda = totals.receitaBruta > 0 ? totals.ebitda / totals.receitaBruta * 100 : 0;

  const exportCSV = () => {
    const headers = ['Mês', 'Receita Bruta', 'Deduções', 'Receita Líquida', 'CMV', 'Lucro Bruto', 'Desp. Op.', 'EBITDA', 'Lucro Líquido', 'Margem %'];
    const rows = dreData.map((m) => [
    m.monthFull, m.receitaBruta.toFixed(2), m.deducoes.toFixed(2), m.receitaLiquida.toFixed(2),
    m.cmv.toFixed(2), m.lucroBruto.toFixed(2), m.totalDespOp.toFixed(2),
    m.ebitda.toFixed(2), m.lucroLiquido.toFixed(2), m.margem.toFixed(1) + '%']
    );
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;a.download = `DRE-${year}.csv`;a.click();
  };

  const chartData = dreData.map((m) => ({
    name: m.month,
    Receita: Math.round(m.receitaBruta),
    CMV: Math.round(m.cmv),
    LucroBruto: Math.round(m.lucroBruto),
    LucroLiquido: Math.round(m.lucroLiquido)
  }));

  return (
    <div className="space-y-6">
      <Header title="DRE - Demonstrativo de Resultados" subtitle={`Exercício ${year} — Regime de Caixa`} />

      {/* Controls */}
      <GlassCard>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="bg-white/5 border-white/10 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[moment().year(), moment().year() - 1, moment().year() - 2].map((y) =>
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={view} onValueChange={setView}>
              <SelectTrigger className="bg-white/5 border-white/10 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anual">Visão Anual</SelectItem>
                <SelectItem value="grafico">Gráfico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />Exportar DRE
          </Button>
        </div>
      </GlassCard>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
        { label: 'Receita Bruta', value: totals.receitaBruta, color: 'text-green-400', icon: TrendingUp },
        { label: 'Receita Líquida', value: totals.receitaLiquida, color: 'text-emerald-400', icon: TrendingUp },
        { label: 'Lucro Bruto', value: totals.lucroBruto, color: 'text-blue-400', icon: DollarSign },
        { label: 'EBITDA', value: totals.ebitda, color: totals.ebitda >= 0 ? 'text-purple-400' : 'text-red-400', icon: Percent },
        { label: 'Lucro Líquido', value: totals.lucroLiquido, color: totals.lucroLiquido >= 0 ? 'text-pink-400' : 'text-red-400', icon: DollarSign },
        { label: 'Margem Líquida', value: margemLiquida, isPercent: true, color: margemLiquida >= 0 ? 'text-orange-400' : 'text-red-400', icon: Percent }].
        map((kpi, i) =>
        <GlassCard key={i} delay={i * 0.05}>
            <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
            <p className={`text-sm font-bold ${kpi.color}`}>
              {kpi.isPercent ? `${kpi.value.toFixed(1)}%` : fmt(kpi.value)}
            </p>
            {!kpi.isPercent &&
          <p className="text-xs text-gray-500 mt-0.5">{pct(kpi.value, totals.receitaBruta)} receita</p>
          }
          </GlassCard>
        )}
      </div>

      {/* Margem indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
        { label: 'Margem Bruta', value: margemBrutaTotal, desc: '(Lucro Bruto / Receita Líquida)' },
        { label: 'Margem EBITDA', value: margemEbitda, desc: '(EBITDA / Receita Bruta)' },
        { label: 'Margem Líquida', value: margemLiquida, desc: '(Lucro Líquido / Receita Bruta)' }].
        map((m, i) =>
        <GlassCard key={i}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-400">{m.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${m.value >= 20 ? 'text-green-400' : m.value >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {m.value.toFixed(1)}%
                </p>
                <Badge className={`mt-1 text-xs ${m.value >= 20 ? 'bg-green-500/20 text-green-400' : m.value >= 10 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                  {m.value >= 20 ? 'Saudável' : m.value >= 10 ? 'Atenção' : 'Crítico'}
                </Badge>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {view === 'grafico' ?
      <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Evolução Mensal — {year}</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(v) => fmt(v)} />
                <Legend formatter={(v) => <span className="text-gray-300 text-xs">{v}</span>} />
                <Bar dataKey="Receita" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="CMV" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="LucroLiquido" fill="#ec4899" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard> :

      <GlassCard>
          <h3 className="text-slate-600 mb-4 text-lg font-semibold">DRE Completo — {year}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 pb-3 font-medium pl-3 w-64">Descrição</th>
                  <th className="text-right text-gray-400 pb-3 font-medium">Total {year}</th>
                  <th className="text-right text-gray-400 pb-3 font-medium w-24">% Receita</th>
                </tr>
              </thead>
              <tbody>
                {/* RECEITA BRUTA */}
                <DRERow label="(+) RECEITA BRUTA" value={totals.receitaBruta} base={totals.receitaBruta} bold colorClass="text-green-400"
              expandable expanded={false} />
                <DRERow label="Vendas de Produtos" value={totals.receitaVendas} base={totals.receitaBruta} level={1} sub />
                <DRERow label="Receita de Serviços" value={totals.receitaServicos} base={totals.receitaBruta} level={1} sub />
                <DRERow label="Outras Receitas" value={totals.receitaOutras} base={totals.receitaBruta} level={1} sub />

                <DRERow label="(-) Deduções e Impostos" value={-totals.deducoes} base={totals.receitaBruta} colorClass="text-red-400" />

                <DRERow label="(=) RECEITA LÍQUIDA" value={totals.receitaLiquida} base={totals.receitaBruta} bold colorClass="text-emerald-400" highlight />

                {/* CMV */}
                <DRERow label="(-) CMV / Custos Diretos" value={-totals.cmv} base={totals.receitaBruta} colorClass="text-red-400" bold
              expandable expanded={expandCMV} onToggle={() => setExpandCMV((e) => !e)} />
                {expandCMV && <>
                  <DRERow label="Materiais" value={-totals.cmvMateriais} base={totals.receitaBruta} level={1} sub />
                  <DRERow label="Fornecedores" value={-totals.cmvFornecedores} base={totals.receitaBruta} level={1} sub />
                </>}

                <DRERow label="(=) LUCRO BRUTO" value={totals.lucroBruto} base={totals.receitaBruta} bold colorClass="text-blue-400" highlight />
                <DRERow label="   Margem Bruta" value={margemBrutaTotal} base={100} isPercent colorClass="text-blue-300" sub />

                {/* DESPESAS OPERACIONAIS */}
                <DRERow label="(-) Despesas Operacionais" value={-totals.totalDespOp} base={totals.receitaBruta} colorClass="text-orange-400" bold
              expandable expanded={expandDesp} onToggle={() => setExpandDesp((e) => !e)} />
                {expandDesp && <>
                  <DRERow label="Salários e Encargos" value={-totals.despSalarios} base={totals.receitaBruta} level={1} sub />
                  <DRERow label="Aluguel" value={-totals.despAluguel} base={totals.receitaBruta} level={1} sub />
                  <DRERow label="Manutenção" value={-totals.despManutencao} base={totals.receitaBruta} level={1} sub />
                  <DRERow label="Despesas Fixas" value={-totals.despFixas * 12} base={totals.receitaBruta} level={1} sub />
                </>}

                <DRERow label="(=) EBITDA" value={totals.ebitda} base={totals.receitaBruta} bold colorClass={totals.ebitda >= 0 ? 'text-purple-400' : 'text-red-400'} highlight />
                <DRERow label="   Margem EBITDA" value={margemEbitda} base={100} isPercent colorClass="text-purple-300" sub />

                <DRERow label="(=) LUCRO LÍQUIDO" value={totals.lucroLiquido} base={totals.receitaBruta} bold colorClass={totals.lucroLiquido >= 0 ? 'text-pink-400' : 'text-red-400'} highlight />
                <DRERow label="   Margem Líquida" value={margemLiquida} base={100} isPercent colorClass={margemLiquida >= 0 ? 'text-pink-300' : 'text-red-300'} sub />
              </tbody>
            </table>
          </div>
        </GlassCard>
      }

      {/* Monthly breakdown */}
      <GlassCard>
        <h3 className="text-slate-600 mb-4 text-lg font-semibold">Evolução Mensal Detalhada</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 pb-3 font-medium">Mês</th>
                <th className="text-right text-gray-400 pb-3">Rec. Bruta</th>
                <th className="text-right text-gray-400 pb-3">CMV</th>
                <th className="text-right text-gray-400 pb-3">Lucro Bruto</th>
                <th className="text-right text-gray-400 pb-3">Desp. Op.</th>
                <th className="text-right text-gray-400 pb-3">EBITDA</th>
                <th className="text-right text-gray-400 pb-3">Luc. Líq.</th>
                <th className="text-right text-gray-400 pb-3">Margem</th>
              </tr>
            </thead>
            <tbody>
              {dreData.map((m, i) =>
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 text-black capitalize font-medium">{m.monthFull}</td>
                  <td className="py-2 text-right text-green-400">{fmt(m.receitaBruta)}</td>
                  <td className="py-2 text-right text-red-400">{fmt(m.cmv)}</td>
                  <td className={`py-2 text-right ${m.lucroBruto >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{fmt(m.lucroBruto)}</td>
                  <td className="py-2 text-right text-orange-400">{fmt(m.totalDespOp)}</td>
                  <td className={`py-2 text-right ${m.ebitda >= 0 ? 'text-purple-400' : 'text-red-400'}`}>{fmt(m.ebitda)}</td>
                  <td className={`py-2 text-right font-bold ${m.lucroLiquido >= 0 ? 'text-pink-400' : 'text-red-400'}`}>{fmt(m.lucroLiquido)}</td>
                  <td className={`py-2 text-right ${m.margem >= 10 ? 'text-green-400' : m.margem >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{m.margem.toFixed(1)}%</td>
                </tr>
              )}
              <tr className="border-t-2 border-pink-500/30 bg-pink-500/5 font-bold">
                <td className="py-2.5 text-pink-400">TOTAL {year}</td>
                <td className="py-2.5 text-right text-green-400">{fmt(totals.receitaBruta)}</td>
                <td className="py-2.5 text-right text-red-400">{fmt(totals.cmv)}</td>
                <td className={`py-2.5 text-right ${totals.lucroBruto >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{fmt(totals.lucroBruto)}</td>
                <td className="py-2.5 text-right text-orange-400">{fmt(totals.totalDespOp)}</td>
                <td className={`py-2.5 text-right ${totals.ebitda >= 0 ? 'text-purple-400' : 'text-red-400'}`}>{fmt(totals.ebitda)}</td>
                <td className={`py-2.5 text-right ${totals.lucroLiquido >= 0 ? 'text-pink-400' : 'text-red-400'}`}>{fmt(totals.lucroLiquido)}</td>
                <td className={`py-2.5 text-right ${margemLiquida >= 0 ? 'text-green-400' : 'text-red-400'}`}>{margemLiquida.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>);

}