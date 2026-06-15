import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import { AlertTriangle, CheckCircle, Edit, Plus, Target, Trash2, TrendingUp, X } from 'lucide-react';
import moment from 'moment';

const defaultForm = { title: '', target_value: 0, current_value: 0, type: 'vendas', deadline: '', completed: false };
const types = { vendas: 'var(--green)', clientes: 'var(--accent)', lucro: 'var(--purple)', producao: 'var(--orange)', outros: 'var(--text-secondary)' };
const typeLabels = { vendas: 'Vendas', clientes: 'Clientes', lucro: 'Lucro', producao: 'Produção', outros: 'Outros' };
const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const progressOf = (goal) => goal.target_value ? Math.min(100, (Number(goal.current_value || 0) / Number(goal.target_value || 1)) * 100) : 0;

const filterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'lucro', label: 'Lucro' },
  { value: 'producao', label: 'Produção' },
  { value: 'late', label: 'Atrasadas' },
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

export default function Metas() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState(defaultForm);

  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => erp.entities.Goal.list('-created_date') });

  const saveGoal = useMutation({ mutationFn: (data) => selectedGoal ? erp.entities.Goal.update(selectedGoal.id, data) : erp.entities.Goal.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setShowForm(false); setSelectedGoal(null); setFormData(defaultForm); } });
  const deleteGoal = useMutation({ mutationFn: (id) => erp.entities.Goal.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }) });

  const filtered = filter === 'all' ? goals : goals.filter((goal) => goal.type === filter || (filter === 'late' && goal.deadline && moment(goal.deadline).isBefore(moment(), 'day') && !goal.completed));
  const stats = useMemo(() => {
    const completed = goals.filter((goal) => goal.completed || progressOf(goal) >= 100).length;
    const late = goals.filter((goal) => goal.deadline && moment(goal.deadline).isBefore(moment(), 'day') && !goal.completed).length;
    const avg = goals.length ? goals.reduce((sum, goal) => sum + progressOf(goal), 0) / goals.length : 0;
    const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.target_value || 0), 0);
    return { total: goals.length, completed, late, avg, totalTarget };
  }, [goals]);

  const openForm = (goal = null) => { setSelectedGoal(goal); setFormData(goal ? { ...defaultForm, ...goal } : defaultForm); setShowForm(true); };

  return (
    <div className="space-y-6">
      <Header title="Metas" subtitle="Painel de objetivos, progresso e execução estratégica" />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { icon: Target, label: 'Total de metas', value: stats.total, color: 'var(--green)' },
          { icon: CheckCircle, label: 'Concluídas', value: stats.completed, color: 'var(--accent)' },
          { icon: AlertTriangle, label: 'Atrasadas', value: stats.late, color: 'var(--red)' },
          { icon: TrendingUp, label: 'Progresso médio', value: `${stats.avg.toFixed(0)}%`, color: 'var(--purple)' },
          { icon: Target, label: 'Alvo total', value: money(stats.totalTarget), color: 'var(--orange)' },
        ].map((kpi) => {
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

      {/* Cabeçalho de filtros + botão nova meta */}
      <div className="card p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={filter === opt.value ? 'card-pressed' : 'card'}
              style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--r-full)', border: filter === opt.value ? '1px solid var(--accent-border)' : '1px solid var(--border)', color: filter === opt.value ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => openForm()}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', fontSize: 13 }}
        >
          <Plus size={15} /> Nova meta
        </button>
      </div>

      {/* Grid de metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((goal) => {
          const progress = progressOf(goal);
          const late = goal.deadline && moment(goal.deadline).isBefore(moment(), 'day') && !goal.completed;
          const done = progress >= 100 || goal.completed;
          const progressColor = done ? 'var(--green)' : progress >= 80 ? 'var(--green)' : progress >= 50 ? 'var(--orange)' : 'var(--red)';
          const typeColor = types[goal.type] || 'var(--text-secondary)';

          return (
            <div key={goal.id} className="card p-5" style={{ borderLeft: `3px solid ${typeColor}` }}>
              {/* Header do card */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--surface-2)', color: typeColor, borderRadius: 'var(--r-full)', padding: '3px 10px', boxShadow: 'var(--shadow-sm)' }}>
                      {typeLabels[goal.type] || goal.type}
                    </span>
                    {late && <span className="badge-red" style={{ fontSize: 11 }}>Atrasada</span>}
                    {done && <span className="badge-green" style={{ fontSize: 11 }}>Concluída</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => openForm(goal)} style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <Edit size={13} />
                  </button>
                  <button onClick={() => deleteGoal.mutate(goal.id)} style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--red)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Percentual grande */}
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 42, fontWeight: 900, color: progressColor, margin: 0, lineHeight: 1 }}>{progress.toFixed(0)}<span style={{ fontSize: 20 }}>%</span></p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0', fontWeight: 600 }}>de atingimento</p>
              </div>

              {/* Progress bar neumórfica */}
              <div style={{ height: 10, borderRadius: 'var(--r-full)', background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${progress}%`, borderRadius: 'var(--r-full)', background: progressColor, transition: 'width 0.5s ease', boxShadow: `0 0 8px ${progressColor}60` }} />
              </div>

              {/* Valores atual / meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="card-pressed" style={{ padding: '10px 12px', border: '1px solid var(--border-inner)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Atual</p>
                  <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14, margin: '3px 0 0' }}>{money(goal.current_value)}</p>
                </div>
                <div className="card-pressed" style={{ padding: '10px 12px', border: '1px solid var(--border-inner)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Meta</p>
                  <p style={{ fontWeight: 800, color: 'var(--green)', fontSize: 14, margin: '3px 0 0' }}>{money(goal.target_value)}</p>
                </div>
              </div>

              {goal.deadline && (
                <p style={{ fontSize: 12, marginTop: 12, fontWeight: 600, color: late ? 'var(--red)' : 'var(--text-tertiary)' }}>
                  Prazo: {moment(goal.deadline).format('DD/MM/YYYY')}
                </p>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
            <Target size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)' }}>Nenhuma meta encontrada</p>
            <p style={{ fontSize: 13 }}>Crie metas para acompanhar a evolução do negócio.</p>
          </div>
        )}
      </div>

      {/* Modal de criação/edição de meta */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowForm(false)}>
          <div
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', margin: 0 }}>{selectedGoal ? 'Editar meta' : 'Nova meta'}</p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>Defina o objetivo e o prazo</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveGoal.mutate({ ...formData, completed: Number(formData.current_value || 0) >= Number(formData.target_value || 0) }); }} className="space-y-4">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Título *</label>
                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required style={inputStyle} placeholder="Ex: Faturar R$ 50.000 em julho" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Tipo</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="vendas">Vendas</option>
                  <option value="clientes">Clientes</option>
                  <option value="lucro">Lucro</option>
                  <option value="producao">Produção</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Valor alvo *</label>
                  <input type="number" value={formData.target_value} onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value || 0) })} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Valor atual</label>
                  <input type="number" value={formData.current_value} onChange={(e) => setFormData({ ...formData, current_value: Number(e.target.value || 0) })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Prazo</label>
                <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-nm" style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: 14 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: 14 }}>Salvar meta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
