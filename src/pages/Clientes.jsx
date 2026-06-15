import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import { AlertTriangle, Download, Edit, MessageCircle, Plus, Search, Star, Trash2, Users, Wallet, X } from 'lucide-react';
import { toast } from '@/components/ui/app-toast';
import { downloadCsv } from '@/lib/downloadUtils';
import { sendWhatsAppMessage, whatsappResultMessage } from '@/lib/whatsappSender';
import moment from 'moment';

const paymentMethods = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'parcelado', 'boleto', 'crediario', 'transferencia'];
const defaultForm = { name: '', phone: '', whatsapp: '', email: '', address: '', payment_method: 'pix', status: 'em_dia', notes: '' };
const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const text = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const segmentBadge = { vip: 'badge-purple', ativo: 'badge-green', risco: 'badge-red', inativo: 'badge-orange' };
const segmentLabel = { vip: 'VIP', ativo: 'Ativo', risco: 'Risco', inativo: 'Inativo' };
const statusBadge = { em_dia: 'badge-green', atrasado: 'badge-orange', inadimplente: 'badge-red' };
const statusLabel = { em_dia: 'Em dia', atrasado: 'Atrasado', inadimplente: 'Inadimplente' };

function Avatar({ name, size = 40 }) {
  const initials = (name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: 'var(--r-full)', flexShrink: 0,
      background: 'var(--accent-muted)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.35,
      boxShadow: 'var(--shadow-raised)',
    }}>
      {initials}
    </div>
  );
}

function NmInput({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          background: 'var(--bg)', color: 'var(--text-primary)', border: 'none', outline: 'none',
          borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 14, width: '100%',
          boxShadow: 'var(--shadow-pressed)',
        }}
      />
    </div>
  );
}

function NmSelect({ label, value, onChange, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>}
      <select
        value={value}
        onChange={onChange}
        style={{
          background: 'var(--bg)', color: 'var(--text-primary)', border: 'none', outline: 'none',
          borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 14, width: '100%',
          boxShadow: 'var(--shadow-pressed)', cursor: 'pointer', appearance: 'none',
        }}
      >
        {children}
      </select>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 700, transition: 'all 0.15s ease',
        background: active ? 'var(--accent)' : 'var(--bg)',
        color: active ? 'var(--text-inverted)' : 'var(--text-secondary)',
        boxShadow: active ? 'var(--shadow-pressed)' : 'var(--shadow-raised)',
      }}
    >
      {label}
    </button>
  );
}

export default function Clientes() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: 'all', payment: 'all', segment: 'all' });
  const [formData, setFormData] = useState(defaultForm);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => erp.entities.Client.list('name') });
  const { data: orders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 500) });
  const { data: receivables = [] } = useQuery({ queryKey: ['accountsReceivable'], queryFn: () => erp.entities.AccountReceivable.list('due_date') });

  const saveClient = useMutation({
    mutationFn: (data) => selectedClient ? erp.entities.Client.update(selectedClient.id, data) : erp.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setSelectedClient(null);
      setFormData(defaultForm);
      toast.success('Cliente salvo');
    }
  });

  const deleteClient = useMutation({
    mutationFn: (id) => erp.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente removido');
    }
  });

  const enriched = useMemo(() => clients.map((client) => {
    const clientOrders = orders.filter((order) => order.client_id === client.id || order.client_name === client.name);
    const totalOrders = clientOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const lastOrder = clientOrders[0]?.created_date;
    const debt = receivables
      .filter((item) => !item.received && (item.client_name === client.name || item.client_id === client.id))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0) || Number(client.total_debt || 0);
    const recencyDays = lastOrder ? moment().diff(moment(lastOrder), 'days') : 999;
    const segment = totalOrders > 3000 || clientOrders.length >= 5 ? 'vip' : debt > 0 ? 'risco' : recencyDays > 120 ? 'inativo' : 'ativo';
    return { ...client, ordersCount: clientOrders.length, totalOrders, lastOrder, debt, segment };
  }), [clients, orders, receivables]);

  const filtered = enriched.filter((client) => {
    const search = text([client.name, client.phone, client.whatsapp, client.email].join(' '));
    return (!filters.search || search.includes(text(filters.search))) &&
      (filters.status === 'all' || client.status === filters.status) &&
      (filters.payment === 'all' || client.payment_method === filters.payment) &&
      (filters.segment === 'all' || client.segment === filters.segment);
  });

  const stats = {
    total: clients.length,
    active: enriched.filter((c) => c.segment === 'ativo').length,
    vip: enriched.filter((c) => c.segment === 'vip').length,
    risk: enriched.filter((c) => c.segment === 'risco').length,
    inactive: enriched.filter((c) => c.segment === 'inativo').length,
    debt: enriched.reduce((sum, c) => sum + c.debt, 0),
    revenue: enriched.reduce((sum, c) => sum + c.totalOrders, 0),
    avgTicket: enriched.filter((c) => c.totalOrders > 0).length > 0
      ? enriched.reduce((sum, c) => sum + c.totalOrders, 0) / enriched.filter((c) => c.totalOrders > 0).length
      : 0,
  };

  const topClients = [...enriched].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 6);

  const openForm = (client = null) => {
    setSelectedClient(client);
    setFormData(client ? { ...defaultForm, ...client } : defaultForm);
    setShowForm(true);
  };

  const sendWhatsApp = async (client, collection = false) => {
    const phone = (client.whatsapp || client.phone || '').replace(/\D/g, '');
    if (!phone) { toast.error('Cliente sem WhatsApp ou telefone'); return; }
    const msg = collection
      ? `Ola ${client.name}, identificamos um valor em aberto de ${money(client.debt)}. Podemos combinar o pagamento?`
      : `Ola ${client.name}!`;
    const result = await sendWhatsAppMessage({ phone, message: msg });
    if (result.sent || result.copied) toast.success(whatsappResultMessage(result));
    else toast.error(whatsappResultMessage(result));
  };

  const exportCsv = () => {
    const rows = [['Nome', 'Contato', 'Email', 'Status', 'Segmento', 'Compras', 'Divida'], ...filtered.map((c) => [c.name, c.phone || c.whatsapp, c.email, c.status, c.segment, c.totalOrders, c.debt])];
    downloadCsv(rows, 'clientes.csv');
  };

  const kpis = [
    { label: 'Total clientes', value: stats.total, icon: Users, color: 'var(--accent)', muted: 'var(--accent-muted)' },
    { label: 'Ativos + VIP', value: stats.active + stats.vip, icon: Star, color: 'var(--green)', muted: 'var(--green-muted)' },
    { label: 'Débito pendente', value: money(stats.debt), icon: AlertTriangle, color: 'var(--red)', muted: 'var(--red-muted)' },
    { label: 'Ticket médio', value: money(stats.avgTicket), icon: Wallet, color: 'var(--purple)', muted: 'var(--purple-muted)' },
  ];

  return (
    <div style={{ padding: '0 0 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Header title="Clientes" subtitle="CRM operacional, cobrança, segmentação e histórico de compra" />

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="btn-nm" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={15} /> Exportar
        </button>
        <button className="btn-primary" onClick={() => openForm()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Novo cliente
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</span>
              <div style={{ background: kpi.muted, color: kpi.color, borderRadius: 'var(--r-sm)', padding: 8 }}>
                <kpi.icon size={16} />
              </div>
            </div>
            <div className="kpi-number" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: 'var(--accent-muted)', color: 'var(--accent)', borderRadius: 'var(--r-sm)', padding: 8 }}>
            <Search size={16} />
          </div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Filtros</span>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Buscar por nome, telefone, email..."
            style={{
              width: '100%', background: 'var(--bg)', color: 'var(--text-primary)', border: 'none', outline: 'none',
              borderRadius: 'var(--r-md)', padding: '10px 14px 10px 36px', fontSize: 14,
              boxShadow: 'var(--shadow-pressed)',
            }}
          />
        </div>

        {/* Segmento chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Segmento:</span>
          {[['all', 'Todos'], ['vip', 'VIP'], ['ativo', 'Ativo'], ['risco', 'Risco'], ['inativo', 'Inativo']].map(([val, lbl]) => (
            <FilterChip key={val} label={lbl} active={filters.segment === val} onClick={() => setFilters({ ...filters, segment: val })} />
          ))}
        </div>

        {/* Status + Pagamento chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Status:</span>
          {[['all', 'Todos'], ['em_dia', 'Em dia'], ['atrasado', 'Atrasado'], ['inadimplente', 'Inadimplente']].map(([val, lbl]) => (
            <FilterChip key={val} label={lbl} active={filters.status === val} onClick={() => setFilters({ ...filters, status: val })} />
          ))}
          {(filters.search || filters.status !== 'all' || filters.segment !== 'all' || filters.payment !== 'all') && (
            <button
              onClick={() => setFilters({ search: '', status: 'all', payment: 'all', segment: 'all' })}
              style={{ padding: '6px 12px', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: 'var(--red-muted)', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <X size={11} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Grid principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Tabela de clientes */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'var(--accent-muted)', color: 'var(--accent)', borderRadius: 'var(--r-sm)', padding: 8 }}>
                <Users size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Carteira de clientes</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{filtered.length} clientes encontrados</div>
              </div>
            </div>
          </div>

          <div className="section-divider" />

          <div style={{ overflowX: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                Nenhum cliente encontrado
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Cliente', 'Contato', 'Segmento', 'Compras', 'Dívida', 'Ações'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--surface-1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client, i) => (
                    <tr key={client.id} className="table-row-hover" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={client.name} size={34} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{client.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{client.email || 'sem email'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{client.phone || client.whatsapp || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={segmentBadge[client.segment] || 'badge-blue'}>{segmentLabel[client.segment] || client.segment}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 13, color: 'var(--green)' }}>{money(client.totalOrders)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 13, color: client.debt > 0 ? 'var(--red)' : 'var(--text-tertiary)' }}>{money(client.debt)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn-nm"
                            aria-label={`WhatsApp ${client.name}`}
                            onClick={() => sendWhatsApp(client, client.debt > 0)}
                            style={{ padding: '6px 8px', minWidth: 'unset' }}
                          >
                            <MessageCircle size={14} style={{ color: 'var(--green)' }} />
                          </button>
                          <button
                            className="btn-nm"
                            aria-label={`Editar ${client.name}`}
                            onClick={() => openForm(client)}
                            style={{ padding: '6px 8px', minWidth: 'unset' }}
                          >
                            <Edit size={14} style={{ color: 'var(--accent)' }} />
                          </button>
                          <button
                            className="btn-nm"
                            aria-label={`Excluir ${client.name}`}
                            onClick={() => deleteClient.mutate(client.id)}
                            style={{ padding: '6px 8px', minWidth: 'unset' }}
                          >
                            <Trash2 size={14} style={{ color: 'var(--red)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top clientes sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'var(--purple-muted)', color: 'var(--purple)', borderRadius: 'var(--r-sm)', padding: 8 }}>
                <Star size={16} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Top clientes</div>
            </div>
            <div className="section-divider" />
            <div style={{ padding: '12px 0' }}>
              {topClients.map((client, index) => (
                <div key={client.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: index < topClients.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 'var(--r-full)',
                    background: index === 0 ? 'var(--purple-muted)' : 'var(--surface-2)',
                    color: index === 0 ? 'var(--purple)' : 'var(--text-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, flexShrink: 0,
                    boxShadow: 'var(--shadow-flat)',
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{client.ordersCount} pedidos</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--green)', flexShrink: 0 }}>{money(client.totalOrders)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini stats */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>Segmentação</div>
            {[
              { label: 'VIP', value: stats.vip, color: 'var(--purple)', muted: 'var(--purple-muted)' },
              { label: 'Ativos', value: stats.active, color: 'var(--green)', muted: 'var(--green-muted)' },
              { label: 'Em risco', value: stats.risk, color: 'var(--red)', muted: 'var(--red-muted)' },
              { label: 'Inativos', value: stats.inactive, color: 'var(--orange)', muted: 'var(--orange-muted)' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: item.color }}>{item.value}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 'var(--r-full)', background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 'var(--r-full)',
                      background: item.color, opacity: 0.8,
                      width: stats.total > 0 ? `${(item.value / stats.total) * 100}%` : '0%',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de edição */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--bg)', borderRadius: 'var(--r-2xl)',
            boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: 520,
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>
                  {selectedClient ? 'Editar cliente' : 'Novo cliente'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Cadastre contato, forma de pagamento e situação financeira
                </div>
              </div>
              <button className="btn-nm" onClick={() => setShowForm(false)} style={{ padding: '8px', minWidth: 'unset' }}>
                <X size={16} />
              </button>
            </div>

            <div className="section-divider" style={{ margin: '20px 0 0' }} />

            <form
              onSubmit={(e) => { e.preventDefault(); saveClient.mutate(formData); }}
              style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <NmInput label="Nome" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <NmInput label="Telefone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                <NmInput label="WhatsApp" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
              </div>

              <NmInput label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" type="email" />
              <NmInput label="Endereço" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Rua, número, bairro..." />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <NmSelect label="Pagamento" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                  {paymentMethods.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </NmSelect>
                <NmSelect label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="em_dia">Em dia</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="inadimplente">Inadimplente</option>
                </NmSelect>
              </div>

              <div className="section-divider" />

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-nm" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saveClient.isPending}>
                  {saveClient.isPending ? 'Salvando...' : 'Salvar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
