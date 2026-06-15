import React from 'react';
import { Archive, CheckCircle, Filter, RefreshCw, Search, SlidersHorizontal, XCircle } from 'lucide-react';

const statuses = [
  ['all', 'Todos status'], ['rascunho', 'Rascunho'], ['enviado', 'Enviado'],
  ['aprovado', 'Aprovado'], ['reprovado', 'Reprovado'], ['expirado', 'Expirado'],
];

const inputStyle = {
  background: 'var(--bg)',
  boxShadow: 'var(--shadow-pressed)',
  border: '1px solid var(--border-inner)',
  borderRadius: 'var(--r-sm)',
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  height: 42,
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
};

const checkLabelStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)',
  border: '1px solid var(--border-inner)', borderRadius: 'var(--r-sm)',
  padding: '8px 12px', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', cursor: 'pointer', height: 42,
};

const chipStyle = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--bg)',
  boxShadow: active ? 'var(--shadow-pressed)' : 'var(--shadow-raised-sm)',
  color: active ? 'var(--accent)' : 'var(--text-secondary)',
  borderRadius: 'var(--r-sm)', border: 'none',
  padding: '8px 14px', fontWeight: active ? 700 : 600,
  fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
  height: 38,
});

export default function QuoteAdvancedToolbar({ filters, setFilters, selectedCount, onBulkStatus, onClearSelection, view, setView }) {
  const update = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const reset = () => setFilters({ search: '', status: 'all', period: 'all', partner: 'all', sort: 'recent', minValue: '', onlyWithPhone: false, onlyHighMargin: false });

  return (
    <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', borderRadius: 'var(--r-xl)', padding: '18px 20px' }}>
      {/* Search + View switcher */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Buscar cliente, número, produto, telefone..."
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {['table', 'pipeline', 'cards'].map((v) => (
            <button key={v} onClick={() => setView(v)} style={chipStyle(view === v)}>
              {v === 'table' ? 'Tabela' : v === 'pipeline' ? 'Pipeline' : 'Cards'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        <select style={selectStyle} value={filters.status} onChange={(e) => update('status', e.target.value)}>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select style={selectStyle} value={filters.period} onChange={(e) => update('period', e.target.value)}>
          <option value="all">Qualquer data</option>
          <option value="today">Hoje</option>
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
          <option value="expired">Vencidos</option>
        </select>
        <select style={selectStyle} value={filters.partner} onChange={(e) => update('partner', e.target.value)}>
          <option value="all">Todos responsáveis</option>
          <option value="Maeli">Maeli</option>
          <option value="Wesley">Wesley</option>
          <option value="Juliano">Juliano</option>
        </select>
        <select style={selectStyle} value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
          <option value="recent">Mais recentes</option>
          <option value="value_desc">Maior valor</option>
          <option value="value_asc">Menor valor</option>
          <option value="client">Cliente A-Z</option>
          <option value="deadline">Prazo</option>
        </select>
        <input
          type="number"
          value={filters.minValue}
          onChange={(e) => update('minValue', e.target.value)}
          placeholder="Valor mínimo"
          style={inputStyle}
        />
        <label style={checkLabelStyle}>
          <input type="checkbox" checked={filters.onlyWithPhone} onChange={(e) => update('onlyWithPhone', e.target.checked)} />
          Com telefone
        </label>
        <label style={checkLabelStyle}>
          <input type="checkbox" checked={filters.onlyHighMargin} onChange={(e) => update('onlyHighMargin', e.target.checked)} />
          Alta margem
        </label>
        <button onClick={reset} style={chipStyle(false)}>
          <RefreshCw size={13} /> Limpar
        </button>
      </div>

      {/* Bulk actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border-inner)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
          <SlidersHorizontal size={13} /> Filtros, ordenação, busca ampla, seleção em lote e mudança rápida de status.
        </div>
        {selectedCount > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{selectedCount} selecionado(s)</span>
            {[
              { label: 'Enviado', status: 'enviado', icon: <Filter size={12} /> },
              { label: 'Aprovar', status: 'aprovado', icon: <CheckCircle size={12} /> },
              { label: 'Reprovar', status: 'reprovado', icon: <XCircle size={12} /> },
              { label: 'Expirar', status: 'expirado', icon: <Archive size={12} /> },
            ].map(({ label, status, icon }) => (
              <button key={status} onClick={() => onBulkStatus(status)} style={chipStyle(false)}>
                {icon} {label}
              </button>
            ))}
            <button onClick={onClearSelection} style={{ ...chipStyle(false), color: 'var(--text-tertiary)', fontSize: 12 }}>
              Limpar seleção
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
