import React, { useMemo } from 'react';
import { Download, ShoppingCart, Truck, FileText, ClipboardList } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';
import { downloadCsv } from '@/lib/downloadUtils';
import { buildReorderGroups } from '@/lib/purchasing';
import moment from 'moment';

const money = formatCurrency;

export default function ReorderPanel({ products = [], onGeneratePurchase, onOpenPurchases, generatingSupplier }) {
  const groups = useMemo(() => buildReorderGroups(products), [products]);

  const totals = useMemo(() => ({
    items: groups.reduce((sum, group) => sum + group.rows.length, 0),
    estimated: groups.reduce((sum, group) => sum + group.total, 0),
  }), [groups]);

  const exportCsv = () => {
    const header = ['fornecedor', 'item', 'sku', 'saldo', 'minimo', 'maximo', 'sugestao_compra', 'custo_unitario', 'total_estimado'];
    const rows = groups.flatMap((group) => group.rows.map((row) => [
      group.supplier,
      row.product.name,
      row.product.sku || '',
      row.quantity,
      row.minQuantity,
      row.maxQuantity || '',
      row.suggestion,
      Number(row.product.cost_price || 0),
      Number(row.estimated.toFixed(2)),
    ]));
    downloadCsv([header, ...rows], `reposicao-${moment().format('YYYY-MM-DD')}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={17} style={{ color: 'var(--orange)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Painel de reposicao</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {totals.items} {totals.items === 1 ? 'item abaixo do minimo' : 'itens abaixo do minimo'} · compra estimada {money(totals.estimated)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenPurchases && (
              <button type="button" className="btn-nm" onClick={onOpenPurchases} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList size={14} /> Pedidos de compra
              </button>
            )}
            <button type="button" className="btn-nm" onClick={exportCsv} disabled={!totals.items} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: totals.items ? 1 : 0.5 }}>
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {!groups.length && (
        <div className="card p-10 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Nenhum item abaixo do minimo. Estoque saudavel.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.supplier} className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4" style={{ borderBottom: '1px solid var(--border-inner)' }}>
            <div className="flex items-center gap-2">
              <Truck size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>{group.supplier}</span>
              <span className="text-xs font-bold rounded-full px-2 py-1" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{group.rows.length} {group.rows.length === 1 ? 'item' : 'itens'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--orange)' }}>Total estimado: {money(group.total)}</span>
              {onGeneratePurchase && (
                <button type="button" className="btn-nm" onClick={() => onGeneratePurchase(group)} disabled={!group.buyableCount || generatingSupplier === group.supplier} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: group.buyableCount ? 1 : 0.5 }}>
                  <FileText size={13} /> {generatingSupplier === group.supplier ? 'Gerando...' : 'Gerar compra'}
                </button>
              )}
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-inner)' }}>
                  {['Item', 'Saldo', 'Minimo', 'Sugestao de compra', 'Custo unit.', 'Total estimado'].map((heading) => (
                    <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest font-black" style={{ color: 'var(--text-tertiary)' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.product.id} style={{ borderBottom: '1px solid var(--border-inner)' }}>
                    <td className="p-3">
                      <p className="font-black break-words" style={{ color: 'var(--text-primary)' }}>{row.product.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{row.product.sku || 'sem SKU'}</p>
                    </td>
                    <td className="p-3 font-black" style={{ color: 'var(--red)' }}>{row.quantity} {row.product.unit || 'un'}</td>
                    <td className="p-3 font-bold" style={{ color: 'var(--text-secondary)' }}>{row.minQuantity}</td>
                    <td className="p-3">
                      <span className="text-xs font-black rounded-full px-2.5 py-1" style={{ background: 'var(--orange-muted)', color: 'var(--orange)' }}>+{row.suggestion} {row.product.unit || 'un'}</span>
                    </td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{money(row.product.cost_price)}</td>
                    <td className="p-3 font-black" style={{ color: 'var(--text-primary)' }}>{money(row.estimated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
