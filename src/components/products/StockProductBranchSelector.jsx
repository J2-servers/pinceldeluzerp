import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronRight, Layers, Package, Plus, Search } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { inferProductBehavior, getPricingModeLabel } from '@/lib/productBehavior';
import { money } from '@/lib/pricingEngine';
import { isSafeImageUrl } from '@/lib/brandingAssets';

function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

const rowTones = [
  'border-sky-100 bg-sky-50/70 hover:bg-sky-100',
  'border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100',
  'border-violet-100 bg-violet-50/70 hover:bg-violet-100',
  'border-amber-100 bg-amber-50/70 hover:bg-amber-100',
  'border-rose-100 bg-rose-50/70 hover:bg-rose-100',
];

// Itens de area (acrilico) que controlam estoque em m2: quantity = m2 disponivel.
function isAreaStock(product) {
  return product.track_area_stock === true && inferProductBehavior(product).pricingMode === 'area_m2';
}

function formatM2(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
}

function stockText(product) {
  if (product.track_stock === false) return 'sem estoque';
  if (isAreaStock(product)) return formatM2(product.quantity);
  return `${product.quantity || 0} ${product.unit || ''} em estoque`.replace(/\s{2,}/g, ' ').trim();
}

function stockTone(product) {
  return Number(product.quantity || 0) > 0 || product.track_stock === false ? 'green' : 'amber';
}

function basePriceOf(product) {
  const behavior = inferProductBehavior(product);
  const material = product.materialParameter;
  return behavior.pricingMode === 'area_m2'
    ? Number(material?.sale_price_per_m2 || product.price_per_m2 || product.sale_price || 0)
    : Number(material?.sale_price || material?.unit_sale_price || product.sale_price || 0);
}

function unitLabel(product) {
  return inferProductBehavior(product).pricingMode === 'area_m2' ? 'por m2' : `por ${product.unit || 'un'}`;
}

// Resumo de estoque do grupo: soma em m2 quando todas variacoes sao de area, senao soma em unidades.
function groupStockText(members) {
  if (members.every(isAreaStock)) {
    return formatM2(members.reduce((sum, member) => sum + Number(member.quantity || 0), 0));
  }
  const tracked = members.filter((member) => member.track_stock !== false);
  if (!tracked.length) return 'sem estoque';
  const total = tracked.reduce((sum, member) => sum + Number(member.quantity || 0), 0);
  const unit = tracked.find((member) => member.unit)?.unit || '';
  return `${total} ${unit} em estoque`.replace(/\s{2,}/g, ' ').trim();
}

function groupStockTone(members) {
  const total = members.reduce((sum, member) => sum + Number(member.quantity || 0), 0);
  return total > 0 || members.every((member) => member.track_stock === false) ? 'green' : 'amber';
}

function matchesTerm(product, term) {
  const behavior = inferProductBehavior(product);
  return Boolean(
    product.name?.toLowerCase().includes(term)
    || product.sku?.toLowerCase().includes(term)
    || product.category?.toLowerCase().includes(term)
    || product.variant_label?.toLowerCase().includes(term)
    || behavior.productGroup?.toLowerCase().includes(term),
  );
}

function makeGroupRow(members) {
  const groupId = members[0].variant_group_id;
  const parent = members.find((member) => member.id === groupId) || members[0];
  const ordered = [parent, ...members.filter((member) => member.id !== parent.id)];
  const prices = ordered.map(basePriceOf);
  return {
    kind: 'group',
    groupId,
    parent,
    members: ordered,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
}

export default function StockProductBranchSelector({ selectedProductId, onSelect, mode = 'quote' }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  const { data: products = [] } = useQuery({ queryKey: ['products', 'list', 'name'], queryFn: () => erp.entities.Product.list('name') });
  const { data: materialParameters = [] } = useQuery({ queryKey: ['pricing-material-parameters'], queryFn: () => erp.entities.MaterialParameter.filter({ active: true }) });

  const materialMap = useMemo(() => {
    const byProduct = {};
    const byName = {};
    materialParameters.forEach((material) => {
      if (material.product_id) byProduct[String(material.product_id)] = material;
      if (material.name) byName[String(material.name).toLowerCase()] = material;
      if (material.product_name) byName[String(material.product_name).toLowerCase()] = material;
    });
    return { byProduct, byName };
  }, [materialParameters]);

  const availableProducts = useMemo(() => products
    .filter((product) => {
      const behavior = inferProductBehavior(product);
      return mode === 'sale' ? behavior.canSell : behavior.canQuote;
    })
    .map((product) => ({
      ...product,
      materialParameter: materialMap.byProduct[String(product.id)] || materialMap.byName[String(product.name || '').toLowerCase()] || null,
    })), [products, mode, materialMap]);

  const categories = useMemo(() => ['all', ...Array.from(new Set(availableProducts.map((product) => inferProductBehavior(product).productGroup).filter(Boolean)))], [availableProducts]);

  // Monta as linhas de exibicao: produtos soltos como linha unica e grupos de variacao (2+ membros) como uma linha resumida.
  const displayRows = useMemo(() => {
    const term = search.toLowerCase().trim();
    const inCategory = availableProducts.filter((product) => selectedCategory === 'all' || inferProductBehavior(product).productGroup === selectedCategory);

    const groupMembers = new Map();
    inCategory.forEach((product) => {
      if (!product.variant_group_id) return;
      if (!groupMembers.has(product.variant_group_id)) groupMembers.set(product.variant_group_id, []);
      groupMembers.get(product.variant_group_id).push(product);
    });

    const emitted = new Set();
    const baseRows = [];
    inCategory.forEach((product) => {
      const groupId = product.variant_group_id;
      const members = groupId ? groupMembers.get(groupId) : null;
      if (!members || members.length < 2) {
        baseRows.push({ kind: 'product', product });
        return;
      }
      if (emitted.has(groupId)) return;
      emitted.add(groupId);
      baseRows.push(makeGroupRow(members));
    });

    if (!term) return baseRows;

    const result = [];
    baseRows.forEach((row) => {
      if (row.kind === 'product') {
        if (matchesTerm(row.product, term)) result.push(row);
        return;
      }
      const hits = row.members.filter((member) => matchesTerm(member, term));
      if (!hits.length) return;
      if (hits.length === row.members.length) { result.push(row); return; }
      if (hits.length === 1) { result.push({ kind: 'product', product: hits[0] }); return; }
      result.push(makeGroupRow(hits));
    });
    return result;
  }, [availableProducts, selectedCategory, search]);

  const toggleGroup = (groupId) => setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  const renderProductRow = (product, tone) => {
    const behavior = inferProductBehavior(product);
    const selected = product.id === selectedProductId;
    const material = product.materialParameter;
    const basePrice = basePriceOf(product);

    return (
      <button
        key={product.id}
        type="button"
        aria-label={`Adicionar ${product.name} ao documento`}
        onClick={() => onSelect(product)}
        className={`grid w-full grid-cols-1 gap-3 border-b px-4 py-3 text-left transition md:grid-cols-[1fr_122px] md:items-center ${selected ? 'border-blue-200 bg-blue-100' : tone}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          {isSafeImageUrl(product.image_url) ? (
            <img src={product.image_url} alt={product.name} className="mt-0.5 h-8 w-8 shrink-0 rounded-xl border border-slate-200 object-cover" />
          ) : (
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${selected ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              {selected ? <CheckCircle2 className="h-4 w-4" /> : <Package className="h-4 w-4" />}
            </span>
          )}
          <div className="min-w-0">
            <p className="break-words font-black text-slate-900">{product.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge>{behavior.productGroup || 'Sem categoria'}</Badge>
              <Badge tone="blue">{getPricingModeLabel(behavior.pricingMode)}</Badge>
              <Badge tone={stockTone(product)}>{stockText(product)}</Badge>
              {material ? <Badge tone="green">tabela OK</Badge> : <Badge tone="amber">sem tabela</Badge>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <div className="text-right">
            <p className="font-black text-slate-950">{money(basePrice)}</p>
            <p className="text-[11px] text-slate-500">{unitLabel(product)}</p>
          </div>
          <span className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-4 text-xs font-black text-white shadow-lg shadow-indigo-100 [background:linear-gradient(135deg,#020617,#4f46e5,#7c3aed)]">
            Adicionar <Plus className="h-3.5 w-3.5" />
          </span>
        </div>
      </button>
    );
  };

  const renderVariantChip = (member) => {
    const selected = member.id === selectedProductId;
    const material = member.materialParameter;
    const price = basePriceOf(member);

    return (
      <button
        key={member.id}
        type="button"
        aria-label={`Adicionar variacao ${member.variant_label || member.name} ao documento`}
        onClick={() => onSelect(member)}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition ${selected ? 'border-blue-300 bg-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isSafeImageUrl(member.image_url) ? (
            <img src={member.image_url} alt={member.variant_label || member.name} className="h-7 w-7 shrink-0 rounded-lg border border-slate-200 object-cover" />
          ) : (
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${selected ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-black text-slate-900">{member.variant_label || member.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={stockTone(member)}>{stockText(member)}</Badge>
              {material ? null : <Badge tone="amber">sem tabela</Badge>}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-black text-slate-950">{money(price)}</p>
          <p className="text-[11px] text-slate-500">{unitLabel(member)}</p>
        </div>
      </button>
    );
  };

  const renderGroupRow = (row, tone) => {
    const { groupId, parent, members, minPrice, maxPrice } = row;
    const behavior = inferProductBehavior(parent);
    const hasSelectedMember = members.some((member) => member.id === selectedProductId);
    const isOpen = Boolean(expandedGroups[groupId]) || hasSelectedMember || Boolean(search.trim());
    const priceLabel = minPrice === maxPrice ? money(minPrice) : `${money(minPrice)} - ${money(maxPrice)}`;

    return (
      <div key={`group-${groupId}`} className={`border-b ${hasSelectedMember ? 'border-blue-200' : 'border-slate-100'}`}>
        <button
          type="button"
          onClick={() => toggleGroup(groupId)}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Recolher' : 'Expandir'} variacoes de ${parent.name}`}
          className={`grid w-full grid-cols-1 gap-3 px-4 py-3 text-left transition md:grid-cols-[1fr_122px] md:items-center ${hasSelectedMember ? 'bg-blue-100' : tone}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${hasSelectedMember ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              <Layers className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="break-words font-black text-slate-900">{parent.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge>{behavior.productGroup || 'Sem categoria'}</Badge>
                <Badge tone="blue">{members.length} variacoes</Badge>
                <Badge tone={groupStockTone(members)}>{groupStockText(members)}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end">
            <div className="text-right">
              <p className="font-black text-slate-950">{priceLabel}</p>
              <p className="text-[11px] text-slate-500">{unitLabel(parent)}</p>
            </div>
            <span className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm">
              {isOpen ? 'Recolher' : 'Ver'} {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="space-y-2 px-4 pb-3 md:pl-14">
            {members.map((member) => renderVariantChip(member))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto, variacao ou SKU" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
        </label>
        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm">
          {categories.map((category) => <option key={category} value={category}>{category === 'all' ? 'Todas as categorias' : category}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[430px] divide-y divide-slate-100 overflow-y-auto">
          {displayRows.map((row, index) => {
            const tone = rowTones[index % rowTones.length];
            return row.kind === 'group' ? renderGroupRow(row, tone) : renderProductRow(row.product, tone);
          })}
          {!displayRows.length && <div className="p-6 text-center text-sm text-slate-500">Nenhum produto encontrado.</div>}
        </div>
      </div>
    </div>
  );
}
