import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import { AlertTriangle, Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, Plus, Trash2, X } from 'lucide-react';
import moment from 'moment';

const defaultForm = { title: '', type: 'tarefa', date: moment().format('YYYY-MM-DD'), time: '', description: '', completed: false };
const typeConfig = {
  tarefa: { label: 'Tarefa', color: 'var(--accent)', dot: '#5B8DEF' },
  entrega: { label: 'Entrega', color: 'var(--green)', dot: '#22c55e' },
  reuniao: { label: 'Reunião', color: 'var(--purple)', dot: '#7c3aed' },
  cobranca: { label: 'Cobrança', color: 'var(--red)', dot: '#dc2626' },
  manutencao: { label: 'Manutenção', color: 'var(--orange)', dot: '#f97316' },
  outro: { label: 'Outro', color: 'var(--text-secondary)', dot: '#64748b' },
};

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

export default function Agenda() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(moment());
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState(defaultForm);

  const { data: events = [] } = useQuery({ queryKey: ['calendarEvents'], queryFn: () => erp.entities.CalendarEvent.list('date') });

  const saveEvent = useMutation({
    mutationFn: (data) => selectedEvent ? erp.entities.CalendarEvent.update(selectedEvent.id, data) : erp.entities.CalendarEvent.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); setShowForm(false); setSelectedEvent(null); setFormData(defaultForm); }
  });
  const deleteEvent = useMutation({ mutationFn: (id) => erp.entities.CalendarEvent.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); setShowForm(false); setSelectedEvent(null); } });
  const toggleEvent = useMutation({ mutationFn: (event) => erp.entities.CalendarEvent.update(event.id, { completed: !event.completed }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }) });

  const calendarDays = useMemo(() => {
    const start = moment(currentDate).startOf('month');
    const end = moment(currentDate).endOf('month');
    const days = [];
    for (let i = 0; i < start.day(); i++) days.push({ date: moment(start).subtract(start.day() - i, 'days'), current: false });
    for (let day = 1; day <= end.date(); day++) days.push({ date: moment(currentDate).date(day), current: true });
    while (days.length < 42) days.push({ date: moment(end).add(days.length - (start.day() + end.date()) + 1, 'days'), current: false });
    return days;
  }, [currentDate]);

  const today = moment().format('YYYY-MM-DD');
  const visibleEvents = useMemo(
    () => (filterType === 'all' ? events : events.filter((event) => event.type === filterType)),
    [events, filterType]
  );
  const eventsByDay = useMemo(() => {
    const map = new Map();
    visibleEvents.forEach((event) => {
      const key = moment(event.date).format('YYYY-MM-DD');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [visibleEvents]);
  // `today` nao e lido dentro dos callbacks abaixo (que usam moment() direto),
  // mas forca o recalculo quando o dia civil muda — sem isso as listas ficam
  // presas no dia em que a pagina foi aberta.
  const upcoming = useMemo(
    () => visibleEvents.filter((event) => !event.completed && moment(event.date).isSameOrAfter(moment(), 'day')).sort((a, b) => moment(a.date).diff(moment(b.date))).slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleEvents, today]
  );
  const todayEvents = useMemo(
    () => visibleEvents.filter((event) => moment(event.date).isSame(moment(), 'day')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleEvents, today]
  );
  const overdue = useMemo(
    () => visibleEvents.filter((event) => !event.completed && moment(event.date).isBefore(moment(), 'day')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleEvents, today]
  );
  const completed = useMemo(() => visibleEvents.filter((event) => event.completed).length, [visibleEvents]);

  const openNew = (date = moment()) => { setSelectedEvent(null); setFormData({ ...defaultForm, date: date.format('YYYY-MM-DD') }); setShowForm(true); };
  const openEdit = (event) => { setSelectedEvent(event); setFormData({ ...defaultForm, ...event }); setShowForm(true); };
  const eventsForDay = (date) => eventsByDay.get(date.format('YYYY-MM-DD')) || [];

  const kpis = [
    { icon: Calendar, label: 'Eventos hoje', value: todayEvents.length, color: 'var(--purple)' },
    { icon: Clock, label: 'Próximos', value: upcoming.length, color: 'var(--accent)' },
    { icon: AlertTriangle, label: 'Atrasados', value: overdue.length, color: 'var(--red)' },
    { icon: CheckCircle, label: 'Concluídos', value: completed, color: 'var(--green)' },
  ];

  return (
    <div className="space-y-6">
      <Header title="Agenda" subtitle="Calendário operacional de entregas, cobranças, reuniões e tarefas" />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="kpi-card">
              <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon size={15} style={{ color: kpi.color }} />
              </div>
              <p className="kpi-number" style={{ color: kpi.color }}>{kpi.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, fontWeight: 500 }}>{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Calendário — ocupa 3 colunas */}
        <div className="card p-5 xl:col-span-3">
          {/* Navegação de mês */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize' }}>
                {currentDate.format('MMMM [de] YYYY')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{visibleEvents.length} eventos no mês</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setCurrentDate(moment())}
                className="btn-nm"
                style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600 }}
              >
                Hoje
              </button>
              <button
                onClick={() => setCurrentDate(moment(currentDate).subtract(1, 'month'))}
                style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(moment(currentDate).add(1, 'month'))}
                style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => openNew()}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600 }}
              >
                <Plus size={13} /> Evento
              </button>
            </div>
          </div>

          {/* Cabeçalho dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <p key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', margin: 0, padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</p>
            ))}
          </div>

          {/* Grade do calendário */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calendarDays.map(({ date, current }) => {
              const dayEvents = eventsForDay(date);
              const isToday = date.isSame(moment(), 'day');
              const dayKey = date.format('YYYY-MM-DD');

              return (
                <button
                  key={dayKey}
                  onClick={() => openNew(date)}
                  style={{
                    minHeight: 90,
                    textAlign: 'left',
                    borderRadius: 'var(--r-md)',
                    padding: '8px 6px',
                    border: isToday ? '1px solid var(--accent-border)' : '1px solid var(--border-inner)',
                    background: isToday ? 'var(--accent-muted)' : current ? 'var(--bg)' : 'transparent',
                    boxShadow: current && !isToday ? 'var(--shadow-sm)' : isToday ? 'var(--shadow-raised)' : 'none',
                    opacity: current ? 1 : 0.4,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (current) { e.currentTarget.style.boxShadow = 'var(--shadow-raised)'; e.currentTarget.style.borderColor = 'var(--accent-border)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = current && !isToday ? 'var(--shadow-sm)' : isToday ? 'var(--shadow-raised)' : 'none'; e.currentTarget.style.borderColor = isToday ? 'var(--accent-border)' : 'var(--border-inner)'; }}
                >
                  <p style={{ fontSize: 13, fontWeight: isToday ? 900 : 700, color: isToday ? 'var(--accent)' : 'var(--text-primary)', margin: '0 0 4px' }}>{date.date()}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); openEdit(event); }}
                        style={{
                          borderRadius: 'var(--r-xs)',
                          padding: '2px 5px',
                          fontSize: 10,
                          fontWeight: 700,
                          background: 'var(--surface-2)',
                          color: typeConfig[event.type]?.color || 'var(--text-secondary)',
                          boxShadow: 'var(--shadow-sm)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          opacity: event.completed ? 0.5 : 1,
                          textDecoration: event.completed ? 'line-through' : 'none',
                          borderLeft: `2px solid ${typeConfig[event.type]?.dot || '#64748b'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p style={{ fontSize: 9, color: 'var(--text-tertiary)', margin: 0, fontWeight: 600, paddingLeft: 2 }}>+{dayEvents.length - 3} mais</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">
          {/* Filtro por tipo */}
          <div className="card p-4">
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filtrar por tipo</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[{ value: 'all', label: 'Todos os tipos', color: 'var(--text-secondary)', dot: '#64748b' }, ...Object.entries(typeConfig).map(([k, v]) => ({ value: k, label: v.label, color: v.color, dot: v.dot }))].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  className={filterType === opt.value ? 'card-pressed' : 'card'}
                  style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, border: filterType === opt.value ? '1px solid var(--accent-border)' : '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s ease' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: filterType === opt.value ? 'var(--accent)' : 'var(--text-primary)' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Próximos eventos */}
          <div className="card p-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={13} style={{ color: 'var(--purple)' }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>Próximos eventos</p>
            </div>
            <div className="space-y-2">
              {upcoming.map((event) => {
                const tc = typeConfig[event.type] || typeConfig.outro;
                return (
                  <div
                    key={event.id}
                    onClick={() => openEdit(event)}
                    style={{ borderRadius: 'var(--r-md)', padding: '10px 12px', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-inner)', cursor: 'pointer', transition: 'all 0.15s ease', borderLeft: `3px solid ${tc.dot}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-raised)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
                          {moment(event.date).format('DD/MM')} {event.time || ''}
                        </p>
                        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: tc.color, marginTop: 4 }}>{tc.label}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleEvent.mutate(event); }}
                        style={{ width: 22, height: 22, borderRadius: 'var(--r-sm)', background: event.completed ? 'var(--green)' : 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                        title={event.completed ? 'Desmarcar' : 'Concluir'}
                      >
                        {event.completed && <CheckCircle size={12} style={{ color: 'white' }} />}
                      </button>
                    </div>
                  </div>
                );
              })}
              {upcoming.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>Nenhum evento próximo.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de criação/edição de evento */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowForm(false)}>
          <div
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', margin: 0 }}>{selectedEvent ? 'Editar evento' : 'Novo evento'}</p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>Agenda operacional</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveEvent.mutate(formData); }} className="space-y-4">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Título *</label>
                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required style={inputStyle} placeholder="Ex: Entrega pedido #123" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Tipo</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Data *</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Hora (opcional)</label>
                <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Observações sobre o evento..."
                />
              </div>

              {selectedEvent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, completed: !formData.completed })}
                    style={{ width: 22, height: 22, borderRadius: 'var(--r-sm)', background: formData.completed ? 'var(--green)' : 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    {formData.completed && <CheckCircle size={12} style={{ color: 'white' }} />}
                  </button>
                  <label style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setFormData({ ...formData, completed: !formData.completed })}>Marcar como concluído</label>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                {selectedEvent && (
                  <button
                    type="button"
                    onClick={() => deleteEvent.mutate(selectedEvent.id)}
                    style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--red)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button type="button" onClick={() => setShowForm(false)} className="btn-nm" style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: 14 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: 14 }}>Salvar evento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
