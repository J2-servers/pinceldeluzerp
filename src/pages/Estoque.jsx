import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import ProductFormDialog from '@/components/estoque/ProductFormDialog';
import VariationMatrixDialog from '@/components/estoque/VariationMatrixDialog';
import BomDialog from '@/components/estoque/BomDialog';
import PurchaseOrdersDialog from '@/components/estoque/PurchaseOrdersDialog';
import { createPurchaseOrderForGroup } from '@/lib/purchasing';
import { reservedByProduct } from '@/lib/stockReservations';
import InventoryHero from '@/components/estoque/InventoryHero';
import InventoryToolbar from '@/components/estoque/InventoryToolbar';
import InventorySmartTable from '@/components/estoque/InventorySmartTable';
import InventoryCardsGrid from '@/components/estoque/InventoryCardsGrid';
import InventoryDailyPanel from '@/components/estoque/InventoryDailyPanel';
import InventoryMovementsList from '@/components/estoque/InventoryMovementsList';
import ProductMovementHistory from '@/components/estoque/ProductMovementHistory';
import ReorderPanel from '@/components/estoque/ReorderPanel';
import InventoryCountSession from '@/components/estoque/InventoryCountSession';
import ScrapInventoryPanel from '@/components/estoque/ScrapInventoryPanel';
import { buildAssetPayloadFromProduct } from '@/lib/productAssetUtils';
import { syncLegacyProductToCore, createAuditLog } from '@/lib/erpCoreSync';
import { syncProductMaterialParameter } from '@/lib/productMaterialSync';
import { downloadCsv } from '@/lib/downloadUtils';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';
import { toast } from '@/components/ui/app-toast';
import { Package, DollarSign, AlertTriangle, XCircle, Plus, X, ArrowDown, ArrowUp, RotateCcw, SlidersHorizontal } from 'lucide-react';
import moment from 'moment';
import { normalizeText } from '@/lib/utils';

const defaultFilters = { search: '', category: 'all', stock: 'all', behavior: 'all', sort: 'name', minQty: '', onlyNoPrice: false, onlyLow: false };
const defaultMovement = { product_id: '', product_name: '', type: 'entrada', quantity: '', reason: '', unit_cost: '', entry_mode: 'm2', sheets: '', sheet_w: '', sheet_h: '', sheet_cost: '' };

const formatM2 = (value) => `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m2`;
const isAreaStock = (p) => p?.pricing_mode === 'area_m2' && !!p?.track_area_stock;
const minStockRef = (p) => (isAreaStock(p) ? Number(p?.min_stock_m2 || 0) : Number(p?.min_quantity || 1));
const isLowStock = (p) => p?.track_stock !== false && Number(p?.quantity || 0) <= minStockRef(p);
const sheetAreaM2 = (w, h) => (parseDecimal(w) * parseDecimal(h)) / 1000000;

const movementTypes = [
  { value: 'entrada', label: 'Entrada', icon: ArrowDown, activeBg: 'var(--green)' },
  { value: 'saida', label: 'Saida', icon: ArrowUp, activeBg: 'var(--red)' },
  { value: 'ajuste', label: 'Ajuste', icon: SlidersHorizontal, activeBg: 'var(--accent)' },
  { value: 'devolucao', label: 'Devolucao', icon: RotateCcw, activeBg: 'var(--purple)' },
];

const reasonRequiredTypes = ['ajuste', 'devolucao'];

const inputStyle = {
  background: 'var(--bg)',
  boxShadow: 'var(--shadow-pressed)',
  border: '1px solid var(--border-inner)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-primary)',
  padding: '9px 13px',
  width: '100%',
  outline: 'none',
  fontSize: '14px',
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-tertiary)',
  marginBottom: '6px',
};

export default function Estoque() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variationSource, setVariationSource] = useState(null);
  const [matrixProduct, setMatrixProduct] = useState(null);
  const [bomProduct, setBomProduct] = useState(null);
  const [showPurchases, setShowPurchases] = useState(false);
  const [generatingSupplier, setGeneratingSupplier] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementData, setMovementData] = useState(defaultMovement);
  const [filters, setFilters] = useState(defaultFilters);
  const [view, setView] = useState('table');

  const { data: products = [] } = useQuery({ queryKey: ['products', 'list', 'name'], queryFn: () => erp.entities.Product.list('name') });
  const { data: categoriesData = [] } = useQuery({ queryKey: ['productCategories'], queryFn: () => erp.entities.ProductCategory.list('name') });
  const { data: movements = [] } = useQuery({ queryKey: ['stockMovements'], queryFn: () => erp.entities.StockMovement.list('-date', 150) });
  const { data: reservations = [] } = useQuery({ queryKey: ['stockReservations', 'active'], queryFn: () => erp.entities.StockReservation.filter({ status: 'active' }) });
  const reservedMap = useMemo(() => reservedByProduct(reservations), [reservations]);

  useEffect(() => {
    const search = searchParams.get('search') || searchParams.get('busca');
    const nextView = searchParams.get('view');
    if (search) setFilters((prev) => ({ ...prev, search, category: 'all', stock: 'all' }));
    if (['table', 'cards', 'movements', 'repor', 'inventario', 'retalhos'].includes(nextView)) setView(nextView);
  }, [searchParams]);

  const saveProduct = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      const saved = selectedProduct ? await erp.entities.Product.update(selectedProduct.id, payload) : await erp.entities.Product.create(payload);
      // Primeira variacao criada a partir de um produto: o pai passa a apontar para o proprio id como grupo
      if (!selectedProduct && variationSource && !variationSource.variant_group_id) {
        await erp.entities.Product.update(variationSource.id, { variant_group_id: variationSource.id });
      }
      if (data.auto_create_asset && data.asset_type !== 'nenhum') {
        if (data.linked_asset_id) await erp.entities.CompanyAsset.update(data.linked_asset_id, buildAssetPayloadFromProduct(data));
        else {
          const asset = await erp.entities.CompanyAsset.create(buildAssetPayloadFromProduct(data));
          await erp.entities.Product.update(saved.id, { linked_asset_id: asset.id });
        }
      }
      await syncLegacyProductToCore(saved);
      await syncProductMaterialParameter(saved);
      await createAuditLog({ module: 'inventory', entity_name: 'Product', entity_id: saved.id, action: selectedProduct ? 'update' : 'create', document_number: saved.sku || saved.name, metadata: { quantity: saved.quantity || 0 } });
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-material-parameters'] });
      queryClient.invalidateQueries({ queryKey: ['MaterialParameter'] });
      queryClient.invalidateQueries({ queryKey: ['companyAssets'] });
      setShowForm(false);
      setSelectedProduct(null);
      setVariationSource(null);
    }
  });

  const deleteProduct = useMutation({
    mutationFn: async (product) => {
      await createAuditLog({ module: 'inventory', entity_name: 'Product', entity_id: product.id, action: 'delete', document_number: product.sku || product.name });
      return erp.entities.Product.delete(product.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  const adjustStock = useMutation({
    mutationFn: async (data) => {
      const product = products.find((p) => p.id === data.product_id);
      if (!product) throw new Error('Selecione um item da lista');
      const sheetMode = data.entry_mode === 'sheet' && data.type === 'entrada';
      let quantity;
      let unitCost = parseDecimal(data.unit_cost);
      if (sheetMode) {
        const perSheet = sheetAreaM2(data.sheet_w, data.sheet_h);
        if (!(perSheet > 0)) throw new Error('Informe largura e altura da chapa');
        const sheets = parseDecimal(data.sheets);
        if (!(sheets > 0)) throw new Error('Informe o numero de chapas');
        quantity = sheets * perSheet;
        const sheetCost = parseDecimal(data.sheet_cost);
        unitCost = sheetCost > 0 ? sheetCost / perSheet : 0;
      } else {
        quantity = Number(data.quantity);
      }
      if (!Number.isFinite(quantity) || quantity === 0) throw new Error('Informe uma quantidade diferente de zero');
      if (reasonRequiredTypes.includes(data.type) && !String(data.reason || '').trim()) throw new Error('Motivo e obrigatorio para ajuste e devolucao');
      const delta = data.type === 'saida' ? -Math.abs(quantity) : data.type === 'ajuste' ? quantity : Math.abs(quantity);
      const user = erp.auth.getCachedUser?.();
      const payload = {
        product_id: data.product_id,
        delta,
        movement_type: data.type,
        reason: String(data.reason || '').trim(),
        user_name: user?.name || user?.full_name || user?.email || '',
      };
      if (data.type === 'entrada' && unitCost > 0) payload.unit_cost = unitCost;
      const response = await erp.functions.invoke('adjustStock', payload);
      return { response, previousCost: Number(product.cost_price || 0) };
    },
    onSuccess: ({ response, previousCost }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      setShowMovementForm(false);
      setMovementData(defaultMovement);
      const product = response?.data?.product;
      if (product) {
        const area = isAreaStock(products.find((p) => p.id === product.id));
        const balance = area ? formatM2(product.quantity) : product.quantity;
        const newCost = Number(product.cost_price || 0);
        const costChanged = Math.abs(newCost - previousCost) > 0.004;
        toast.success(`${product.name}: novo saldo ${balance}${costChanged ? ` · custo medio ${formatCurrency(newCost)}${area ? '/m2' : ''}` : ''}`);
      } else {
        toast.success('Movimentacao registrada');
      }
    },
    onError: (error) => toast.error(error.message || 'Falha ao movimentar o estoque'),
  });

  // Reposição → compra: transforma a sugestão de um fornecedor num pedido de compra.
  const createPurchase = useMutation({
    mutationFn: async (group) => {
      const user = erp.auth.getCachedUser?.();
      const po = await createPurchaseOrderForGroup(group, { userName: user?.name || user?.email || '' });
      await createAuditLog({ module: 'inventory', entity_name: 'PurchaseOrder', entity_id: po.id, action: 'purchase_create', document_number: po.supplier_name || group.supplier, metadata: { total: po.total, items: group.buyableCount } });
      return po;
    },
    onSuccess: () => {
      setGeneratingSupplier(null);
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setShowPurchases(true);
      toast.success('Pedido de compra gerado (rascunho). Revise e receba quando chegar.');
    },
    onError: (error) => { setGeneratingSupplier(null); toast.error(error.message || 'Não foi possível gerar a compra'); },
  });

  const createCategory = async (name) => {
    const code = normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    const existing = categoriesData.find((item) => item.code === code || item.name === name);
    if (existing) return existing;
    const created = await erp.entities.ProductCategory.create({ name, code, active: true });
    queryClient.invalidateQueries({ queryKey: ['productCategories'] });
    return created;
  };

  const filteredProducts = useMemo(() => products.filter((p) => {
    const text = normalizeText([p.name, p.sku, p.category, p.supplier_name, p.location, p.color, p.brand].join(' '));
    const low = isLowStock(p);
    const noPrice = !Number(p.sale_price || p.price_per_m2 || 0);
    return (!filters.search || text.includes(normalizeText(filters.search))) &&
      (filters.category === 'all' || p.category === filters.category) &&
      (filters.stock === 'all' || (filters.stock === 'low' && low) || (filters.stock === 'zero' && Number(p.quantity || 0) === 0) || (filters.stock === 'positive' && Number(p.quantity || 0) > 0) || (filters.stock === 'no_track' && p.track_stock === false)) &&
      (filters.behavior === 'all' || (filters.behavior === 'sell' && p.can_sell) || (filters.behavior === 'quote' && p.can_quote) || (filters.behavior === 'asset' && p.asset_type && p.asset_type !== 'nenhum') || (filters.behavior === 'dimensional' && (p.sheet_width_mm || p.dimensions_required))) &&
      (!filters.minQty || Number(p.quantity || 0) >= Number(filters.minQty)) &&
      (!filters.onlyNoPrice || noPrice) &&
      (!filters.onlyLow || low);
  }).sort((a, b) => {
    if (filters.sort === 'qty_asc') return Number(a.quantity || 0) - Number(b.quantity || 0);
    if (filters.sort === 'qty_desc') return Number(b.quantity || 0) - Number(a.quantity || 0);
    if (filters.sort === 'cost_desc') return Number(b.quantity || 0) * Number(b.cost_price || 0) - Number(a.quantity || 0) * Number(a.cost_price || 0);
    if (filters.sort === 'sale_desc') return Number(b.sale_price || b.price_per_m2 || 0) - Number(a.sale_price || a.price_per_m2 || 0);
    return String(a.name || '').localeCompare(String(b.name || ''));
  }), [products, filters]);

  const stats = useMemo(() => ({
    total: products.length,
    lowStock: products.filter(isLowStock).length,
    noPrice: products.filter((p) => !Number(p.sale_price || p.price_per_m2 || 0)).length,
    dimensional: products.filter((p) => p.sheet_width_mm || p.dimensions_required).length,
    costValue: products.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.cost_price || 0), 0),
    saleValue: products.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.sale_price || p.price_per_m2 || 0), 0),
    zeroStock: products.filter((p) => p.track_stock !== false && Number(p.quantity || 0) === 0).length,
  }), [products]);

  const daily = useMemo(() => ({
    lowStock: products.filter(isLowStock),
    noPrice: products.filter((p) => !Number(p.sale_price || p.price_per_m2 || 0)),
    zeroStock: products.filter((p) => p.track_stock !== false && Number(p.quantity || 0) === 0),
    topValue: [...products].sort((a, b) => Number(b.quantity || 0) * Number(b.cost_price || 0) - Number(a.quantity || 0) * Number(a.cost_price || 0)),
  }), [products]);

  const openMovement = (product, type = 'entrada') => {
    const area = isAreaStock(product);
    setMovementData({
      ...defaultMovement,
      product_id: product.id,
      product_name: product.name,
      type,
      entry_mode: area && type === 'entrada' ? 'sheet' : 'm2',
      sheet_w: product.sheet_width_mm || '',
      sheet_h: product.sheet_height_mm || '',
    });
    setShowMovementForm(true);
  };

  // Abre o editor de matriz de variações (atributos × valores → combinações).
  const openVariation = (product) => {
    setMatrixProduct(product);
  };

  const exportCsv = () => {
    const header = ['nome', 'sku', 'categoria', 'saldo', 'minimo', 'unidade', 'custo', 'preco', 'local'];
    const rows = filteredProducts.map((p) => [p.name, p.sku, p.category, p.quantity || 0, p.min_quantity || 0, p.unit, p.cost_price || 0, p.sale_price || p.price_per_m2 || 0, p.location || '']);
    downloadCsv([header, ...rows], `estoque-${moment().format('YYYY-MM-DD')}.csv`);
  };

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  const movementProduct = useMemo(() => products.find((p) => p.id === movementData.product_id) || null, [products, movementData.product_id]);

  const areaMovement = isAreaStock(movementProduct);
  const sheetEntry = areaMovement && movementData.type === 'entrada' && movementData.entry_mode === 'sheet';
  const perSheetM2 = sheetAreaM2(movementData.sheet_w, movementData.sheet_h);
  const sheetTotalM2 = parseDecimal(movementData.sheets) * perSheetM2;
  const sheetUnitCost = perSheetM2 > 0 && parseDecimal(movementData.sheet_cost) > 0 ? parseDecimal(movementData.sheet_cost) / perSheetM2 : 0;

  return (
    <div className="space-y-6 page-neu">
      <Header title="Estoque" subtitle="Controle real de produtos, materiais, saldo e movimentações" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Total Itens</span>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>produtos cadastrados</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Valor Total</span>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} style={{ color: 'var(--green)' }} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
            {stats.costValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>valor em custo</div>
        </div>

        <div className="kpi-card" style={stats.lowStock > 0 ? { outline: '1.5px solid var(--orange)', outlineOffset: '-1px' } : {}}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Itens Críticos</span>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} style={{ color: 'var(--orange)' }} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: stats.lowStock > 0 ? 'var(--orange)' : 'var(--text-primary)', lineHeight: 1 }}>{stats.lowStock}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>abaixo do mínimo</div>
        </div>

        <div className="kpi-card" style={stats.zeroStock > 0 ? { outline: '1.5px solid var(--red)', outlineOffset: '-1px' } : {}}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Itens Zerados</span>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={16} style={{ color: 'var(--red)' }} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: stats.zeroStock > 0 ? 'var(--red)' : 'var(--text-primary)', lineHeight: 1 }}>{stats.zeroStock}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>sem estoque</div>
        </div>
      </div>

      {/* Filtros por categoria como chips */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilters(f => ({ ...f, category: 'all' }))}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-xl)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none',
              background: filters.category === 'all' ? 'var(--accent)' : 'var(--bg)',
              color: filters.category === 'all' ? '#fff' : 'var(--text-secondary)',
              boxShadow: filters.category === 'all' ? '0 2px 8px rgba(91,141,239,0.4)' : 'var(--shadow-raised)',
              transition: 'all 0.15s ease',
            }}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilters(f => ({ ...f, category: f.category === cat ? 'all' : cat }))}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-xl)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                background: filters.category === cat ? 'var(--accent)' : 'var(--bg)',
                color: filters.category === cat ? '#fff' : 'var(--text-secondary)',
                boxShadow: filters.category === cat ? '0 2px 8px rgba(91,141,239,0.4)' : 'var(--shadow-raised)',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              className="btn-primary"
              onClick={() => { setSelectedProduct(null); setVariationSource(null); setShowForm(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontSize: '13px' }}
            >
              <Plus size={14} /> Novo Produto
            </button>
            <button
              className="btn-nm"
              onClick={() => products[0] && openMovement(products[0], 'entrada')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontSize: '13px' }}
            >
              Movimentar
            </button>
          </div>
        </div>
      </div>

      <InventoryHero stats={stats} onCreate={() => { setSelectedProduct(null); setVariationSource(null); setShowForm(true); }} onMovement={() => products[0] && openMovement(products[0], 'entrada')} onExport={exportCsv} />
      <InventoryToolbar filters={filters} setFilters={setFilters} categories={categoriesData} view={view} setView={setView} />
      <InventoryDailyPanel lowStock={daily.lowStock} noPrice={daily.noPrice} zeroStock={daily.zeroStock} topValue={daily.topValue} />

      {view === 'table' && <InventorySmartTable products={filteredProducts} reservedMap={reservedMap} onEdit={(p) => { setSelectedProduct(p); setVariationSource(null); setShowForm(true); }} onMovement={openMovement} onDelete={(p) => deleteProduct.mutate(p)} onHistory={(p) => setHistoryProduct(p)} onVariation={openVariation} onBom={(p) => setBomProduct(p)} />}
      {view === 'cards' && <InventoryCardsGrid products={filteredProducts} onEdit={(p) => { setSelectedProduct(p); setVariationSource(null); setShowForm(true); }} onMovement={openMovement} onDelete={(p) => deleteProduct.mutate(p)} onHistory={(p) => setHistoryProduct(p)} />}
      {view === 'movements' && <InventoryMovementsList movements={movements} />}
      {view === 'repor' && <ReorderPanel products={products} onGeneratePurchase={(group) => { setGeneratingSupplier(group.supplier); createPurchase.mutate(group); }} onOpenPurchases={() => setShowPurchases(true)} generatingSupplier={generatingSupplier} />}
      {view === 'inventario' && <InventoryCountSession products={products} categories={categories} />}
      {view === 'retalhos' && <ScrapInventoryPanel products={products} />}

      <ProductFormDialog open={showForm} onClose={() => { setShowForm(false); setSelectedProduct(null); setVariationSource(null); }} product={selectedProduct} categories={categoriesData} onCreateCategory={createCategory} onSubmit={(data) => saveProduct.mutate(data)} saving={saveProduct.isPending} products={products} variationSource={variationSource} />
      <VariationMatrixDialog open={!!matrixProduct} onClose={() => setMatrixProduct(null)} baseProduct={matrixProduct} products={products} onSaved={() => queryClient.invalidateQueries({ queryKey: ['products'] })} />
      <BomDialog open={!!bomProduct} onClose={() => setBomProduct(null)} product={bomProduct} products={products} onSaved={() => queryClient.invalidateQueries({ queryKey: ['products'] })} />
      <PurchaseOrdersDialog open={showPurchases} onClose={() => setShowPurchases(false)} />

      {historyProduct && <ProductMovementHistory product={historyProduct} onClose={() => setHistoryProduct(null)} />}

      {/* Modal de Movimentação Neumórfico */}
      {showMovementForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', padding: '28px', width: '100%', maxWidth: '440px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Movimentação de Estoque</h2>
              <button onClick={() => setShowMovementForm(false)} style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', border: 'none', borderRadius: 'var(--r-md)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); adjustStock.mutate(movementData); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Item */}
              <div>
                <label style={labelStyle}>Item</label>
                <select
                  style={inputStyle}
                  value={movementData.product_id}
                  onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    const area = isAreaStock(product);
                    setMovementData((prev) => ({
                      ...prev,
                      product_id: e.target.value,
                      product_name: product?.name || '',
                      entry_mode: area && prev.type === 'entrada' ? 'sheet' : 'm2',
                      sheet_w: product?.sheet_width_mm || '',
                      sheet_h: product?.sheet_height_mm || '',
                    }));
                  }}
                  required
                >
                  <option value="">Selecione um item</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
                </select>
                {movementProduct && (
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                    Saldo atual: <strong style={{ color: 'var(--text-secondary)' }}>{areaMovement ? formatM2(movementProduct.quantity) : `${movementProduct.quantity || 0} ${movementProduct.unit || 'un'}`}</strong> · custo medio {formatCurrency(movementProduct.cost_price)}{areaMovement ? '/m2' : ''}
                    {areaMovement && <span className="ml-1" style={{ color: 'var(--accent)', fontWeight: 700 }}>· controle por area</span>}
                  </div>
                )}
              </div>

              {/* Tipo de movimentação */}
              <div>
                <label style={labelStyle}>Tipo de Movimentação</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {movementTypes.map(({ value, label, icon: Icon, activeBg }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMovementData(p => ({ ...p, type: value }))}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--r-md)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: '600',
                        fontSize: '13px',
                        background: movementData.type === value ? activeBg : 'var(--bg)',
                        color: movementData.type === value ? '#fff' : 'var(--text-secondary)',
                        boxShadow: movementData.type === value ? 'none' : 'var(--shadow-raised)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo de entrada para acrilico controlado por area */}
              {areaMovement && movementData.type === 'entrada' && (
                <div>
                  <label style={labelStyle}>Como registrar a entrada</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[{ value: 'sheet', label: 'Por chapa' }, { value: 'm2', label: 'Por m2' }].map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setMovementData((p) => ({ ...p, entry_mode: mode.value }))}
                        style={{
                          padding: '9px',
                          borderRadius: 'var(--r-md)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                          background: movementData.entry_mode === mode.value ? 'var(--accent)' : 'var(--bg)',
                          color: movementData.entry_mode === mode.value ? '#fff' : 'var(--text-secondary)',
                          boxShadow: movementData.entry_mode === mode.value ? 'none' : 'var(--shadow-raised)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Entrada por chapa (acrilico) ou por m2/quantidade */}
              {sheetEntry ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>N de chapas</label>
                      <input type="number" step="any" min="0.000001" style={inputStyle} value={movementData.sheets} onChange={(e) => setMovementData((p) => ({ ...p, sheets: e.target.value }))} required placeholder="Ex: 5" />
                    </div>
                    <div>
                      <label style={labelStyle}>Largura (mm)</label>
                      <input type="number" step="any" min="0" style={inputStyle} value={movementData.sheet_w} onChange={(e) => setMovementData((p) => ({ ...p, sheet_w: e.target.value }))} required placeholder="1000" />
                    </div>
                    <div>
                      <label style={labelStyle}>Altura (mm)</label>
                      <input type="number" step="any" min="0" style={inputStyle} value={movementData.sheet_h} onChange={(e) => setMovementData((p) => ({ ...p, sheet_h: e.target.value }))} required placeholder="2000" />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Custo por chapa (R$)</label>
                    <input type="number" step="0.01" min="0" style={inputStyle} value={movementData.sheet_cost} onChange={(e) => setMovementData((p) => ({ ...p, sheet_cost: e.target.value }))} placeholder="Opcional" />
                  </div>
                  <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Sera adicionado ao saldo: <strong style={{ color: 'var(--green)' }}>{formatM2(sheetTotalM2)}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {perSheetM2 > 0 ? `${formatM2(perSheetM2)} por chapa` : 'Informe largura e altura da chapa'}
                      {sheetUnitCost > 0 ? ` · custo ${formatCurrency(sheetUnitCost)}/m2` : ''}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label style={labelStyle}>{movementData.type === 'ajuste' ? (areaMovement ? 'Area (m2, com sinal)' : 'Quantidade (com sinal)') : (areaMovement ? 'Area (m2)' : 'Quantidade')}</label>
                  <input
                    type="number"
                    step="any"
                    style={inputStyle}
                    value={movementData.quantity}
                    onChange={(e) => setMovementData(p => ({ ...p, quantity: e.target.value }))}
                    required
                    min={movementData.type === 'ajuste' ? undefined : '0.000001'}
                  />
                  {movementData.type === 'ajuste' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Use valor negativo para reduzir o saldo{areaMovement ? ' em m2' : ''} (ex: -3).</div>
                  )}
                  {areaMovement && movementData.type !== 'ajuste' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Valor informado em m2 (area).</div>
                  )}
                </div>
              )}

              {/* Custo unitario da entrada (modo m2/unidade) */}
              {movementData.type === 'entrada' && !sheetEntry && (
                <div>
                  <label style={labelStyle}>{areaMovement ? 'Custo por m2 desta entrada (R$)' : 'Custo unitario desta entrada (R$)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={inputStyle}
                    value={movementData.unit_cost}
                    onChange={(e) => setMovementData(p => ({ ...p, unit_cost: e.target.value }))}
                    placeholder="Opcional"
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Atualiza o custo medio do produto{areaMovement ? ' (por m2)' : ''}.</div>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label style={labelStyle}>{reasonRequiredTypes.includes(movementData.type) ? 'Motivo (obrigatorio)' : 'Motivo'}</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={movementData.reason}
                  onChange={(e) => setMovementData(p => ({ ...p, reason: e.target.value }))}
                  placeholder={movementData.type === 'devolucao' ? 'Devolucao de cliente, troca...' : 'Compra, perda, producao, inventario...'}
                  required={reasonRequiredTypes.includes(movementData.type)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="button" className="btn-nm" style={{ flex: 1, padding: '10px' }} onClick={() => setShowMovementForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px' }} disabled={adjustStock.isPending}>
                  {adjustStock.isPending ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
