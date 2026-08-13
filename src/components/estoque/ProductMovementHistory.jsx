import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { ArrowDownRight, ArrowUpRight, History, RotateCcw, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';
import moment from 'moment';

const money = formatCurrency;

const typeConfig = {
  entrada: { label: 'Entrada', color: 'var(--green)', bg: 'var(--green-muted)', icon: ArrowUpRight },
  saida: { label: 'Saida', color: 'var(--red)', bg: 'var(--red-muted)', icon: ArrowDownRight },
  ajuste: { label: 'Ajuste', color: 'var(--accent)', bg: 'var(--accent-muted)', icon: SlidersHorizontal },
  devolucao: { label: 'Devolucao', color: 'var(--purple)', bg: 'var(--purple-muted)', icon: RotateCcw },
  estorno: { label: 'Estorno', color: 'var(--orange)', bg: 'var(--orange-muted)', icon: Undo2 },
};

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

export default function ProductMovementHistory({ product, onClose }) {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stockMovements', 'product', product?.id],
    queryFn: () => erp.entities.StockMovement.filter({ product_id: product.id }, '-date', 300),
    enabled: !!product?.id,
  });

  const sorted = useMemo(() => [...movements].sort((a, b) => {
    const dateA = String(a.created_date || a.date || '');
    const dateB = String(b.created_date || b.date || '');
    return dateB.localeCompare(dateA);
  }), [movements]);

  if (!product) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', padding: '24px', width: '100%', maxWidth: '760px', maxHeight: 'calc(100dvh - 48px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <History size={17} style={{ color: 'var(--accent)' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Historico de movimentacao</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name} · saldo atual {product.quantity || 0} {product.unit || 'un'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', border: 'none', borderRadius: 'var(--r-md)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-pressed)', background: 'var(--bg)' }}>
          {isLoading && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Carregando movimentos...</div>}
          {!isLoading && !sorted.length && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Nenhuma movimentacao registrada para este item.</div>}
          {!isLoading && sorted.length > 0 && (
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-inner)' }}>
                  {['Data', 'Tipo', 'Qtd', 'Motivo', 'Saldo', 'Custo unit.'].map((heading) => (
                    <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest font-black" style={{ color: 'var(--text-tertiary)' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((movement) => {
                  const config = typeConfig[movement.type] || typeConfig.ajuste;
                  const Icon = config.icon;
                  const hasBalance = hasValue(movement.previous_quantity) && hasValue(movement.new_quantity);
                  return (
                    <tr key={movement.id} style={{ borderBottom: '1px solid var(--border-inner)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{movement.date ? moment(movement.date).format('DD/MM/YY') : '-'}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: config.bg, color: config.color }}>
                          <Icon size={12} /> {config.label}
                        </span>
                      </td>
                      <td className="p-3 font-black" style={{ color: 'var(--text-primary)' }}>{movement.quantity}</td>
                      <td className="p-3 break-words" style={{ color: 'var(--text-secondary)' }}>{movement.reason || '-'}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {hasBalance ? (
                          <span style={{ fontWeight: 700 }}>saldo: {Number(movement.previous_quantity)} <span style={{ color: 'var(--text-tertiary)' }}>→</span> {Number(movement.new_quantity)}</span>
                        ) : '-'}
                      </td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{hasValue(movement.unit_cost) ? money(movement.unit_cost) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" className="btn-nm" onClick={onClose} style={{ padding: '9px 20px' }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
