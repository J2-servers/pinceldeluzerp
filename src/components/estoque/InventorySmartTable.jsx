import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, ArrowUpRight, Edit, Trash2 } from 'lucide-react';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function InventorySmartTable({ products, onEdit, onMovement, onDelete }) {
  if (!products.length) {
    return <div className="rounded-[24px] p-10 text-center" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)', color: 'var(--text-tertiary)' }}>Nenhum item encontrado.</div>;
  }

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
      <div className="w-full overflow-hidden">
        <table className="erp-responsive-table nm-hover-table w-full table-fixed text-sm">
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-inner)' }}>
              {['Item', 'Categoria', 'Saldo', 'Minimo', 'Preco', 'Custo total', 'Uso', 'Local', 'Acoes'].map((heading) => (
                <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest font-black" style={{ color: 'var(--text-tertiary)' }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const low = product.track_stock !== false && Number(product.quantity || 0) <= Number(product.min_quantity || 1);
              const productName = product.name || 'Item';

              return (
                <tr key={product.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-inner)' }}>
                  <td className="p-3" data-label="Item">
                    <p className="font-black break-words" style={{ color: 'var(--text-primary)' }}>{productName}</p>
                    <p className="text-xs break-words" style={{ color: 'var(--text-tertiary)' }}>{product.sku || 'sem SKU'} {product.brand ? `· ${product.brand}` : ''}</p>
                  </td>
                  <td className="p-3" data-label="Categoria">
                    <span className="text-xs font-bold rounded-full px-2 py-1" style={{ background: 'var(--purple-muted)', color: 'var(--purple)' }}>{product.category || '-'}</span>
                  </td>
                  <td className="p-3" data-label="Saldo">
                    <p className="font-black" style={{ color: low ? 'var(--red)' : 'var(--green)' }}>{product.quantity || 0} {product.unit || 'un'}</p>
                    {low && <p className="text-xs" style={{ color: 'var(--red)' }}>Critico</p>}
                  </td>
                  <td className="p-3 font-bold" data-label="Minimo" style={{ color: 'var(--text-secondary)' }}>{product.min_quantity || 1}</td>
                  <td className="p-3" data-label="Preco">
                    <p className="font-black" style={{ color: 'var(--accent)' }}>{money(product.sale_price || product.price_per_m2)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{product.pricing_mode || 'unitario'}</p>
                  </td>
                  <td className="p-3" data-label="Custo total">
                    <p className="font-black" style={{ color: 'var(--text-primary)' }}>{money(Number(product.quantity || 0) * Number(product.cost_price || 0))}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>unit. {money(product.cost_price)}</p>
                  </td>
                  <td className="p-3" data-label="Uso">
                    <div className="flex flex-wrap gap-1">
                      {product.can_sell && <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'var(--green-muted)', color: 'var(--green)' }}>vende</span>}
                      {product.can_quote && <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>orca</span>}
                      {product.track_stock !== false && <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'var(--orange-muted)', color: 'var(--orange)' }}>estoque</span>}
                    </div>
                  </td>
                  <td className="p-3" data-label="Local" style={{ color: 'var(--text-secondary)' }}>{product.location || '-'}</td>
                  <td className="actions-cell p-3" data-label="Acoes">
                    <div className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap">
                      <Button size="sm" variant="ghost" title="Entrada" aria-label={`Registrar entrada de ${productName}`} onClick={() => onMovement(product, 'entrada')}><ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} /></Button>
                      <Button size="sm" variant="ghost" title="Saida" aria-label={`Registrar saida de ${productName}`} onClick={() => onMovement(product, 'saida')}><ArrowDownRight className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Editar ${productName}`} onClick={() => onEdit(product)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Excluir ${productName}`} onClick={() => onDelete(product)}><Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} /></Button>
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
