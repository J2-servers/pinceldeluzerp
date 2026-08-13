import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import QueryState from '@/components/ui/QueryState';
import MovimentacoesTab from '@/components/financeiro/MovimentacoesTab';
import ContasPagar from '@/components/financeiro/ContasPagar';
import ContasReceber from '@/components/financeiro/ContasReceber';
import CapitalSocios from '@/components/financeiro/CapitalSocios';
import InadimplenciaAging from '@/components/financeiro/InadimplenciaAging';
import GestaoComissoes from '@/components/financeiro/GestaoComissoes';
import ImpostoSimples from '@/components/financeiro/ImpostoSimples';
import FinanceActionCenter from '@/components/financeiro/FinanceActionCenter';
import FinanceCashFlowChart from '@/components/financeiro/FinanceCashFlowChart';
import FinanceCategoryAnalysis from '@/components/financeiro/FinanceCategoryAnalysis';
import FinancePlanMatrix from '@/components/financeiro/FinancePlanMatrix';
import { Download, RefreshCw, TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import moment from 'moment';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';
import { downloadCsv } from '@/lib/downloadUtils';
import { PARTNERS } from '@/lib/financeConstants';

const money = formatCurrency;
const normalizeDate = (date) => date || '9999-12-31';

function buildActionItem(item, kind) {
  return {
    id: item.id,
    title: item.description || item.client_name || item.supplier_name || 'Registro financeiro',
    subtitle: `${kind} · ${item.due_date ? moment(item.due_date).format('DD/MM/YYYY') : 'sem vencimento'}`,
    amount: parseDecimal(item.amount),
  };
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 700, transition: 'all 0.15s ease', whiteSpace: 'nowrap',
        background: active ? 'var(--accent)' : 'var(--bg)',
        color: active ? 'var(--text-inverted)' : 'var(--text-secondary)',
        boxShadow: active ? 'var(--shadow-pressed)' : 'var(--shadow-raised)',
      }}
    >
      {children}
    </button>
  );
}

function HealthRing({ score, label }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const color = score >= 75 ? 'var(--green)' : score >= 45 ? 'var(--orange)' : 'var(--red)';
  const HealthIcon = score >= 75 ? CheckCircle : score >= 45 ? AlertTriangle : AlertCircle;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
        <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius}
            fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <span style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>pts</span>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <HealthIcon size={16} style={{ color }} />
          <span style={{ fontWeight: 800, fontSize: 16, color }}>{label}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 160 }}>
          {score >= 75 ? 'Empresa com boa saúde financeira' : score >= 45 ? 'Atenção a alguns indicadores' : 'Situação crítica — ação imediata'}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 6, borderRadius: 'var(--r-full)', background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', overflow: 'hidden', width: 160 }}>
            <div style={{
              height: '100%', borderRadius: 'var(--r-full)',
              background: color,
              width: `${score}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState('cockpit');

  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'list', '-date'],
    queryFn: () => erp.entities.Transaction.list('-date'),
  });
  const payablesQuery = useQuery({
    queryKey: ['accountsPayable'],
    queryFn: () => erp.entities.AccountPayable.list('due_date'),
  });
  const receivablesQuery = useQuery({
    queryKey: ['accountsReceivable'],
    queryFn: () => erp.entities.AccountReceivable.list('due_date'),
  });
  const fixedExpensesQuery = useQuery({
    queryKey: ['fixedExpenses'],
    queryFn: () => erp.entities.FixedExpense.filter({ active: true }),
  });
  const capitalMovementsQuery = useQuery({
    queryKey: ['partnerCapital'],
    queryFn: () => erp.entities.PartnerCapital.list('-date'),
  });

  const transactions = transactionsQuery.data || [];
  const payables = payablesQuery.data || [];
  const receivables = receivablesQuery.data || [];
  const fixedExpenses = fixedExpensesQuery.data || [];
  const capitalMovements = capitalMovementsQuery.data || [];
  const refetchTransactions = transactionsQuery.refetch;
  const refetchPayables = payablesQuery.refetch;
  const refetchReceivables = receivablesQuery.refetch;
  const refetchFixedExpenses = fixedExpensesQuery.refetch;
  const refetchCapital = capitalMovementsQuery.refetch;

  const financeQueries = [transactionsQuery, payablesQuery, receivablesQuery, fixedExpensesQuery, capitalMovementsQuery];
  const isLoading = financeQueries.some((q) => q.isLoading);
  const isError = financeQueries.some((q) => q.isError);
  const firstError = financeQueries.find((q) => q.isError)?.error;
  const refetchAll = () => financeQueries.forEach((q) => q.refetch());

  const today = moment().format('YYYY-MM-DD');
  const nextSevenDays = moment().add(7, 'days').format('YYYY-MM-DD');

  const financial = useMemo(() => {
    const monthTransactions = transactions.filter((item) => moment(item.date).isSame(moment(), 'month'));
    const yearTransactions = transactions.filter((item) => moment(item.date).isSame(moment(), 'year'));
    const monthIncome = monthTransactions.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const monthExpense = monthTransactions.filter((item) => item.type === 'saida').reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const yearIncome = yearTransactions.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const totalIncome = transactions.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const totalExpense = transactions.filter((item) => item.type === 'saida').reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const openPayable = payables.filter((item) => !item.paid).reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const openReceivable = receivables.filter((item) => !item.received).reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const overduePayableValue = payables.filter((item) => !item.paid && item.due_date < today).reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const overdueReceivableValue = receivables.filter((item) => !item.received && item.due_date < today).reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const fixedExpensesTotal = fixedExpenses.reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const partnerCapital = PARTNERS.reduce((sum, partner) => {
      const moves = capitalMovements.filter((item) => item.partner === partner);
      const positive = moves.filter((item) => ['aporte', 'emprestimo_socio'].includes(item.type)).reduce((acc, item) => acc + parseDecimal(item.amount), 0);
      const negative = moves.filter((item) => ['retirada', 'pro_labore', 'dividendo', 'devolucao_emprestimo'].includes(item.type)).reduce((acc, item) => acc + parseDecimal(item.amount), 0);
      return sum + positive - negative;
    }, 0);
    const monthResult = monthIncome - monthExpense;
    const margin = monthIncome > 0 ? (monthResult / monthIncome) * 100 : 0;
    const cashBalance = totalIncome - totalExpense;

    let healthScore = 100;
    if (monthResult < 0) healthScore -= 24;
    if (overduePayableValue > 0) healthScore -= 18;
    if (overdueReceivableValue > monthIncome * 0.25 && monthIncome > 0) healthScore -= 16;
    if (cashBalance < openPayable) healthScore -= 18;
    if (margin < 10 && monthIncome > 0) healthScore -= 12;
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    return {
      monthIncome, monthExpense, monthResult, yearIncome,
      totalIncome, totalExpense, cashBalance,
      openPayable, openReceivable, overduePayableValue, overdueReceivableValue,
      fixedExpenses: fixedExpensesTotal, partnerCapital, margin, healthScore,
      healthLabel: healthScore >= 75 ? 'Saudável' : healthScore >= 45 ? 'Atenção' : 'Crítico',
    };
  }, [transactions, payables, receivables, fixedExpenses, capitalMovements, today]);

  const actionData = useMemo(() => {
    const overduePayables = payables
      .filter((item) => !item.paid && item.due_date < today)
      .sort((a, b) => normalizeDate(a.due_date).localeCompare(normalizeDate(b.due_date)))
      .map((item) => buildActionItem(item, 'Pagar'));
    const overdueReceivables = receivables
      .filter((item) => !item.received && item.due_date < today)
      .sort((a, b) => normalizeDate(a.due_date).localeCompare(normalizeDate(b.due_date)))
      .map((item) => buildActionItem(item, 'Cobrar'));
    const dueSoonPayables = payables
      .filter((item) => !item.paid && item.due_date >= today && item.due_date <= nextSevenDays)
      .sort((a, b) => normalizeDate(a.due_date).localeCompare(normalizeDate(b.due_date)))
      .map((item) => buildActionItem(item, 'Vence'));
    const dueSoonReceivables = receivables
      .filter((item) => !item.received && item.due_date >= today && item.due_date <= nextSevenDays)
      .sort((a, b) => normalizeDate(a.due_date).localeCompare(normalizeDate(b.due_date)))
      .map((item) => buildActionItem(item, 'Receber'));
    return { overduePayables, overdueReceivables, dueSoonPayables, dueSoonReceivables };
  }, [payables, receivables, today, nextSevenDays]);

  const analytics = useMemo(() => {
    const monthlyMap = {};
    for (let i = 5; i >= 0; i -= 1) {
      const key = moment().subtract(i, 'months').format('YYYY-MM');
      monthlyMap[key] = { month: moment(key).format('MMM/YY'), entradas: 0, saidas: 0, resultado: 0 };
    }
    transactions.forEach((item) => {
      const key = moment(item.date).format('YYYY-MM');
      if (!monthlyMap[key]) return;
      if (item.type === 'entrada') monthlyMap[key].entradas += parseDecimal(item.amount);
      if (item.type === 'saida') monthlyMap[key].saidas += parseDecimal(item.amount);
      monthlyMap[key].resultado = monthlyMap[key].entradas - monthlyMap[key].saidas;
    });

    const totalCategoryExpenses = transactions.filter((item) => item.type === 'saida' && moment(item.date).isSame(moment(), 'month')).reduce((sum, item) => sum + parseDecimal(item.amount), 0);
    const categoryMap = {};
    transactions.filter((item) => item.type === 'saida' && moment(item.date).isSame(moment(), 'month')).forEach((item) => {
      const key = item.category || 'outros';
      categoryMap[key] = (categoryMap[key] || 0) + parseDecimal(item.amount);
    });
    const categoryData = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value, percent: totalCategoryExpenses > 0 ? (value / totalCategoryExpenses) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    const paymentMap = {};
    transactions.filter((item) => moment(item.date).isSame(moment(), 'month')).forEach((item) => {
      const key = item.payment_method || 'indefinido';
      paymentMap[key] = (paymentMap[key] || 0) + parseDecimal(item.amount);
    });
    const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    let projectedBalance = financial.cashBalance;
    const projectionData = Array.from({ length: 31 }).map((_, index) => {
      const date = moment().add(index, 'days').format('YYYY-MM-DD');
      const dayIncome = receivables.filter((item) => !item.received && item.due_date === date).reduce((sum, item) => sum + parseDecimal(item.amount), 0);
      const dayExpense = payables.filter((item) => !item.paid && item.due_date === date).reduce((sum, item) => sum + parseDecimal(item.amount), 0);
      projectedBalance += dayIncome - dayExpense;
      return { day: moment(date).format('DD/MM'), saldo: projectedBalance };
    });

    return { monthlyData: Object.values(monthlyMap), categoryData, paymentData, projectionData };
  }, [transactions, receivables, payables, financial.cashBalance]);

  const refreshAll = () => {
    refetchTransactions();
    refetchPayables();
    refetchReceivables();
    refetchFixedExpenses();
    refetchCapital();
  };

  const exportExecutiveCsv = () => {
    const rows = [
      ['Indicador', 'Valor'],
      ['Entradas do mês', financial.monthIncome],
      ['Saídas do mês', financial.monthExpense],
      ['Resultado do mês', financial.monthResult],
      ['Saldo de caixa', financial.cashBalance],
      ['A pagar em aberto', financial.openPayable],
      ['A receber em aberto', financial.openReceivable],
      ['Inadimplência', financial.overdueReceivableValue],
      ['Contas vencidas a pagar', financial.overduePayableValue],
      ['Saúde financeira', financial.healthScore],
    ];
    downloadCsv(rows, `resumo-financeiro-${moment().format('YYYY-MM-DD')}.csv`);
  };

  // KPIs principais
  const kpis = [
    {
      label: 'Saldo de caixa',
      value: money(financial.cashBalance),
      sub: 'Total acumulado',
      icon: DollarSign,
      color: financial.cashBalance >= 0 ? 'var(--green)' : 'var(--red)',
      muted: financial.cashBalance >= 0 ? 'var(--green-muted)' : 'var(--red-muted)',
    },
    {
      label: 'Receitas do mês',
      value: money(financial.monthIncome),
      sub: `Ano: ${money(financial.yearIncome)}`,
      icon: TrendingUp,
      color: 'var(--green)',
      muted: 'var(--green-muted)',
    },
    {
      label: 'Despesas do mês',
      value: money(financial.monthExpense),
      sub: `Fixas: ${money(financial.fixedExpenses)}`,
      icon: TrendingDown,
      color: 'var(--red)',
      muted: 'var(--red-muted)',
    },
    {
      label: 'Margem líquida',
      value: `${financial.margin.toFixed(1)}%`,
      sub: `Resultado: ${money(financial.monthResult)}`,
      icon: Activity,
      color: financial.margin >= 10 ? 'var(--green)' : financial.margin >= 0 ? 'var(--orange)' : 'var(--red)',
      muted: financial.margin >= 10 ? 'var(--green-muted)' : 'var(--orange-muted)',
    },
  ];

  const tabs = [
    { id: 'cockpit', label: 'Cockpit' },
    { id: 'movimentacoes', label: 'Movimentações' },
    { id: 'apagar', label: 'A Pagar' },
    { id: 'areceber', label: 'A Receber' },
    { id: 'capital', label: 'Capital' },
    { id: 'inadimplencia', label: 'Inadimplência' },
    { id: 'comissoes', label: 'Comissões' },
    { id: 'impostos', label: 'Impostos' },
  ];

  return (
    <div style={{ padding: '0 0 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Header title="Financeiro" subtitle="Cockpit completo de caixa, contas, riscos, projeções e governança" />

      <QueryState isLoading={isLoading} isError={isError} error={firstError} onRetry={refetchAll} loadingLabel="Carregando dados financeiros...">
      {/* Ações */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="btn-nm" onClick={refreshAll} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Atualizar
        </button>
        <button className="btn-primary" onClick={exportExecutiveCsv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Exportar resumo
        </button>
      </div>

      {/* ── VISÃO GERAL ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ background: 'var(--accent-muted)', color: 'var(--accent)', borderRadius: 'var(--r-sm)', padding: 8 }}>
            <DollarSign size={16} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Visão Geral</span>
        </div>

        {/* 4 KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</span>
                <div style={{ background: kpi.muted, color: kpi.color, borderRadius: 'var(--r-sm)', padding: 8 }}>
                  <kpi.icon size={15} />
                </div>
              </div>
              <div className="kpi-number" style={{ color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Score + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Saúde financeira */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 20 }}>Saúde financeira</div>
          <HealthRing score={financial.healthScore} label={financial.healthLabel} />

          <div className="section-divider" style={{ margin: '20px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Resultado mensal', ok: financial.monthResult >= 0, text: financial.monthResult >= 0 ? 'Positivo' : 'Negativo' },
              { label: 'Contas vencidas', ok: financial.overduePayableValue === 0, text: financial.overduePayableValue === 0 ? 'Nenhuma' : money(financial.overduePayableValue) },
              { label: 'Inadimplência', ok: financial.overdueReceivableValue === 0, text: financial.overdueReceivableValue === 0 ? 'Zerada' : money(financial.overdueReceivableValue) },
              { label: 'Margem', ok: financial.margin >= 10, text: `${financial.margin.toFixed(1)}%` },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: item.ok ? 'var(--green)' : 'var(--red)',
                  background: item.ok ? 'var(--green-muted)' : 'var(--red-muted)',
                  padding: '2px 8px', borderRadius: 'var(--r-full)',
                }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Snap financeiro */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 20 }}>Posição financeira</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'A receber (em aberto)', value: money(financial.openReceivable), color: 'var(--green)', muted: 'var(--green-muted)' },
              { label: 'A pagar (em aberto)', value: money(financial.openPayable), color: 'var(--red)', muted: 'var(--red-muted)' },
              { label: 'Inadimplência', value: money(financial.overdueReceivableValue), color: 'var(--orange)', muted: 'var(--orange-muted)' },
              { label: 'Contas vencidas', value: money(financial.overduePayableValue), color: 'var(--red)', muted: 'var(--red-muted)' },
              { label: 'Capital dos sócios', value: money(financial.partnerCapital), color: 'var(--purple)', muted: 'var(--purple-muted)' },
              { label: 'Despesas fixas/mês', value: money(financial.fixedExpenses), color: 'var(--accent)', muted: 'var(--accent-muted)' },
            ].map((item) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--bg)', boxShadow: 'var(--shadow-flat)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <section>
        {/* Tab list */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', padding: '14px 16px',
          background: 'var(--bg)', borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-pressed)', marginBottom: 24,
        }}>
          {tabs.map((tab) => (
            <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </TabButton>
          ))}
        </div>

        {/* Tab contents */}
        {activeTab === 'cockpit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ background: 'var(--accent-muted)', color: 'var(--accent)', borderRadius: 'var(--r-sm)', padding: 8 }}>
                <Activity size={16} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Transações</span>
            </div>
            <FinanceActionCenter {...actionData} />

            <div className="section-divider" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ background: 'var(--green-muted)', color: 'var(--green)', borderRadius: 'var(--r-sm)', padding: 8 }}>
                <TrendingUp size={16} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Projeções</span>
            </div>
            <FinanceCashFlowChart monthlyData={analytics.monthlyData} projectionData={analytics.projectionData} />

            <div className="section-divider" />
            <FinanceCategoryAnalysis categoryData={analytics.categoryData} paymentData={analytics.paymentData} />
            <FinancePlanMatrix />
          </div>
        )}

        {activeTab === 'movimentacoes' && <MovimentacoesTab />}
        {activeTab === 'apagar' && <ContasPagar />}
        {activeTab === 'areceber' && <ContasReceber />}
        {activeTab === 'capital' && <CapitalSocios />}
        {activeTab === 'inadimplencia' && <InadimplenciaAging receivables={receivables} />}
        {activeTab === 'comissoes' && <GestaoComissoes />}
        {activeTab === 'impostos' && <ImpostoSimples receitaAnual={financial.yearIncome} />}
      </section>
      </QueryState>
    </div>
  );
}
