import React from 'react';
import { Download, Plus, Receipt, ShoppingBag } from 'lucide-react';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const kpis = (stats) => [
  { label: 'Pedidos', value: stats.total, color: 'var(--accent)', icon: '🛒' },
  { label: 'Abertos', value: stats.open, color: 'var(--orange)', icon: '⏳' },
  { label: 'Em produção', value: stats.production, color: 'var(--purple)', icon: '⚙️' },
  { label: 'Entregues', value: stats.delivered, color: 'var(--green)', icon: '✅' },
  { label: 'A receber', value: money(stats.pendingValue), color: 'var(--red)', icon: '💸' },
  { label: 'Ticket médio', value: money(stats.averageTicket), color: 'var(--text-primary)', icon: '📊' },
];

export default function SalesHero({ stats, onCreate, onExport, selectedCount, onBulkInvoice }) {
  return (
    <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', borderRadius: 'var(--r-2xl)', padding: '24px' }}>
      {/* Header row */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--green-muted)', color: 'var(--green)',
            borderRadius: 'var(--r-full)', padding: '4px 12px',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            marginBottom: 10, boxShadow: 'var(--shadow-flat)'
          }}>
            <ShoppingBag size={12} /> Central operacional de vendas
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
            Pedido criado, estoque baixado, produção acompanhada e dinheiro controlado.
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            Vender, cobrar, produzir, entregar, emitir nota, acompanhar margem e impedir venda sem estoque.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              color: '#fff', boxShadow: '4px 4px 10px rgba(0,0,0,0.18), -2px -2px 6px var(--nm-light)',
              borderRadius: 'var(--r-md)', border: 'none', padding: '10px 20px',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            <Plus size={16} /> Criar pedido
          </button>
          <button
            onClick={onExport}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)',
              color: 'var(--text-secondary)', borderRadius: 'var(--r-md)',
              border: 'none', padding: '10px 16px',
              fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={onBulkInvoice}
            disabled={!selectedCount}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg)', boxShadow: selectedCount ? 'var(--shadow-raised-sm)' : 'var(--shadow-pressed)',
              color: selectedCount ? 'var(--green)' : 'var(--text-tertiary)',
              borderRadius: 'var(--r-md)', border: 'none', padding: '10px 16px',
              fontWeight: 600, fontSize: 13, cursor: selectedCount ? 'pointer' : 'not-allowed',
              opacity: selectedCount ? 1 : 0.6
            }}
          >
            <Receipt size={14} /> {selectedCount ? `Emitir ${selectedCount}` : 'Emitir seleção'}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 20 }}>
        {kpis(stats).map(({ label, value, color, icon }) => (
          <div
            key={label}
            className="kpi-card"
            style={{ padding: '14px 16px' }}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-tertiary)', margin: 0 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 900, color, margin: '4px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
