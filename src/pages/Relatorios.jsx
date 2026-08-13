import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import QueryState from '@/components/ui/QueryState';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Download, FileBarChart, ShoppingCart, TrendingUp, Users, Wallet } from 'lucide-react';
import { downloadCsv } from '@/lib/downloadUtils';
import moment from 'moment';
import { formatCurrency } from '@/lib/numberFormat';

const colors = ['#5B8DEF', '#7c3aed', '#16a34a', '#f97316', '#dc2626', '#0891b2', '#db2777'];
const money = formatCurrency;

const reportTypes = [
  { value: 'executivo', label: 'Executivo', icon: FileBarChart, desc: 'Visão geral do negócio' },
  { value: 'financeiro', label: 'Financeiro', icon: Wallet, desc: 'Receitas e despesas' },
  { value: 'vendas', label: 'Vendas', icon: ShoppingCart, desc: 'Pedidos e conversão' },
  { value: 'clientes', label: 'Clientes', icon: Users, desc: 'Ranking e retenção' },
  { value: 'estoque', label: 'Estoque', icon: AlertTriangle, desc: 'Níveis e alertas' },
];

const periodChips = [
  { label: 'Hoje', start: () => moment().format('YYYY-MM-DD'), end: () => moment().format('YYYY-MM-DD') },
  { label: 'Esta semana', start: () => moment().startOf('week').format('YYYY-MM-DD'), end: () => moment().endOf('week').format('YYYY-MM-DD') },
  { label: 'Este mês', start: () => moment().startOf('month').format('YYYY-MM-DD'), end: () => moment().endOf('month').format('YYYY-MM-DD') },
  { label: 'Último mês', start: () => moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), end: () => moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD') },
  { label: 'Este ano', start: () => moment().startOf('year').format('YYYY-MM-DD'), end: () => moment().endOf('year').format('YYYY-MM-DD') },
];

const inputStyle = {
  background: 'var(--bg)',
  boxShadow: 'var(--shadow-pressed)',
  border: '1px solid var(--border-inner)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-primary)',
  padding: '9px 13px',
  outline: 'none',
  width: '100%',
  fontSize: '14px',
};

export default function Relatorios() {
  const [periodStart, setPeriodStart] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [periodEnd, setPeriodEnd] = useState(moment().endOf('month').format('YYYY-MM-DD'));
  const [reportType, setReportType] = useState('executivo');
  const [activePeriodChip, setActivePeriodChip] = useState(2);

  const transactionsQuery = useQuery({ queryKey: ['transactions', 'list', '-date', 800], queryFn: () => erp.entities.Transaction.list('-date', 800) });
  const salesOrdersQuery = useQuery({ queryKey: ['salesOrders', 'list', '-created_date', 500], queryFn: () => erp.entities.SalesOrder.list('-created_date', 500) });
  const quotesQuery = useQuery({ queryKey: ['productQuotes'], queryFn: () => erp.entities.ProductQuote.list('-created_date', 500) });
  const clientsQuery = useQuery({ queryKey: ['clients', 'list'], queryFn: () => erp.entities.Client.list() });
  const productsQuery = useQuery({ queryKey: ['products', 'list'], queryFn: () => erp.entities.Product.list() });
  const payablesQuery = useQuery({ queryKey: ['accountsPayable'], queryFn: () => erp.entities.AccountPayable.list('due_date') });
  const receivablesQuery = useQuery({ queryKey: ['accountsReceivable'], queryFn: () => erp.entities.AccountReceivable.list('due_date') });

  const transactions = transactionsQuery.data || [];
  const salesOrders = salesOrdersQuery.data || [];
  const quotes = quotesQuery.data || [];
  const clients = clientsQuery.data || [];
  const products = productsQuery.data || [];
  const payables = payablesQuery.data || [];
  const receivables = receivablesQuery.data || [];

  const reportQueries = [transactionsQuery, salesOrdersQuery, quotesQuery, clientsQuery, productsQuery, payablesQuery, receivablesQuery];
  const isLoading = reportQueries.some((q) => q.isLoading);
  const isError = reportQueries.some((q) => q.isError);
  const firstError = reportQueries.find((q) => q.isError)?.error;
  const refetchAll = () => reportQueries.forEach((q) => q.refetch());

  const data = useMemo(() => {
    const inRange = (date) => date && date >= periodStart && date <= periodEnd;
    const tx = transactions.filter((item) => inRange(item.date));
    const orders = salesOrders.filter((item) => inRange(String(item.created_date || '').slice(0, 10)));
    const periodQuotes = quotes.filter((item) => inRange(String(item.created_date || '').slice(0, 10)));
    const income = tx.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = tx.filter((item) => item.type === 'saida').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const salesTotal = orders.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const ticket = orders.length ? salesTotal / orders.length : 0;
    const approvedQuotes = periodQuotes.filter((item) => ['aprovado'].includes(item.status)).length;
    const conversion = periodQuotes.length ? (approvedQuotes / periodQuotes.length) * 100 : 0;
    const overdueReceivables = receivables.filter((item) => !item.received && item.due_date < moment().format('YYYY-MM-DD')).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const lowStock = products.filter((item) => item.track_stock !== false && Number(item.quantity || 0) <= Number(item.min_quantity || 1)).length;

    const dailyMap = {};
    tx.forEach((item) => { const key = moment(item.date).format('DD/MM'); if (!dailyMap[key]) dailyMap[key] = { day: key, entradas: 0, saidas: 0 }; if (item.type === 'entrada') dailyMap[key].entradas += Number(item.amount || 0); if (item.type === 'saida') dailyMap[key].saidas += Number(item.amount || 0); });
    const statusMap = {};
    orders.forEach((item) => { const key = item.status || 'sem_status'; statusMap[key] = (statusMap[key] || 0) + 1; });
    const clientMap = {};
    orders.forEach((item) => { const key = item.client_name || 'Cliente'; clientMap[key] = (clientMap[key] || 0) + Number(item.total || 0); });
    const categoryMap = {};
    tx.forEach((item) => { const key = item.category || 'outros'; categoryMap[key] = (categoryMap[key] || 0) + Number(item.amount || 0); });

    return {
      tx, orders, periodQuotes, income, expense, result: income - expense, salesTotal, ticket, conversion, overdueReceivables, lowStock,
      dailyChart: Object.values(dailyMap),
      statusChart: Object.entries(statusMap).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })),
      topClients: Object.entries(clientMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      categoryChart: Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [transactions, salesOrders, quotes, products, receivables, periodStart, periodEnd]);

  const exportReport = () => {
    const rows = [['Indicador', 'Valor'], ['Receitas', data.income], ['Despesas', data.expense], ['Resultado', data.result], ['Vendas', data.salesTotal], ['Pedidos', data.orders.length], ['Ticket médio', data.ticket], ['Conversão orçamentos', `${data.conversion.toFixed(1)}%`], ['Clientes', clients.length], ['Produtos críticos', data.lowStock]];
    downloadCsv(rows, `relatorio-${reportType}-${periodStart}.csv`);
  };

  const handlePeriodChip = (index, chip) => {
    setActivePeriodChip(index);
    setPeriodStart(chip.start());
    setPeriodEnd(chip.end());
  };

  const kpis = [
    { icon: Wallet, label: 'Resultado', value: money(data.result), color: data.result >= 0 ? 'var(--green)' : 'var(--red)' },
    { icon: TrendingUp, label: 'Receitas', value: money(data.income), color: 'var(--green)' },
    { icon: ShoppingCart, label: 'Vendas', value: money(data.salesTotal), color: 'var(--accent)' },
    { icon: Users, label: 'Ticket médio', value: money(data.ticket), color: 'var(--purple)' },
    { icon: FileBarChart, label: 'Conversão', value: `${data.conversion.toFixed(1)}%`, color: 'var(--orange)' },
    { icon: AlertTriangle, label: 'Estoque crítico', value: data.lowStock, color: 'var(--red)' },
  ];

  return (
    <div className="space-y-6">
      <Header title="Relatórios" subtitle="Central executiva de indicadores, análises e exportações" />

      <QueryState isLoading={isLoading} isError={isError} error={firstError} onRetry={refetchAll} loadingLabel="Carregando relatórios...">
      {/* Tipo de Relatório — grid de cards neumórficos */}
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tipo de relatório</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {reportTypes.map((rt) => {
            const Icon = rt.icon;
            const active = reportType === rt.value;
            return (
              <button
                key={rt.value}
                onClick={() => setReportType(rt.value)}
                className={active ? 'card-pressed' : 'card'}
                style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, cursor: 'pointer', border: active ? '1px solid var(--accent-border)' : '1px solid var(--border)', transition: 'all 0.18s ease' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: active ? 'var(--accent-muted)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: active ? 'var(--accent)' : 'var(--text-primary)', margin: 0 }}>{rt.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{rt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros de período — chips raised/pressed + datas */}
      <div className="card p-5">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, margin: 0 }}>Período de análise</p>
          <button
            onClick={exportReport}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', fontSize: 13 }}
          >
            <Download size={15} /> Exportar relatório
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {periodChips.map((chip, i) => (
            <button
              key={chip.label}
              onClick={() => handlePeriodChip(i, chip)}
              className={activePeriodChip === i ? 'card-pressed' : 'card'}
              style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--r-full)', border: activePeriodChip === i ? '1px solid var(--accent-border)' : '1px solid var(--border)', color: activePeriodChip === i ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Data início</label>
            <input type="date" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); setActivePeriodChip(null); }} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Data fim</label>
            <input type="date" value={periodEnd} onChange={(e) => { setPeriodEnd(e.target.value); setActivePeriodChip(null); }} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="kpi-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <Icon size={16} style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="kpi-number" style={{ color: kpi.color }}>{kpi.value}</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, fontWeight: 500 }}>{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Entradas × Saídas por dia</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.dailyChart} style={{ background: 'var(--bg)' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }} />
              <Legend />
              <Bar dataKey="entradas" fill="var(--green)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saidas" fill="var(--red)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={15} style={{ color: 'var(--purple)' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Pedidos por status</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart style={{ background: 'var(--bg)' }}>
              <Pie data={data.statusChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100}>
                {data.statusChart.map((entry, i) => <Cell key={entry.name} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} style={{ color: 'var(--green)' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Top clientes</p>
          </div>
          {data.topClients.map((client, index) => (
            <div key={client.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-inner)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{index + 1}. {client.name}</span>
              <span style={{ fontWeight: 800, color: 'var(--green)', fontSize: 13, whiteSpace: 'nowrap' }}>{money(client.value)}</span>
            </div>
          ))}
          {!data.topClients.length && <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Sem vendas no período.</p>}
        </div>

        <div className="card p-5" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileBarChart size={15} style={{ color: 'var(--orange)' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Categorias financeiras</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.categoryChart} style={{ background: 'var(--bg)' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }} />
              <Line type="monotone" dataKey="value" stroke="var(--orange)" strokeWidth={3} dot={{ fill: 'var(--orange)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </QueryState>
    </div>
  );
}
