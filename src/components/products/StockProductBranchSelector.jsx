import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Package, Plus, Search } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { inferProductBehavior, getPricingModeLabel } from '@/lib/productBehavior';
import { money } from '@/lib/pricingEngine';

function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export default function StockProductBranchSelector({ selectedProductId, onSelect, mode = 'quote' }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list('name') });
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

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    return availableProducts.filter((product) => {
      const behavior = inferProductBehavior(product);
      const matchesCategory = selectedCategory === 'all' || behavior.productGroup === selectedCategory;
      const matchesSearch = !term
        || product.name?.toLowerCase().includes(term)
        || product.sku?.toLowerCase().includes(term)
        || product.category?.toLowerCase().includes(term)
        || behavior.productGroup?.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [availableProducts, selectedCategory, search]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto ou SKU" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
        </label>
        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm">
          {categories.map((category) => <option key={category} value={category}>{category === 'all' ? 'Todas as categorias' : category}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[430px] divide-y divide-slate-100 overflow-y-auto">
          {filteredProducts.map((product, index) => {
            const behavior = inferProductBehavior(product);
            const selected = product.id === selectedProductId;
            const material = product.materialParameter;
            const rowTones = [
              'border-sky-100 bg-sky-50/70 hover:bg-sky-100',
              'border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100',
              'border-violet-100 bg-violet-50/70 hover:bg-violet-100',
              'border-amber-100 bg-amber-50/70 hover:bg-amber-100',
              'border-rose-100 bg-rose-50/70 hover:bg-rose-100',
            ];
            const tone = rowTones[index % rowTones.length];
            const basePrice = behavior.pricingMode === 'area_m2'
              ? Number(material?.sale_price_per_m2 || product.price_per_m2 || product.sale_price || 0)
              : Number(material?.sale_price || material?.unit_sale_price || product.sale_price || 0);

            return (
              <button
                key={product.id}
                type="button"
                aria-label={`Adicionar ${product.name} ao documento`}
                onClick={() => onSelect(product)}
                className={`grid w-full grid-cols-1 gap-3 border-b px-4 py-3 text-left transition md:grid-cols-[1fr_122px] md:items-center ${selected ? 'border-blue-200 bg-blue-100' : tone}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${selected ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    {selected ? <CheckCircle2 className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-black text-slate-900">{product.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge>{behavior.productGroup || 'Sem categoria'}</Badge>
                      <Badge tone="blue">{getPricingModeLabel(behavior.pricingMode)}</Badge>
                      <Badge tone={Number(product.quantity || 0) > 0 || product.track_stock === false ? 'green' : 'amber'}>
                        {product.track_stock === false ? 'sem estoque' : `${product.quantity || 0} ${product.unit || ''} em estoque`}
                      </Badge>
                      {material ? <Badge tone="green">tabela OK</Badge> : <Badge tone="amber">sem tabela</Badge>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <div className="text-right">
                    <p className="font-black text-slate-950">{money(basePrice)}</p>
                    <p className="text-[11px] text-slate-500">{behavior.pricingMode === 'area_m2' ? 'por m2' : `por ${product.unit || 'un'}`}</p>
                  </div>
                  <span className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-4 text-xs font-black text-white shadow-lg shadow-indigo-100 [background:linear-gradient(135deg,#020617,#4f46e5,#7c3aed)]">
                    Adicionar <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
          {!filteredProducts.length && <div className="p-6 text-center text-sm text-slate-500">Nenhum produto encontrado.</div>}
        </div>
      </div>
    </div>
  );
}
