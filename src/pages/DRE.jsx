import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import QueryState from '@/components/ui/QueryState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, Wallet, DollarSign, Activity, Percent, Download,
  ChevronDown, ChevronRight, BarChart3,
} from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/lib/numberFormat';
import { downloadCsv } from '@/lib/downloadUtils';

// Nomes de mes em portugues sem depender do locale global do moment
// (mudar moment.locale afetaria a formatacao de datas do app inteiro).
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_FULL = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const money = formatCurrency;
const num = (v) => (typeof v === 'number' ? v : Number(v || 0)) || 0;
const pct = (v, base) => (base > 0 ? `${((v / base) * 100).toFixed(1)}%` : '0.0%');

const controlStyle = {
  background: 'var(--bg)',
  boxShadow: 'var(--shadow-pressed)',
  border: '1px solid var(--border-inner)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-primary)',
  padding: '9px 13px',
  outline: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

function DRERow({ label, value, base, level = 0, bold, color, sub, isPercent, expandable, expanded, onToggle, highlight }) {
  const indent = level * 18;
  const valueColor = color || (value >= 0 ? 'var(--text-primary)' : 'var(--red)');
  return (
    <tr
      onClick={expandable ? onToggle : undefined}
      style={{
        borderBottom: '1px solid var(--border-inner)',
        cursor: expandable ? 'pointer' : 'default',
        background: highlight ? 'var(--surface-2)' : 'transparent',
      }}
    >
      <td style={{ padding: '10px 12px', paddingLeft: 12 + indent }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {expandable && (expanded
            ? <ChevronDown size={13} style={{ color: 'var(--text-tertiary)' }} />
            : <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />)}
          <span style={{
            fontSize: sub ? 12 : 13,
            fontWeight: bold ? 800 : 500,
            color: sub ? 'var(--text-tertiary)' : (color || 'var(--text-secondary)'),
          }}>
            {label}
          </span>
        </div>
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: sub ? 12 : 13, fontWeight: bold ? 800 : 600, color: valueColor }}>
        {isPercent ? `${num(value).toFixed(1)}%` : money(value)}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text-tertiary)' }}>
        {isPercent ? '—' : pct(value, base)}
      </td>
    </tr>
  );
}

export default function DRE() {
  const nowYear = moment().year();
  const [year, setYear] = useState(nowYear);
  const [view, setView] = useState('tabela');
  const [expandCMV, setExpandCMV] = useState(false);
  const [expandDesp, setExpandDesp] = useState(false);

  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'list', '-date', 2000],
    queryFn: () => erp.entities.Transaction.list('-date', 2000),
  });
  const fixedExpensesQuery = useQuery({
    queryKey: ['fixedExpenses', 'active'],
    queryFn: () => erp.entities.FixedExpense.filter({ active: true }),
  });

  const transactions = transactionsQuery.data || [];
  const fixedExpenses = fixedExpensesQuery.data || [];

  const dreQueries = [transactionsQuery, fixedExpensesQuery];
  const isLoading = dreQueries.some((q) => q.isLoading);
  const isError = dreQueries.some((q) => q.isError);
  const firstError = dreQueries.find((q) => q.isError)?.error;
  const refetchAll = () => dreQueries.forEach((q) => q.refetch());

  const dreData = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m += 1) {
      const monthDate = moment().year(year).month(m);
      const monthStart = monthDate.clone().startOf('month').format('YYYY-MM-DD');
      const monthEnd = monthDate.clone().endOf('month').format('YYYY-MM-DD');

      const txMonth = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);

      // Receita Bruta
      const receitaVendas = txMonth.filter((t) => t.type === 'entrada' && t.category === 'vendas').reduce((a, t) => a + num(t.amount), 0);
      const receitaServicos = txMonth.filter((t) => t.type === 'entrada' && t.category === 'servicos').reduce((a, t) => a + num(t.amount), 0);
      const receitaOutras = txMonth.filter((t) => t.type === 'entrada' && !['vendas', 'servicos'].includes(t.category)).reduce((a, t) => a + num(t.amount), 0);
      const receitaBruta = receitaVendas + receitaServicos + receitaOutras;

      // Deducoes (impostos)
      const deducoes = txMonth.filter((t) => t.type === 'saida' && t.category === 'impostos').reduce((a, t) => a + num(t.amount), 0);
      const receitaLiquida = receitaBruta - deducoes;

      // CMV
      const cmvMateriais = txMonth.filter((t) => t.type === 'saida' && t.category === 'materiais').reduce((a, t) => a + num(t.amount), 0);
      const cmvFornecedores = txMonth.filter((t) => t.type === 'saida' && t.category === 'fornecedores').reduce((a, t) => a + num(t.amount), 0);
      const cmv = cmvMateriais + cmvFornecedores;
      const lucroBruto = receitaLiquida - cmv;

      // Despesas Operacionais — despFixas e o total mensal das despesas fixas ativas,
      // contabilizado uma vez em CADA mes do loop (12x no ano), igual ao totalDespOp.
      const despSalarios = txMonth.filter((t) => t.type === 'saida' && t.category === 'salarios').reduce((a, t) => a + num(t.amount), 0);
      const despAluguel = txMonth.filter((t) => t.type === 'saida' && t.category === 'aluguel').reduce((a, t) => a + num(t.amount), 0);
      const despManutencao = txMonth.filter((t) => t.type === 'saida' && t.category === 'manutencao').reduce((a, t) => a + num(t.amount), 0);
      const despFixas = fixedExpenses.reduce((a, e) => a + num(e.amount), 0);
      const despOutras = txMonth.filter((t) => t.type === 'saida' && !['impostos', 'materiais', 'fornecedores', 'salarios', 'aluguel', 'manutencao'].includes(t.category)).reduce((a, t) => a + num(t.amount), 0);
      const totalDespOp = despSalarios + despAluguel + despManutencao + despOutras + despFixas;

      const ebitda = lucroBruto - totalDespOp;
      const lucroLiquido = ebitda; // simplificado (sem D&A/financeiras/IR)
      const margem = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
      const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;

      months.push({
        month: MESES[m],
        monthFull: MESES_FULL[m],
        receitaBruta, receitaVendas, receitaServicos, receitaOutras,
        deducoes, receitaLiquida,
        cmv, cmvMateriais, cmvFornecedores,
        lucroBruto, margemBruta,
        despSalarios, despAluguel, despManutencao, despFixas, despOutras, totalDespOp,
        ebitda, lucroLiquido, margem,
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
    despOutras: acc.despOutras + m.despOutras,
    ebitda: acc.ebitda + m.ebitda,
    lucroLiquido: acc.lucroLiquido + m.lucroLiquido,
  }), {
    receitaBruta: 0, receitaVendas: 0, receitaServicos: 0, receitaOutras: 0,
    deducoes: 0, receitaLiquida: 0, cmv: 0, cmvMateriais: 0, cmvFornecedores: 0,
    lucroBruto: 0, totalDespOp: 0, despSalarios: 0, despAluguel: 0, despManutencao: 0,
    despFixas: 0, despOutras: 0, ebitda: 0, lucroLiquido: 0,
  });

  const margemLiquida = totals.receitaBruta > 0 ? (totals.lucroLiquido / totals.receitaBruta) * 100 : 0;
  const margemBrutaTotal = totals.receitaLiquida > 0 ? (totals.lucroBruto / totals.receitaLiquida) * 100 : 0;
  const margemEbitda = totals.receitaBruta > 0 ? (totals.ebitda / totals.receitaBruta) * 100 : 0;

  const exportCSV = () => {
    const header = ['Mes', 'Receita Bruta', 'Deducoes', 'Receita Liquida', 'CMV', 'Lucro Bruto', 'Desp. Operacionais', 'EBITDA', 'Lucro Liquido', 'Margem %'];
    const rows = dreData.map((m) => [
      m.monthFull, m.receitaBruta.toFixed(2), m.deducoes.toFixed(2), m.receitaLiquida.toFixed(2),
      m.cmv.toFixed(2), m.lucroBruto.toFixed(2), m.totalDespOp.toFixed(2),
      m.ebitda.toFixed(2), m.lucroLiquido.toFixed(2), `${m.margem.toFixed(1)}%`,
    ]);
    const totalRow = [
      `TOTAL ${year}`, totals.receitaBruta.toFixed(2), totals.deducoes.toFixed(2), totals.receitaLiquida.toFixed(2),
      totals.cmv.toFixed(2), totals.lucroBruto.toFixed(2), totals.totalDespOp.toFixed(2),
      totals.ebitda.toFixed(2), totals.lucroLiquido.toFixed(2), `${margemLiquida.toFixed(1)}%`,
    ];
    downloadCsv([header, ...rows, totalRow], `DRE-${year}.csv`);
  };

  const chartData = dreData.map((m) => ({
    name: m.month,
    Receita: Math.round(m.receitaBruta),
    CMV: Math.round(m.cmv),
    'Lucro Liquido': Math.round(m.lucroLiquido),
  }));

  const kpis = [
    { label: 'Receita Bruta', value: totals.receitaBruta, color: 'var(--green)', icon: TrendingUp },
    { label: 'Receita Liquida', value: totals.receitaLiquida, color: 'var(--green)', icon: Wallet },
    { label: 'Lucro Bruto', value: totals.lucroBruto, color: totals.lucroBruto >= 0 ? 'var(--accent)' : 'var(--red)', icon: DollarSign },
    { label: 'EBITDA', value: totals.ebitda, color: totals.ebitda >= 0 ? 'var(--purple)' : 'var(--red)', icon: Activity },
    { label: 'Lucro Liquido', value: totals.lucroLiquido, color: totals.lucroLiquido >= 0 ? 'var(--green)' : 'var(--red)', icon: DollarSign },
    { label: 'Margem Liquida', value: margemLiquida, isPercent: true, color: margemLiquida >= 10 ? 'var(--green)' : margemLiquida >= 0 ? 'var(--orange)' : 'var(--red)', icon: Percent },
  ];

  const margens = [
    { label: 'Margem Bruta', value: margemBrutaTotal, desc: 'Lucro Bruto / Receita Liquida' },
    { label: 'Margem EBITDA', value: margemEbitda, desc: 'EBITDA / Receita Bruta' },
    { label: 'Margem Liquida', value: margemLiquida, desc: 'Lucro Liquido / Receita Bruta' },
  ];

  const marginColor = (v) => (v >= 20 ? 'var(--green)' : v >= 10 ? 'var(--orange)' : 'var(--red)');
  const marginBadge = (v) => (v >= 20 ? 'Saudavel' : v >= 10 ? 'Atencao' : 'Critico');

  return (
    <div className="space-y-6">
      <Header title="DRE — Demonstrativo de Resultados" subtitle={`Exercicio ${year} · Regime de caixa`} />

      <QueryState isLoading={isLoading} isError={isError} error={firstError} onRetry={refetchAll} loadingLabel="Carregando dados do DRE...">
        {/* Controles */}
        <div className="card p-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={controlStyle}>
              {[nowYear, nowYear - 1, nowYear - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ id: 'tabela', label: 'Tabela' }, { id: 'grafico', label: 'Grafico' }].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={view === v.id ? 'card-pressed' : 'card'}
                  style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 'var(--r-full)',
                    cursor: 'pointer', border: view === v.id ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                    color: view === v.id ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', fontSize: 13 }}>
            <Download size={15} /> Exportar DRE
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={`${kpi.label}-${i}`} className="kpi-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} style={{ color: kpi.color }} />
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: kpi.color }}>
                  {kpi.isPercent ? `${kpi.value.toFixed(1)}%` : money(kpi.value)}
                </div>
                {!kpi.isPercent && (
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{pct(kpi.value, totals.receitaBruta)} da receita</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Indicadores de margem */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {margens.map((m) => (
            <div key={m.label} className="card p-5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{m.label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{m.desc}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: marginColor(m.value), margin: 0 }}>{m.value.toFixed(1)}%</p>
                <span style={{
                  display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700,
                  padding: '2px 10px', borderRadius: 'var(--r-full)',
                  color: marginColor(m.value), background: 'var(--surface-2)',
                }}>
                  {marginBadge(m.value)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {view === 'grafico' ? (
          <div className="card p-5">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Evolucao mensal — {year}</p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }} />
                <Legend />
                <Bar dataKey="Receita" fill="var(--green)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CMV" fill="var(--red)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro Liquido" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card p-5">
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: '0 0 16px' }}>DRE completo — {year}</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0 12px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)' }}>Descricao</th>
                    <th style={{ textAlign: 'right', padding: '0 12px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)' }}>Total {year}</th>
                    <th style={{ textAlign: 'right', padding: '0 12px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', width: 96 }}>% Receita</th>
                  </tr>
                </thead>
                <tbody>
                  <DRERow label="(+) RECEITA BRUTA" value={totals.receitaBruta} base={totals.receitaBruta} bold color="var(--green)" />
                  <DRERow label="Vendas de Produtos" value={totals.receitaVendas} base={totals.receitaBruta} level={1} sub />
                  <DRERow label="Receita de Servicos" value={totals.receitaServicos} base={totals.receitaBruta} level={1} sub />
                  <DRERow label="Outras Receitas" value={totals.receitaOutras} base={totals.receitaBruta} level={1} sub />

                  <DRERow label="(-) Deducoes e Impostos" value={-totals.deducoes} base={totals.receitaBruta} color="var(--red)" />
                  <DRERow label="(=) RECEITA LIQUIDA" value={totals.receitaLiquida} base={totals.receitaBruta} bold color="var(--green)" highlight />

                  <DRERow
                    label="(-) CMV / Custos Diretos" value={-totals.cmv} base={totals.receitaBruta} bold color="var(--red)"
                    expandable expanded={expandCMV} onToggle={() => setExpandCMV((e) => !e)}
                  />
                  {expandCMV && (
                    <>
                      <DRERow label="Materiais" value={-totals.cmvMateriais} base={totals.receitaBruta} level={1} sub />
                      <DRERow label="Fornecedores" value={-totals.cmvFornecedores} base={totals.receitaBruta} level={1} sub />
                    </>
                  )}

                  <DRERow label="(=) LUCRO BRUTO" value={totals.lucroBruto} base={totals.receitaBruta} bold color="var(--accent)" highlight />
                  <DRERow label="Margem Bruta" value={margemBrutaTotal} isPercent color="var(--accent)" level={1} sub />

                  <DRERow
                    label="(-) Despesas Operacionais" value={-totals.totalDespOp} base={totals.receitaBruta} bold color="var(--orange)"
                    expandable expanded={expandDesp} onToggle={() => setExpandDesp((e) => !e)}
                  />
                  {expandDesp && (
                    <>
                      <DRERow label="Salarios e Encargos" value={-totals.despSalarios} base={totals.receitaBruta} level={1} sub />
                      <DRERow label="Aluguel" value={-totals.despAluguel} base={totals.receitaBruta} level={1} sub />
                      <DRERow label="Manutencao" value={-totals.despManutencao} base={totals.receitaBruta} level={1} sub />
                      {/*
                        BUG CORRIGIDO (x12): totals.despFixas JA e a soma dos 12 meses — o valor
                        mensal das despesas fixas e somado em cada iteracao do loop, exatamente
                        como acontece com totalDespOp. O codigo antigo exibia -totals.despFixas * 12,
                        multiplicando o total anual de novo. Aqui mostramos o total anual direto,
                        coerente com o que ja esta somado em (-) Despesas Operacionais.
                      */}
                      <DRERow label="Despesas Fixas (12 meses)" value={-totals.despFixas} base={totals.receitaBruta} level={1} sub />
                      <DRERow label="Outras Despesas" value={-totals.despOutras} base={totals.receitaBruta} level={1} sub />
                    </>
                  )}

                  <DRERow label="(=) EBITDA" value={totals.ebitda} base={totals.receitaBruta} bold color={totals.ebitda >= 0 ? 'var(--purple)' : 'var(--red)'} highlight />
                  <DRERow label="Margem EBITDA" value={margemEbitda} isPercent color="var(--purple)" level={1} sub />

                  <DRERow label="(=) LUCRO LIQUIDO" value={totals.lucroLiquido} base={totals.receitaBruta} bold color={totals.lucroLiquido >= 0 ? 'var(--green)' : 'var(--red)'} highlight />
                  <DRERow label="Margem Liquida" value={margemLiquida} isPercent color={margemLiquida >= 0 ? 'var(--green)' : 'var(--red)'} level={1} sub />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Evolucao mensal detalhada */}
        <div className="card p-5">
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: '0 0 16px' }}>Evolucao mensal detalhada</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Mes', 'Rec. Bruta', 'CMV', 'Lucro Bruto', 'Desp. Op.', 'EBITDA', 'Luc. Liquido', 'Margem'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '0 8px 10px', fontWeight: 700, color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dreData.map((m) => (
                  <tr key={m.monthFull} style={{ borderBottom: '1px solid var(--border-inner)' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.monthFull}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--green)' }}>{money(m.receitaBruta)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--red)' }}>{money(m.cmv)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: m.lucroBruto >= 0 ? 'var(--accent)' : 'var(--red)' }}>{money(m.lucroBruto)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--orange)' }}>{money(m.totalDespOp)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: m.ebitda >= 0 ? 'var(--purple)' : 'var(--red)' }}>{money(m.ebitda)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: m.lucroLiquido >= 0 ? 'var(--green)' : 'var(--red)' }}>{money(m.lucroLiquido)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: m.margem >= 10 ? 'var(--green)' : m.margem >= 0 ? 'var(--orange)' : 'var(--red)' }}>{m.margem.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--accent-border)', background: 'var(--surface-2)', fontWeight: 800 }}>
                  <td style={{ padding: '10px 8px', color: 'var(--accent)' }}>TOTAL {year}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--green)' }}>{money(totals.receitaBruta)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--red)' }}>{money(totals.cmv)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: totals.lucroBruto >= 0 ? 'var(--accent)' : 'var(--red)' }}>{money(totals.lucroBruto)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--orange)' }}>{money(totals.totalDespOp)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: totals.ebitda >= 0 ? 'var(--purple)' : 'var(--red)' }}>{money(totals.ebitda)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: totals.lucroLiquido >= 0 ? 'var(--green)' : 'var(--red)' }}>{money(totals.lucroLiquido)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: margemLiquida >= 0 ? 'var(--green)' : 'var(--red)' }}>{margemLiquida.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
