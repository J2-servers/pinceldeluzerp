import React from 'react';
import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react';

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

/**
 * CommercialAdvancedToolbar — shared search/filter/bulk-actions bar for the
 * Vendas (SalesOrder) and Orcamentos (ProductQuote) pages. The set of filter
 * selects, checkboxes, bulk status actions and the reset target all come
 * from `config`, since the two entities filter on different fields.
 *
 * config shape:
 * {
 *   searchPlaceholder: string,
 *   selects: Array<{ field: string, options: Array<[value, label]> }>,
 *   checkboxes: Array<{ field: string, label: string }>,
 *   helperText: string,
 *   bulkActions: Array<{ label: string, status: string, icon: LucideIcon }>,
 *   defaultFilters: object,
 * }
 */
export default function CommercialAdvancedToolbar({ filters, setFilters, selectedCount, onBulkStatus, onClearSelection, view, setView, config }) {
  const { searchPlaceholder, selects, checkboxes, helperText, bulkActions, defaultFilters } = config;
  const update = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const reset = () => setFilters(defaultFilters);

  return (
    <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', borderRadius: 'var(--r-xl)', padding: '18px 20px' }}>
      {/* Search + View switcher */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder={searchPlaceholder}
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
        {selects.map(({ field, options }) => (
          <select key={field} style={selectStyle} value={filters[field]} onChange={(e) => update(field, e.target.value)}>
            {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        ))}
        <input type="number" value={filters.minValue} onChange={(e) => update('minValue', e.target.value)} placeholder="Valor mínimo" style={inputStyle} />
        {checkboxes.map(({ field, label }) => (
          <label key={field} style={checkLabelStyle}>
            <input type="checkbox" checked={filters[field]} onChange={(e) => update(field, e.target.checked)} />
            {label}
          </label>
        ))}
        <button onClick={reset} style={chipStyle(false)}>
          <RefreshCw size={13} /> Limpar
        </button>
      </div>

      {/* Bulk actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border-inner)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
          <SlidersHorizontal size={13} /> {helperText}
        </div>
        {selectedCount > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{selectedCount} selecionado(s)</span>
            {bulkActions.map(({ label, status, icon: Icon }) => (
              <button key={status} onClick={() => onBulkStatus(status)} style={chipStyle(false)}>
                <Icon size={12} /> {label}
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
