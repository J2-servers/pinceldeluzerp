import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import StatusBadge from '@/components/ui/StatusBadge';
import RevenueChart from '@/components/dashboard/RevenueChart';
import CategoryPieChart from '@/components/dashboard/CategoryPieChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import UpcomingEvents from '@/components/dashboard/UpcomingEvents';
import DashboardKPIsAvancados from '@/components/dashboard/DashboardKPIsAvancados';
import ScorecardKPIs from '@/components/dashboard/ScorecardKPIs';
import TrendingRevenueChart from '@/components/dashboard/TrendingRevenueChart';
import TopProdutosWidget from '@/components/dashboard/TopProdutosWidget';
import AlertasPrazo from '@/components/dashboard/AlertasPrazo';
import ConversaoOrcamentos from '@/components/dashboard/ConversaoOrcamentos';
import TicketMedioTrend from '@/components/dashboard/TicketMedioTrend';
import PaymentMethodChart from '@/components/dashboard/PaymentMethodChart';
import MetasWidget from '@/components/dashboard/MetasWidget';
import StrategicSummaryCard from '@/components/dashboard/StrategicSummaryCard';
import SystemIntegrityPanel from '@/components/dashboard/SystemIntegrityPanel';
import QueryState from '@/components/ui/QueryState';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  DollarSign,
  FileText,
  Gauge,
  Package,
  PiggyBank,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import moment from 'moment';
import { createPageUrl } from '@/utils';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';

const money = formatCurrency;
const shortMoney = (value) => `R$ ${parseDecimal(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
const currentMonth = moment().format('YYYY-MM');

function sumBy(items, getter) {
  return items.reduce((sum, item) => sum + parseDecimal(getter(item)), 0);
}

function monthSeries(transactions) {
  return Array.from({ length: 6 }, (_, index) => {
    const month = moment().subtract(5 - index, 'months');
    const key = month.format('YYYY-MM');
    const monthTransactions = transactions.filter((item) => (item.date || '').startsWith(key));
    const receitas = sumBy(monthTransactions.filter((item) => item.type === 'entrada'), (item) => item.amount);
    const despesas = sumBy(monthTransactions.filter((item) => item.type === 'saida'), (item) => item.amount);
    return {
      month: month.format('MMM'),
      receitas,
      despesas,
      lucro: receitas - despesas,
    };
  });
}

function salesAsRevenueRecords(salesOrders) {
  return salesOrders
    .filter((order) => !['cancelado'].includes(order.status) && parseDecimal(order.total) > 0)
    .map((order) => ({
      id: `sale-${order.id}`,
      type: 'entrada',
      amount: parseDecimal(order.total),
      date: String(order.created_date || order.date || order.delivery_date || '').slice(0, 10),
      category: 'vendas',
      payment_method: order.payment_method || 'pix',
      order_id: order.id,
      description: `Venda ${order.order_number || ''} — ${order.client_name || ''}`,
      confirmed: order.payment_status === 'pago',
    }))
    .filter((item) => item.date);
}

function buildDashboardFinancialRecords(transactions, salesOrders) {
  const nonSalesTransactions = transactions.filter((item) => item.type !== 'entrada' || (item.category !== 'vendas' && !item.order_id));
  return [...nonSalesTransactions, ...salesAsRevenueRecords(salesOrders)];
}

function groupMoney(items, field, valueGetter) {
  const grouped = items.reduce((acc, item) => {
    const key = item[field] || 'Não informado';
    acc[key] = (acc[key] || 0) + parseDecimal(valueGetter(item));
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([name, value]) => ({ name: String(name).replace(/_/g, ' '), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

// KPI Card neumórfico com ícone colorido
function ExecutiveCard({ icon: Icon, title, value, note, meaning, accentVar = '--accent', to }) {
  const content = (
    <div className="kpi-card h-full" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-tertiary)', marginBottom: '6px' }}>{title}</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
          {note && <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>{note}</p>}
        </div>
        <div style={{
          width: '40px', height: '40px', borderRadius: 'var(--r-md)',
          background: `var(${accentVar}-muted, var(--accent-muted))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: 'var(--shadow-flat)',
        }}>
          <Icon style={{ width: '18px', height: '18px', color: `var(${accentVar}, var(--accent))` }} />
        </div>
      </div>
      {meaning && (
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5, borderTop: '1px solid var(--nm-dark)', paddingTop: '8px' }}>{meaning}</p>
      )}
    </div>
  );

  return to ? <Link to={to} style={{ display: 'block', height: '100%', textDecoration: 'none' }}>{content}</Link> : content;
}

// Fila de trabalho neumórfica
function WorkQueue({ title, icon: Icon, items, empty, to, renderItem }) {
  return (
    <div className="card" style={{ padding: '20px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon style={{ width: '16px', height: '16px', color: 'var(--accent)' }} />
          <h3 style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '14px', margin: 0 }}>{title}</h3>
        </div>
        {to && (
          <Link to={to} style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            Abrir <ArrowRight style={{ width: '12px', height: '12px' }} />
          </Link>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.length
          ? items.map(renderItem)
          : <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '24px 0', textAlign: 'center' }}>{empty}</p>
        }
      </div>
    </div>
  );
}

// Barra de saúde neumórfica
function HealthBar({ label, value, accentVar = '--accent', meaning }) {
  const width = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="card-pressed" style={{ padding: '12px', borderRadius: 'var(--r-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)' }}>{width.toFixed(0)}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '99px', background: 'var(--nm-dark)', overflow: 'hidden', boxShadow: 'var(--shadow-pressed)' }}>
        <div style={{
          height: '100%', borderRadius: '99px',
          width: `${width}%`,
          background: `var(${accentVar}, var(--accent))`,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {meaning && <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', lineHeight: 1.5 }}>{meaning}</p>}
    </div>
  );
}

// Título de seção neumórfico
function SectionTitle({ icon: Icon, title, subtitle, accentVar = '--accent' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: 'var(--r-md)', flexShrink: 0,
        background: `var(${accentVar}-muted, var(--accent-muted))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-flat)',
      }}>
        <Icon style={{ width: '16px', height: '16px', color: `var(${accentVar}, var(--accent))` }} />
      </div>
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{subtitle}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const q1 = useQuery({ queryKey: ['transactions-dashboard'], queryFn: () => erp.entities.Transaction.list('-date', 600) });
  const q2 = useQuery({ queryKey: ['sales-dashboard'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 300) });
  const q3 = useQuery({ queryKey: ['quotes-dashboard'], queryFn: () => erp.entities.ProductQuote.list('-created_date', 300) });
  const q4 = useQuery({ queryKey: ['products-dashboard'], queryFn: () => erp.entities.Product.list('name') });
  const q5 = useQuery({ queryKey: ['clients-dashboard'], queryFn: () => erp.entities.Client.list() });
  const q6 = useQuery({ queryKey: ['service-dashboard'], queryFn: () => erp.entities.ServiceOrder.list('-created_date', 200) });
  const q7 = useQuery({ queryKey: ['events-dashboard'], queryFn: () => erp.entities.CalendarEvent.list('date', 80) });
  const q8 = useQuery({ queryKey: ['goals-dashboard'], queryFn: () => erp.entities.Goal.list('-created_date', 120) });
  const q9 = useQuery({ queryKey: ['machine-dashboard'], queryFn: () => erp.entities.MachineCost.list('-created_date', 80) });
  const q10 = useQuery({ queryKey: ['receivables-dashboard'], queryFn: () => erp.entities.AccountReceivable.list('-due_date', 200) });
  const q11 = useQuery({ queryKey: ['payables-dashboard'], queryFn: () => erp.entities.AccountPayable.list('-due_date', 200) });

  const dashboardQueries = [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11];
  const isLoading = dashboardQueries.some((q) => q.isLoading);
  const isError = dashboardQueries.some((q) => q.isError);
  const firstError = dashboardQueries.find((q) => q.isError)?.error;
  const refetchAll = () => dashboardQueries.forEach((q) => q.refetch());

  const transactions = q1.data || [];
  const salesOrders = q2.data || [];
  const quotesRaw = q3.data || [];
  const products = q4.data || [];
  const clients = q5.data || [];
  const serviceOrders = q6.data || [];
  const events = q7.data || [];
  const goals = q8.data || [];
  const machineCosts = q9.data || [];
  const receivables = q10.data || [];
  const payables = q11.data || [];

  const quotes = useMemo(() => quotesRaw.map((quote) => ({
    ...quote,
    total: parseDecimal(quote.final_price || quote.total_price || quote.total),
    status: quote.status === 'reprovado' ? 'recusado' : quote.status,
  })), [quotesRaw]);

  const dashboardFinancialRecords = useMemo(() => buildDashboardFinancialRecords(transactions, salesOrders), [transactions, salesOrders]);

  const financial = useMemo(() => {
    const monthTransactions = dashboardFinancialRecords.filter((item) => (item.date || '').startsWith(currentMonth));
    const receitasMes = sumBy(monthTransactions.filter((item) => item.type === 'entrada'), (item) => item.amount);
    const despesasMes = sumBy(monthTransactions.filter((item) => item.type === 'saida'), (item) => item.amount);
    const saldoGeral = sumBy(dashboardFinancialRecords.filter((item) => item.type === 'entrada'), (item) => item.amount) - sumBy(dashboardFinancialRecords.filter((item) => item.type === 'saida'), (item) => item.amount);
    const contasReceber = sumBy(receivables.filter((item) => !item.received && item.status !== 'cancelado'), (item) => item.amount || item.total || item.value);
    const contasPagar = sumBy(payables.filter((item) => !item.paid && item.status !== 'cancelado'), (item) => item.amount || item.total || item.value);
    const margem = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0;
    return { receitasMes, despesasMes, resultadoMes: receitasMes - despesasMes, saldoGeral, contasReceber, contasPagar, margem };
  }, [dashboardFinancialRecords, receivables, payables]);

  const commercial = useMemo(() => {
    const pedidosAbertos = salesOrders.filter((item) => !['entregue', 'cancelado'].includes(item.status));
    const pedidosPendentes = salesOrders.filter((item) => item.payment_status === 'pendente');
    const orcamentosAbertos = quotes.filter((item) => ['rascunho', 'enviado'].includes(item.status));
    const orcamentosAprovados = quotes.filter((item) => item.status === 'aprovado');
    const ticketMedio = salesOrders.length ? sumBy(salesOrders, (item) => item.total) / salesOrders.length : 0;
    const taxaConversao = quotes.length ? (orcamentosAprovados.length / quotes.length) * 100 : 0;
    const pipelineValue = sumBy(orcamentosAbertos, (item) => item.total);
    return { pedidosAbertos, pedidosPendentes, orcamentosAbertos, ticketMedio, taxaConversao, pipelineValue };
  }, [salesOrders, quotes]);

  const operation = useMemo(() => {
    const osAbertas = serviceOrders.filter((item) => !['concluida', 'cancelada'].includes(item.status));
    const estoqueCritico = products.filter((item) => item.track_stock !== false && parseDecimal(item.quantity) <= parseDecimal(item.min_quantity || 1));
    const estoqueValor = sumBy(products, (item) => parseDecimal(item.quantity) * parseDecimal(item.cost_price));
    const entregasAtrasadas = commercial.pedidosAbertos.filter((item) => item.delivery_date && item.delivery_date < moment().format('YYYY-MM-DD'));
    const entregasHoje = commercial.pedidosAbertos.filter((item) => item.delivery_date && item.delivery_date === moment().format('YYYY-MM-DD'));
    const estoqueSaude = products.length ? ((products.length - estoqueCritico.length) / products.length) * 100 : 100;
    return { osAbertas, estoqueCritico, estoqueValor, entregasAtrasadas, entregasHoje, estoqueSaude };
  }, [serviceOrders, products, commercial.pedidosAbertos]);

  const clientStats = useMemo(() => {
    const devedores = clients.filter((item) => parseDecimal(item.total_debt) > 0).sort((a, b) => parseDecimal(b.total_debt) - parseDecimal(a.total_debt));
    const vip = clients.filter((item) => parseDecimal(item.total_purchases) >= 1000).length;
    const risco = clients.filter((item) => ['atrasado', 'inadimplente'].includes(item.status)).length;
    return { devedores, vip, risco };
  }, [clients]);

  const chartData = useMemo(() => monthSeries(dashboardFinancialRecords), [dashboardFinancialRecords]);
  const categoryData = useMemo(() => groupMoney(dashboardFinancialRecords.filter((item) => item.type === 'entrada'), 'category', (item) => item.amount), [dashboardFinancialRecords]);
  const paymentData = useMemo(() => groupMoney(salesOrders, 'payment_method', (item) => item.total), [salesOrders]);
  const quoteStatusData = useMemo(() => groupMoney(quotes, 'status', (item) => item.total), [quotes]);

  const próximosEventos = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    return events.filter((event) => !event.date || event.date >= today).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 8);
  }, [events]);

  const executiveHealth = [
    { label: 'Margem do mês', value: financial.margem, accentVar: financial.margem >= 20 ? '--green' : financial.margem >= 10 ? '--orange' : '--red', meaning: 'Quanto sobra da receita após despesas.' },
    { label: 'Conversão comercial', value: commercial.taxaConversao, accentVar: commercial.taxaConversao >= 45 ? '--green' : commercial.taxaConversao >= 25 ? '--orange' : '--red', meaning: 'Orçamentos que viraram negócio aprovado.' },
    { label: 'Saúde do estoque', value: operation.estoqueSaude, accentVar: operation.estoqueSaude >= 85 ? '--green' : operation.estoqueSaude >= 65 ? '--orange' : '--red', meaning: 'Produtos fora do nível crítico.' },
  ];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Header title="Dashboard Executivo" subtitle="Visão completa: finanças, comercial, produção, estoque, clientes, metas e riscos em tempo real" />

      <QueryState isLoading={isLoading} isError={isError} error={firstError} onRetry={refetchAll} loadingLabel="Carregando dados do dashboard...">
      {/* Botões de ação */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <Link to={`${createPageUrl('Orcamentos')}?novo=1`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '10px 20px', borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: '14px' }}>
          <FileText style={{ width: '16px', height: '16px' }} /> Criar novo orçamento
        </Link>
        <Link to={`${createPageUrl('Vendas')}?novo=1`} className="btn-nm" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '10px 20px', borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          <ShoppingCart style={{ width: '16px', height: '16px' }} /> Lançar venda
        </Link>
      </div>

      <SystemIntegrityPanel />

      {/* Centro de Comando */}
      <div style={{ background: 'var(--accent-muted)', borderRadius: 'var(--r-xl)', padding: '24px', boxShadow: 'var(--shadow-raised)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--accent)', margin: '0 0 6px 0' }}>Centro de comando</p>
              <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>O que precisa de decisão agora</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '520px', lineHeight: 1.6 }}>Informações agrupadas por finalidade: saúde da empresa, dinheiro, vendas, operação e alertas.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {executiveHealth.map((item) => <HealthBar key={item.label} {...item} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Seção Financeiro */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={DollarSign} title="Financeiro principal" subtitle="Mostra rapidamente se o mês está gerando caixa ou consumindo dinheiro." accentVar="--green" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <ExecutiveCard icon={TrendingUp} title="Receita do mês" value={money(financial.receitasMes)} note="vendas + entradas" meaning="Soma das vendas e outras entradas do mês, sem duplicar venda que já virou transação." accentVar="--green" to={createPageUrl('Financeiro')} />
          <ExecutiveCard icon={TrendingDown} title="Despesas do mês" value={money(financial.despesasMes)} note="saídas registradas" meaning="Tudo que saiu do caixa dentro do mês atual." accentVar="--red" to={createPageUrl('Financeiro')} />
          <ExecutiveCard icon={PiggyBank} title="Resultado" value={money(financial.resultadoMes)} note={`${financial.margem.toFixed(1)}% de margem`} meaning="Diferença entre receitas e despesas do mês." accentVar={financial.resultadoMes >= 0 ? '--accent' : '--red'} />
          <ExecutiveCard icon={DollarSign} title="Saldo geral" value={money(financial.saldoGeral)} note="histórico acumulado" meaning="Resultado acumulado de todas as entradas menos saídas registradas." accentVar="--purple" />
        </div>
      </section>

      {/* Seção Comercial e Operação */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={ShoppingCart} title="Comercial e operação" subtitle="Volume de trabalho, vendas em aberto e pontos que podem travar entrega ou recebimento." accentVar="--comercial" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <ExecutiveCard icon={FileText} title="Pipeline" value={shortMoney(commercial.pipelineValue)} note={`${commercial.orcamentosAbertos.length} abertos`} meaning="Valor potencial dos orçamentos ainda não concluídos." accentVar="--purple" to={createPageUrl('Orcamentos')} />
          <ExecutiveCard icon={ShoppingCart} title="Pedidos ativos" value={commercial.pedidosAbertos.length} note={`${commercial.pedidosPendentes.length} sem pagamento`} meaning="Pedidos que ainda não foram entregues ou cancelados." accentVar="--comercial" to={createPageUrl('Vendas')} />
          <ExecutiveCard icon={Wrench} title="Produção ativa" value={operation.osAbertas.length} note="ordens em andamento" meaning="Serviços e produções que ainda precisam ser finalizados." accentVar="--accent" to={createPageUrl('Producao')} />
          <ExecutiveCard icon={Package} title="Estoque crítico" value={operation.estoqueCritico.length} note={shortMoney(operation.estoqueValor)} meaning="Itens no mínimo ou abaixo do mínimo cadastrado." accentVar="--orange" to={createPageUrl('Estoque')} />
          <ExecutiveCard icon={AlertTriangle} title="Riscos críticos" value={operation.entregasAtrasadas.length + operation.estoqueCritico.length + clientStats.risco} note="prazo, estoque e cliente" meaning="Soma dos alertas que exigem atenção imediata." accentVar="--red" />
        </div>
      </section>

      <AlertasPrazo salesOrders={salesOrders} />

      {/* Seção Análise Financeira */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={BarChart3} title="Análise financeira e saúde do negócio" subtitle="Gráficos maiores ficam onde a leitura exige espaço; indicadores menores ficam agrupados ao lado." accentVar="--accent" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-6"><RevenueChart data={chartData} /></div>
          <div className="lg:col-span-3">
            <StrategicSummaryCard
              clientsCount={clients.length}
              vipCount={clientStats.vip}
              riskCount={clientStats.risco}
              stockValue={operation.estoqueValor}
              receivables={financial.contasReceber}
              payables={financial.contasPagar}
            />
          </div>
          <div className="lg:col-span-3">
            <ScorecardKPIs transactions={dashboardFinancialRecords} salesOrders={salesOrders} quotes={quotes} serviceOrders={serviceOrders} products={products} />
          </div>
        </div>
      </section>

      {/* Seção KPIs Avançados */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={Gauge} title="KPIs avançados" subtitle="Indicadores executivos compactos para analisar eficiência, margem, inadimplência, entrega e máquinas." accentVar="--gestao" />
        <DashboardKPIsAvancados
          transactions={dashboardFinancialRecords}
          salesOrders={salesOrders}
          quotes={quotes}
          serviceOrders={serviceOrders}
          products={products}
          machineCosts={machineCosts}
          goals={goals}
        />
      </section>

      {/* Seção Tendências */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={TrendingUp} title="Tendências comerciais" subtitle="Evolução, conversão e ticket médio sem ocupar espaço desnecessário." accentVar="--teal" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <TrendingRevenueChart transactions={dashboardFinancialRecords} />
          <ConversaoOrcamentos quotes={quotes} />
          <TicketMedioTrend salesOrders={salesOrders} />
        </div>
      </section>

      {/* Seção Distribuições */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={Target} title="Distribuições estratégicas" subtitle="De onde vem a receita, como os clientes pagam e onde está o valor dos orçamentos." accentVar="--purple" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <CategoryPieChart title="Receita por categoria" subtitle="Origem das entradas financeiras" data={categoryData} />
          <PaymentMethodChart data={paymentData} />
          <CategoryPieChart title="Valor por status de orçamento" subtitle="Distribuição do pipeline comercial" data={quoteStatusData} />
        </div>
      </section>

      {/* Seção Ações e Alertas */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={AlertTriangle} title="Ações e alertas" subtitle="Itens que pedem ação: atraso, cobrança, estoque crítico, clientes e produção." accentVar="--red" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-6">
            <WorkQueue
              title="Fila executiva de ação"
              icon={Gauge}
              to={createPageUrl('Vendas')}
              empty="Nenhuma ação urgente no momento"
              items={[
                ...operation.entregasAtrasadas.slice(0, 4).map((item) => ({ ...item, kind: 'Entrega atrasada', kindVar: '--red' })),
                ...operation.entregasHoje.slice(0, 3).map((item) => ({ ...item, kind: 'Entrega hoje', kindVar: '--orange' })),
                ...commercial.pedidosPendentes.slice(0, 3).map((item) => ({ ...item, kind: 'Pagamento pendente', kindVar: '--purple' })),
              ].slice(0, 8)}
              renderItem={(item) => (
                <div key={`${item.kind}-${item.id}`} className="card-pressed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: 'var(--r-md)' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 900, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, fontSize: '13px' }}>{item.kind}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0 0' }}>
                      {item.order_number || 'Pedido'} · {item.client_name || 'Cliente'} · {item.delivery_date ? moment(item.delivery_date).format('DD/MM/YYYY') : 'sem prazo'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 900, color: 'var(--green)', margin: '0 0 4px 0' }}>{money(item.total)}</p>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="lg:col-span-3">
            <TopProdutosWidget salesOrders={salesOrders} />
          </div>
          <div className="lg:col-span-3">
            <MetasWidget goals={goals} />
          </div>
        </div>
      </section>

      {/* Seção Detalhamento Operacional */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={ClipboardList} title="Detalhamento operacional" subtitle="Listas menores com o tamanho necessário para consulta rápida e tomada de decisão." accentVar="--operacao" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
          <WorkQueue
            title="Estoque crítico"
            icon={Package}
            to={createPageUrl('Estoque')}
            empty="Estoque saudável"
            items={operation.estoqueCritico.slice(0, 6)}
            renderItem={(product) => (
              <div key={product.id} className="card-pressed" style={{ padding: '12px', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--orange)' }}>
                <p style={{ fontWeight: 900, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 3px 0', fontSize: '13px' }}>{product.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--orange)', margin: 0 }}>
                  Atual: {product.quantity || 0} {product.unit || 'un'} · mínimo: {product.min_quantity || 1} · valor: {money(Number(product.quantity || 0) * Number(product.cost_price || 0))}
                </p>
              </div>
            )}
          />

          <WorkQueue
            title="Clientes e cobrança"
            icon={Users}
            to={createPageUrl('Clientes')}
            empty="Nenhuma cobrança crítica"
            items={clientStats.devedores.slice(0, 6)}
            renderItem={(client) => (
              <div key={client.id} className="card-pressed" style={{ padding: '12px', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--purple)' }}>
                <p style={{ fontWeight: 900, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 3px 0', fontSize: '13px' }}>{client.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--purple)', margin: 0 }}>
                  Dívida: {money(client.total_debt)} · compras: {money(client.total_purchases)} · status: {client.status || 'em dia'}
                </p>
              </div>
            )}
          />

          <WorkQueue
            title="Produção ativa"
            icon={Wrench}
            to={createPageUrl('Producao')}
            empty="Nenhuma produção aberta"
            items={operation.osAbertas.slice(0, 6)}
            renderItem={(order) => (
              <div key={order.id} className="card-pressed" style={{ padding: '12px', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--accent)' }}>
                <p style={{ fontWeight: 900, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 3px 0', fontSize: '13px' }}>{order.title || order.service_number || order.client_name || 'Ordem de serviço'}</p>
                <p style={{ fontSize: '11px', color: 'var(--accent)', margin: 0 }}>
                  Status: {order.status || 'aberta'} · prazo: {order.due_date ? moment(order.due_date).format('DD/MM/YYYY') : 'não informado'}
                </p>
              </div>
            )}
          />
        </div>
      </section>

      {/* Seção Movimentos e Agenda */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SectionTitle icon={CalendarClock} title="Movimentos recentes e agenda" subtitle="Contexto rápido sobre o que aconteceu agora e o que vem a seguir." accentVar="--teal" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          <div><RecentTransactions transactions={dashboardFinancialRecords} /></div>
          <div><UpcomingEvents events={próximosEventos} /></div>
          <div>
            <WorkQueue
              title="Clientes e cobrança"
              icon={Users}
              to={createPageUrl('Clientes')}
              empty="Nenhuma cobrança crítica"
              items={clientStats.devedores.slice(0, 4)}
              renderItem={(client) => (
                <div key={client.id} className="card-pressed" style={{ padding: '12px', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--purple)' }}>
                  <p style={{ fontWeight: 900, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 3px 0', fontSize: '13px' }}>{client.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--purple)', margin: 0 }}>Dívida: {money(client.total_debt)} · status: {client.status || 'em dia'}</p>
                </div>
              )}
            />
          </div>
        </div>
      </section>

      {/* Rodapé de leitura rápida */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--r-md)', flexShrink: 0,
              background: 'var(--green-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-flat)',
            }}>
              <CheckCircle style={{ width: '18px', height: '18px', color: 'var(--green)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '15px' }}>Leitura rápida da empresa</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Saldo geral {money(financial.saldoGeral)}, ticket médio {money(commercial.ticketMedio)}, conversão {commercial.taxaConversao.toFixed(1)}% e saúde do estoque {operation.estoqueSaude.toFixed(1)}%.
              </p>
            </div>
            <Link to={createPageUrl('Relatorios')} className="btn-nm" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '10px 18px', borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', flexShrink: 0 }}>
              Abrir relatórios <ArrowRight style={{ width: '14px', height: '14px' }} />
            </Link>
          </div>
        </div>
      </div>
      </QueryState>
    </div>
  );
}
