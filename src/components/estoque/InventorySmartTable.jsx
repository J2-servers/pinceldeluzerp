import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, ClipboardList, CopyPlus, Edit, History, Layers, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/numberFormat';
import { isSafeImageUrl } from '@/lib/brandingAssets';

const money = formatCurrency;

const formatM2 = (value) => `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m2`;

function isAreaStock(product) {
  return product.pricing_mode === 'area_m2' && !!product.track_area_stock;
}

function priceOf(product) {
  return Number(product.sale_price || product.price_per_m2 || 0);
}

export default function InventorySmartTable({ products, reservedMap, onEdit, onMovement, onDelete, onHistory, onVariation, onBom }) {
  const [groupVariants, setGroupVariants] = useState(false);
  const [expanded, setExpanded] = useState({});

  const rows = useMemo(() => {
    if (!groupVariants) return products.map((product) => ({ kind: 'product', product }));
    const groups = new Map();
    products.forEach((product) => {
      if (!product.variant_group_id) return;
      if (!groups.has(product.variant_group_id)) groups.set(product.variant_group_id, []);
      groups.get(product.variant_group_id).push(product);
    });
    const emitted = new Set();
    const output = [];
    products.forEach((product) => {
      const groupId = product.variant_group_id;
      const members = groupId ? groups.get(groupId) : null;
      if (!members || members.length < 2) {
        output.push({ kind: 'product', product });
        return;
      }
      if (emitted.has(groupId)) return;
      emitted.add(groupId);
      const parent = members.find((member) => member.id === groupId) || members[0];
      const ordered = [parent, ...members.filter((member) => member.id !== parent.id)];
      const totalQty = members.reduce((sum, member) => sum + Number(member.quantity || 0), 0);
      const totalCost = members.reduce((sum, member) => sum + Number(member.quantity || 0) * Number(member.cost_price || 0), 0);
      const prices = members.map(priceOf);
      output.push({
        kind: 'group',
        groupId,
        parent,
        members: ordered,
        totalQty,
        totalCost,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      });
      if (expanded[groupId]) ordered.forEach((member) => output.push({ kind: 'product', product: member, inGroup: true }));
    });
    return output;
  }, [products, groupVariants, expanded]);

  if (!products.length) {
    return <div className="rounded-[24px] p-10 text-center" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised-sm)', color: 'var(--text-tertiary)' }}>Nenhum item encontrado.</div>;
  }

  const renderProductRow = (product, inGroup = false) => {
    const area = isAreaStock(product);
    const minRef = area ? Number(product.min_stock_m2 || 0) : Number(product.min_quantity || 1);
    const low = product.track_stock !== false && Number(product.quantity || 0) <= minRef;
    const productName = product.name || 'Item';
    const reserved = Number(reservedMap?.get?.(product.id) || 0);
    const available = Number(product.quantity || 0) - reserved;

    return (
      <tr key={product.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-inner)', background: inGroup ? 'var(--surface-2)' : 'transparent' }}>
        <td className="p-3" data-label="Item" style={inGroup ? { paddingLeft: '28px' } : undefined}>
          <div className="flex items-start gap-2.5">
            {isSafeImageUrl(product.image_url) && (
              <img src={product.image_url} alt={productName} className="h-9 w-9 shrink-0 rounded-lg object-cover" style={{ boxShadow: 'var(--shadow-flat)' }} />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-black break-words" style={{ color: 'var(--text-primary)' }}>{productName}</p>
                {product.variant_label && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--purple-muted)', color: 'var(--purple)' }}>{product.variant_label}</span>}
                {product.is_kit && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--orange-muted)', color: 'var(--orange)' }}>Kit</span>}
              </div>
              <p className="text-xs break-words" style={{ color: 'var(--text-tertiary)' }}>{product.sku || 'sem SKU'} {product.brand ? `· ${product.brand}` : ''}</p>
            </div>
          </div>
        </td>
        <td className="p-3" data-label="Categoria">
          <span className="text-xs font-bold rounded-full px-2 py-1" style={{ background: 'var(--purple-muted)', color: 'var(--purple)' }}>{product.category || '-'}</span>
        </td>
        <td className="p-3" data-label="Saldo">
          <p className="font-black" style={{ color: low ? 'var(--red)' : 'var(--green)' }}>{area ? formatM2(product.quantity) : `${product.quantity || 0} ${product.unit || 'un'}`}</p>
          {area && <p className="text-[10px] font-bold" style={{ color: 'var(--accent)' }}>controle por area</p>}
          {reserved > 0 && (
            <p className="text-[10px] font-bold" style={{ color: 'var(--orange)' }} title="Reservado por orçamentos aprovados ainda não convertidos">
              reservado {area ? formatM2(reserved) : `${reserved} ${product.unit || 'un'}`} · livre {area ? formatM2(available) : `${available} ${product.unit || 'un'}`}
            </p>
          )}
          {low && <p className="text-xs" style={{ color: 'var(--red)' }}>Critico</p>}
        </td>
        <td className="p-3 font-bold" data-label="Minimo" style={{ color: 'var(--text-secondary)' }}>{area ? formatM2(product.min_stock_m2) : (product.min_quantity || 1)}</td>
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
          <div className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap">
            <Button size="sm" variant="ghost" title="Entrada" aria-label={`Registrar entrada de ${productName}`} onClick={() => onMovement(product, 'entrada')}><ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} /></Button>
            <Button size="sm" variant="ghost" title="Saida" aria-label={`Registrar saida de ${productName}`} onClick={() => onMovement(product, 'saida')}><ArrowDownRight className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} /></Button>
            {onHistory && <Button size="sm" variant="ghost" title="Historico" aria-label={`Ver historico de ${productName}`} onClick={() => onHistory(product)}><History className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /></Button>}
            {onVariation && <Button size="sm" variant="ghost" title="Criar variacao" aria-label={`Criar variacao de ${productName}`} onClick={() => onVariation(product)}><CopyPlus className="w-3.5 h-3.5" style={{ color: 'var(--purple)' }} /></Button>}
            {onBom && <Button size="sm" variant="ghost" title="Ficha tecnica" aria-label={`Ficha tecnica de ${productName}`} onClick={() => onBom(product)}><ClipboardList className="w-3.5 h-3.5" style={{ color: 'var(--indigo, #6366f1)' }} /></Button>}
            <Button size="sm" variant="ghost" title="Editar" aria-label={`Editar ${productName}`} onClick={() => onEdit(product)}><Edit className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" title="Excluir" aria-label={`Excluir ${productName}`} onClick={() => onDelete(product)}><Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} /></Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderGroupRow = (row) => {
    const isOpen = !!expanded[row.groupId];
    const priceRange = row.minPrice === row.maxPrice ? money(row.minPrice) : `${money(row.minPrice)} — ${money(row.maxPrice)}`;
    return (
      <tr key={`group-${row.groupId}`} className="transition-colors" style={{ borderBottom: '1px solid var(--border-inner)' }}>
        <td className="p-3" data-label="Item">
          <button
            type="button"
            onClick={() => setExpanded((prev) => ({ ...prev, [row.groupId]: !prev[row.groupId] }))}
            className="flex items-center gap-2 text-left"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-primary)' }}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Recolher' : 'Expandir'} variacoes de ${row.parent.name || 'item'}`}
          >
            {isOpen ? <ChevronDown size={15} style={{ color: 'var(--purple)' }} /> : <ChevronRight size={15} style={{ color: 'var(--purple)' }} />}
            <span className="font-black break-words">{row.parent.name || 'Item'}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--purple-muted)', color: 'var(--purple)' }}>
              <Layers size={11} /> {row.members.length} variacoes
            </span>
          </button>
          <p className="text-xs break-words" style={{ color: 'var(--text-tertiary)', marginLeft: '23px' }}>{row.parent.sku || 'sem SKU'}</p>
        </td>
        <td className="p-3" data-label="Categoria">
          <span className="text-xs font-bold rounded-full px-2 py-1" style={{ background: 'var(--purple-muted)', color: 'var(--purple)' }}>{row.parent.category || '-'}</span>
        </td>
        <td className="p-3" data-label="Saldo">
          <p className="font-black" style={{ color: 'var(--text-primary)' }}>{row.totalQty} {row.parent.unit || 'un'}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>soma do grupo</p>
        </td>
        <td className="p-3 font-bold" data-label="Minimo" style={{ color: 'var(--text-tertiary)' }}>-</td>
        <td className="p-3" data-label="Preco">
          <p className="font-black" style={{ color: 'var(--accent)' }}>{priceRange}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>faixa de preco</p>
        </td>
        <td className="p-3" data-label="Custo total">
          <p className="font-black" style={{ color: 'var(--text-primary)' }}>{money(row.totalCost)}</p>
        </td>
        <td className="p-3" data-label="Uso" style={{ color: 'var(--text-tertiary)' }}>-</td>
        <td className="p-3" data-label="Local" style={{ color: 'var(--text-secondary)' }}>{row.parent.location || '-'}</td>
        <td className="actions-cell p-3" data-label="Acoes">
          <button type="button" className="btn-nm" onClick={() => setExpanded((prev) => ({ ...prev, [row.groupId]: !prev[row.groupId] }))} style={{ padding: '6px 12px', fontSize: '12px' }}>
            {isOpen ? 'Recolher' : 'Expandir'}
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-inner)' }}>
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={groupVariants} onChange={(e) => setGroupVariants(e.target.checked)} />
          Agrupar variacoes
        </label>
      </div>
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
            {rows.map((row) => (row.kind === 'group' ? renderGroupRow(row) : renderProductRow(row.product, row.inGroup)))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
