import React, { useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Download, Edit, Eye, Mail, MessageCircle, ShoppingCart, Trash2 } from 'lucide-react';

const money = (value) => `R$ ${(Number(value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const marginOf = (quote) => {
  const price = Number(quote.final_price || 0);
  const cost = Number(quote.total_cost || 0);
  return price > 0 ? ((price - cost) / price) * 100 : 0;
};

const marginColor = (margin) => {
  if (margin >= 45) return 'var(--green)';
  if (margin >= 20) return 'var(--orange)';
  return 'var(--red)';
};

const ActionBtn = ({ title, onClick, children, danger }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 34,
      height: 34,
      borderRadius: 'var(--r-sm)',
      background: 'var(--bg)',
      boxShadow: 'var(--shadow-flat)',
      border: '1px solid var(--border)',
      cursor: 'pointer',
      color: danger ? 'var(--red)' : 'var(--text-secondary)',
      transition: 'box-shadow 0.15s, color 0.15s',
    }}
    onMouseEnter={(event) => {
      event.currentTarget.style.boxShadow = 'var(--shadow-raised-sm)';
      event.currentTarget.style.color = danger ? 'var(--red)' : 'var(--accent)';
    }}
    onMouseLeave={(event) => {
      event.currentTarget.style.boxShadow = 'var(--shadow-flat)';
      event.currentTarget.style.color = danger ? 'var(--red)' : 'var(--text-secondary)';
    }}
  >
    {children}
  </button>
);

export default function QuoteSmartTable({
  quotes,
  selectedIds,
  onToggle,
  onToggleAll,
  onView,
  onEdit,
  onDelete,
  onConvert,
  onPdf,
  onEmail,
  onWhatsApp,
}) {
  const [expandedRows, setExpandedRows] = useState([]);
  const allSelected = quotes.length > 0 && quotes.every((quote) => selectedIds.includes(quote.id));
  const toggleRow = (id) => setExpandedRows((prev) => prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]);

  const headerStyle = {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 900,
    color: 'var(--text-secondary)',
    padding: '14px 16px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border-inner)',
  };

  if (!quotes.length) {
    return (
      <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', borderRadius: 'var(--r-xl)', padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
        Nenhum orcamento encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 48 }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '21%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th style={headerStyle}><input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Selecionar todos" /></th>
              <th style={{ ...headerStyle, textAlign: 'left' }}>Numero</th>
              <th style={{ ...headerStyle, textAlign: 'left' }}>Cliente</th>
              <th style={{ ...headerStyle, textAlign: 'left' }}>Resp.</th>
              <th style={{ ...headerStyle, textAlign: 'left' }}>Valor</th>
              <th style={{ ...headerStyle, textAlign: 'left' }}>Margem</th>
              <th style={{ ...headerStyle, textAlign: 'left' }}>Status</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote, index) => {
              const margin = marginOf(quote);
              const isExpanded = expandedRows.includes(quote.id);
              const rowBg = index % 2 === 0 ? 'var(--bg)' : 'var(--surface-2)';
              return (
                <React.Fragment key={quote.id}>
                  <tr style={{ background: rowBg, borderBottom: '1px solid var(--border-inner)' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', background: rowBg }}>
                      <input type="checkbox" checked={selectedIds.includes(quote.id)} onChange={() => onToggle(quote.id)} aria-label={`Selecionar ${quote.quote_number || 'orcamento'}`} />
                    </td>
                    <td style={{ padding: '12px 16px', background: rowBg }}>
                      <button type="button" onClick={() => toggleRow(quote.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: 'var(--text-primary)' }}>
                        <p style={{ fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontSize: 14 }}>{quote.quote_number || '-'}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{(quote.created_date || '').slice(0, 10) || '-'}</p>
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', background: rowBg }}>
                      <p style={{ fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontSize: 14, overflowWrap: 'anywhere' }}>{quote.client_name || 'Sem cliente'}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{quote.client_phone || '-'}</p>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', background: rowBg }}>{quote.created_by_partner || '-'}</td>
                    <td style={{ padding: '12px 16px', background: rowBg }}>
                      <p style={{ fontWeight: 900, color: 'var(--green)', margin: 0, fontSize: 14 }}>{money(quote.final_price)}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>custo {money(quote.total_cost)}</p>
                    </td>
                    <td style={{ padding: '12px 16px', background: rowBg }}>
                      <span style={{ fontWeight: 900, fontSize: 14, color: marginColor(margin) }}>{margin.toFixed(1)}%</span>
                    </td>
                    <td style={{ padding: '12px 16px', background: rowBg }}><StatusBadge status={quote.status} /></td>
                    <td style={{ padding: '12px 16px', background: rowBg }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <ActionBtn title="Ver" onClick={() => onView(quote)}><Eye size={14} /></ActionBtn>
                        <ActionBtn title="Editar" onClick={() => onEdit(quote)}><Edit size={14} /></ActionBtn>
                        <ActionBtn title="PDF" onClick={() => onPdf(quote)}><Download size={14} /></ActionBtn>
                        <ActionBtn title="E-mail" onClick={() => onEmail(quote)}><Mail size={14} /></ActionBtn>
                        <ActionBtn title="WhatsApp" onClick={() => onWhatsApp(quote)}><MessageCircle size={14} /></ActionBtn>
                        <ActionBtn title="Converter em venda" onClick={() => onConvert(quote)}><ShoppingCart size={14} /></ActionBtn>
                        <ActionBtn title="Excluir" onClick={() => onDelete(quote)} danger><Trash2 size={14} /></ActionBtn>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} style={{ padding: '0 16px 14px', background: 'var(--surface-2)' }}>
                        <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', borderRadius: 'var(--r-md)', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, fontSize: 13 }}>
                          <div><p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', margin: '0 0 4px' }}>Resumo</p><p style={{ color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>{quote.product_name || '-'}</p></div>
                          <div><p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', margin: '0 0 4px' }}>Descricao</p><p style={{ color: 'var(--text-secondary)', margin: 0 }}>{quote.items_summary || quote.description || '-'}</p></div>
                          <div><p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', margin: '0 0 4px' }}>Telefone</p><p style={{ color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>{quote.client_phone || '-'}</p></div>
                          <div><p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', margin: '0 0 4px' }}>Custo total</p><p style={{ color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>{money(quote.total_cost)}</p></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
