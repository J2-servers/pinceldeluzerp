import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { CheckCircle, Download, Edit, Eye, FileText, PackageCheck, Receipt, Trash2, Truck } from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/lib/numberFormat';

const money = formatCurrency;

const ActionBtn = ({ title, onClick, children, danger }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 30, height: 30, borderRadius: 'var(--r-sm)',
      background: 'var(--bg)', boxShadow: 'var(--shadow-flat)',
      border: 'none', cursor: 'pointer',
      color: danger ? 'var(--red)' : 'var(--text-secondary)',
      flexShrink: 0,
    }}
    onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-raised-sm)'}
    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-flat)'}
  >
    {children}
  </button>
);

const headerStyle = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
  fontWeight: 700, color: 'var(--text-tertiary)', padding: '12px 14px',
  background: 'var(--surface-2)', borderBottom: '1px solid var(--border-inner)',
  textAlign: 'left',
};

export default function SalesSmartTable({ orders, selectedIds, onToggle, onToggleAll, onView, onEdit, onDelete, onStatusChange, onInvoice }) {
  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));
  const today = moment().format('YYYY-MM-DD');

  if (!orders.length) {
    return (
      <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', borderRadius: 'var(--r-xl)', padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
        Nenhum pedido encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
      {/* Mobile cards */}
      <div className="md:hidden" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orders.map((order) => {
          const late = order.delivery_date && order.delivery_date < today && !['entregue', 'cancelado'].includes(order.status);
          const margin = Number(order.total || 0) > 0 ? ((Number(order.total || 0) - Number(order.total_cost || 0)) / Number(order.total || 1)) * 100 : 0;
          return (
            <div key={order.id} style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)', borderRadius: 'var(--r-lg)', padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => onToggle(order.id)} style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{order.order_number}</p>
                  <p style={{ fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0', fontSize: 15 }}>{order.client_name}</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--green)', margin: '4px 0 0' }}>{money(order.total)}</p>
                  {late && <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, margin: '2px 0 0' }}>⚠ Atrasado</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <StatusBadge status={order.status} />
                  <StatusBadge status={order.payment_status} />
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0 }}>{order.items || 'Sem descrição'}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-tertiary)' }}>
                  {order.line_items_count || 1} item(ns) · margem {margin.toFixed(1)}% · {order.payment_method || 'pix'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, borderTop: '1px solid var(--border-inner)', paddingTop: 10 }}>
                <ActionBtn title="Ver" onClick={() => onView(order)}><Eye size={13} /></ActionBtn>
                <ActionBtn title="Editar" onClick={() => onEdit(order)}><Edit size={13} /></ActionBtn>
                <ActionBtn title="Produção" onClick={() => onStatusChange(order, 'em_producao')}><PackageCheck size={13} /></ActionBtn>
                <ActionBtn title="Pronto" onClick={() => onStatusChange(order, 'pronto')}><CheckCircle size={13} /></ActionBtn>
                <ActionBtn title="Entregue" onClick={() => onStatusChange(order, 'entregue')}><Truck size={13} /></ActionBtn>
                <ActionBtn title="Nota fiscal" onClick={() => onInvoice(order)}><Receipt size={13} /></ActionBtn>
                <ActionBtn title="Documento" onClick={() => onView(order)}><FileText size={13} /></ActionBtn>
                <ActionBtn title="Exportar" onClick={() => onView(order)}><Download size={13} /></ActionBtn>
                <ActionBtn title="Excluir" onClick={() => onDelete(order)} danger><Trash2 size={13} /></ActionBtn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 44 }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col />
            <col style={{ width: '11%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={headerStyle}><input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Selecionar todos" /></th>
              <th style={headerStyle}>Número</th>
              <th style={headerStyle}>Cliente</th>
              <th style={headerStyle}>Pedido</th>
              <th style={headerStyle}>Valor</th>
              <th style={headerStyle}>Entrega</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>Pagamento</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => {
              const late = order.delivery_date && order.delivery_date < today && !['entregue', 'cancelado'].includes(order.status);
              const margin = Number(order.total || 0) > 0 ? ((Number(order.total || 0) - Number(order.total_cost || 0)) / Number(order.total || 1)) * 100 : 0;
              const rowBg = i % 2 === 0 ? 'var(--bg)' : 'var(--surface-2)';

              return (
                <tr
                  key={order.id}
                  style={{ borderBottom: '1px solid var(--border-inner)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.querySelectorAll('td').forEach(c => c.style.background = 'var(--surface-3)');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.querySelectorAll('td').forEach(c => c.style.background = rowBg);
                  }}
                >
                  <td style={{ padding: '10px 14px', textAlign: 'center', background: rowBg }}>
                    <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => onToggle(order.id)} aria-label={`Selecionar ${order.order_number}`} />
                  </td>
                  <td style={{ padding: '10px 14px', background: rowBg }}>
                    <p style={{ fontWeight: 900, color: 'var(--accent)', margin: 0, fontSize: 13 }}>{order.order_number || '—'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{order.created_date ? moment(order.created_date).format('DD/MM/YY') : '—'}</p>
                  </td>
                  <td style={{ padding: '10px 14px', background: rowBg }}>
                    <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: 13 }}>{order.client_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{order.payment_method || 'pix'}</p>
                  </td>
                  <td style={{ padding: '10px 14px', background: rowBg }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.items || 'Sem descrição'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{order.line_items_count || 1} item(ns) · margem {margin.toFixed(1)}%</p>
                  </td>
                  <td style={{ padding: '10px 14px', background: rowBg }}>
                    <p style={{ fontWeight: 900, color: 'var(--green)', margin: 0, fontSize: 13 }}>{money(order.total)}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>custo {money(order.total_cost)}</p>
                  </td>
                  <td style={{ padding: '10px 14px', background: rowBg }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: late ? 'var(--red)' : 'var(--text-secondary)' }}>
                      {order.delivery_date ? moment(order.delivery_date).format('DD/MM/YY') : '—'}
                    </span>
                    {late && <p style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, margin: '1px 0 0' }}>Atrasado</p>}
                  </td>
                  <td style={{ padding: '10px 14px', background: rowBg }}><StatusBadge status={order.status} /></td>
                  <td style={{ padding: '10px 14px', background: rowBg }}><StatusBadge status={order.payment_status} /></td>
                  <td style={{ padding: '10px 14px', background: rowBg }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <ActionBtn title="Ver" onClick={() => onView(order)}><Eye size={13} /></ActionBtn>
                      <ActionBtn title="Editar" onClick={() => onEdit(order)}><Edit size={13} /></ActionBtn>
                      <ActionBtn title="Produção" onClick={() => onStatusChange(order, 'em_producao')}><PackageCheck size={13} /></ActionBtn>
                      <ActionBtn title="Pronto" onClick={() => onStatusChange(order, 'pronto')}><CheckCircle size={13} /></ActionBtn>
                      <ActionBtn title="Entregue" onClick={() => onStatusChange(order, 'entregue')}><Truck size={13} /></ActionBtn>
                      <ActionBtn title="Nota fiscal" onClick={() => onInvoice(order)}><Receipt size={13} /></ActionBtn>
                      <ActionBtn title="Documento" onClick={() => onView(order)}><FileText size={13} /></ActionBtn>
                      <ActionBtn title="Exportar" onClick={() => onView(order)}><Download size={13} /></ActionBtn>
                      <ActionBtn title="Excluir" onClick={() => onDelete(order)} danger><Trash2 size={13} /></ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
