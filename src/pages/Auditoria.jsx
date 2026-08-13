import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import QueryState from '@/components/ui/QueryState';
import { History, PlusCircle, Pencil, Trash2, Search, User } from 'lucide-react';
import {
  PRICE_FIELD_LABELS,
  PRICE_LOG_ENTITY_LABELS,
  parseChangedFields,
  formatLogValue,
} from '@/components/pricing/priceChangeLog';

// ── Estilo dos badges de acao (verde=criacao, azul=edicao, vermelho=exclusao, laranja=status) ──
const ACTION_META = {
  create: { label: 'Criacao', color: 'var(--green)', muted: 'var(--green-muted)', bucket: 'create' },
  update: { label: 'Edicao', color: 'var(--accent)', muted: 'var(--accent-muted)', bucket: 'update' },
  edit: { label: 'Edicao', color: 'var(--accent)', muted: 'var(--accent-muted)', bucket: 'update' },
  delete: { label: 'Exclusao', color: 'var(--red)', muted: 'var(--red-muted)', bucket: 'delete' },
  remove: { label: 'Exclusao', color: 'var(--red)', muted: 'var(--red-muted)', bucket: 'delete' },
  cancel: { label: 'Cancelamento', color: 'var(--red)', muted: 'var(--red-muted)', bucket: 'delete' },
  status: { label: 'Status', color: 'var(--orange)', muted: 'var(--orange-muted)', bucket: 'status' },
  status_change: { label: 'Status', color: 'var(--orange)', muted: 'var(--orange-muted)', bucket: 'status' },
  approve: { label: 'Aprovacao', color: 'var(--purple)', muted: 'var(--purple-muted)', bucket: 'other' },
  convert: { label: 'Conversao', color: 'var(--purple)', muted: 'var(--purple-muted)', bucket: 'other' },
};

function resolveAction(action) {
  const key = String(action || '').toLowerCase();
  if (ACTION_META[key]) return ACTION_META[key];
  if (key.includes('creat') || key.includes('cria') || key.includes('novo') || key.includes('add')) return ACTION_META.create;
  if (key.includes('delet') || key.includes('exclu') || key.includes('remov')) return ACTION_META.delete;
  if (key.includes('cancel')) return ACTION_META.cancel;
  if (key.includes('status')) return ACTION_META.status;
  if (key.includes('updat') || key.includes('edit') || key.includes('alter')) return ACTION_META.update;
  return { label: action || 'Acao', color: 'var(--text-secondary)', muted: 'var(--surface-2)', bucket: 'other' };
}

const fieldLabel = (field) => PRICE_FIELD_LABELS[field] || field;

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function parseMetadata(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { valor: String(parsed) };
  } catch {
    return { info: String(raw) };
  }
}

// Une AuditLog + PriceChangeLog numa timeline unica e normalizada.
function normalizeEvents(auditLogs, priceLogs) {
  const audit = (auditLogs || []).map((log) => {
    const meta = resolveAction(log.action);
    const changes = log.field_name
      ? [{ field: log.field_name, old: log.old_value, new: log.new_value }]
      : [];
    return {
      id: `audit-${log.id}`,
      source: 'Auditoria',
      date: log.created_date,
      user: log.user_name || log.user_email || 'Sistema',
      module: log.module || 'Sistema',
      entity: log.entity_name || log.module || 'Registro',
      action: log.action || '',
      actionMeta: meta,
      label: log.document_number || log.entity_id || '',
      changes,
      metadata: parseMetadata(log.metadata),
    };
  });

  const price = (priceLogs || []).map((log) => {
    const meta = resolveAction(log.action);
    return {
      id: `price-${log.id}`,
      source: 'Precificacao',
      date: log.created_date,
      user: log.user_name || 'Sistema',
      module: 'Precificacao',
      entity: PRICE_LOG_ENTITY_LABELS[log.entity_name] || log.entity_name || 'Precificacao',
      action: log.action || '',
      actionMeta: meta,
      label: log.record_label || log.record_id || '',
      changes: parseChangedFields(log.changed_fields),
      metadata: null,
    };
  });

  return [...audit, ...price].sort((a, b) => {
    const ta = new Date(a.date || 0).getTime();
    const tb = new Date(b.date || 0).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
}

const controlStyle = {
  background: 'var(--bg)',
  boxShadow: 'var(--shadow-pressed)',
  border: '1px solid var(--border-inner)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-primary)',
  padding: '9px 13px',
  outline: 'none',
  fontSize: 13,
  width: '100%',
};

function ChangeLine({ actionBucket, change }) {
  let text;
  if (actionBucket === 'create') text = formatLogValue(change.new);
  else if (actionBucket === 'delete') text = formatLogValue(change.old);
  else text = `${formatLogValue(change.old)} → ${formatLogValue(change.new)}`;
  return (
    <div style={{
      borderRadius: 'var(--r-sm)', background: 'var(--bg)', boxShadow: 'var(--shadow-flat)',
      padding: '6px 10px', fontSize: 12, color: 'var(--text-secondary)',
    }}>
      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fieldLabel(change.field)}:</span> {text}
    </div>
  );
}

export default function Auditoria() {
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [search, setSearch] = useState('');

  const auditQuery = useQuery({
    queryKey: ['auditLog', 'list', 500],
    queryFn: () => erp.entities.AuditLog.list('-created_date', 500),
  });
  const priceQuery = useQuery({
    queryKey: ['priceChangeLog', 'list', 200],
    queryFn: () => (erp.entities.PriceChangeLog
      ? erp.entities.PriceChangeLog.list('-created_date', 200)
      : Promise.resolve([])),
  });

  const queries = [auditQuery, priceQuery];
  const isLoading = queries.some((q) => q.isLoading);
  // So bloqueia a tela se o log principal (AuditLog) falhar; PriceChangeLog e complementar.
  const isError = auditQuery.isError;
  const firstError = auditQuery.error;
  const refetchAll = () => queries.forEach((q) => q.refetch());

  const events = useMemo(
    () => normalizeEvents(auditQuery.data || [], priceQuery.data || []),
    [auditQuery.data, priceQuery.data],
  );

  const moduleOptions = useMemo(
    () => Array.from(new Set(events.map((e) => e.entity).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [events],
  );
  const actionOptions = useMemo(
    () => Array.from(new Set(events.map((e) => e.action).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [events],
  );
  const userOptions = useMemo(
    () => Array.from(new Set(events.map((e) => e.user).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [events],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((e) => {
      if (moduleFilter !== 'all' && e.entity !== moduleFilter) return false;
      if (actionFilter !== 'all' && e.action !== actionFilter) return false;
      if (userFilter !== 'all' && e.user !== userFilter) return false;
      if (term) {
        const haystack = `${e.label} ${e.entity} ${e.module} ${e.user} ${e.action}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [events, moduleFilter, actionFilter, userFilter, search]);

  const counts = useMemo(() => {
    const base = { total: filtered.length, create: 0, update: 0, delete: 0, status: 0, other: 0 };
    filtered.forEach((e) => {
      const bucket = e.actionMeta.bucket || 'other';
      base[bucket] = (base[bucket] || 0) + 1;
    });
    return base;
  }, [filtered]);

  const kpis = [
    { label: 'Registros', value: counts.total, color: 'var(--text-primary)', icon: History },
    { label: 'Criacoes', value: counts.create, color: 'var(--green)', icon: PlusCircle },
    { label: 'Edicoes', value: counts.update, color: 'var(--accent)', icon: Pencil },
    { label: 'Exclusoes/Status', value: counts.delete + counts.status, color: 'var(--red)', icon: Trash2 },
  ];

  const resetFilters = () => {
    setModuleFilter('all');
    setActionFilter('all');
    setUserFilter('all');
    setSearch('');
  };

  const hasFilters = moduleFilter !== 'all' || actionFilter !== 'all' || userFilter !== 'all' || search.trim() !== '';

  return (
    <div className="space-y-6">
      <Header title="Auditoria" subtitle="Trilha de alteracoes do sistema — quem mudou, o que mudou e quando" />

      <QueryState isLoading={isLoading} isError={isError} error={firstError} onRetry={refetchAll} loadingLabel="Carregando trilha de auditoria...">
        {/* KPIs por tipo de acao */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="kpi-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} style={{ color: kpi.color }} />
                  </div>
                </div>
                <div className="kpi-number" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="card p-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Modulo / Entidade</label>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={controlStyle}>
              <option value="all">Todas</option>
              {moduleOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Acao</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={controlStyle}>
              <option value="all">Todas</option>
              {actionOptions.map((opt) => <option key={opt} value={opt}>{resolveAction(opt).label} ({opt})</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Usuario</label>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={controlStyle}>
              <option value="all">Todos</option>
              {userOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Documento, registro..."
                style={{ ...controlStyle, paddingLeft: 32 }}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div className="card p-5" style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              {hasFilters
                ? 'Nenhum registro corresponde aos filtros aplicados.'
                : 'Nenhum registro de auditoria ainda. Alteracoes feitas no sistema aparecem aqui automaticamente.'}
              {hasFilters && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn-nm" onClick={resetFilters} style={{ fontSize: 12 }}>Limpar filtros</button>
                </div>
              )}
            </div>
          ) : filtered.map((ev) => (
            <article key={ev.id} className="card p-4">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '3px 10px', borderRadius: 'var(--r-full)',
                  color: ev.actionMeta.color, background: ev.actionMeta.muted,
                }}>
                  {ev.actionMeta.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{ev.entity}</span>
                {ev.label && <span style={{ fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{ev.label}</span>}
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--surface-2)', color: 'var(--text-tertiary)',
                }}>
                  {ev.module}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatDateTime(ev.date)}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <User size={12} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{ev.user}</span>
              </div>

              {ev.changes.length > 0 && (
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {ev.changes.map((change, idx) => (
                    <ChangeLine key={`${ev.id}-${change.field}-${idx}`} actionBucket={ev.actionMeta.bucket} change={change} />
                  ))}
                </div>
              )}

              {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(ev.metadata).map(([key, val]) => (
                    <span key={key} style={{
                      fontSize: 11, color: 'var(--text-tertiary)', padding: '3px 8px',
                      borderRadius: 'var(--r-sm)', background: 'var(--surface-2)',
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{fieldLabel(key)}:</span>{' '}
                      {formatLogValue(typeof val === 'object' ? JSON.stringify(val) : val)}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
