import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import { Plus, X, Edit, Trash2, Clock, CheckCircle, Pause, Play, Wrench, AlertCircle, Calendar } from 'lucide-react';
import moment from 'moment';

const defaultForm = { title: '', client_name: '', description: '', priority: 'normal', estimated_hours: 0, deadline: '', status: 'aguardando' };

const inputStyle = {
  background: 'var(--bg)',
  boxShadow: 'var(--shadow-pressed)',
  border: '1px solid var(--border-inner)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-primary)',
  padding: '9px 13px',
  width: '100%',
  outline: 'none',
  fontSize: '14px',
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-tertiary)',
  marginBottom: '6px',
};

const STATUS_CONFIG = {
  aguardando:   { label: 'Aguardando',   badge: 'badge-orange', dot: 'var(--orange)' },
  em_andamento: { label: 'Em Andamento', badge: 'badge-blue',   dot: 'var(--accent)' },
  pausada:      { label: 'Pausada',      badge: 'badge-purple', dot: 'var(--purple)' },
  concluida:    { label: 'Concluída',    badge: 'badge-green',  dot: 'var(--green)'  },
  cancelada:    { label: 'Cancelada',    badge: 'badge-red',    dot: 'var(--red)'    },
};

const PRIORITY_CONFIG = {
  baixa:   { label: 'Baixa',   color: 'var(--teal)',   badge: 'badge-blue'   },
  normal:  { label: 'Normal',  color: 'var(--green)',  badge: 'badge-green'  },
  alta:    { label: 'Alta',    color: 'var(--orange)', badge: 'badge-orange' },
  urgente: { label: 'Urgente', color: 'var(--red)',    badge: 'badge-red'    },
};

function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const today = moment().format('YYYY-MM-DD');
  const diff = moment(deadline).diff(moment(today), 'days');
  if (diff < 0) return { label: 'Atrasado', color: 'var(--red)', bg: 'var(--red-muted)' };
  if (diff <= 2) return { label: `${diff}d`, color: 'var(--orange)', bg: 'var(--orange-muted)' };
  return { label: moment(deadline).format('DD/MM'), color: 'var(--green)', bg: 'var(--green-muted)' };
}

function OSCard({ os, onEdit, onDelete, onStatusChange }) {
  const status = STATUS_CONFIG[os.status] || STATUS_CONFIG.aguardando;
  const priority = PRIORITY_CONFIG[os.priority] || PRIORITY_CONFIG.normal;
  const deadlineStatus = getDeadlineStatus(os.deadline);
  const isCritical = os.status !== 'concluida' && os.status !== 'cancelada' && deadlineStatus?.color === 'var(--red)';

  return (
    <div
      className="card p-5"
      style={{
        outline: isCritical ? '1.5px solid var(--red)' : undefined,
        outlineOffset: '-1px',
        transition: 'transform 0.15s ease',
        cursor: 'default',
      }}
    >
      {/* Header do card */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {os.title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {os.client_name}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => onEdit(os)}
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: 'none', borderRadius: 'var(--r-md)', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-tertiary)' }}
          >
            <Edit size={13} />
          </button>
          <button
            onClick={() => onDelete(os.id)}
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: 'none', borderRadius: 'var(--r-md)', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--red)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        <span className={status.badge}>{status.label}</span>
        <span className={priority.badge}>{priority.label}</span>
        {deadlineStatus && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: 'var(--r-xl)', fontSize: '11px', fontWeight: '600', background: deadlineStatus.bg, color: deadlineStatus.color }}>
            <Calendar size={10} /> {deadlineStatus.label}
          </span>
        )}
      </div>

      {/* Progress bar neumórfica (horas estimadas como indicador visual) */}
      {os.estimated_hours > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Horas estimadas</span>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>{os.estimated_hours}h</span>
          </div>
          <div style={{ height: '6px', borderRadius: 'var(--r-xl)', background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: os.status === 'concluida' ? '100%' : os.status === 'em_andamento' ? '55%' : os.status === 'pausada' ? '30%' : '5%',
              borderRadius: 'var(--r-xl)',
              background: `linear-gradient(90deg, var(--accent), var(--teal))`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Ações rápidas de status */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {os.status === 'aguardando' && (
          <button className="btn-nm" onClick={() => onStatusChange(os, 'em_andamento')} style={{ flex: 1, padding: '7px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--accent)' }}>
            <Play size={12} /> Iniciar
          </button>
        )}
        {os.status === 'em_andamento' && (
          <>
            <button className="btn-nm" onClick={() => onStatusChange(os, 'pausada')} style={{ flex: 1, padding: '7px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--orange)' }}>
              <Pause size={12} /> Pausar
            </button>
            <button className="btn-nm" onClick={() => onStatusChange(os, 'concluida')} style={{ flex: 1, padding: '7px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--green)' }}>
              <CheckCircle size={12} /> Concluir
            </button>
          </>
        )}
        {os.status === 'pausada' && (
          <button className="btn-nm" onClick={() => onStatusChange(os, 'em_andamento')} style={{ flex: 1, padding: '7px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--accent)' }}>
            <Play size={12} /> Retomar
          </button>
        )}
        {(os.status === 'concluida' || os.status === 'cancelada') && (
          <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', padding: '7px' }}>
            {os.status === 'concluida' ? 'Finalizada' : 'Cancelada'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdensServico() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedOS, setSelectedOS] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState(defaultForm);

  const { data: serviceOrders = [] } = useQuery({ queryKey: ['serviceOrders'], queryFn: () => erp.entities.ServiceOrder.list('-created_date') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => erp.entities.Client.list('name') });

  const createMutation = useMutation({
    mutationFn: data => erp.entities.ServiceOrder.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['serviceOrders']); setShowForm(false); setFormData(defaultForm); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => erp.entities.ServiceOrder.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['serviceOrders']); setShowForm(false); setSelectedOS(null); setFormData(defaultForm); }
  });
  const deleteMutation = useMutation({
    mutationFn: id => erp.entities.ServiceOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['serviceOrders'])
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (selectedOS) updateMutation.mutate({ id: selectedOS.id, data: formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = os => {
    setSelectedOS(os);
    setFormData({ title: os.title || '', client_name: os.client_name || '', description: os.description || '', priority: os.priority || 'normal', estimated_hours: os.estimated_hours || 0, deadline: os.deadline || '', status: os.status || 'aguardando' });
    setShowForm(true);
  };

  const handleStatusChange = async (os, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'em_andamento' && !os.started_at) updates.started_at = new Date().toISOString();
    if (newStatus === 'concluida') {
      updates.completed_at = new Date().toISOString();
      if (os.sales_order_id) await erp.entities.SalesOrder.update(os.sales_order_id, { status: 'pronto' });
    }
    await updateMutation.mutateAsync({ id: os.id, data: updates });
  };

  const filteredOrders = serviceOrders.filter(os => {
    const s = os.title?.toLowerCase().includes(searchQuery.toLowerCase()) || os.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return s && (statusFilter === 'all' || os.status === statusFilter);
  });

  const emAndamento = serviceOrders.filter(o => o.status === 'em_andamento').length;
  const aguardando = serviceOrders.filter(o => o.status === 'aguardando').length;
  const concluidas = serviceOrders.filter(o => o.status === 'concluida').length;
  const urgentes = serviceOrders.filter(o => o.priority === 'urgente' && !['concluida', 'cancelada'].includes(o.status)).length;

  const STATUS_CHIPS = [
    { value: 'all', label: 'Todos' },
    { value: 'aguardando', label: 'Aguardando' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'pausada', label: 'Pausada' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  return (
    <div className="space-y-6">
      <Header title="Ordens de Serviço" subtitle="Gerencie ordens de serviço, prazos e equipe" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Em Andamento', value: emAndamento, icon: Play, color: 'var(--accent)' },
          { title: 'Aguardando',   value: aguardando,  icon: Clock, color: 'var(--orange)' },
          { title: 'Concluídas',   value: concluidas,  icon: CheckCircle, color: 'var(--green)' },
          { title: 'Urgentes',     value: urgentes,    icon: AlertCircle, color: 'var(--red)', alert: urgentes > 0 },
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

      {/* Toolbar: chips de status + busca + novo */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {STATUS_CHIPS.map(chip => (
            <button
              key={chip.value}
              onClick={() => setStatusFilter(chip.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-xl)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                background: statusFilter === chip.value ? 'var(--accent)' : 'var(--bg)',
                color: statusFilter === chip.value ? '#fff' : 'var(--text-secondary)',
                boxShadow: statusFilter === chip.value ? '0 2px 8px rgba(91,141,239,0.4)' : 'var(--shadow-raised)',
                transition: 'all 0.15s ease',
              }}
            >
              {chip.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <button
              className="btn-primary"
              onClick={() => { setFormData(defaultForm); setSelectedOS(null); setShowForm(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontSize: '13px' }}
            >
              <Plus size={14} /> Nova OS
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Buscar título ou cliente..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, maxWidth: '380px' }}
        />
      </div>

      {/* Grid de Cards de OS */}
      {filteredOrders.length === 0 ? (
        <div className="card p-10" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <Wrench size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontWeight: '600' }}>Nenhuma OS encontrada</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredOrders.map(os => (
            <OSCard
              key={os.id}
              os={os}
              onEdit={handleEdit}
              onDelete={id => deleteMutation.mutate(id)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {selectedOS ? 'Editar OS' : 'Nova OS'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setSelectedOS(null); }}
                style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', border: 'none', borderRadius: 'var(--r-md)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input style={inputStyle} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="Título da OS..." />
              </div>

              <div>
                <label style={labelStyle}>Cliente *</label>
                <input list="clients-os-nm" style={inputStyle} value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} required placeholder="Nome do cliente" />
                <datalist id="clients-os-nm">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
              </div>

              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do serviço..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Prioridade</label>
                  <select
                    style={inputStyle}
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Horas Estimadas</label>
                  <input type="number" style={inputStyle} value={formData.estimated_hours} onChange={e => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 })} placeholder="0" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Prazo</label>
                <input type="date" style={inputStyle} value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
              </div>

              {selectedOS && (
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="aguardando">Aguardando</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="pausada">Pausada</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="button" className="btn-nm" style={{ flex: 1, padding: '10px' }} onClick={() => { setShowForm(false); setSelectedOS(null); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px' }}>
                  {selectedOS ? 'Salvar' : 'Criar OS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
