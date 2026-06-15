import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { toast } from '@/components/ui/app-toast';
import ProductionHero from '@/components/producao/ProductionHero';
import ProductionToolbar from '@/components/producao/ProductionToolbar';
import ProductionKanbanBoard from '@/components/producao/ProductionKanbanBoard';
import ProductionList from '@/components/producao/ProductionList';
import ProductionDailyPanel from '@/components/producao/ProductionDailyPanel';
import DeliveryModal from '@/components/producao/DeliveryModal';
import Header from '@/components/layout/Header';
import { RefreshCw, Monitor, X, Zap, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import moment from 'moment';

const defaultFilters = { search: '', status: 'open', period: 'all', payment: 'all', sort: 'delivery', onlyLate: false, onlyReady: false };
const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const ensureServiceOrderForSale = async (order) => {
  const existing = await erp.entities.ServiceOrder.filter({ sales_order_id: order.id });
  if (existing.length) return existing[0];
  return erp.entities.ServiceOrder.create({
    title: `OS - ${order.order_number}`,
    client_id: order.client_id || '',
    client_name: order.client_name,
    sales_order_id: order.id,
    description: order.items,
    priority: 'normal',
    deadline: order.delivery_date || '',
    status: 'aguardando',
  });
};

const ensureFinancialEntryForSale = async (order, paymentMethod) => {
  const existing = await erp.entities.Transaction.filter({ order_id: order.id });
  if (existing.length) return existing[0];
  return erp.entities.Transaction.create({
    type: 'entrada',
    amount: order.total || 0,
    description: `Venda ${order.order_number} - ${order.client_name}`,
    category: 'vendas',
    payment_method: paymentMethod || order.payment_method || 'pix',
    date: moment().format('YYYY-MM-DD'),
    client_id: order.client_id || '',
    order_id: order.id,
    confirmed: true,
  });
};

const STATUS_MAP = {
  novo:         { label: 'Novo',        color: 'var(--accent)',  bg: 'rgba(91,141,239,0.12)' },
  em_producao:  { label: 'ProduÃ§Ã£o',    color: 'var(--orange)', bg: 'rgba(251,146,60,0.12)' },
  pronto:       { label: 'Pronto',      color: 'var(--green)',  bg: 'rgba(52,211,153,0.12)'  },
  atrasados:    { label: 'Atrasados',   color: 'var(--red)',    bg: 'rgba(248,113,113,0.12)' },
};

function TVScreen({ orders, onClose }) {
  const open = orders.filter((o) => !['entregue', 'cancelado'].includes(o.status));
  const today = moment().format('YYYY-MM-DD');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)', overflowY: 'auto', padding: '24px' }}>
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: '16px', right: '16px',
          background: 'var(--surface-1)', boxShadow: 'var(--shadow-raised)',
          border: 'none', borderRadius: 'var(--r-lg)',
          padding: '8px 18px', cursor: 'pointer',
          color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px',
          display: 'flex', alignItems: 'center', gap: '6px',
          zIndex: 10000,
        }}
      >
        <X size={14} /> Fechar
      </button>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>Painel de ProduÃ§Ã£o</h1>
        <p style={{ color: 'var(--text-tertiary)', marginTop: '6px', fontSize: '15px' }}>{moment().format('dddd, DD/MM/YYYY HH:mm')}</p>
      </div>

      {/* Stats TV */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {Object.entries(STATUS_MAP).map(([key, cfg]) => {
          const count = key === 'atrasados'
            ? open.filter((o) => o.delivery_date && o.delivery_date < today).length
            : open.filter((o) => o.status === key).length;
          return (
            <div key={key} style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}`, borderRadius: 'var(--r-2xl)', padding: '20px', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ fontSize: '52px', fontWeight: '900', color: cfg.color, lineHeight: 1, marginBottom: '6px' }}>{count}</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Cards de pedidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        {open.map((o) => {
          const isLate = o.delivery_date && o.delivery_date < today;
          return (
            <div key={o.id} style={{
              background: 'var(--surface-1)',
              boxShadow: 'var(--shadow-raised)',
              borderRadius: 'var(--r-xl)',
              padding: '16px',
              outline: isLate ? '1.5px solid var(--red)' : undefined,
              outlineOffset: '-1px',
            }}>
              <div style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent)', fontSize: '13px', marginBottom: '4px' }}>{o.order_number}</div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.client_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.items}</div>
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: isLate ? 'var(--red)' : 'var(--text-tertiary)' }}>
                  {o.delivery_date ? moment(o.delivery_date).format('DD/MM') : 'â€”'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: STATUS_MAP[o.status]?.color || 'var(--text-tertiary)' }}>
                  {STATUS_MAP[o.status]?.label || o.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductionProgressCard({ order }) {
  const today = moment().format('YYYY-MM-DD');
  const isLate = order.delivery_date && order.delivery_date < today && !['entregue', 'cancelado'].includes(order.status);

  const progressMap = { novo: 10, em_producao: 55, pronto: 100, entregue: 100, cancelado: 0 };
  const progress = progressMap[order.status] || 0;
  const progressColor = order.status === 'pronto' || order.status === 'entregue' ? 'var(--green)' : isLate ? 'var(--red)' : 'var(--accent)';

  return (
    <div className="card p-4" style={isLate ? { outline: '1.5px solid var(--red)', outlineOffset: '-1px' } : {}}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--accent)', fontWeight: '700', marginBottom: '2px' }}>{order.order_number}</div>
          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.client_name}</div>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          {isLate && <span className="badge-red" style={{ fontSize: '10px' }}>Atrasado</span>}
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 'var(--r-xl)', background: STATUS_MAP[order.status]?.bg, color: STATUS_MAP[order.status]?.color }}>
            {STATUS_MAP[order.status]?.label || order.status}
          </span>
        </div>
      </div>

      {order.items && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.items}</div>
      )}

      {/* Barra de progresso neumÃ³rfica */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ height: '8px', borderRadius: 'var(--r-xl)', background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: 'var(--r-xl)',
            background: `linear-gradient(90deg, ${progressColor}, ${progressColor}aa)`,
            transition: 'width 0.5s ease',
            boxShadow: `0 0 8px ${progressColor}66`,
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {order.delivery_date ? `Entrega: ${moment(order.delivery_date).format('DD/MM')}` : 'Sem prazo'}
        </span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: progressColor }}>{progress}%</span>
      </div>
    </div>
  );
}

export default function Producao() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(defaultFilters);
  const [view, setView] = useState('kanban');
  const [deliverOrder, setDeliverOrder] = useState(null);
  const [showTV, setShowTV] = useState(false);

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['salesOrders'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 200), refetchInterval: 30000 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search') || params.get('busca');
    const nextView = params.get('view');
    if (search) setFilters((prev) => ({ ...prev, search, status: 'all', period: 'all', payment: 'all' }));
    if (['kanban', 'list'].includes(nextView)) setView(nextView);
  }, []);

  const updateStatus = useMutation({
    mutationFn: async ({ order, status }) => {
      if (status === 'em_producao') await ensureServiceOrderForSale(order);
      const updated = await erp.entities.SalesOrder.update(order.id, { status });
      return updated;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salesOrders'] }); queryClient.invalidateQueries({ queryKey: ['serviceOrders'] }); toast.success('Producao atualizada'); }
  });

  const confirmDelivery = async ({ paymentStatus, paymentMethod }) => {
    if (!deliverOrder) return;
    await erp.entities.SalesOrder.update(deliverOrder.id, { status: 'entregue', payment_status: paymentStatus, payment_method: paymentMethod });
    if (paymentStatus === 'pago' || paymentStatus === 'parcial') {
      await ensureFinancialEntryForSale(deliverOrder, paymentMethod);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
    queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    setDeliverOrder(null);
    toast.success('Pedido entregue');
  };

  const filteredOrders = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    return orders.filter((order) => {
      const text = normalizeText([order.client_name, order.order_number, order.items, order.notes, order.status].join(' '));
      const late = order.delivery_date && order.delivery_date < today && !['entregue', 'cancelado'].includes(order.status);
      const week = order.delivery_date && moment(order.delivery_date).isSame(moment(), 'week');
      return (!filters.search || text.includes(normalizeText(filters.search))) &&
        (filters.status === 'all' || (filters.status === 'open' && !['entregue', 'cancelado'].includes(order.status)) || order.status === filters.status) &&
        (filters.payment === 'all' || order.payment_status === filters.payment) &&
        (filters.period === 'all' || (filters.period === 'today' && order.delivery_date === today) || (filters.period === 'late' && late) || (filters.period === 'week' && week)) &&
        (!filters.onlyLate || late) &&
        (!filters.onlyReady || order.status === 'pronto');
    }).sort((a, b) => {
      if (filters.sort === 'recent') return String(b.created_date || '').localeCompare(String(a.created_date || ''));
      if (filters.sort === 'value_desc') return Number(b.total || 0) - Number(a.total || 0);
      if (filters.sort === 'client') return String(a.client_name || '').localeCompare(String(b.client_name || ''));
      return String(a.delivery_date || '9999').localeCompare(String(b.delivery_date || '9999'));
    });
  }, [orders, filters]);

  const today = moment().format('YYYY-MM-DD');
  const openOrders = orders.filter((o) => !['entregue', 'cancelado'].includes(o.status));
  const daily = {
    late: openOrders.filter((o) => o.delivery_date && o.delivery_date < today),
    today: openOrders.filter((o) => o.delivery_date === today),
    production: openOrders.filter((o) => o.status === 'em_producao'),
    ready: openOrders.filter((o) => o.status === 'pronto')
  };
  const stats = {
    newOrders: openOrders.filter((o) => o.status === 'novo').length,
    production: daily.production.length,
    ready: daily.ready.length,
    late: daily.late.length,
    today: daily.today.length,
    open: openOrders.length
  };

  return (
    <div className="space-y-6 page-neu">
      <Header title="ProduÃ§Ã£o" subtitle="Fila visual de produÃ§Ã£o, atrasos, prontos e entregas" />

      {/* KPIs de visÃ£o geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Novos', value: stats.newOrders, icon: Package, color: 'var(--accent)' },
          { title: 'Em ProduÃ§Ã£o', value: stats.production, icon: Zap, color: 'var(--orange)' },
          { title: 'Prontos', value: stats.ready, icon: CheckCircle, color: 'var(--green)' },
          { title: 'Atrasados', value: stats.late, icon: AlertTriangle, color: 'var(--red)', alert: stats.late > 0 },
        ].map(({ title, value, icon: Icon, color, alert }) => (
          <div key={title} className="kpi-card" style={alert ? { outline: '1.5px solid var(--red)', outlineOffset: '-1px' } : {}}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>{title}</span>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: alert ? 'var(--red)' : 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar com aÃ§Ãµes */}
      <div className="card p-4" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="btn-nm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['salesOrders'] })}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
        >
          <RefreshCw size={13} /> Atualizar
        </button>
        <button
          className="btn-nm"
          onClick={() => setShowTV(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', color: 'var(--accent)' }}
        >
          <Monitor size={13} /> Modo TV
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {[
            { label: 'Hoje', value: stats.today, color: 'var(--teal)' },
            { label: 'Abertos', value: stats.open, color: 'var(--accent)' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '6px 14px', borderRadius: 'var(--r-xl)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', textAlign: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: stat.color }}>{stat.value}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '5px' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fila de produÃ§Ã£o com barras de progresso */}
      {daily.production.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={13} style={{ color: 'var(--orange)' }} /> Em ProduÃ§Ã£o Agora ({daily.production.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {daily.production.map(order => (
              <ProductionProgressCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {/* Prontos para entrega */}
      {daily.ready.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={13} style={{ color: 'var(--green)' }} /> Prontos para Entrega ({daily.ready.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {daily.ready.map(order => (
              <ProductionProgressCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      <ProductionHero stats={stats} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['salesOrders'] })} onTV={() => setShowTV(true)} />
      <ProductionToolbar filters={filters} setFilters={setFilters} view={view} setView={setView} />
      <ProductionDailyPanel late={daily.late} today={daily.today} production={daily.production} ready={daily.ready} />

      {isLoading ? (
        <div className="card p-10" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div className="skeleton" style={{ height: '40px', borderRadius: 'var(--r-md)', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '40px', borderRadius: 'var(--r-md)' }} />
        </div>
      ) : view === 'kanban' ? (
        <ProductionKanbanBoard orders={filteredOrders} onStatus={(order, status) => updateStatus.mutate({ order, status })} onDeliver={setDeliverOrder} />
      ) : (
        <ProductionList orders={filteredOrders} onStatus={(order, status) => updateStatus.mutate({ order, status })} onDeliver={setDeliverOrder} />
      )}

      <DeliveryModal order={deliverOrder} open={!!deliverOrder} onClose={() => setDeliverOrder(null)} onConfirm={confirmDelivery} />
      {showTV && <TVScreen orders={orders} onClose={() => setShowTV(false)} />}
    </div>
  );
}


