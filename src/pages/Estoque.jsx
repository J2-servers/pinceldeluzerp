import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import ProductFormDialog from '@/components/estoque/ProductFormDialog';
import InventoryHero from '@/components/estoque/InventoryHero';
import InventoryToolbar from '@/components/estoque/InventoryToolbar';
import InventorySmartTable from '@/components/estoque/InventorySmartTable';
import InventoryCardsGrid from '@/components/estoque/InventoryCardsGrid';
import InventoryDailyPanel from '@/components/estoque/InventoryDailyPanel';
import InventoryMovementsList from '@/components/estoque/InventoryMovementsList';
import { buildAssetPayloadFromProduct } from '@/lib/productAssetUtils';
import { syncLegacyProductToCore, syncStockMovementItem, createAuditLog } from '@/lib/erpCoreSync';
import { syncProductMaterialParameter } from '@/lib/productMaterialSync';
import { downloadCsv } from '@/lib/downloadUtils';
import { Package, DollarSign, AlertTriangle, XCircle, Plus, X, ArrowDown, ArrowUp } from 'lucide-react';
import moment from 'moment';

const defaultFilters = { search: '', category: 'all', stock: 'all', behavior: 'all', sort: 'name', minQty: '', onlyNoPrice: false, onlyLow: false };
const defaultMovement = { product_id: '', product_name: '', type: 'entrada', quantity: 0, reason: '', date: moment().format('YYYY-MM-DD') };
const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

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
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementData, setMovementData] = useState(defaultMovement);
  const [filters, setFilters] = useState(defaultFilters);
  const [view, setView] = useState('table');

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list('name') });
  const { data: categoriesData = [] } = useQuery({ queryKey: ['productCategories'], queryFn: () => erp.entities.ProductCategory.list('name') });
  const { data: movements = [] } = useQuery({ queryKey: ['stockMovements'], queryFn: () => erp.entities.StockMovement.list('-date', 150) });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search') || params.get('busca');
    const nextView = params.get('view');
    if (search) setFilters((prev) => ({ ...prev, search, category: 'all', stock: 'all' }));
    if (['table', 'cards'].includes(nextView)) setView(nextView);
  }, []);

  const saveProduct = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      const saved = selectedProduct ? await erp.entities.Product.update(selectedProduct.id, payload) : await erp.entities.Product.create(payload);
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
    }
  });

  const deleteProduct = useMutation({
    mutationFn: async (product) => {
      await createAuditLog({ module: 'inventory', entity_name: 'Product', entity_id: product.id, action: 'delete', document_number: product.sku || product.name });
      return erp.entities.Product.delete(product.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  const createMovement = useMutation({
    mutationFn: async (data) => {
      const product = products.find((p) => p.id === data.product_id);
      if (!product) return;
      const quantity = Number(data.quantity || 0);
      const newQty = data.type === 'entrada' ? Number(product.quantity || 0) + quantity : Number(product.quantity || 0) - quantity;
      if (newQty < 0) throw new Error('Estoque insuficiente');
      const movement = await erp.entities.StockMovement.create({ ...data, quantity });
      const updatedProduct = await erp.entities.Product.update(product.id, { quantity: newQty });
      await syncStockMovementItem(movement, updatedProduct);
      await createAuditLog({ module: 'inventory', entity_name: 'StockMovement', entity_id: movement.id, action: data.type, document_number: updatedProduct.sku || updatedProduct.name, metadata: { quantity, reason: data.reason || '' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      setShowMovementForm(false);
      setMovementData(defaultMovement);
    }
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
    const low = p.track_stock !== false && Number(p.quantity || 0) <= Number(p.min_quantity || 1);
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
    lowStock: products.filter((p) => p.track_stock !== false && Number(p.quantity || 0) <= Number(p.min_quantity || 1)).length,
    noPrice: products.filter((p) => !Number(p.sale_price || p.price_per_m2 || 0)).length,
    dimensional: products.filter((p) => p.sheet_width_mm || p.dimensions_required).length,
    costValue: products.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.cost_price || 0), 0),
    saleValue: products.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.sale_price || p.price_per_m2 || 0), 0),
    zeroStock: products.filter((p) => p.track_stock !== false && Number(p.quantity || 0) === 0).length,
  }), [products]);

  const daily = useMemo(() => ({
    lowStock: products.filter((p) => p.track_stock !== false && Number(p.quantity || 0) <= Number(p.min_quantity || 1)),
    noPrice: products.filter((p) => !Number(p.sale_price || p.price_per_m2 || 0)),
    zeroStock: products.filter((p) => p.track_stock !== false && Number(p.quantity || 0) === 0),
    topValue: [...products].sort((a, b) => Number(b.quantity || 0) * Number(b.cost_price || 0) - Number(a.quantity || 0) * Number(a.cost_price || 0)),
  }), [products]);

  const openMovement = (product, type = 'entrada') => {
    setMovementData({ ...defaultMovement, product_id: product.id, product_name: product.name, type });
    setShowMovementForm(true);
  };

  const exportCsv = () => {
    const header = ['nome', 'sku', 'categoria', 'saldo', 'minimo', 'unidade', 'custo', 'preco', 'local'];
    const rows = filteredProducts.map((p) => [p.name, p.sku, p.category, p.quantity || 0, p.min_quantity || 0, p.unit, p.cost_price || 0, p.sale_price || p.price_per_m2 || 0, p.location || '']);
    downloadCsv([header, ...rows], `estoque-${moment().format('YYYY-MM-DD')}.csv`);
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

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
              onClick={() => { setSelectedProduct(null); setShowForm(true); }}
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

      <InventoryHero stats={stats} onCreate={() => { setSelectedProduct(null); setShowForm(true); }} onMovement={() => products[0] && openMovement(products[0], 'entrada')} onExport={exportCsv} />
      <InventoryToolbar filters={filters} setFilters={setFilters} categories={categoriesData} view={view} setView={setView} />
      <InventoryDailyPanel lowStock={daily.lowStock} noPrice={daily.noPrice} zeroStock={daily.zeroStock} topValue={daily.topValue} />

      {view === 'table' && <InventorySmartTable products={filteredProducts} onEdit={(p) => { setSelectedProduct(p); setShowForm(true); }} onMovement={openMovement} onDelete={(p) => deleteProduct.mutate(p)} />}
      {view === 'cards' && <InventoryCardsGrid products={filteredProducts} onEdit={(p) => { setSelectedProduct(p); setShowForm(true); }} onMovement={openMovement} onDelete={(p) => deleteProduct.mutate(p)} />}
      {view === 'movements' && <InventoryMovementsList movements={movements} />}

      <ProductFormDialog open={showForm} onClose={() => { setShowForm(false); setSelectedProduct(null); }} product={selectedProduct} categories={categoriesData} onCreateCategory={createCategory} onSubmit={(data) => saveProduct.mutate(data)} saving={saveProduct.isPending} />

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

            <form onSubmit={(e) => { e.preventDefault(); createMovement.mutate(movementData); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Item selecionado */}
              <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Item</div>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>{movementData.product_name || 'Selecione um item pela lista'}</div>
              </div>

              {/* Tipo de movimentação */}
              <div>
                <label style={labelStyle}>Tipo de Movimentação</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['entrada', 'saida'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMovementData(p => ({ ...p, type }))}
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
                        background: movementData.type === type
                          ? (type === 'entrada' ? 'var(--green)' : 'var(--red)')
                          : 'var(--bg)',
                        color: movementData.type === type ? '#fff' : 'var(--text-secondary)',
                        boxShadow: movementData.type === type ? 'none' : 'var(--shadow-raised)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {type === 'entrada' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                      {type === 'entrada' ? 'Entrada' : 'Saída'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label style={labelStyle}>Quantidade</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={movementData.quantity}
                  onChange={(e) => setMovementData(p => ({ ...p, quantity: Number(e.target.value || 0) }))}
                  required
                  min="1"
                />
              </div>

              {/* Motivo */}
              <div>
                <label style={labelStyle}>Motivo</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={movementData.reason}
                  onChange={(e) => setMovementData(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Compra, ajuste, perda, produção..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="button" className="btn-nm" style={{ flex: 1, padding: '10px' }} onClick={() => setShowMovementForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px' }}>
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
