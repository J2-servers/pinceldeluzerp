import React from 'react';
import { CheckCircle, PackageCheck, RefreshCw, Search, SlidersHorizontal, Truck, XCircle } from 'lucide-react';

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

export default function SalesAdvancedToolbar({ filters, setFilters, selectedCount, onBulkStatus, onClearSelection, view, setView }) {
  const update = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const reset = () => setFilters({ search: '', status: 'all', payment: 'all', period: 'all', sort: 'recent', minValue: '', onlyLate: false, onlyPendingPayment: false });

  return (
    <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', borderRadius: 'var(--r-xl)', padding: '18px 20px' }}>
      {/* Search + View switcher */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Buscar cliente, número, item, status, observação..."
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
          <option value="all">Todos status</option>
          <option value="novo">Novo</option>
          <option value="em_producao">Em produção</option>
          <option value="pronto">Pronto</option>
          <option value="entregue">Entregue</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select style={selectStyle} value={filters.payment} onChange={(e) => update('payment', e.target.value)}>
          <option value="all">Todos pagamentos</option>
          <option value="pendente">Pendente</option>
          <option value="parcial">Parcial</option>
          <option value="pago">Pago</option>
        </select>
        <select style={selectStyle} value={filters.period} onChange={(e) => update('period', e.target.value)}>
          <option value="all">Qualquer data</option>
          <option value="today">Hoje</option>
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
          <option value="late">Atrasados</option>
        </select>
        <select style={selectStyle} value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
          <option value="recent">Mais recentes</option>
          <option value="value_desc">Maior valor</option>
          <option value="value_asc">Menor valor</option>
          <option value="delivery">Entrega</option>
          <option value="client">Cliente A-Z</option>
        </select>
        <input type="number" value={filters.minValue} onChange={(e) => update('minValue', e.target.value)} placeholder="Valor mínimo" style={inputStyle} />
        <label style={checkLabelStyle}>
          <input type="checkbox" checked={filters.onlyLate} onChange={(e) => update('onlyLate', e.target.checked)} />
          Atrasados
        </label>
        <label style={checkLabelStyle}>
          <input type="checkbox" checked={filters.onlyPendingPayment} onChange={(e) => update('onlyPendingPayment', e.target.checked)} />
          A receber
        </label>
        <button onClick={reset} style={chipStyle(false)}>
          <RefreshCw size={13} /> Limpar
        </button>
      </div>

      {/* Bulk actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border-inner)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
          <SlidersHorizontal size={13} /> Filtros de venda, pagamento, entrega, atraso, valor e ações em lote.
        </div>
        {selectedCount > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{selectedCount} selecionado(s)</span>
            {[
              { label: 'Produção', status: 'em_producao', icon: <PackageCheck size={12} /> },
              { label: 'Pronto', status: 'pronto', icon: <CheckCircle size={12} /> },
              { label: 'Entregue', status: 'entregue', icon: <Truck size={12} /> },
              { label: 'Cancelar', status: 'cancelado', icon: <XCircle size={12} /> },
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
